import { calculateRSI, calculateMACD, calculateBollingerBands, calculateAvgVolume, calculateATR, scoreRSI, scoreMACD, scoreBollinger, scoreVolume, MACD, BollingerBands } from '../indicators/technical';
import { bithumbClient, OrderBook } from '../bithumb/client';

export interface IndicatorScores {
  rsi: number;
  macd: number;
  bollinger: number;
  volume: number;
  volatility: number;
  sentiment: number;
  event: number;
}

export interface Weights {
  rsi: number;
  macd: number;
  bollinger: number;
  volume: number;
  volatility: number;
  sentiment: number;
  event: number;
}

export interface VolatilitySnapshot {
  atr: number;
  rangeRatio: number;
  orderBookImbalance: number;
  volumeSpike: number;
}

export interface SentimentSnapshot {
  aggregateScore: number; // -1 (부정) ~ 1 (긍정)
  confidence: number; // 0 ~ 1
  sources: Array<{
    source: 'news' | 'community' | 'social';
    score: number;
    confidence: number;
  }>;
}

export interface EventSignal {
  id: string;
  type: 'macro' | 'exchange' | 'listing' | 'regulation';
  severity: 'low' | 'medium' | 'high';
  impact: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  scheduledAt?: Date;
  detectedAt: Date;
}

export interface MarketAnalysis {
  score: number;
  signal: 'buy' | 'hold' | 'sell';
  indicators: IndicatorScores;
  metadata: {
    volatility: VolatilitySnapshot;
    sentiment: SentimentSnapshot;
    events: EventSignal[];
  };
}

/**
 * 변동성 지표 계산
 */
export function calculateVolatilityMetrics(params: {
  prices: number[];
  volumes: number[];
  orderBook: OrderBook;
}): VolatilitySnapshot {
  const atr = calculateATR(params.prices, 14);
  const recentHigh = Math.max(...params.prices.slice(-24));
  const recentLow = Math.min(...params.prices.slice(-24));
  const current = params.prices[params.prices.length - 1];
  const rangeRatio = (current - recentLow) / Math.max(recentHigh - recentLow, 1e-8);

  const bidVolume = params.orderBook.bids.reduce((acc, bid) => acc + bid.quantity, 0);
  const askVolume = params.orderBook.asks.reduce((acc, ask) => acc + ask.quantity, 0);
  const total = Math.max(bidVolume + askVolume, 1e-8);
  const orderBookImbalance = bidVolume / total;

  const avgVolume = calculateAvgVolume(params.volumes.slice(-24));
  const volumeSpike = params.volumes[params.volumes.length - 1] / Math.max(avgVolume, 1e-8);

  return { atr, rangeRatio, orderBookImbalance, volumeSpike };
}

/**
 * 변동성 점수화
 */
export function scoreVolatility(snapshot: VolatilitySnapshot): number {
  let score = 50;
  if (snapshot.atr >= 0.015) score += 10;
  if (snapshot.rangeRatio >= 0.8) score += 10;
  if (snapshot.orderBookImbalance >= 0.6) score += 10;
  if (snapshot.volumeSpike >= 2) score += 10;
  if (snapshot.orderBookImbalance <= 0.4) score -= 10;
  if (snapshot.rangeRatio <= 0.2) score -= 10;
  return Math.max(0, Math.min(score, 100));
}

/**
 * 감성 점수화
 */
export function scoreSentiment(snapshot: SentimentSnapshot): number {
  if (snapshot.confidence < 0.5) return 40; // 확신도 낮으면 보수적
  const normalized = (snapshot.aggregateScore + 1) / 2; // 0 ~ 1
  return Math.round(normalized * 100);
}

/**
 * 이벤트 점수화
 */
export function scoreEvent(events: EventSignal[]): number {
  if (events.length === 0) return 60; // 이벤트 없음 = 중립

  const weighted = events.reduce((acc, event) => {
    const severityWeight = event.severity === 'high' ? 1 : event.severity === 'medium' ? 0.6 : 0.3;
    const direction = event.impact === 'bullish' ? 1 : event.impact === 'bearish' ? -1 : 0;
    return acc + direction * severityWeight * event.confidence;
  }, 0);

  const normalized = (weighted + 1) / 2; // -1 ~ 1 → 0 ~ 1
  return Math.round(Math.max(0, Math.min(normalized, 1)) * 100);
}

