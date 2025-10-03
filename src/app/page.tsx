'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { bithumbClient } from '@/lib/bithumb/client';
import { TradingControl } from '@/components/TradingControl';

export default function HomePage() {
  const [stats, setStats] = useState({
    totalCoins: 0,
    gainers: 0,
    losers: 0,
    totalVolume: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const tickers = await bithumbClient.getAllTickers();

        const totalVolume = tickers.reduce((sum, t) => sum + t.volumeKrw, 0);
        const gainers = tickers.filter(t => t.change24h > 0).length;
        const losers = tickers.filter(t => t.change24h < 0).length;

        setStats({
          totalCoins: tickers.length,
          gainers,
          losers,
          totalVolume,
        });
        setLoading(false);
      } catch (error) {
        console.error('Failed to load stats:', error);
        setLoading(false);
      }
    }

    loadStats();
    const interval = setInterval(loadStats, 10000); // 10초마다 갱신

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* 히어로 섹션 */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              빗썸 AI 자동매매 봇
            </h1>
            <p className="text-xl text-gray-300 mb-8">
              멀티레이어 전략 + ChatGPT 기반 실시간 암호화폐 자동매매
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link
                href="/dashboard"
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
              >
                실시간 대시보드
              </Link>
              <Link
                href="/strategy"
                className="px-8 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition-colors"
              >
                전략 분석
              </Link>
              <Link
                href="/trading"
                className="px-8 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors"
              >
                자동매매 제어
              </Link>
              <Link
                href="/backtest"
                className="px-8 py-3 bg-orange-600 hover:bg-orange-700 rounded-lg font-semibold transition-colors"
              >
                백테스트
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* 실시간 통계 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-400 text-sm">전체 코인</p>
              <span className="text-2xl">📊</span>
            </div>
            <p className="text-3xl font-bold">{stats.totalCoins}개</p>
            {loading && <p className="text-xs text-gray-500 mt-1">로딩 중...</p>}
          </div>

          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-400 text-sm">상승 코인</p>
              <span className="text-2xl">📈</span>
            </div>
            <p className="text-3xl font-bold text-green-500">{stats.gainers}개</p>
          </div>

          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-400 text-sm">하락 코인</p>
              <span className="text-2xl">📉</span>
            </div>
            <p className="text-3xl font-bold text-red-500">{stats.losers}개</p>
          </div>

          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-400 text-sm">총 거래대금</p>
              <span className="text-2xl">💰</span>
            </div>
            <p className="text-3xl font-bold">
              {(stats.totalVolume / 1000000000000).toFixed(1)}조
            </p>
          </div>
        </div>

        {/* 자동매매 제어 */}
        <div className="mb-12">
          <TradingControl />
        </div>

        {/* 주요 기능 */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">주요 기능</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
              <div className="text-3xl mb-4">🎯</div>
              <h3 className="text-xl font-semibold mb-2">멀티레이어 전략</h3>
              <p className="text-gray-400">
                RSI, MACD, 볼린저밴드, 거래량, 변동성, 감성분석, 이벤트 캘린더를 종합한 7단계 분석 시스템
              </p>
            </div>

            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
              <div className="text-3xl mb-4">🤖</div>
              <h3 className="text-xl font-semibold mb-2">AI Copilot</h3>
              <p className="text-gray-400">
                ChatGPT 기반 전략 자동 생성 및 백테스트 분석. Guardrail로 안전성 검증
              </p>
            </div>

            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
              <div className="text-3xl mb-4">⚡</div>
              <h3 className="text-xl font-semibold mb-2">실시간 모니터링</h3>
              <p className="text-gray-400">
                WebSocket 기반 실시간 시세 추적 및 자동 매수/매도 실행
              </p>
            </div>
          </div>
        </div>

        {/* 전략 설명 */}
        <div className="bg-gray-900 rounded-lg p-8 border border-gray-800">
          <h2 className="text-2xl font-bold mb-6">트레이딩 전략</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                <span className="font-bold">1</span>
              </div>
              <div>
                <h3 className="font-semibold mb-1">진입 조건</h3>
                <p className="text-gray-400">
                  종합 점수 70점 이상 + 확신도 게이트 통과 + 거래대금 30억 이상
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
                <span className="font-bold">2</span>
              </div>
              <div>
                <h3 className="font-semibold mb-1">익절 전략</h3>
                <p className="text-gray-400">
                  8% 수익 달성 시 자동 매도 (조정 가능)
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0">
                <span className="font-bold">3</span>
              </div>
              <div>
                <h3 className="font-semibold mb-1">손절 전략</h3>
                <p className="text-gray-400">
                  강한 매도 시그널 발생 또는 확신도 하락 시 즉시 청산
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-yellow-600 flex items-center justify-center flex-shrink-0">
                <span className="font-bold">4</span>
              </div>
              <div>
                <h3 className="font-semibold mb-1">리스크 관리</h3>
                <p className="text-gray-400">
                  1회 투자 금액 조절 가능 (10%~100%) + 긴급 정지 기능
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
