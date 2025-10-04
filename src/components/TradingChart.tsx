'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData } from 'lightweight-charts';
import { bithumbClient } from '@/lib/bithumb/client';

interface TradingChartProps {
  symbol: string;
  interval?: '1m' | '5m' | '15m' | '1h';
}

export function TradingChart({ symbol, interval: initialInterval = '5m' }: TradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [interval, setInterval] = useState<'1m' | '5m' | '15m' | '1h'>(initialInterval);

  // 차트 초기화 (한 번만 실행)
  useEffect(() => {
    if (!chartContainerRef.current) return;
    if (chartRef.current) return; // 이미 생성되었으면 스킵

    console.log('🎨 Creating chart instance (once)');

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 400,
      layout: {
        background: { color: '#0f172a' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: '#1e293b' },
        horzLines: { color: '#1e293b' },
      },
      timeScale: {
        borderColor: '#334155',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 5,
      },
      rightPriceScale: {
        borderColor: '#334155',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      crosshair: {
        mode: 0, // Normal (0 = 빠름)
      },
      // 성능 최적화 옵션
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });

    chartRef.current = chart;

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderUpColor: '#10b981',
      borderDownColor: '#ef4444',
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    candlestickSeriesRef.current = candlestickSeries;

    // 거래량 차트 추가 (서브차트)
    const volumeSeries = chart.addHistogramSeries({
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '', // 별도 스케일
    });

    volumeSeriesRef.current = volumeSeries;

    // ResizeObserver로 리사이즈 처리 (성능 최적화)
    resizeObserverRef.current = new ResizeObserver((entries) => {
      if (chartRef.current && entries.length > 0) {
        const { width } = entries[0].contentRect;
        chartRef.current.applyOptions({ width: Math.floor(width) });
      }
    });

    resizeObserverRef.current.observe(chartContainerRef.current);

    return () => {
      console.log('🧹 Cleaning up chart');
      resizeObserverRef.current?.disconnect();
      chartRef.current?.remove();
      chartRef.current = null;
      candlestickSeriesRef.current = null;
    };
  }, []); // 빈 배열 - 한 번만 실행

  // 데이터 로드 (symbol/interval 변경 시에만)
  const loadChartData = useCallback(async () => {
    if (!candlestickSeriesRef.current || !volumeSeriesRef.current) return;

    try {
      setLoading(true);
      setError(null);

      console.log(`📊 Loading chart data: ${symbol} (${interval})`);
      const startTime = Date.now();

      const candles = await bithumbClient.getCandles(symbol, interval, 50);

      if (!candles || candles.length === 0) {
        throw new Error('캔들 데이터 없음');
      }

      const candleData: CandlestickData[] = candles.map(candle => ({
        time: Math.floor(candle.timestamp.getTime() / 1000) as any,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      }));

      const volumeData = candles.map(candle => ({
        time: Math.floor(candle.timestamp.getTime() / 1000) as any,
        value: candle.volume,
        color: candle.close >= candle.open ? '#10b981' : '#ef4444',
      }));

      candlestickSeriesRef.current.setData(candleData);
      volumeSeriesRef.current.setData(volumeData);
      chartRef.current?.timeScale().fitContent();

      const loadTime = Date.now() - startTime;
      console.log(`✓ Chart data loaded in ${loadTime}ms (${candles.length} candles)`);

      setLoading(false);
    } catch (error: any) {
      console.error('❌ Chart data load failed:', error);
      setError(error.message || '차트 로딩 실패');
      setLoading(false);
    }
  }, [symbol, interval]);

  // 데이터 로드 트리거
  useEffect(() => {
    if (chartRef.current && candlestickSeriesRef.current) {
      loadChartData();
    }
  }, [loadChartData]);

  return (
    <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
      <div className="mb-3">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold">{symbol} 차트</h3>
          {!loading && !error && (
            <span className="text-xs text-green-500">✓ 로딩 완료</span>
          )}
        </div>

        {/* 시간대 선택 */}
        <div className="flex gap-2">
          {(['1m', '5m', '15m', '1h'] as const).map((timeframe) => (
            <button
              key={timeframe}
              onClick={() => setInterval(timeframe)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                interval === timeframe
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {timeframe}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-[400px] bg-gray-800/50 rounded">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
            <p className="text-gray-400">차트 로딩 중...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-center h-[400px] bg-gray-800/50 rounded">
          <div className="text-center">
            <p className="text-red-500 mb-2">⚠️ {error}</p>
            <button
              onClick={loadChartData}
              className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors"
            >
              다시 시도
            </button>
          </div>
        </div>
      )}

      <div
        ref={chartContainerRef}
        className={loading || error ? 'hidden' : ''}
        style={{ position: 'relative' }}
      />
    </div>
  );
}
