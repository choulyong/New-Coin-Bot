'use client';

import { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData } from 'lightweight-charts';
import { bithumbClient } from '@/lib/bithumb/client';

interface TradingChartProps {
  symbol: string;
  interval?: '1m' | '5m' | '15m' | '1h';
}

export function TradingChart({ symbol, interval = '1m' }: TradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    setLoading(true);
    setError(null);

    // 차트 생성
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
      },
      rightPriceScale: {
        borderColor: '#334155',
      },
    });

    chartRef.current = chart;

    // 캔들스틱 시리즈 생성
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderUpColor: '#10b981',
      borderDownColor: '#ef4444',
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    candlestickSeriesRef.current = candlestickSeries;

    // 데이터 로드
    async function loadChartData() {
      try {
        console.log(`Loading chart for ${symbol} (${interval})...`);
        const startTime = Date.now();

        const candles = await bithumbClient.getCandles(symbol, interval, 100); // 200 -> 100으로 줄여서 빠르게

        if (!candles || candles.length === 0) {
          throw new Error('No candle data available');
        }

        const data: CandlestickData[] = candles.map(candle => ({
          time: Math.floor(candle.timestamp.getTime() / 1000) as any,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
        }));

        candlestickSeries.setData(data);
        chart.timeScale().fitContent();

        const loadTime = Date.now() - startTime;
        console.log(`✓ Chart loaded in ${loadTime}ms (${candles.length} candles)`);

        setLoading(false);
      } catch (error: any) {
        console.error('Failed to load chart data:', error);
        setError(error.message || '차트 로딩 실패');
        setLoading(false);
      }
    }

    loadChartData();

    // 리사이즈 핸들러
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [symbol, interval]);

  return (
    <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
      <div className="mb-3 flex justify-between items-center">
        <h3 className="text-lg font-semibold">{symbol} 차트 ({interval})</h3>
        {!loading && !error && (
          <span className="text-xs text-green-500">✓ 로딩 완료</span>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center h-[400px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
            <p className="text-gray-400">차트 로딩 중...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-center h-[400px]">
          <div className="text-center">
            <p className="text-red-500 mb-2">⚠️ {error}</p>
            <p className="text-gray-500 text-sm">콘솔(F12)에서 상세 오류를 확인하세요</p>
          </div>
        </div>
      )}

      <div ref={chartContainerRef} className={loading || error ? 'hidden' : ''} />
    </div>
  );
}
