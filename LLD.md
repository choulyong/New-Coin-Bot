# LLD: Bithumb Auto Trading Bot

## 1. 기술 스택

### 1.1 Frontend
- **Framework**: Next.js 14 (App Router, React Server Components)
- **Language**: TypeScript 5.3+
- **UI Components**: Radix UI Primitives
- **Styling**: Emotion (CSS-in-JS) + rcss utilities
- **차트 라이브러리**: Lightweight Charts (TradingView)
- **상태관리**:
  - Zustand (클라이언트 상태)
  - TanStack Query (서버 상태)
- **실시간 통신**: Socket.io Client
- **폼 관리**: React Hook Form + Zod

### 1.2 Backend
- **Runtime**: Node.js 20 LTS
- **Language**: TypeScript 5.3+
- **Framework**: Next.js API Routes + Express (WebSocket 서버)
- **Database**: Supabase (PostgreSQL 15)
- **ORM**: Drizzle ORM
- **Cache**: Upstash Redis
- **Job Scheduler**: node-cron
- **Validation**: Zod

### 1.3 External APIs
- **빗썸 Public API**:
  - REST: https://api.bithumb.com/public/*
  - 시세, 호가, 체결 데이터

- **빗썸 Private API**:
  - REST: https://api.bithumb.com/*
  - 주문, 잔고, 거래내역
  - HMAC-SHA512 인증

- **빗썸 WebSocket**:
  - WSS: wss://pubwss.bithumb.com/pub/ws
  - 실시간 시세, 체결, 호가

### 1.4 Infrastructure
- **Container**: Dev Containers (Docker Compose)
- **Version Control**: Git + GitHub
- **CI/CD**: GitHub Actions
- **배포**:
  - Frontend: Vercel
  - Backend: Railway (WebSocket 서버)
- **모니터링**:
  - Loki (로그 수집)
  - Grafana (시각화)
  - Sentry (에러 추적)

---

## 2. 시스템 아키텍처

### 2.1 전체 구조

```
┌─────────────────────────────────────────────────┐
│          Next.js App (Vercel)                    │
│  ┌──────────────┐  ┌──────────────────────┐    │
│  │  Dashboard   │  │   API Routes         │    │
│  │  - 차트       │  │   - /api/market/*    │    │
│  │  - 포트폴리오 │  │   - /api/trading/*   │    │
│  │  - 백테스팅  │  │   - /api/backtest/*  │    │
│  └──────┬───────┘  └──────────┬───────────┘    │
│         │ Socket.io            │ HTTP           │
└─────────┼──────────────────────┼────────────────┘
          │                      │
┌─────────▼──────────────────────▼────────────────┐
│      WebSocket Server (Railway)                  │
│  ┌──────────────────────────────────────────┐  │
│  │         Trading Engine Core               │  │
│  │  ┌────────────────┐  ┌─────────────────┐ │  │
│  │  │ Market Data    │  │ Trading Engine  │ │  │
│  │  │ Service        │  │ - Signal Gen    │ │  │
│  │  │ - WS Handler   │  │ - Order Exec    │ │  │
│  │  │ - Indicator    │  │ - Risk Manager  │ │  │
│  │  └────────────────┘  └─────────────────┘ │  │
│  └──────────────────────────────────────────┘  │
└─────────┬───────────────┬──────────────────────┘
          │               │
    ┌─────▼─────┐   ┌────▼──────┐
    │ Supabase  │   │   Redis   │
    │ Postgres  │   │  (Upstash)│
    └───────────┘   └───────────┘
          │
    ┌─────▼─────┐
    │   Vault   │
    │ (API Keys)│
    └───────────┘
```

### 2.2 데이터 플로우

#### 2.2.1 실시간 시세 플로우
```
Bithumb WebSocket
    ↓
Market Data Service (메시지 파싱)
    ↓
Redis Cache (최신 가격 저장, TTL 60초)
    ↓
Indicator Engine (지표 계산)
    ↓
Socket.io Broadcast (클라이언트 전송)
    ↓
Dashboard 차트 업데이트
```

#### 2.2.2 자동 매매 플로우
```
Market Data Update
    ↓
Indicator Engine (RSI, MACD 등 계산)
    ↓
Volatility & Sentiment Engine (ATR, 감성, 이벤트)
    ↓
Signal Fusion Pipeline (멀티레이어 점수화)
    ↓
Strategy Portfolio Manager (전략 슬롯 배분)
    ↓
Trading Decision (매수/보유/매도 결정)
    ↓
Risk Manager (한도 체크)
    ↓
Order Executor (빗썸 API 주문)
    ↓
Position Manager (포지션 업데이트)
    ↓
DB 저장 (Orders, Positions 테이블)
    ↓
Socket.io Emit (실시간 알림)
```

#### 2.2.3 백테스팅 플로우
```
사용자 백테스트 요청 (기간, 전략 설정)
    ↓
Historical Data Load (DB 또는 API)
    ↓
Backtest Engine (시뮬레이션 루프)
    ├─ 각 시점마다 지표 계산
    ├─ 시그널 생성
    └─ 가상 매매 실행
    ↓
Performance Metrics 계산
    ↓
DB 저장 (backtest_results 테이블)
    ↓
결과 차트 렌더링
```

---

## 3. 데이터베이스 스키마

### 3.1 Drizzle Schema 정의

