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
