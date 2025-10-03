'use client';

import { useState, useEffect } from 'react';
import { bithumbClient, Ticker } from '@/lib/bithumb/client';
import { analyzeMarket, MarketAnalysis } from '@/lib/strategy/multi-layer';
import { TradingChart } from '@/components/TradingChart';

interface CoinAnalysis {
  ticker: Ticker;
  analysis: MarketAnalysis;
}

export default function StrategyPage() {
  const [analyses, setAnalyses] = useState<CoinAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCoin, setSelectedCoin] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    loadTopCoins();
  }, []);

  async function loadTopCoins() {
    try {
      setLoading(true);
      const tickers = await bithumbClient.getAllTickers();

      // 거래대금 상위 20개 코인
      const topCoins = tickers
        .filter(t => t.volumeKrw >= 3000000000) // 30억 이상
        .slice(0, 20);

      setAnalyses(topCoins.map(ticker => ({
        ticker,
        analysis: {
          score: 0,
          signal: 'hold',
          indicators: {
            rsi: 0,
            macd: 0,
            bollinger: 0,
            volume: 0,
            volatility: 0,
            sentiment: 0,
            event: 0,
          },
          metadata: {
            volatility: { atr: 0, rangeRatio: 0, orderBookImbalance: 0, volumeSpike: 0 },
            sentiment: { aggregateScore: 0, confidence: 0, sources: [] },
            events: [],
          },
        },
      })));

      setLoading(false);
    } catch (error) {
      console.error('Failed to load coins:', error);
      setLoading(false);
    }
  }

  async function analyzeAll() {
    setAnalyzing(true);

    // 순차적으로 분석 (API 제한 고려)
    const updatedAnalyses: CoinAnalysis[] = [];

    for (const { ticker } of analyses) {
      try {
        console.log(`Analyzing ${ticker.symbol}...`);
        const analysis = await analyzeMarket(ticker.symbol);
        updatedAnalyses.push({ ticker, analysis });

        // API 제한 방지 (200ms 대기)
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Failed to analyze ${ticker.symbol}:`, error);
        // 에러 시에도 티커 정보는 유지
        updatedAnalyses.push({
          ticker,
          analysis: {
            score: 0,
            signal: 'hold' as const,
            indicators: {
              rsi: 0,
              macd: 0,
              bollinger: 0,
              volume: 0,
              volatility: 0,
              sentiment: 0,
              event: 0,
            },
            metadata: {
              volatility: { atr: 0, rangeRatio: 0, orderBookImbalance: 0, volumeSpike: 0 },
              sentiment: { aggregateScore: 0, confidence: 0, sources: [] },
              events: [],
            },
          },
        });
      }
    }

    setAnalyses(updatedAnalyses.sort((a, b) => b.analysis.score - a.analysis.score));
    setAnalyzing(false);
  }

  const getSignalColor = (signal: string) => {
    if (signal === 'buy') return 'text-green-500';
    if (signal === 'sell') return 'text-red-500';
    return 'text-gray-400';
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'bg-green-500';
    if (score >= 50) return 'bg-yellow-500';
    if (score >= 30) return 'bg-orange-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="text-white text-xl">전략 분석 준비 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">멀티레이어 전략 분석</h1>
          <p className="text-gray-400">실시간 기술 지표 기반 매매 시그널</p>
        </div>

        <div className="mb-6">
          <button
            onClick={analyzeAll}
            disabled={analyzing}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              analyzing
                ? 'bg-gray-700 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {analyzing ? '전체 분석 중...' : '전체 코인 분석 시작'}
          </button>
        </div>

        {selectedCoin && (
          <div className="mb-6">
            <TradingChart symbol={selectedCoin} interval="5m" />
          </div>
        )}

        <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold">코인</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold">종합점수</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold">시그널</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold">RSI</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold">MACD</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold">볼린저</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold">거래량</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold">변동성</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold">현재가</th>
                </tr>
              </thead>
              <tbody>
                {analyses.map(({ ticker, analysis }, index) => (
                  <tr
                    key={ticker.symbol}
                    onClick={() => setSelectedCoin(ticker.symbol)}
                    className={`border-t border-gray-800 hover:bg-gray-800/50 transition-colors cursor-pointer ${
                      index % 2 === 0 ? 'bg-gray-900' : 'bg-gray-900/50'
                    } ${selectedCoin === ticker.symbol ? 'ring-2 ring-blue-500' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold">{ticker.symbol}</p>
                        <p className="text-sm text-gray-400">{ticker.koreanName}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <div className="relative w-16 h-16">
                          <svg className="w-16 h-16 transform -rotate-90">
                            <circle
                              cx="32"
                              cy="32"
                              r="28"
                              stroke="#374151"
                              strokeWidth="6"
                              fill="none"
                            />
                            <circle
                              cx="32"
                              cy="32"
                              r="28"
                              stroke={analysis.score >= 70 ? '#10b981' : analysis.score >= 50 ? '#eab308' : '#ef4444'}
                              strokeWidth="6"
                              fill="none"
                              strokeDasharray={`${(analysis.score / 100) * 175.93} 175.93`}
                              strokeLinecap="round"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="font-bold text-sm">{analysis.score.toFixed(0)}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`font-semibold uppercase ${getSignalColor(analysis.signal)}`}>
                        {analysis.signal}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center">
                        <div className={`w-12 h-2 rounded-full ${getScoreColor(analysis.indicators.rsi)}`}></div>
                        <span className="ml-2 text-sm">{analysis.indicators.rsi.toFixed(0)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center">
                        <div className={`w-12 h-2 rounded-full ${getScoreColor(analysis.indicators.macd)}`}></div>
                        <span className="ml-2 text-sm">{analysis.indicators.macd.toFixed(0)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center">
                        <div className={`w-12 h-2 rounded-full ${getScoreColor(analysis.indicators.bollinger)}`}></div>
                        <span className="ml-2 text-sm">{analysis.indicators.bollinger.toFixed(0)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center">
                        <div className={`w-12 h-2 rounded-full ${getScoreColor(analysis.indicators.volume)}`}></div>
                        <span className="ml-2 text-sm">{analysis.indicators.volume.toFixed(0)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center">
                        <div className={`w-12 h-2 rounded-full ${getScoreColor(analysis.indicators.volatility)}`}></div>
                        <span className="ml-2 text-sm">{analysis.indicators.volatility.toFixed(0)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="font-semibold">{ticker.price.toLocaleString()} KRW</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
