import WebSocket from 'ws';
import { EventEmitter } from 'events';

export interface TickerUpdate {
  symbol: string;
  price: number;
  change24h: number;
  volume: number;
  timestamp: Date;
}

export interface TransactionUpdate {
  symbol: string;
  price: number;
  quantity: number;
  type: 'bid' | 'ask';
  timestamp: Date;
}

export class BithumbWebSocket extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private subscribedSymbols: string[] = [];

  constructor() {
    super();
  }

  /**
   * WebSocket 연결
   */
  connect(): void {
    try {
      this.ws = new WebSocket('wss://pubwss.bithumb.com/pub/ws');

      this.ws.on('open', () => {
        console.log('Bithumb WebSocket connected');
        this.reconnectAttempts = 0;

        // Heartbeat 설정
        this.startHeartbeat();

        // 재연결 시 이전 구독 복원
        if (this.subscribedSymbols.length > 0) {
          this.subscribe(this.subscribedSymbols);
        }

        this.emit('connected');
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      });

      this.ws.on('close', () => {
        console.log('Bithumb WebSocket disconnected');
        this.stopHeartbeat();
        this.attemptReconnect();
        this.emit('disconnected');
      });

      this.ws.on('error', (error) => {
        console.error('Bithumb WebSocket error:', error);
        this.emit('error', error);
      });

      this.ws.on('ping', () => {
        this.ws?.pong();
      });
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      this.attemptReconnect();
    }
  }

  /**
   * 재연결 시도
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      this.emit('max_reconnect_attempts');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    console.log(`Reconnecting in ${delay}ms... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Heartbeat 시작
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, 30000); // 30초마다
  }

  /**
   * Heartbeat 중지
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * 코인 구독
   */
  subscribe(symbols: string[]): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected');
      return;
    }

    this.subscribedSymbols = symbols;

    const tickerMessage = {
      type: 'ticker',
      symbols: symbols.map(s => `${s}_KRW`),
      tickTypes: ['24H'],
    };

    const transactionMessage = {
      type: 'transaction',
      symbols: symbols.map(s => `${s}_KRW`),
    };

    this.ws.send(JSON.stringify(tickerMessage));
    this.ws.send(JSON.stringify(transactionMessage));

    console.log(`Subscribed to ${symbols.length} symbols`);
  }

  /**
   * 구독 해제
   */
  unsubscribe(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    this.subscribedSymbols = [];
    // 빗썸 WebSocket은 명시적 구독 해제 메시지가 없으므로 연결만 끊음
  }

  /**
   * 메시지 처리
   */
  private handleMessage(message: any): void {
    if (message.type === 'ticker') {
      const content = message.content;
      const symbol = content.symbol.replace('_KRW', '');

      const tickerUpdate: TickerUpdate = {
        symbol,
        price: parseFloat(content.closePrice),
        change24h: parseFloat(content.chgRate),
        volume: parseFloat(content.volume),
        timestamp: new Date(content.date),
      };

      this.emit('ticker', tickerUpdate);
    } else if (message.type === 'transaction') {
      const content = message.content;
      const symbol = content.symbol.replace('_KRW', '');

      const transactionUpdate: TransactionUpdate = {
        symbol,
        price: parseFloat(content.contPrice),
        quantity: parseFloat(content.contQty),
        type: content.buySellGb === '1' ? 'bid' : 'ask',
        timestamp: new Date(content.contDtm),
      };

      this.emit('transaction', transactionUpdate);
    }
  }

  /**
   * 연결 종료
   */
  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.subscribedSymbols = [];
  }

  /**
   * 연결 상태 확인
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// 싱글톤 인스턴스
export const bithumbWs = new BithumbWebSocket();
