import { EventEmitter } from 'events';
import { bithumbClient, Ticker } from '../bithumb/client';
import { analyzeMarket, computeConfidenceGate, shouldExecuteTrade } from './multi-layer';
import { logAIDecision, logAIOutcome } from '../ai/copilot';

export interface TradingConfig {
  mode: 'live' | 'simulation';
  investmentPercentage: number;
  profitTarget: number;
  minVolumeKrw: number;
  enabled: boolean;
}

export interface Position {
  symbol: string;
  entryPrice: number;
  quantity: number;
  currentPrice: number;
  profitLoss: number;
  profitLossPct: number;
  openedAt: Date;
}

export interface Order {
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit';
  quantity: number;
  price?: number;
  reason?: string;
}

export class TradingEngine extends EventEmitter {
  private isRunning: boolean = false;
  private currentPosition: Position | null = null;
  private config: TradingConfig;
  private loopInterval: NodeJS.Timeout | null = null;

  constructor(config: TradingConfig) {
    super();
    this.config = config;
  }

  /**
   * 자동 매매 시작
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Trading engine already running');
      return;
    }

    this.isRunning = true;
    this.emit('started');
    console.log('Trading engine started in', this.config.mode, 'mode');

    // 메인 루프 (5초마다)
    this.loopInterval = setInterval(async () => {
      try {
        await this.mainLoop();
      } catch (error) {
        console.error('Trading loop error:', error);
        this.emit('error', error);
      }
    }, 5000);
  }

  /**
   * 자동 매매 중지
   */
  stop(): void {
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = null;
    }
    this.isRunning = false;
    this.emit('stopped');
    console.log('Trading engine stopped');
  }

  /**
   * 메인 트레이딩 루프
   */
  private async mainLoop(): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      // 1. 시장 데이터 수집 (거래대금 Top 30)
      const allTickers = await bithumbClient.getAllTickers();
      const filtered = allTickers.filter(t => t.volumeKrw >= this.config.minVolumeKrw);

      // 2. 현재 포지션 확인
      if (this.currentPosition) {
        // 포지션 있음 → 관리
        await this.managePosition(this.currentPosition);
      } else {
        // 포지션 없음 → 신규 매수 검토
        await this.findBuyOpportunity(filtered);
      }
    } catch (error) {
      console.error('Main loop error:', error);
    }
  }

  /**
   * 포지션 관리 (익절/손절 판단)
   */
  private async managePosition(position: Position): Promise<void> {
    try {
      const currentTicker = await bithumbClient.getTicker(position.symbol);
      const currentPrice = currentTicker.price;

      // 수익률 계산
      const profitPct = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;

      // 포지션 업데이트
      position.currentPrice = currentPrice;
      position.profitLoss = (currentPrice - position.entryPrice) * position.quantity;
      position.profitLossPct = profitPct;

      this.emit('position_update', position);

      // 익절 조건 체크
      if (profitPct >= this.config.profitTarget) {
        await this.executeOrder({
          symbol: position.symbol,
          side: 'sell',
          type: 'market',
          quantity: position.quantity,
          reason: `익절 ${profitPct.toFixed(2)}%`,
        });
        this.currentPosition = null;
        this.emit('position_closed', { symbol: position.symbol, profit: profitPct });
        return;
      }

      // 보유 판단 (시그널 점수 체크)
      const analysis = await analyzeMarket(position.symbol);
      const confidenceOk = computeConfidenceGate(analysis.metadata.sentiment, analysis.metadata.events);

      // 강한 매도 시그널 또는 확신도 하락 → 손절
      if ((analysis.signal === 'sell' && analysis.score < 30) || !confidenceOk) {
        await this.executeOrder({
          symbol: position.symbol,
          side: 'sell',
          type: 'market',
          quantity: position.quantity,
          reason: `손절 (시그널 점수: ${analysis.score})`,
        });

        logAIOutcome({
          symbol: position.symbol,
          action: 'exit',
          score: analysis.score,
          profitPct,
          confidenceOk,
        });

        this.currentPosition = null;
        this.emit('position_closed', { symbol: position.symbol, profit: profitPct });

        if (!confidenceOk) {
          this.emit('confidence_exit', {
            symbol: position.symbol,
            sentimentConfidence: analysis.metadata.sentiment.confidence,
          });
        }
      }
    } catch (error) {
      console.error('Position management error:', error);
    }
  }

  /**
   * 신규 매수 기회 탐색
   */
  private async findBuyOpportunity(tickers: Ticker[]): Promise<void> {
    try {
      // 각 코인 분석
      const analyses = await Promise.all(
        tickers.map(async ticker => {
          const analysis = await analyzeMarket(ticker.symbol);
          const confidenceOk = computeConfidenceGate(analysis.metadata.sentiment, analysis.metadata.events);

          return {
            symbol: ticker.symbol,
            price: ticker.price,
            analysis,
            confidenceOk,
            shouldTrade: shouldExecuteTrade(analysis.score, confidenceOk),
          };
        })
      );

      // 매수 시그널 필터링 및 점수 순 정렬
      const buySignals = analyses
        .filter(a => a.shouldTrade && a.analysis.signal === 'buy')
        .sort((a, b) => b.analysis.score - a.analysis.score);

      if (buySignals.length === 0) {
        this.emit('no_opportunity', { reason: '적합한 매수 기회 없음' });
        return;
      }

      const best = buySignals[0];

      // 투자금 계산
      const balance = await this.getBalance();
      const investAmount = balance.krw * (this.config.investmentPercentage / 100);
      const quantity = investAmount / best.price;

      // 매수 주문 실행
      await this.executeOrder({
        symbol: best.symbol,
        side: 'buy',
        type: 'market',
        quantity,
        reason: `자동 매수 (점수: ${best.analysis.score})`,
      });

      // 포지션 생성
      this.currentPosition = {
        symbol: best.symbol,
        entryPrice: best.price,
        quantity,
        currentPrice: best.price,
        profitLoss: 0,
        profitLossPct: 0,
        openedAt: new Date(),
      };

      logAIDecision({
        symbol: best.symbol,
        strategy: 'auto-trade',
        score: best.analysis.score,
        confidence: best.confidenceOk ? best.analysis.metadata.sentiment.confidence : 0,
        metadata: best.analysis.metadata,
      });

      this.emit('position_opened', {
        symbol: best.symbol,
        score: best.analysis.score,
      });
    } catch (error) {
      console.error('Find buy opportunity error:', error);
    }
  }

  /**
   * 주문 실행
   */
  private async executeOrder(order: Order): Promise<void> {
    try {
      if (this.config.mode === 'live') {
        // 실전 모드: 실제 빗썸 API 호출
        const result = await bithumbClient.placeOrder({
          symbol: order.symbol,
          side: order.side,
          type: order.type,
          quantity: order.quantity,
          price: order.price,
        });
        console.log('Live order executed:', result);
      } else {
        // 시뮬레이션 모드: 가상 주문
        console.log('Simulation order:', order);
      }

      this.emit('order_filled', {
        symbol: order.symbol,
        side: order.side,
        quantity: order.quantity,
        price: order.price,
        reason: order.reason,
      });
    } catch (error) {
      console.error('Order execution error:', error);
      this.emit('order_failed', error);
    }
  }

  /**
   * 잔고 조회
   */
  private async getBalance(): Promise<{ krw: number }> {
    if (this.config.mode === 'live') {
      // 실전 모드: 실제 잔고
      const balance = await bithumbClient.getBalance('KRW');
      return { krw: parseFloat(balance.available_krw) };
    } else {
      // 시뮬레이션 모드: 가상 잔고
      return { krw: 10000000 }; // 1천만원
    }
  }

  /**
   * 현재 포지션 조회
   */
  getCurrentPosition(): Position | null {
    return this.currentPosition;
  }

  /**
   * 설정 업데이트
   */
  updateConfig(config: Partial<TradingConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('config_updated', this.config);
  }

  /**
   * 긴급 정지
   */
  async emergencyStop(): Promise<void> {
    this.stop();

    if (this.currentPosition) {
      await this.executeOrder({
        symbol: this.currentPosition.symbol,
        side: 'sell',
        type: 'market',
        quantity: this.currentPosition.quantity,
        reason: '긴급 정지',
      });
      this.currentPosition = null;
    }

    this.emit('emergency_stopped');
    console.log('Emergency stop executed');
  }
}
