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
  const [debugInfo, setDebugInfo] = useState<string>('');

  useEffect(() => {
    loadTopCoins();
  }, []);

  async function loadTopCoins() {
    try {
      setLoading(true);
      const tickers = await bithumbClient.getAllTickers();

      // 거래대금 기준 정렬 후 상위 50개 표시 (필터 없음)
      const topCoins = tickers
        .sort((a, b) => b.volumeKrw - a.volumeKrw)
        .slice(0, 50);

      console.log(`Loaded ${topCoins.length} coins for analysis`);

      setAnalyses(topCoins.map(ticker => ({
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
      })));

      setLoading(false);
    } catch (error) {
      console.error('Failed to load coins:', error);
      setLoading(false);
    }
  }

  async function analyzeAll() {
    if (analyzing) {
      console.log('⚠️ Analysis already in progress');
      setDebugInfo('이미 분석 진행 중입니다');
      return;
    }

    if (analyses.length === 0) {
      console.log('⚠️ No coins to analyze');
      setDebugInfo('분석할 코인이 없습니다. 페이지를 새로고침해주세요.');
      alert('분석할 코인이 없습니다. 페이지를 새로고침해주세요.');
      return;
    }

    setAnalyzing(true);
    setDebugInfo(`🚀 ${analyses.length}개 코인 분석 시작...`);
    console.log(`🚀 Starting analysis for ${analyses.length} coins...`);
    console.log(`📊 Check this console (F12) for real-time progress`);

    // 순차적으로 분석 (API 제한 고려)
    const updatedAnalyses: CoinAnalysis[] = [];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < analyses.length; i++) {
      const { ticker } = analyses[i];
      try {
        setDebugInfo(`[${i + 1}/${analyses.length}] 🔍 ${ticker.symbol} 분석 중...`);
        console.log(`[${i + 1}/${analyses.length}] 🔍 Analyzing ${ticker.symbol} (${ticker.koreanName})...`);

        const analysis = await analyzeMarket(ticker.symbol);
        updatedAnalyses.push({ ticker, analysis });
        successCount++;

        const emoji = analysis.signal === 'buy' ? '🟢' : analysis.signal === 'sell' ? '🔴' : '⚪';
        console.log(`${emoji} ${ticker.symbol}: Score ${analysis.score.toFixed(0)}, Signal ${analysis.signal.toUpperCase()}`);
        setDebugInfo(`${emoji} ${ticker.symbol}: 점수 ${analysis.score.toFixed(0)} (${i + 1}/${analyses.length})`);

        // 진행률 표시 (매 10개마다)
        if ((i + 1) % 10 === 0) {
          console.log(`📈 Progress: ${i + 1}/${analyses.length} (${((i + 1) / analyses.length * 100).toFixed(0)}%)`);
        }

        // API 제한 방지 (400ms 대기 - 안정성 우선)
        await new Promise(resolve => setTimeout(resolve, 400));
      } catch (error: any) {
        console.error(`❌ Failed to analyze ${ticker.symbol}:`, error.message || error);
        setDebugInfo(`❌ ${ticker.symbol} 분석 실패: ${error.message}`);
        errorCount++;

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

        // 에러가 많으면 중단 (연속 5개 실패 시)
        if (errorCount >= 5 && successCount === 0) {
          console.error(`⛔ Too many errors at start. Stopping analysis.`);
          alert('분석 중 오류가 계속 발생합니다. 콘솔(F12)에서 오류를 확인하세요.');
          break;
        }
      }
    }

    console.log(`✅ Analysis complete! Success: ${successCount}, Errors: ${errorCount}`);
    setDebugInfo(`✅ 분석 완료! 성공: ${successCount}, 실패: ${errorCount}`);

    const sorted = updatedAnalyses.sort((a, b) => b.analysis.score - a.analysis.score);
    setAnalyses(sorted);

    // 상위 5개 요약
    if (successCount > 0) {
      console.log(`🏆 Top 5 coins by score:`);
      sorted.slice(0, 5).forEach((item, idx) => {
        if (item.analysis.score > 0) {
          console.log(`  ${idx + 1}. ${item.ticker.symbol}: ${item.analysis.score.toFixed(0)} (${item.analysis.signal.toUpperCase()})`);
        }
      });
    }

    setTimeout(() => {
      setAnalyzing(false);
      setDebugInfo('');
    }, 3000);
  }

  const getSignalColor = (signal: string) => {
    if (signal === 'buy') return 'text-green-500';
    if (signal === 'sell') return 'text-red-500';
    return 'text-gray-400';
  };

  // 단일 코인 테스트 (디버깅용)
  async function testSingleCoin() {
    if (analyses.length === 0) return;

    const testCoin = analyses[0].ticker;
    setDebugInfo(`🧪 ${testCoin.symbol} 단독 테스트 중...`);
    console.log(`🧪 Testing ${testCoin.symbol}...`);

    try {
      const analysis = await analyzeMarket(testCoin.symbol);
      console.log('✅ Test SUCCESS:', analysis);
      setDebugInfo(`✅ 테스트 성공! ${testCoin.symbol} 점수: ${analysis.score.toFixed(0)}`);
    } catch (error: any) {
      console.error('❌ Test FAILED:', error);
      setDebugInfo(`❌ 테스트 실패: ${error.message || error}`);
    }
  }

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
          <div className="flex items-center gap-4 mb-3">
            <button
              onClick={analyzeAll}
              disabled={analyzing || analyses.length === 0}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                analyzing || analyses.length === 0
                  ? 'bg-gray-700 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {analyzing ? '전체 분석 중...' : `전체 코인 분석 시작 (${analyses.length}개)`}
            </button>

            <button
              onClick={testSingleCoin}
              disabled={analyzing || analyses.length === 0}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                analyzing || analyses.length === 0
                  ? 'bg-gray-700 cursor-not-allowed'
                  : 'bg-orange-600 hover:bg-orange-700'
              }`}
            >
              🧪 단일 테스트
            </button>

            {analyzing && (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                <span className="text-sm text-gray-400">F12 콘솔에서 진행 상황 확인</span>
              </div>
            )}
          </div>
          {debugInfo && (
            <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg px-4 py-3">
              <p className="text-blue-400 font-mono text-sm">{debugInfo}</p>
            </div>
          )}
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
