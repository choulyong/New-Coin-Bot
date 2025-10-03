import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';

export interface BithumbConfig {
  apiKey?: string;
  apiSecret?: string;
}

export interface Ticker {
  symbol: string;
  koreanName: string;
  price: number;
  change24h: number;
  volume24h: number;
  volumeKrw: number;
  high24h: number;
  low24h: number;
}

export interface OrderBookLevel {
  price: number;
  quantity: number;
}

export interface OrderBook {
  symbol: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
}

export interface Candle {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export class BithumbClient {
  private apiKey?: string;
  private apiSecret?: string;
  private publicClient: AxiosInstance;
  private privateClient: AxiosInstance;

  constructor(config?: BithumbConfig) {
    this.apiKey = config?.apiKey || process.env.BITHUMB_API_KEY;
    this.apiSecret = config?.apiSecret || process.env.BITHUMB_API_SECRET;

    this.publicClient = axios.create({
      baseURL: 'https://api.bithumb.com/public',
      timeout: 5000,
    });

    this.privateClient = axios.create({
      baseURL: 'https://api.bithumb.com',
      timeout: 5000,
    });
  }

  /**
   * HMAC-SHA512 서명 생성
   */
  private sign(endpoint: string, params: Record<string, any> = {}): { headers: Record<string, string>; body: string } {
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('API Key and Secret are required for private API calls');
    }

    const nonce = Date.now().toString();
    params.nonce = nonce;

    const queryString = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');

    const data = endpoint + '\0' + queryString;
    const signature = crypto
      .createHmac('sha512', Buffer.from(this.apiSecret, 'base64'))
      .update(data)
      .digest('base64');

    return {
      headers: {
        'Api-Key': this.apiKey,
        'Api-Sign': signature,
        'Api-Nonce': nonce,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: queryString,
    };
  }

  /**
   * 전체 마켓 코인 조회 (실제 API)
   */
  async getAllMarkets(): Promise<string[]> {
    try {
      const response = await this.publicClient.get('/ticker/ALL_KRW');
      const data = response.data;

      if (data.status !== '0000') {
        throw new Error(`Bithumb API Error: ${data.message}`);
      }

      // 모든 코인 심볼 추출 (date 제외)
      const symbols = Object.keys(data.data).filter(key => key !== 'date');
      return symbols;
    } catch (error) {
      console.error('Failed to fetch markets:', error);
      throw error;
    }
  }