```typescript
// schema.ts

import { pgTable, uuid, varchar, timestamp, decimal, boolean, jsonb, bigint, integer, pgEnum } from 'drizzle-orm/pg-core';

// Enums
export const tradingModeEnum = pgEnum('trading_mode', ['live', 'simulation']);
export const orderTypeEnum = pgEnum('order_type', ['market', 'limit']);
export const orderSideEnum = pgEnum('order_side', ['buy', 'sell']);
export const orderStatusEnum = pgEnum('order_status', ['pending', 'filled', 'cancelled', 'failed']);
export const positionStatusEnum = pgEnum('position_status', ['open', 'closed']);
export const signalTypeEnum = pgEnum('signal_type', ['buy', 'hold', 'sell']);

// Users (Supabase Auth 연동)
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  createdAt: timestamp('created_at').defaultNow(),
  bithumbApiKey: varchar('bithumb_api_key', { length: 500 }), // 암호화 저장
  bithumbSecret: varchar('bithumb_secret', { length: 500 }), // 암호화 저장
});

// Trading Configs
export const tradingConfigs = pgTable('trading_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  mode: tradingModeEnum('mode').default('simulation').notNull(),
  investmentPercentage: decimal('investment_percentage', { precision: 5, scale: 2 }).default('80').notNull(), // 1-100
  minVolumeKrw: bigint('min_volume_krw', { mode: 'number' }).default(3000000000).notNull(), // 30억
  profitTarget: decimal('profit_target', { precision: 5, scale: 2 }).default('8.00').notNull(), // 8%
  enabled: boolean('enabled').default(false).notNull(),
  indicatorWeights: jsonb('indicator_weights').default({
    rsi: 20,
    macd: 20,
    bollinger: 15,
    volume: 15,
    volatility: 10,
    sentiment: 10,
    event: 10
  }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Trading Signals
export const tradingSignals = pgTable('trading_signals', {
  id: uuid('id').primaryKey().defaultRandom(),
  symbol: varchar('symbol', { length: 20 }).notNull(), // 'BTC', 'ETH' 등
  timestamp: timestamp('timestamp').notNull(),
  score: decimal('score', { precision: 5, scale: 2 }).notNull(), // 0-100
  indicators: jsonb('indicators').notNull(), // { rsi: 45, macd: {...}, volatility: {...} }
  signalType: signalTypeEnum('signal_type').notNull(),
  confidence: decimal('confidence', { precision: 3, scale: 2 }).default('0.00').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Strategy Slots (멀티 전략 구성)
export const strategySlots = pgTable('strategy_slots', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  strategyId: varchar('strategy_id', { length: 50 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(), // trend | grid | sentiment
  baseAllocationPct: decimal('base_allocation_pct', { precision: 5, scale: 2 }).default('15.00').notNull(),
  maxAllocationPct: decimal('max_allocation_pct', { precision: 5, scale: 2 }).default('35.00').notNull(),
  cooldownMinutes: integer('cooldown_minutes').default(15).notNull(),
  enabled: boolean('enabled').default(true).notNull(),
  metadata: jsonb('metadata').default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Strategy Execution Logs
export const strategyExecutions = pgTable('strategy_executions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  symbol: varchar('symbol', { length: 20 }).notNull(),
  strategyId: varchar('strategy_id', { length: 50 }).notNull(),
  score: decimal('score', { precision: 5, scale: 2 }).notNull(),
  confidenceOk: boolean('confidence_ok').default(true).notNull(),
  exit: boolean('exit').default(false).notNull(),
  pnl: decimal('pnl', { precision: 18, scale: 2 }).default('0').notNull(),
  metadata: jsonb('metadata').default({}).notNull(),
  executedAt: timestamp('executed_at').defaultNow(),
});

// Orders
export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  symbol: varchar('symbol', { length: 20 }).notNull(),
  type: orderTypeEnum('type').notNull(),
  side: orderSideEnum('side').notNull(),
  quantity: decimal('quantity', { precision: 18, scale: 8 }).notNull(),
  price: decimal('price', { precision: 18, scale: 2 }).notNull(),
  status: orderStatusEnum('status').default('pending').notNull(),
  bithumbOrderId: varchar('bithumb_order_id', { length: 100 }),
  fee: decimal('fee', { precision: 18, scale: 2 }).default('0').notNull(),
  mode: tradingModeEnum('mode').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  filledAt: timestamp('filled_at'),
});

// Positions
export const positions = pgTable('positions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  symbol: varchar('symbol', { length: 20 }).notNull(),
  entryPrice: decimal('entry_price', { precision: 18, scale: 2 }).notNull(),
  quantity: decimal('quantity', { precision: 18, scale: 8 }).notNull(),
  currentPrice: decimal('current_price', { precision: 18, scale: 2 }).notNull(),
  profitLoss: decimal('profit_loss', { precision: 18, scale: 2 }).notNull(),
  profitLossPct: decimal('profit_loss_pct', { precision: 5, scale: 2 }).notNull(),
  status: positionStatusEnum('status').default('open').notNull(),
  mode: tradingModeEnum('mode').notNull(),
  openedAt: timestamp('opened_at').defaultNow(),
  closedAt: timestamp('closed_at'),
});

// Market Data (Candlestick - 시계열)
export const marketData = pgTable('market_data', {
  id: uuid('id').primaryKey().defaultRandom(),
  symbol: varchar('symbol', { length: 20 }).notNull(),
  interval: varchar('interval', { length: 10 }).notNull(), // '1m', '5m', '1h', '1d'
  timestamp: timestamp('timestamp').notNull(),
  open: decimal('open', { precision: 18, scale: 2 }).notNull(),
  high: decimal('high', { precision: 18, scale: 2 }).notNull(),
  low: decimal('low', { precision: 18, scale: 2 }).notNull(),
  close: decimal('close', { precision: 18, scale: 2 }).notNull(),
  volume: decimal('volume', { precision: 18, scale: 8 }).notNull(),
  volumeKrw: bigint('volume_krw', { mode: 'number' }).notNull(),
});

// Backtest Results
export const backtestResults = pgTable('backtest_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  config: jsonb('config').notNull(), // 전략 설정
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  initialBalance: decimal('initial_balance', { precision: 18, scale: 2 }).notNull(),
  finalBalance: decimal('final_balance', { precision: 18, scale: 2 }).notNull(),
  totalReturn: decimal('total_return', { precision: 5, scale: 2 }).notNull(), // %
  maxDrawdown: decimal('max_drawdown', { precision: 5, scale: 2 }).notNull(), // %
  winRate: decimal('win_rate', { precision: 5, scale: 2 }).notNull(), // %
  totalTrades: bigint('total_trades', { mode: 'number' }).notNull(),
  trades: jsonb('trades').notNull(), // 거래 상세 배열
  createdAt: timestamp('created_at').defaultNow(),
});

// Simulation Balances (시뮬레이션 모드 잔고)
export const simulationBalances = pgTable('simulation_balances', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull().unique(),
  krw: decimal('krw', { precision: 18, scale: 2 }).default('10000000').notNull(), // 1천만원
  holdings: jsonb('holdings').default({}).notNull(), // { 'BTC': { quantity: 0.1, avgPrice: 50000000 } }
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

### 3.2 인덱스 전략

```sql
-- 성능 최적화를 위한 인덱스
CREATE INDEX idx_signals_symbol_timestamp ON trading_signals(symbol, timestamp DESC);
CREATE INDEX idx_orders_user_created ON orders(user_id, created_at DESC);
CREATE INDEX idx_positions_user_status ON positions(user_id, status);
CREATE INDEX idx_market_data_symbol_interval ON market_data(symbol, interval, timestamp DESC);
CREATE INDEX idx_backtest_user_created ON backtest_results(user_id, created_at DESC);
```

---

## 4. API 설계

### 4.1 RESTful Endpoints

#### 4.1.1 Market API
```typescript
// GET /api/market/tickers
// 전체 코인 시세 (거래대금 Top 30)
Response: {
  data: [
    {
      symbol: 'BTC',
      price: 50000000,
      change24h: 5.2,
      volume24h: 1500000000000,
      volumeKrw: 75000000000000
    },
    // ...
  ]
}

// GET /api/market/ticker/:symbol
// 개별 코인 시세
Response: {
  symbol: 'BTC',
  price: 50000000,
  high24h: 51000000,
  low24h: 49000000,
  volume24h: 1500000000000,
  volumeKrw: 75000000000000
}

// GET /api/market/orderbook/:symbol
// 호가 정보
Response: {
  symbol: 'BTC',
  bids: [ { price: 49999000, quantity: 0.5 }, ... ],
  asks: [ { price: 50001000, quantity: 0.3 }, ... ]
}