/**
 * 종합 점수 계산
 */
export function calculateTotalScore(
  scores: IndicatorScores,
  weights: Weights = {
    rsi: 20,
    macd: 20,
    bollinger: 15,
    volume: 15,
    volatility: 10,
    sentiment: 10,
    event: 10,
  }
): number {
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);

  const weightedSum =
    scores.rsi * weights.rsi +
    scores.macd * weights.macd +
    scores.bollinger * weights.bollinger +
    scores.volume * weights.volume +
    scores.volatility * weights.volatility +
    scores.sentiment * weights.sentiment +
    scores.event * weights.event;

  return weightedSum / totalWeight;
}

/**
 * 시그널 결정
 */
export function determineSignal(score: number): 'buy' | 'hold' | 'sell' {
  if (score >= 70) return 'buy';
  if (score <= 30) return 'sell';
  return 'hold';
}

/**
 * 확신도 게이트 검증
 */
export function computeConfidenceGate(sentiment: SentimentSnapshot, events: EventSignal[]): boolean {
  const sentimentOk = sentiment.confidence >= 0.5;
  const hasCriticalBearish = events.some(
    event => event.impact === 'bearish' && event.severity === 'high' && event.confidence >= 0.7
  );
  return sentimentOk && !hasCriticalBearish;
}

/**
 * 거래 실행 여부 결정
 */
export function shouldExecuteTrade(score: number, confidenceOk: boolean): boolean {
  if (!confidenceOk) return false;
  return score >= 70;
}

/**
 * 시장 분석 (전체 파이프라인)
 */
export async function analyzeMarket(symbol: string): Promise<MarketAnalysis> {
  try {
    console.log(`[analyzeMarket] 📊 Starting ${symbol}`);

    // 1. 가격 데이터 가져오기
    const candles = await bithumbClient.getCandles(symbol, '5m', 60);

    if (!candles || candles.length < 20) {
      throw new Error(`Insufficient data: ${candles?.length || 0} candles`);
    }

    console.log(`[analyzeMarket] ✓ Got ${candles.length} candles for ${symbol}`);

    const prices = candles.map(c => c.close);
    const volumes = candles.map(c => c.volume);
    const currentPrice = prices[prices.length - 1];

    // 2. 호가창 데이터 (간단한 fallback - API 호출 제거)
    const orderBook = {
      bids: [{ price: currentPrice * 0.999, quantity: 1 }],
      asks: [{ price: currentPrice * 1.001, quantity: 1 }],
    };

    console.log(`[analyzeMarket] ✓ Using fallback orderbook for ${symbol}`);

    // 3. 기술 지표 계산
    const rsi = calculateRSI(prices);
    const macd = calculateMACD(prices);
    const prevMACD = calculateMACD(prices.slice(0, -1));
    const bollinger = calculateBollingerBands(prices);
    const currentPrice = prices[prices.length - 1];
    const avgVolume = calculateAvgVolume(volumes);
    const volatilitySnapshot = calculateVolatilityMetrics({ prices, volumes, orderBook });

    // 4. 감성/이벤트 데이터 (임시)
    const sentimentSnapshot: SentimentSnapshot = {
      aggregateScore: 0,
      confidence: 0.6,
      sources: [],
    };
    const eventSignals: EventSignal[] = [];

    // 5. 점수화
    const scores: IndicatorScores = {
      rsi: scoreRSI(rsi),
      macd: scoreMACD(macd, prevMACD),
      bollinger: scoreBollinger(currentPrice, bollinger),
      volume: scoreVolume(volumes[volumes.length - 1], avgVolume),
      volatility: scoreVolatility(volatilitySnapshot),
      sentiment: scoreSentiment(sentimentSnapshot),
      event: scoreEvent(eventSignals),
    };

    // 6. 종합 점수 및 시그널
    const totalScore = calculateTotalScore(scores);
    const signal = determineSignal(totalScore);

    return {
      score: totalScore,
      signal,
      indicators: scores,
      metadata: {
        volatility: volatilitySnapshot,
        sentiment: sentimentSnapshot,
        events: eventSignals,
      },
    };
  } catch (error: any) {
    console.error(`[analyzeMarket] Failed for ${symbol}:`, error);
    throw new Error(`Analysis failed for ${symbol}: ${error.message || 'Unknown error'}`);
  }
}
