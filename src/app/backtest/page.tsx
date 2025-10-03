'use client';

import { useState } from 'react';
import { analyzeBacktestResult } from '@/lib/ai/copilot';

interface BacktestResult {
  totalReturn: number;
  maxDrawdown: number;
  winRate: number;
  totalTrades: number;
  avgProfit: number;
  avgLoss: number;
  profitFactor: number;
  sharpeRatio: number;
}

interface Trade {
  entryTime: Date;
  exitTime: Date;
  symbol: string;
  side: 'buy' | 'sell';
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  profit: number;
  profitPct: number;
}

export default function BacktestPage() {
  const [config, setConfig] = useState({
    symbol: 'BTC',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    initialCapital: 10000000,
    profitTarget: 8,
    stopLoss: -3,
  });

  const [result, setResult] = useState<BacktestResult | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [analysis, setAnalysis] = useState<string>('');
  const [loading, setLoading] = useState(false);

  async function runBacktest() {
    setLoading(true);

    // 백테스트 실행 (실제로는 백엔드 API 호출)
    // 여기서는 데모 데이터 사용
    setTimeout(async () => {
      const demoResult: BacktestResult = {
        totalReturn: 15.3,
        maxDrawdown: -8.2,
        winRate: 62.5,
        totalTrades: 48,
        avgProfit: 4.2,
        avgLoss: -2.1,
        profitFactor: 2.0,
        sharpeRatio: 1.8,
      };

      const demoTrades: Trade[] = Array.from({ length: 10 }, (_, i) => ({
        entryTime: new Date(2024, 0, i + 1),
        exitTime: new Date(2024, 0, i + 2),
        symbol: config.symbol,
        side: Math.random() > 0.5 ? 'buy' : 'sell',
        entryPrice: 50000000 + Math.random() * 10000000,
        exitPrice: 50000000 + Math.random() * 10000000,
        quantity: 0.1,
        profit: (Math.random() - 0.4) * 500000,
        profitPct: (Math.random() - 0.4) * 10,
      }));

      setResult(demoResult);
      setTrades(demoTrades);

      // AI 분석
      const aiAnalysis = await analyzeBacktestResult({
        strategyName: '멀티레이어 전략',
        totalReturn: demoResult.totalReturn,
        maxDrawdown: demoResult.maxDrawdown,
        winRate: demoResult.winRate,
        totalTrades: demoResult.totalTrades,
        trades: demoTrades,
      });

      setAnalysis(aiAnalysis);
      setLoading(false);
    }, 2000);
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">백테스트 시뮬레이션</h1>
          <p className="text-gray-400">과거 데이터 기반 전략 성과 검증</p>
        </div>

        {/* 백테스트 설정 */}
        <div className="bg-gray-900 rounded-lg p-6 border border-gray-800 mb-6">
          <h2 className="text-xl font-semibold mb-4">백테스트 설정</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">코인</label>
              <select
                value={config.symbol}
                onChange={(e) => setConfig({ ...config, symbol: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2"
              >
                <option value="BTC">BTC (비트코인)</option>
                <option value="ETH">ETH (이더리움)</option>
                <option value="XRP">XRP (리플)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">시작일</label>
              <input
                type="date"
                value={config.startDate}
                onChange={(e) => setConfig({ ...config, startDate: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">종료일</label>
              <input
                type="date"
                value={config.endDate}
                onChange={(e) => setConfig({ ...config, endDate: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">초기 자본금 (KRW)</label>
              <input
                type="number"
                value={config.initialCapital}
                onChange={(e) => setConfig({ ...config, initialCapital: parseInt(e.target.value) })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">익절 목표 (%)</label>
              <input
                type="number"
                value={config.profitTarget}
                onChange={(e) => setConfig({ ...config, profitTarget: parseFloat(e.target.value) })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">손절선 (%)</label>
              <input
                type="number"
                value={config.stopLoss}
                onChange={(e) => setConfig({ ...config, stopLoss: parseFloat(e.target.value) })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2"
              />
            </div>
          </div>

          <button
            onClick={runBacktest}
            disabled={loading}
            className={`mt-6 w-full py-3 rounded-lg font-semibold transition-colors ${
              loading
                ? 'bg-gray-700 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? '백테스트 실행 중...' : '백테스트 시작'}
          </button>
        </div>

        {/* 백테스트 결과 */}
        {result && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
                <p className="text-gray-400 text-sm mb-2">총 수익률</p>
                <p className={`text-3xl font-bold ${result.totalReturn >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {result.totalReturn >= 0 ? '+' : ''}{result.totalReturn.toFixed(2)}%
                </p>
              </div>

              <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
                <p className="text-gray-400 text-sm mb-2">최대 낙폭 (MDD)</p>
                <p className="text-3xl font-bold text-red-500">
                  {result.maxDrawdown.toFixed(2)}%
                </p>
              </div>

              <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
                <p className="text-gray-400 text-sm mb-2">승률</p>
                <p className="text-3xl font-bold text-blue-500">
                  {result.winRate.toFixed(1)}%
                </p>
              </div>

              <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
                <p className="text-gray-400 text-sm mb-2">총 거래 횟수</p>
                <p className="text-3xl font-bold">
                  {result.totalTrades}회
                </p>
              </div>

              <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
                <p className="text-gray-400 text-sm mb-2">평균 수익</p>
                <p className="text-xl font-bold text-green-500">
                  +{result.avgProfit.toFixed(2)}%
                </p>
              </div>

              <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
                <p className="text-gray-400 text-sm mb-2">평균 손실</p>
                <p className="text-xl font-bold text-red-500">
                  {result.avgLoss.toFixed(2)}%
                </p>
              </div>

              <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
                <p className="text-gray-400 text-sm mb-2">손익비</p>
                <p className="text-xl font-bold">
                  {result.profitFactor.toFixed(2)}
                </p>
              </div>

              <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
                <p className="text-gray-400 text-sm mb-2">샤프 지수</p>
                <p className="text-xl font-bold">
                  {result.sharpeRatio.toFixed(2)}
                </p>
              </div>
            </div>

            {/* AI 분석 */}
            {analysis && (
              <div className="bg-gray-900 rounded-lg p-6 border border-gray-800 mb-6">
                <h3 className="text-xl font-semibold mb-4">AI 전략 분석</h3>
                <div className="prose prose-invert max-w-none">
                  <p className="text-gray-300 whitespace-pre-wrap">{analysis}</p>
                </div>
              </div>
            )}

            {/* 거래 내역 */}
            <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
              <div className="p-6 border-b border-gray-800">
                <h3 className="text-xl font-semibold">거래 내역</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold">진입 시간</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">청산 시간</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">코인</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold">진입가</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold">청산가</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold">수익률</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold">손익</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map((trade, i) => (
                      <tr key={i} className="border-t border-gray-800">
                        <td className="px-6 py-4 text-sm">
                          {trade.entryTime.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {trade.exitTime.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold">
                          {trade.symbol}
                        </td>
                        <td className="px-6 py-4 text-right text-sm">
                          {trade.entryPrice.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-right text-sm">
                          {trade.exitPrice.toLocaleString()}
                        </td>
                        <td className={`px-6 py-4 text-right text-sm font-semibold ${
                          trade.profitPct >= 0 ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {trade.profitPct >= 0 ? '+' : ''}{trade.profitPct.toFixed(2)}%
                        </td>
                        <td className={`px-6 py-4 text-right text-sm font-semibold ${
                          trade.profit >= 0 ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {trade.profit >= 0 ? '+' : ''}{trade.profit.toLocaleString()} KRW
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