// GET /api/market/candles/:symbol?interval=1m&limit=100
// 캔들 데이터
Response: {
  symbol: 'BTC',
  interval: '1m',
  candles: [
    {
      timestamp: '2024-01-01T00:00:00Z',
      open: 50000000,
      high: 50100000,
      low: 49900000,
      close: 50050000,
      volume: 10.5
    },
    // ...
  ]
}
```

#### 4.1.2 Trading API
```typescript
// POST /api/trading/start
// 자동매매 시작
Request: {
  mode: 'simulation' | 'live'
}
Response: {
  success: true,
  message: 'Trading started'
}

// POST /api/trading/stop
// 자동매매 정지
Response: {
  success: true,
  message: 'Trading stopped'
}

// POST /api/trading/order
// 수동 주문
Request: {
  symbol: 'BTC',
  side: 'buy' | 'sell',
  type: 'market' | 'limit',
  quantity: 0.1,
  price?: 50000000 // limit 주문 시
}
Response: {
  orderId: 'uuid',
  status: 'pending',
  bithumbOrderId: '12345'
}

// GET /api/trading/positions?mode=simulation
// 현재 포지션
Response: {
  positions: [
    {
      symbol: 'BTC',
      entryPrice: 49000000,
      quantity: 0.1,
      currentPrice: 50000000,
      profitLoss: 100000,
      profitLossPct: 2.04,
      openedAt: '2024-01-01T00:00:00Z'
    }
  ]
}

// GET /api/trading/orders?limit=20
// 주문 내역
Response: {
  orders: [
    {
      id: 'uuid',
      symbol: 'BTC',
      side: 'buy',
      type: 'market',
      quantity: 0.1,
      price: 50000000,
      status: 'filled',
      fee: 20000,
      createdAt: '2024-01-01T00:00:00Z'
    }
  ]
}

// GET /api/trading/balance?mode=simulation
// 잔고 조회
Response: {
  krw: 10000000,
  holdings: {
    'BTC': { quantity: 0.1, avgPrice: 50000000 }
  },
  totalAsset: 15000000
}
```

#### 4.1.3 Backtest API
```typescript
// POST /api/backtest/run
// 백테스팅 실행
Request: {
  name: 'Strategy Test 1',
  startDate: '2024-01-01',
  endDate: '2024-03-31',
  initialBalance: 10000000,
  config: {
    profitTarget: 8,
    indicatorWeights: {
      rsi: 25,
      macd: 30,
      bollinger: 20,
      volume: 25
    }
  }
}
Response: {
  backtestId: 'uuid',
  status: 'running'
}

// GET /api/backtest/results/:id
// 백테스트 결과 조회
Response: {
  id: 'uuid',
  name: 'Strategy Test 1',
  totalReturn: 15.3,
  maxDrawdown: 8.2,
  winRate: 65,
  totalTrades: 45,
  trades: [ ... ],
  createdAt: '2024-01-01T00:00:00Z'
}

// GET /api/backtest/list
// 백테스트 목록
Response: {
  results: [
    {
      id: 'uuid',
      name: 'Strategy Test 1',
      totalReturn: 15.3,
      createdAt: '2024-01-01T00:00:00Z'
    }
  ]
}
```

#### 4.1.4 Config API
```typescript
// GET /api/config
// 설정 조회
Response: {
  mode: 'simulation',
  investmentPercentage: 80,
  minVolumeKrw: 3000000000,
  profitTarget: 8,
  enabled: false,
  indicatorWeights: {
    rsi: 25,
    macd: 30,
    bollinger: 20,
    volume: 25
  }
}

// PUT /api/config
// 설정 업데이트
Request: {
  investmentPercentage: 70,
  profitTarget: 10
}
Response: {
  success: true,
  config: { ... }
}
```

### 4.2 WebSocket Events

#### 4.2.1 Client → Server
```typescript
// 시세 구독
socket.emit('subscribe_ticker', { symbols: ['BTC', 'ETH'] });

// 시그널 구독
socket.emit('subscribe_signals');

// 주문 구독
socket.emit('subscribe_orders');
```

#### 4.2.2 Server → Client
```typescript
// 실시간 시세
socket.on('ticker_update', (data) => {
  // data: { symbol: 'BTC', price: 50000000, timestamp: '...' }
});

// 새 시그널 발생
socket.on('signal_generated', (data) => {
  // data: { symbol: 'BTC', score: 75, type: 'buy', indicators: {...} }
});

// 주문 체결
socket.on('order_filled', (data) => {
  // data: { orderId: 'uuid', symbol: 'BTC', side: 'buy', price: 50000000 }
});

// 포지션 업데이트
socket.on('position_update', (data) => {
  // data: { symbol: 'BTC', profitLoss: 100000, profitLossPct: 2.04 }
});

// 자동매매 알림
socket.on('trading_alert', (data) => {
  // data: { message: 'BTC 매수 완료', type: 'success' }
});
```

---

## 5. 기술 지표 계산 로직

### 5.1 RSI (Relative Strength Index)

```typescript
/**
 * RSI 계산 (14일 기준)
 */
function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) {
    throw new Error('Not enough data for RSI calculation');
  }

  const changes = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }

  const gains = changes.map(c => c > 0 ? c : 0);
  const losses = changes.map(c => c < 0 ? -c : 0);

  // 첫 번째 평균
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  // Wilder's Smoothing
  for (let i = period; i < changes.length; i++) {
    avgGain = ((avgGain * (period - 1)) + gains[i]) / period;
    avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period;
  }

  if (avgLoss === 0) return 100;

  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

/**
 * RSI 점수화 (0-100점)
 */
function scoreRSI(rsi: number): number {
  if (rsi < 30) return 100; // 과매도 → 강한 매수
  if (rsi < 40) return 70;  // 약한 과매도
  if (rsi < 60) return 50;  // 중립
  if (rsi < 70) return 30;  // 약한 과매수
  return 0;                 // 과매수 → 강한 매도
}
```

### 5.2 MACD (Moving Average Convergence Divergence)

```typescript
/**
 * EMA 계산 (Exponential Moving Average)
 */
function calculateEMA(prices: number[], period: number): number {
  const multiplier = 2 / (period + 1);
  let ema = prices[0];

  for (let i = 1; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }

  return ema;
}

/**
 * MACD 계산
 */
interface MACD {
  macdLine: number;
  signal: number;
  histogram: number;
}

function calculateMACD(prices: number[]): MACD {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macdLine = ema12 - ema26;

  // Signal Line (MACD의 9일 EMA)
  const macdHistory = []; // 실제로는 과거 MACD 값들 필요
  const signal = calculateEMA([...macdHistory, macdLine], 9);
  const histogram = macdLine - signal;

  return { macdLine, signal, histogram };
}

/**
 * MACD 점수화
 */
function scoreMACD(macd: MACD, prevMACD: MACD): number {
  // 골든크로스 (MACD가 Signal을 상향 돌파)
  if (macd.macdLine > macd.signal && prevMACD.macdLine <= prevMACD.signal) {
    return 100;
  }

  // 데드크로스 (MACD가 Signal을 하향 돌파)
  if (macd.macdLine < macd.signal && prevMACD.macdLine >= prevMACD.signal) {
    return 0;
  }

  // 히스토그램 양수 (상승 모멘텀)
  if (macd.histogram > 0) {
    return 50 + (Math.min(macd.histogram / 1000, 1) * 30); // 최대 80점
  }

  // 히스토그램 음수 (하락 모멘텀)
  return 50 - (Math.min(Math.abs(macd.histogram) / 1000, 1) * 30); // 최소 20점
}
```

### 5.3 Bollinger Bands

```typescript
/**
 * SMA 계산 (Simple Moving Average)
 */