  /**
   * 특정 코인 티커 조회 (실제 API)
   */
  async getTicker(symbol: string): Promise<Ticker> {
    try {
      const response = await this.publicClient.get(`/ticker/${symbol}_KRW`);
      const data = response.data;

      if (data.status !== '0000') {
        throw new Error(`Bithumb API Error: ${data.message}`);
      }

      const tickerData = data.data;

      const currentPrice = parseFloat(tickerData.closing_price);
      const openPrice = parseFloat(tickerData.opening_price);

      // 실제 24시간 변동률 계산
      const change24h = openPrice > 0
        ? ((currentPrice - openPrice) / openPrice) * 100
        : 0;

      return {
        symbol,
        koreanName: this.getKoreanName(symbol),
        price: currentPrice,
        change24h: change24h,
        volume24h: parseFloat(tickerData.units_traded_24H),
        volumeKrw: parseFloat(tickerData.acc_trade_value_24H),
        high24h: parseFloat(tickerData.max_price),
        low24h: parseFloat(tickerData.min_price),
      };
    } catch (error) {
      console.error(`Failed to fetch ticker for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * 전체 코인 티커 조회 (실제 API)
   */
  async getAllTickers(): Promise<Ticker[]> {
    try {
      const response = await this.publicClient.get('/ticker/ALL_KRW');
      const data = response.data;

      if (data.status !== '0000') {
        throw new Error(`Bithumb API Error: ${data.message}`);
      }

      const tickers: Ticker[] = [];
      const tickerData = data.data;

      for (const symbol of Object.keys(tickerData)) {
        if (symbol === 'date') continue;

        const coin = tickerData[symbol];
        const currentPrice = parseFloat(coin.closing_price);
        const openPrice = parseFloat(coin.opening_price);

        // 실제 24시간 변동률 계산
        const change24h = openPrice > 0
          ? ((currentPrice - openPrice) / openPrice) * 100
          : 0;

        tickers.push({
          symbol,
          koreanName: this.getKoreanName(symbol),
          price: currentPrice,
          change24h: change24h,
          volume24h: parseFloat(coin.units_traded_24H),
          volumeKrw: parseFloat(coin.acc_trade_value_24H),
          high24h: parseFloat(coin.max_price),
          low24h: parseFloat(coin.min_price),
        });
      }

      return tickers;
    } catch (error) {
      console.error('Failed to fetch all tickers:', error);
      throw error;
    }
  }

  /**
   * 호가 정보 조회 (실제 API)
   */
  async getOrderBook(symbol: string): Promise<OrderBook> {
    try {
      const response = await this.publicClient.get(`/orderbook/${symbol}_KRW`);
      const data = response.data;

      if (data.status !== '0000') {
        throw new Error(`Bithumb API Error: ${data.message}`);
      }

      const orderbookData = data.data;

      return {
        symbol,
        bids: orderbookData.bids.map((bid: any) => ({
          price: parseFloat(bid.price),
          quantity: parseFloat(bid.quantity),
        })),
        asks: orderbookData.asks.map((ask: any) => ({
          price: parseFloat(ask.price),
          quantity: parseFloat(ask.quantity),
        })),
      };
    } catch (error) {
      console.error(`Failed to fetch orderbook for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * 캔들 데이터 조회 (실제 API)
   */
  async getCandles(symbol: string, interval: string = '1m', count: number = 200): Promise<Candle[]> {
    try {
      const response = await this.publicClient.get(`/candlestick/${symbol}_KRW/${interval}`);
      const data = response.data;

      if (data.status !== '0000') {
        throw new Error(`Bithumb API Error: ${data.message}`);
      }

      const candles: Candle[] = data.data.slice(0, count).map((candle: any) => ({
        timestamp: new Date(candle[0]),
        open: parseFloat(candle[1]),
        close: parseFloat(candle[2]),
        high: parseFloat(candle[3]),
        low: parseFloat(candle[4]),
        volume: parseFloat(candle[5]),
      }));

      return candles.reverse(); // 오래된 순서로 정렬
    } catch (error) {
      console.error(`Failed to fetch candles for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * 잔고 조회 (Private API)
   */
  async getBalance(currency: string = 'ALL'): Promise<any> {
    const endpoint = '/info/balance';
    const params = {
      currency,
      payment_currency: 'KRW',
    };

    const { headers, body } = this.sign(endpoint, params);

    try {
      const response = await this.privateClient.post(endpoint, body, { headers });
      const data = response.data;

      if (data.status !== '0000') {
        throw new Error(`Bithumb API Error: ${data.message}`);
      }

      return data.data;
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      throw error;
    }
  }

  /**
   * 주문 실행 (Private API)
   */
  async placeOrder(params: {
    symbol: string;
    side: 'buy' | 'sell';
    type: 'market' | 'limit';
    quantity: number;
    price?: number;
  }): Promise<any> {
    const endpoint = '/trade/place';
    const orderParams: any = {
      order_currency: params.symbol,
      payment_currency: 'KRW',
      type: params.side,
      units: params.quantity.toString(),
    };

    if (params.type === 'limit' && params.price) {
      orderParams.price = params.price.toString();
    }

    const { headers, body } = this.sign(endpoint, orderParams);

    try {
      const response = await this.privateClient.post(endpoint, body, { headers });
      const data = response.data;

      if (data.status !== '0000') {
        throw new Error(`Bithumb API Error: ${data.message}`);
      }

      return data.data;
    } catch (error) {
      console.error('Failed to place order:', error);
      throw error;
    }
  }

  /**
   * 주문 취소 (Private API)
   */
  async cancelOrder(orderId: string, symbol: string): Promise<any> {
    const endpoint = '/trade/cancel';
    const params = {
      order_id: orderId,
      order_currency: symbol,
      payment_currency: 'KRW',
    };

    const { headers, body } = this.sign(endpoint, params);

    try {
      const response = await this.privateClient.post(endpoint, body, { headers });
      const data = response.data;

      if (data.status !== '0000') {
        throw new Error(`Bithumb API Error: ${data.message}`);
      }

      return data.data;
    } catch (error) {
      console.error('Failed to cancel order:', error);
      throw error;
    }
  }

  /**
   * 코인 한글명 매핑 (빗썸 주요 코인)
   */
  private getKoreanName(symbol: string): string {
    const nameMap: Record<string, string> = {
      BTC: '비트코인',
      ETH: '이더리움',
      XRP: '리플',
      ADA: '에이다',
      SOL: '솔라나',
      DOGE: '도지코인',
      DOT: '폴카닷',
      MATIC: '폴리곤',
      AVAX: '아발란체',
      LINK: '체인링크',
      BCH: '비트코인캐시',
      LTC: '라이트코인',
      ATOM: '코스모스',
      NEAR: '니어프로토콜',
      ALGO: '알고랜드',
      TRX: '트론',
      ETC: '이더리움클래식',
      SAND: '샌드박스',
      MANA: '디센트럴랜드',
      AXS: '엑시인피니티',
      CHZ: '칠리즈',
      THETA: '쎄타토큰',
      VET: '비체인',
      FIL: '파일코인',
      HBAR: '헤데라',
      ICP: '인터넷컴퓨터',
      EOS: '이오스',
      AAVE: '에이브',
      MKR: '메이커',
      COMP: '컴파운드',
      UNI: '유니스왑',
      SUSHI: '스시스왑',
      SNX: '신세틱스',
      GRT: '더그래프',
      ENJ: '엔진코인',
      BAT: '베이직어텐션토큰',
      ZRX: '제로엑스',
      CRV: '커브',
      YFI: '연파이낸스',
      '1INCH': '원인치',
      ANKR: '앵커',
      BAL: '밸런서',
      CVC: '시빅',
      KNC: '카이버네트워크',
      LRC: '루프링',
      OMG: '오미세고',
      QTUM: '퀀텀',
      ZIL: '질리카',
      ICX: '아이콘',
      KLAY: '클레이튼',
      WEMIX: '위믹스',
      BORA: '보라',
      FLOW: '플로우',
      APT: '앱토스',
      ARB: '아비트럼',
      SUI: '수이',
      SEI: '세이',
      STRK: '스타크넷',
      BLUR: '블러',
      INJ: '인젝티브',
      IMX: '이뮤터블엑스',
      RNDR: '렌더토큰',
      FTM: '팬텀',
      OP: '옵티미즘',
      SHIB: '시바이누',
      PEPE: '페페',
      FLOKI: '플로키',
      BONK: '봉크',
      WLD: '월드코인',
      PYTH: '피스네트워크',
      TIA: '셀레스티아',
      JTO: '지토',
      JUP: '주피터',
      DYM: '디뮴',
      MANTA: '만타',
      ALT: '알트레이어',
      BICO: '비코노미',
    };

    return nameMap[symbol] || symbol;
  }
}

// 싱글톤 인스턴스
export const bithumbClient = new BithumbClient();
