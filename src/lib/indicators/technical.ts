/**
 * RSI (Relative Strength Index) 계산
 */
export function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) {
    throw new Error('Not enough data for RSI calculation');
  }

  const changes: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }

  const gains = changes.map(c => (c > 0 ? c : 0));
  const losses = changes.map(c => (c < 0 ? -c : 0));

  // 첫 번째 평균
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  // Wilder's Smoothing
  for (let i = period; i < changes.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
  }

  if (avgLoss === 0) return 100;

  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/**
 * RSI 점수화 (0-100점)
 */
export function scoreRSI(rsi: number): number {
  if (rsi < 30) return 100; // 과매도 → 강한 매수
  if (rsi < 40) return 70; // 약한 과매도
  if (rsi < 60) return 50; // 중립
  if (rsi < 70) return 30; // 약한 과매수
  return 0; // 과매수 → 강한 매도
}

/**
 * EMA (Exponential Moving Average) 계산
 */
export function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) {
    throw new Error('Not enough data for EMA calculation');
  }

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
export interface MACD {
  macdLine: number;
  signal: number;
  histogram: number;
}

export function calculateMACD(prices: number[]): MACD {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macdLine = ema12 - ema26;

  // Signal Line (MACD의 9일 EMA)
  const macdHistory = [macdLine]; // 실제로는 과거 MACD 값들도 포함해야 함
  const signal = calculateEMA(macdHistory, 9);
  const histogram = macdLine - signal;

  return { macdLine, signal, histogram };
}

/**
 * MACD 점수화
 */
export function scoreMACD(macd: MACD, prevMACD: MACD): number {
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
    return 50 + Math.min(macd.histogram / 1000, 1) * 30; // 최대 80점
  }

  // 히스토그램 음수 (하락 모멘텀)
  return 50 - Math.min(Math.abs(macd.histogram) / 1000, 1) * 30; // 최소 20점
}

/**
 * SMA (Simple Moving Average) 계산
 */
export function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) {
    throw new Error('Not enough data for SMA calculation');
  }

  const sum = prices.slice(-period).reduce((a, b) => a + b, 0);
  return sum / period;
}

/**
 * 표준편차 계산
 */
export function calculateStdDev(prices: number[], period: number): number {
  const sma = calculateSMA(prices, period);
  const squaredDiffs = prices.slice(-period).map(p => Math.pow(p - sma, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
  return Math.sqrt(variance);
}

/**
 * Bollinger Bands 계산
 */
export interface BollingerBands {
  upper: number;
  middle: number;
  lower: number;
}

export function calculateBollingerBands(
  prices: number[],
  period: number = 20,
  stdDevMultiplier: number = 2
): BollingerBands {
  const sma = calculateSMA(prices, period);
  const stdDev = calculateStdDev(prices, period);

  return {
    upper: sma + stdDevMultiplier * stdDev,
    middle: sma,
    lower: sma - stdDevMultiplier * stdDev,
  };
}

/**
 * Bollinger Bands 점수화
 */
export function scoreBollinger(price: number, bands: BollingerBands): number {
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

/**
 * 거래량 평균 계산
 */
export function calculateAvgVolume(volumes: number[], period: number = 20): number {
  if (volumes.length < period) {
    throw new Error('Not enough data for average volume calculation');
  }

  const sum = volumes.slice(-period).reduce((a, b) => a + b, 0);
  return sum / period;
}

/**
 * 거래량 급증 감지 및 점수화
 */
export function scoreVolume(currentVolume: number, avgVolume: number): number {
  const ratio = currentVolume / avgVolume;

  if (ratio >= 3) return 100; // 3배 이상 급증
  if (ratio >= 2) return 80; // 2배 이상 급증
  if (ratio >= 1.5) return 60; // 1.5배 증가
  if (ratio >= 1.2) return 50; // 1.2배 증가
  if (ratio >= 1) return 40; // 평균 수준
  return 20; // 평균 이하
}

/**
 * ATR (Average True Range) 계산
 */
export function calculateATR(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) {
    throw new Error('Not enough data for ATR calculation');
  }

  const trueRanges: number[] = [];

  for (let i = 1; i < prices.length; i++) {
    const high = Math.max(prices[i], prices[i - 1]);
    const low = Math.min(prices[i], prices[i - 1]);
    const tr = high - low;
    trueRanges.push(tr);
  }

  return calculateSMA(trueRanges, period);
}