function calculateSMA(prices: number[], period: number): number {
  const sum = prices.slice(-period).reduce((a, b) => a + b, 0);
  return sum / period;
}

/**
 * 표준편차 계산
 */
function calculateStdDev(prices: number[], period: number): number {
  const sma = calculateSMA(prices, period);
  const squaredDiffs = prices.slice(-period).map(p => Math.pow(p - sma, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
  return Math.sqrt(variance);
}

/**
 * Bollinger Bands 계산
 */
interface BollingerBands {
  upper: number;
  middle: number;
  lower: number;
}

function calculateBollingerBands(
  prices: number[],
  period: number = 20,
  stdDevMultiplier: number = 2
): BollingerBands {
  const sma = calculateSMA(prices, period);
  const stdDev = calculateStdDev(prices, period);

  return {
    upper: sma + (stdDevMultiplier * stdDev),
    middle: sma,
    lower: sma - (stdDevMultiplier * stdDev)
  };
}

/**
 * Bollinger Bands 점수화
 */
function scoreBollinger(price: number, bands: BollingerBands): number {
  const bandWidth = bands.upper - bands.lower;
  const position = (price - bands.lower) / bandWidth;

  // 하단 밴드 근처 (0-0.2): 강한 매수
  if (position < 0.2) return 100;

  // 중하단 (0.2-0.4): 약한 매수
  if (position < 0.4) return 70;

  // 중립 (0.4-0.6)
  if (position < 0.6) return 50;

  // 중상단 (0.6-0.8): 약한 매도
  if (position < 0.8) return 30;

  // 상단 밴드 근처 (0.8-1.0): 강한 매도
  return 0;
}
```

### 5.4 거래량 분석

```typescript
/**
 * 거래량 평균 계산
 */
function calculateAvgVolume(volumes: number[], period: number = 20): number {
  const sum = volumes.slice(-period).reduce((a, b) => a + b, 0);
  return sum / period;
}

/**
 * 거래량 급증 감지 및 점수화
 */
function scoreVolume(currentVolume: number, avgVolume: number): number {
  const ratio = currentVolume / avgVolume;

  if (ratio >= 3) return 100;   // 3배 이상 급증
  if (ratio >= 2) return 80;    // 2배 이상 급증
  if (ratio >= 1.5) return 60;  // 1.5배 증가
  if (ratio >= 1.2) return 50;  // 1.2배 증가
  if (ratio >= 1) return 40;    // 평균 수준
  return 20;                    // 평균 이하
}
```

### 5.5 종합 점수 계산

```typescript
interface IndicatorScores {
  rsi: number;
  macd: number;
  bollinger: number;
  volume: number;
  volatility: number;
  sentiment: number;
  event: number;
}

interface Weights {
  rsi: number;
  macd: number;
  bollinger: number;
  volume: number;
  volatility: number;
  sentiment: number;
  event: number;
}

/**
 * 가중 평균 종합 점수 계산
 */
function calculateTotalScore(
  scores: IndicatorScores,
  weights: Weights = {
    rsi: 20,
    macd: 20,
    bollinger: 15,
    volume: 15,
    volatility: 10,
    sentiment: 10,
    event: 10
  }
): number {
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);

  const weightedSum =
    (scores.rsi * weights.rsi) +
    (scores.macd * weights.macd) +
    (scores.bollinger * weights.bollinger) +
    (scores.volume * weights.volume) +
    (scores.volatility * weights.volatility) +
    (scores.sentiment * weights.sentiment) +
    (scores.event * weights.event);

  return weightedSum / totalWeight;
}

/**
 * 시그널 타입 결정
 */
function determineSignal(score: number): 'buy' | 'hold' | 'sell' {
  if (score >= 70) return 'buy';
  if (score <= 30) return 'sell';
  return 'hold';
}

/**
 * 전체 지표 분석 파이프라인
 */
async function analyzeMarket(symbol: string): Promise<{
  score: number;
  signal: 'buy' | 'hold' | 'sell';
  indicators: IndicatorScores;
  metadata: {
    volatility: VolatilitySnapshot;
    sentiment: SentimentSnapshot;
    events: EventSignal[];
  };
}> {
  // 1. 가격 데이터 가져오기
  const prices = await fetchPrices(symbol, 120); // 120개 캔들
  const volumes = await fetchVolumes(symbol, 20);
  const orderBook = await fetchOrderBook(symbol);

  // 2. 지표 계산
  const rsi = calculateRSI(prices);
  const macd = calculateMACD(prices);
  const prevMACD = calculateMACD(prices.slice(0, -1));
  const bollinger = calculateBollingerBands(prices);
  const currentPrice = prices[prices.length - 1];
  const avgVolume = calculateAvgVolume(volumes);
  const volatilitySnapshot = calculateVolatilityMetrics({ prices, volumes, orderBook });
  const sentimentSnapshot = await fetchSentimentScores(symbol);
  const eventSignals = await fetchEventSignals(symbol);

  // 3. 점수화
  const scores: IndicatorScores = {
    rsi: scoreRSI(rsi),
    macd: scoreMACD(macd, prevMACD),
    bollinger: scoreBollinger(currentPrice, bollinger),
    volume: scoreVolume(volumes[volumes.length - 1], avgVolume),
    volatility: scoreVolatility(volatilitySnapshot),
    sentiment: scoreSentiment(sentimentSnapshot),
    event: scoreEvent(eventSignals)
  };

  // 4. 종합 점수 및 시그널
  const totalScore = calculateTotalScore(scores);
  const signal = determineSignal(totalScore);

  return {
    score: totalScore,
    signal,
    indicators: scores,
    metadata: {
      volatility: volatilitySnapshot,
      sentiment: sentimentSnapshot,
      events: eventSignals
    }
  };
}
```

### 5.6 변동성 계층 계산

```typescript
interface OrderBookSnapshot {
  bids: Array<{ price: number; quantity: number }>;
  asks: Array<{ price: number; quantity: number }>;
}

interface VolatilitySnapshot {
  atr: number;               // Average True Range
  rangeRatio: number;        // 24시간 고저 대비 현재 위치 (0 ~ 1)
  orderBookImbalance: number;// 매수/매도 호가 비율 (0 ~ 1, 0.5 중립)
  volumeSpike: number;       // 거래량 급증 배율
}

function calculateVolatilityMetrics(params: {
  prices: number[];
  volumes: number[];
  orderBook: OrderBookSnapshot;
}): VolatilitySnapshot {
  const atr = calculateATR(params.prices, 14);
  const recentHigh = Math.max(...params.prices.slice(-24));
  const recentLow = Math.min(...params.prices.slice(-24));
  const current = params.prices[params.prices.length - 1];
  const rangeRatio = (current - recentLow) / Math.max(recentHigh - recentLow, 1e-8);
  const orderBookImbalance = computeOrderBookImbalance(params.orderBook);
  const avgVolume = calculateAvgVolume(params.volumes.slice(-24));
  const volumeSpike = params.volumes[params.volumes.length - 1] / Math.max(avgVolume, 1e-8);

  return { atr, rangeRatio, orderBookImbalance, volumeSpike };
}

function computeOrderBookImbalance(orderBook: OrderBookSnapshot): number {
  const bidVolume = orderBook.bids.reduce((acc, bid) => acc + bid.quantity, 0);
  const askVolume = orderBook.asks.reduce((acc, ask) => acc + ask.quantity, 0);
  const total = Math.max(bidVolume + askVolume, 1e-8);
  return bidVolume / total; // 0 → 매도 우위, 1 → 매수 우위
}

function scoreVolatility(snapshot: VolatilitySnapshot): number {
  let score = 50;
  if (snapshot.atr >= 0.015) score += 10;
  if (snapshot.rangeRatio >= 0.8) score += 10;
  if (snapshot.orderBookImbalance >= 0.6) score += 10;
  if (snapshot.volumeSpike >= 2) score += 10;
  if (snapshot.orderBookImbalance <= 0.4) score -= 10;
  if (snapshot.rangeRatio <= 0.2) score -= 10;
  return Math.max(0, Math.min(score, 100));
}
```

### 5.7 감성 계층 계산

```typescript
interface SentimentSnapshot {
  aggregateScore: number; // -1 (부정) ~ 1 (긍정)
  confidence: number;     // 0 ~ 1
  sources: Array<{
    source: 'news' | 'community' | 'social';
    score: number;
    confidence: number;
  }>;
}

async function fetchSentimentScores(symbol: string): Promise<SentimentSnapshot> {
  return sentimentService.getAggregate(symbol, {
    language: 'ko',
    windowMinutes: 60,
    minConfidence: 0.3,
  });
}

function scoreSentiment(snapshot: SentimentSnapshot): number {
  if (snapshot.confidence < 0.5) return 40; // 확신도 낮으면 보수적
  const normalized = (snapshot.aggregateScore + 1) / 2; // 0 ~ 1
  return Math.round(normalized * 100);
}
```

### 5.8 이벤트 계층 계산

```typescript
interface EventSignal {
  id: string;
  type: 'macro' | 'exchange' | 'listing' | 'regulation';
  severity: 'low' | 'medium' | 'high';
  impact: 'bullish' | 'bearish' | 'neutral';
  confidence: number; // 0 ~ 1
  scheduledAt?: Date;
  detectedAt: Date;
}

async function fetchEventSignals(symbol: string): Promise<EventSignal[]> {
  return eventService.getSignals({ symbol, includeGlobal: true, windowHours: 24 });
}

function scoreEvent(events: EventSignal[]): number {
  if (events.length === 0) return 60; // 이벤트 없음 = 중립

  const weighted = events.reduce((acc, event) => {
    const severityWeight = event.severity === 'high' ? 1 : event.severity === 'medium' ? 0.6 : 0.3;
    const direction = event.impact === 'bullish' ? 1 : event.impact === 'bearish' ? -1 : 0;
    return acc + direction * severityWeight * event.confidence;
  }, 0);

  const normalized = (weighted + 1) / 2; // -1 ~ 1 → 0 ~ 1
  return Math.round(Math.max(0, Math.min(normalized, 1)) * 100);
}
```

### 5.9 데이터 확신도 게이트

```typescript
function computeConfidenceGate(sentiment: SentimentSnapshot, events: EventSignal[]): boolean {
  const sentimentOk = sentiment.confidence >= 0.5;
  const hasCriticalBearish = events.some(
    event => event.impact === 'bearish' && event.severity === 'high' && event.confidence >= 0.7
  );
  return sentimentOk && !hasCriticalBearish;
}

function shouldExecuteTrade(score: number, confidenceOk: boolean): boolean {
  if (!confidenceOk) return false;
  return score >= 70;
}
```

### 6.3 Strategy Portfolio Manager

```typescript
interface StrategySlot {
  strategyId: string;
  type: 'trend' | 'grid' | 'sentiment';
  baseAllocationPct: number;
  maxAllocationPct: number;
  cooldownMinutes: number;
  performance: {
    monthlyReturn: number;
    maxDrawdown: number;
    sharpe: number;
    lastUpdated: Date;
  };
  enabled: boolean;
}

interface StrategyRecommendation {
  strategyId: string;
  confidence: number;
  rationale: string;
}

interface StrategyCandidate {
  symbol: string;
  price: number;
  analysis: {
    score: number;
    signal: 'buy' | 'hold' | 'sell';
    metadata: {
      volatility: VolatilitySnapshot;
      sentiment: SentimentSnapshot;
      events: EventSignal[];
    };
  };
  confidenceOk: boolean;
  shouldTrade: boolean;
  recommended: StrategyRecommendation;
}

class StrategyPortfolioManager {
  private slots: StrategySlot[];

  constructor(slots: StrategySlot[]) {
    this.slots = slots;
  }

  recommendStrategy(params: {
    symbol: string;
    analysis: StrategyCandidate['analysis'];
    confidenceOk: boolean;
    volatility: VolatilitySnapshot;
  }): StrategyRecommendation {
    const { analysis, volatility, confidenceOk } = params;

    if (!confidenceOk) {
      return { strategyId: 'sentiment-watch', confidence: 0.3, rationale: '확신도 부족' };
    }

    if (volatility.atr > 0.02 && volatility.rangeRatio > 0.7) {
      return { strategyId: 'trend-momentum', confidence: 0.8, rationale: '강한 추세 지속' };
    }

    if (volatility.orderBookImbalance >= 0.45 && volatility.orderBookImbalance <= 0.55) {
      return { strategyId: 'grid-balance', confidence: 0.7, rationale: '횡보 구간 감지' };
    }

    if (analysis.metadata.sentiment.aggregateScore > 0.3) {
      return { strategyId: 'sentiment-momentum', confidence: 0.75, rationale: '긍정 감성 우세' };
    }

    return { strategyId: 'base-trend', confidence: 0.6, rationale: '기본 추세 전략' };
  }

  rankCandidates(candidates: StrategyCandidate[]): StrategyCandidate[] {
    return candidates
      .filter(c => c.analysis.signal === 'buy')
      .sort((a, b) => {
        const scoreDiff = b.analysis.score - a.analysis.score;
        if (scoreDiff !== 0) return scoreDiff;
        return (b.recommended.confidence || 0) - (a.recommended.confidence || 0);
      });
  }

  allocateCapital(params: {
    balance: { krw: number };
    defaultPercentage: number;
    strategy: string;
    score: number;
    volatility: VolatilitySnapshot;
  }): number {
    const slot = this.slots.find(s => s.strategyId === params.strategy);
    const basePct = slot?.baseAllocationPct ?? params.defaultPercentage;
    const scoreBoost = (params.score - 70) * 0.2; // 점수 5마다 1% 가산
    const volatilityClamp = Math.max(0.5, 1 - params.volatility.atr * 10);
    const rawPct = basePct + scoreBoost;
    const cappedPct = Math.min(slot?.maxAllocationPct ?? 30, Math.max(rawPct, 0));
    const finalPct = cappedPct * volatilityClamp;
    return params.balance.krw * (finalPct / 100);
  }

  recordExecution(params: {
    symbol: string;
    strategy: string;
    score: number;
    confidenceOk: boolean;
    exit?: boolean;
    pnl?: number;
  }) {
    db.insert(strategyExecutions).values({
      symbol: params.symbol,
      strategyId: params.strategy,
      score: params.score,
      confidenceOk: params.confidenceOk,
      exit: params.exit ?? false,
      pnl: params.pnl ?? 0,
      executedAt: new Date()
    });
  }
}
```

### 6.4 AI Strategy Copilot

```typescript
class StrategyCopilot {
  constructor(private llmClient: LlmClient) {}

  async generatePlaybook(context: {
    userGoals: { targetReturn: number; maxDrawdown: number };
    marketSnapshot: any;
  }): Promise<string> {
    const prompt = buildStrategyPrompt(context);
    return this.llmClient.complete({
      model: 'gpt-5-strategy',
      temperature: 0.2,
      messages: [
        { role: 'system', content: STRATEGY_SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ]
    });
  }

  logDecision(event: {
    symbol: string;
    strategy: string;
    score: number;
    confidence: number;
    metadata: {
      volatility: VolatilitySnapshot;
      sentiment: SentimentSnapshot;
      events: EventSignal[];
    };
  }) {
    analytics.track('ai_decision', {
      ...event,
      timestamp: Date.now()
    });
  }

  logOutcome(event: {
    symbol: string;
    action: 'exit' | 'hold';
    score: number;
    profitPct: number;
    confidenceOk: boolean;
  }) {
    analytics.track('ai_outcome', {
      ...event,
      timestamp: Date.now()
    });
  }
}
```

---

## 6. Trading Engine 구현

### 6.1 Core Engine 구조

```typescript
import { EventEmitter } from 'events';

class TradingEngine extends EventEmitter {
  private isRunning: boolean = false;
  private currentPosition: Position | null = null;
  private config: TradingConfig;
  private marketDataService: MarketDataService;
  private signalGenerator: SignalGenerator;
  private orderExecutor: OrderExecutor;
  private riskManager: RiskManager;
  private strategyPortfolio: StrategyPortfolioManager;
  private aiCopilot: StrategyCopilot;

  constructor(
    config: TradingConfig,
    marketDataService: MarketDataService,
    signalGenerator: SignalGenerator,
    orderExecutor: OrderExecutor,
    riskManager: RiskManager,
    strategyPortfolio: StrategyPortfolioManager,
    aiCopilot: StrategyCopilot
  ) {
    super();
    this.config = config;
    this.marketDataService = marketDataService;
    this.signalGenerator = signalGenerator;
    this.orderExecutor = orderExecutor;
    this.riskManager = riskManager;
    this.strategyPortfolio = strategyPortfolio;
    this.aiCopilot = aiCopilot;
  }

  async start() {
    this.isRunning = true;
    this.emit('started');

    // WebSocket 구독
    await this.marketDataService.subscribeAll();

    // 메인 루프 (5초마다)
    const interval = setInterval(async () => {
      if (!this.isRunning) {
        clearInterval(interval);
        return;
      }

      try {
        await this.mainLoop();
      } catch (error) {
        console.error('Trading loop error:', error);
        this.emit('error', error);
      }
    }, 5000);
  }

  async stop() {
    this.isRunning = false;
    await this.marketDataService.unsubscribeAll();
    this.emit('stopped');
  }

  private async mainLoop() {
    // 1. 시장 데이터 수집 (거래대금 Top 30)
    const tickers = await this.marketDataService.getTopVolumeCoins(30);
    const filtered = tickers.filter(t => t.volumeKrw >= this.config.minVolumeKrw);

    // 2. 현재 포지션 확인
    this.currentPosition = await this.getOpenPosition();

    if (this.currentPosition) {
      // 3-1. 포지션 있음 → 관리
      await this.managePosition(this.currentPosition);
    } else {
      // 3-2. 포지션 없음 → 신규 매수 검토
      await this.findBuyOpportunity(filtered);
    }
  }

  /**
   * 포지션 관리 (익절/손절 판단)
   */
  private async managePosition(position: Position) {
    const currentPrice = await this.marketDataService.getCurrentPrice(position.symbol);
    const profitPct = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;

    // 익절 조건 체크
    if (profitPct >= this.config.profitTarget) {
      await this.executeOrder({
        symbol: position.symbol,
        side: 'sell',
        type: 'market',
        quantity: position.quantity,
        reason: `익절 ${profitPct.toFixed(2)}%`
      });
      this.emit('position_closed', { symbol: position.symbol, profit: profitPct });
      return;
    }

    // 보유 판단 (시그널 점수 체크)
    const analysis = await this.signalGenerator.analyze(position.symbol);
    const confidenceOk = computeConfidenceGate(
      analysis.metadata.sentiment,
      analysis.metadata.events
    );

    // 강한 매도 시그널 또는 확신도 하락 → 손절
    if ((analysis.signal === 'sell' && analysis.score < 30) || !confidenceOk) {
      await this.executeOrder({
        symbol: position.symbol,
        side: 'sell',
        type: 'market',
        quantity: position.quantity,
        reason: `손절 (시그널 점수: ${analysis.score})`
      });
      this.emit('position_closed', { symbol: position.symbol, profit: profitPct });
      if (!confidenceOk) {
        this.emit('confidence_exit', {
          symbol: position.symbol,
          sentimentConfidence: analysis.metadata.sentiment.confidence
        });
      }
      this.strategyPortfolio.recordExecution({
        symbol: position.symbol,
        strategy: 'active-position',
        score: analysis.score,
        confidenceOk,
        exit: true,
        pnl: profitPct,
      });
      this.aiCopilot.logOutcome({
        symbol: position.symbol,
        action: 'exit',
        score: analysis.score,
        profitPct,
        confidenceOk,
      });
    }

    // 그 외에는 보유
  }

  /**
   * 신규 매수 기회 탐색
   */
  private async findBuyOpportunity(tickers: Ticker[]) {
    // 각 코인 분석
    const analyses = await Promise.all(
      tickers.map(async (ticker) => ({
        symbol: ticker.symbol,
        price: ticker.price,
        analysis: await this.signalGenerator.analyze(ticker.symbol)
      }))
    );

    const candidates = analyses.map(item => {
      const confidenceOk = computeConfidenceGate(
        item.analysis.metadata.sentiment,
        item.analysis.metadata.events
      );
      const shouldTrade = shouldExecuteTrade(item.analysis.score, confidenceOk);
      const recommended = this.strategyPortfolio.recommendStrategy({
        symbol: item.symbol,
        analysis: item.analysis,
        confidenceOk,
        volatility: item.analysis.metadata.volatility,
      });
      return {
        ...item,
        confidenceOk,
        shouldTrade,
        recommended,
      };
    });

    const ranked = this.strategyPortfolio.rankCandidates(candidates);
    const best = ranked.find(candidate => candidate.shouldTrade && candidate.confidenceOk);

    if (!best) {
      this.emit('confidence_skip', { reason: '적합한 전략 없음' });
      return;
    }

    // 리스크 체크 및 자본 배분
    const balance = await this.getBalance();
    const investAmount = this.strategyPortfolio.allocateCapital({
      balance,
      defaultPercentage: this.config.investmentPercentage,
      strategy: best.recommended.strategyId,
      score: best.analysis.score,
      volatility: best.analysis.metadata.volatility,
    });

    if (!this.riskManager.canTrade(investAmount)) {
      this.emit('risk_limit', '일일 손실 한도 초과');
      return;
    }

    if (!best.shouldTrade) {
      this.emit('confidence_skip', {
        symbol: best.symbol,
        reason: '점수/확신도 기준 미충족'
      });
      return;
    }

    // 매수 주문 실행
    const quantity = investAmount / best.price;
    await this.executeOrder({
      symbol: best.symbol,
      side: 'buy',
      type: 'market',
      quantity,
      reason: `전략 ${best.recommended.strategyId} / 점수 ${best.analysis.score}`
    });

    this.strategyPortfolio.recordExecution({
      symbol: best.symbol,
      strategy: best.recommended.strategyId,
      score: best.analysis.score,
      confidenceOk: best.confidenceOk,
    });

    this.aiCopilot.logDecision({
      symbol: best.symbol,
      strategy: best.recommended.strategyId,
      score: best.analysis.score,
      confidence: best.confidenceOk ? best.analysis.metadata.sentiment.confidence : 0,
      metadata: best.analysis.metadata,
    });

    this.emit('position_opened', {
      symbol: best.symbol,
      score: best.analysis.score,
      strategy: best.recommended.strategyId,
    });
  }

  /**
   * 주문 실행
   */
  private async executeOrder(params: {
    symbol: string;
    side: 'buy' | 'sell';
    type: 'market' | 'limit';
    quantity: number;
    price?: number;
    reason?: string;
  }) {
    const order = await this.orderExecutor.execute({
      ...params,
      mode: this.config.mode
    });

    this.emit('order_filled', order);

    // 포지션 업데이트
    if (params.side === 'buy') {
      this.currentPosition = await this.openPosition(order);
    } else {
      await this.closePosition(order);
      this.currentPosition = null;
    }
  }

  private async getOpenPosition(): Promise<Position | null> {
    // DB에서 open 상태 포지션 조회
    return null; // 구현 생략
  }

  private async getBalance(): Promise<{ krw: number }> {
    // 시뮬레이션/실전 모드에 따라 잔고 조회
    return { krw: 10000000 }; // 구현 생략
  }

  private async openPosition(order: Order): Promise<Position> {
    // 포지션 생성 및 DB 저장
    return {} as Position; // 구현 생략
  }

  private async closePosition(order: Order) {
    // 포지션 종료 및 DB 업데이트
  }
}
```

### 6.2 Order Executor

```typescript
class OrderExecutor {
  private bithumbClient: BithumbClient;

  async execute(params: {
    symbol: string;
    side: 'buy' | 'sell';
    type: 'market' | 'limit';
    quantity: number;
    price?: number;
    mode: 'live' | 'simulation';
  }): Promise<Order> {
    if (params.mode === 'simulation') {
      return this.executeSimulation(params);
    } else {
      return this.executeLive(params);
    }
  }

  /**
   * 실전 주문
   */
  private async executeLive(params: any): Promise<Order> {
    try {
      const bithumbOrder = await this.bithumbClient.placeOrder({
        order_currency: params.symbol,
        payment_currency: 'KRW',
        units: params.quantity,
        price: params.price,
        type: params.side === 'buy' ? 'bid' : 'ask'
      });

      // DB에 저장
      const order = await db.insert(orders).values({
        userId: params.userId,
        symbol: params.symbol,
        type: params.type,
        side: params.side,
        quantity: params.quantity,
        price: bithumbOrder.price,
        status: 'filled',
        bithumbOrderId: bithumbOrder.order_id,
        fee: bithumbOrder.fee,
        mode: 'live'
      });

      return order;
    } catch (error) {
      console.error('Live order failed:', error);
      throw error;
    }
  }

  /**
   * 시뮬레이션 주문
   */
  private async executeSimulation(params: any): Promise<Order> {
    const currentPrice = await this.getCurrentPrice(params.symbol);
    const fee = (currentPrice * params.quantity) * 0.0004; // 0.04%

    // 가상 주문 생성
    const order = await db.insert(orders).values({
      userId: params.userId,
      symbol: params.symbol,
      type: params.type,
      side: params.side,
      quantity: params.quantity,
      price: currentPrice,
      status: 'filled',
      fee,
      mode: 'simulation'
    });

    // 시뮬레이션 잔고 업데이트
    await this.updateSimulationBalance(params.userId, params.side, params.symbol, params.quantity, currentPrice, fee);

    return order;
  }

  private async getCurrentPrice(symbol: string): Promise<number> {
    // Redis 캐시 또는 빗썸 API에서 현재가 조회
    return 50000000; // 구현 생략
  }

  private async updateSimulationBalance(
    userId: string,
    side: 'buy' | 'sell',
    symbol: string,
    quantity: number,
    price: number,
    fee: number
  ) {
    const balance = await db.query.simulationBalances.findFirst({
      where: eq(simulationBalances.userId, userId)
    });

    if (side === 'buy') {
      balance.krw -= (price * quantity + fee);
      balance.holdings[symbol] = {
        quantity: (balance.holdings[symbol]?.quantity || 0) + quantity,
        avgPrice: price
      };
    } else {
      balance.krw += (price * quantity - fee);
      delete balance.holdings[symbol];
    }

    await db.update(simulationBalances)
      .set(balance)
      .where(eq(simulationBalances.userId, userId));
  }
}
```

---

## 7. 백테스팅 시스템

```typescript
class BacktestEngine {
  private signalGenerator: SignalGenerator;

  async run(config: BacktestConfig): Promise<BacktestResult> {
    // 1. 과거 데이터 로드
    const candles = await this.loadHistoricalData(
      config.symbol || 'BTC', // 특정 코인 또는 전체
      config.startDate,
      config.endDate,
      config.interval || '5m'
    );

    let balance = config.initialBalance;
    let position: Position | null = null;
    const trades: Trade[] = [];
    let maxBalance = balance;
    let maxDrawdown = 0;

    // 2. 시뮬레이션 루프
    for (let i = 0; i < candles.length; i++) {
      const candle = candles[i];

      // 지표 계산 (현재까지의 데이터로)
      const historicalPrices = candles.slice(0, i + 1).map(c => c.close);
      const analysis = await this.signalGenerator.analyzeHistorical(
        historicalPrices,
        candles.slice(0, i + 1).map(c => c.volume)
      );

      if (!position && analysis.signal === 'buy' && analysis.score >= 70) {
        // 매수
        const investAmount = balance * (config.investmentPercentage / 100);
        const quantity = investAmount / candle.close;
        const fee = investAmount * 0.0004;

        position = {
          symbol: 'BTC',
          entryPrice: candle.close,
          quantity,
          entryTime: candle.timestamp
        };

        balance -= (investAmount + fee);
      } else if (position) {
        // 포지션 관리
        const profitPct = ((candle.close - position.entryPrice) / position.entryPrice) * 100;

        const shouldSell =
          profitPct >= config.profitTarget || // 익절
          (analysis.signal === 'sell' && analysis.score < 30); // 손절

        if (shouldSell) {
          const sellAmount = position.quantity * candle.close;
          const fee = sellAmount * 0.0004;
          balance += (sellAmount - fee);

          trades.push({
            symbol: 'BTC',
            entryPrice: position.entryPrice,
            exitPrice: candle.close,
            quantity: position.quantity,
            profit: sellAmount - (position.entryPrice * position.quantity),
            profitPct,
            entryTime: position.entryTime,
            exitTime: candle.timestamp
          });

          position = null;
        }
      }

      // MDD 계산
      if (balance > maxBalance) {
        maxBalance = balance;
      }
      const drawdown = ((maxBalance - balance) / maxBalance) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    // 3. 성과 메트릭 계산
    const totalReturn = ((balance - config.initialBalance) / config.initialBalance) * 100;
    const winningTrades = trades.filter(t => t.profit > 0);
    const winRate = (winningTrades.length / trades.length) * 100;

    return {
      initialBalance: config.initialBalance,
      finalBalance: balance,
      totalReturn,
      maxDrawdown,
      winRate,
      totalTrades: trades.length,
      trades
    };
  }

  private async loadHistoricalData(
    symbol: string,
    startDate: Date,
    endDate: Date,
    interval: string
  ): Promise<Candle[]> {
    // DB 또는 빗썸 API에서 과거 데이터 로드
    return []; // 구현 생략
  }
}
```

---

## 8. 보안 고려사항

### 8.1 API 키 관리

```typescript
import { createClient } from '@supabase/supabase-js';

// Supabase Vault를 사용한 암호화 저장
async function saveApiKey(userId: string, apiKey: string, secret: string) {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

  // Vault에 암호화 저장
  await supabase.rpc('vault_encrypt', {
    name: `bithumb_api_key_${userId}`,
    value: apiKey
  });

  await supabase.rpc('vault_encrypt', {
    name: `bithumb_secret_${userId}`,
    value: secret
  });
}

// 복호화하여 사용
async function getApiKey(userId: string) {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

  const { data: apiKey } = await supabase.rpc('vault_decrypt', {
    name: `bithumb_api_key_${userId}`
  });

  const { data: secret } = await supabase.rpc('vault_decrypt', {
    name: `bithumb_secret_${userId}`
  });

  return { apiKey, secret };
}
```

### 8.2 Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

// API Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 1000, // 1초
  max: 10, // 최대 10회
  message: 'Too many requests'
});

app.use('/api/market', apiLimiter);

// 빗썸 API Rate Limit 관리
class BithumbRateLimiter {
  private queue: Array<() => Promise<any>> = [];
  private isProcessing = false;

  async throttle<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift()!;
      await task();
      await this.delay(100); // 100ms 대기 (초당 10회 제한)
    }

    this.isProcessing = false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 8.3 주문 검증

```typescript
class OrderValidator {
  async validate(order: OrderRequest): Promise<void> {
    // 1. 최소/최대 주문 금액 체크
    if (order.quantity * order.price < 500) {
      throw new Error('주문 금액이 최소 금액(500원) 미만입니다');
    }

    // 2. 잔고 부족 검증
    const balance = await this.getBalance(order.userId, order.mode);
    const requiredAmount = order.quantity * order.price * 1.0004; // 수수료 포함

    if (balance.krw < requiredAmount) {
      throw new Error('잔고가 부족합니다');
    }

    // 3. 중복 주문 방지
    const recentOrders = await this.getRecentOrders(order.userId, 10); // 10초 이내
    const duplicates = recentOrders.filter(
      o => o.symbol === order.symbol && o.side === order.side
    );

    if (duplicates.length > 0) {
      throw new Error('중복 주문입니다. 잠시 후 다시 시도해주세요');
    }

    // 4. 시장가 주문 슬리피지 체크
    if (order.type === 'market') {
      const currentPrice = await this.getCurrentPrice(order.symbol);
      const slippage = Math.abs((order.price - currentPrice) / currentPrice) * 100;

      if (slippage > 0.5) { // 0.5% 이상 차이
        throw new Error(`슬리피지가 너무 큽니다 (${slippage.toFixed(2)}%)`);
      }
    }
  }
}
```

### 8.4 Circuit Breaker

```typescript
class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime: number = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      // 일정 시간 후 재시도
      if (Date.now() - this.lastFailureTime > 60000) { // 1분
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    this.state = 'closed';
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= 5) { // 5회 실패 시
      this.state = 'open';
    }
  }
}
```

---

## 9. 모니터링 & 로깅

### 9.1 Loki + Grafana 설정

```yaml
# docker-compose.yml
version: '3.8'

services:
  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"
    volumes:
      - ./loki-config.yaml:/etc/loki/local-config.yaml

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-storage:/var/lib/grafana

volumes:
  grafana-storage:
```

### 9.2 구조화된 로깅

```typescript
import winston from 'winston';
import LokiTransport from 'winston-loki';

const logger = winston.createLogger({
  transports: [
    new LokiTransport({
      host: 'http://localhost:3100',
      labels: { app: 'bithumb-trading-bot' },
      json: true,
      format: winston.format.json(),
      replaceTimestamp: true,
      onConnectionError: (err) => console.error(err)
    }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// 사용 예시
logger.info('Order executed', {
  userId: 'uuid',
  symbol: 'BTC',
  side: 'buy',
  quantity: 0.1,
  price: 50000000
});

logger.error('Order failed', {
  userId: 'uuid',
  symbol: 'BTC',
  error: error.message
});
```

---

## 10. 배포 전략

### 10.1 환경 설정

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xhzqhvjkkfpeavdphoit.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

UPSTASH_REDIS_URL=redis://...
UPSTASH_REDIS_TOKEN=...

BITHUMB_API_KEY=your_api_key
BITHUMB_SECRET=your_secret

LOKI_URL=http://localhost:3100
SENTRY_DSN=https://...
```

### 10.2 Vercel 배포 (Frontend)

```json
// vercel.json
{
  "buildCommand": "npm run build",
  "framework": "nextjs",
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase-url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase-anon-key"
  }
}
```

### 10.3 Railway 배포 (WebSocket Server)

```yaml
# railway.yml
build:
  builder: DOCKERFILE
  dockerfilePath: Dockerfile.websocket

deploy:
  startCommand: node dist/websocket-server.js
  healthcheckPath: /health
  restartPolicyType: ON_FAILURE
```

---

이상으로 Bithumb Auto Trading Bot의 저수준 설계 문서(LLD)를 완료했습니다. 이 문서는 실제 구현 시 참조할 기술 스펙과 코드 예시를 포함합니다.
