'use client';

import { useEffect, useState } from 'react';
import { bithumbClient, Ticker } from '@/lib/bithumb/client';
import { bithumbWs, TickerUpdate } from '@/lib/bithumb/websocket';
import { TradingEngine, Position } from '@/lib/strategy/trading-engine';
import { TradingChart } from '@/components/TradingChart';

export default function DashboardPage() {
  const [coins, setCoins] = useState<Ticker[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPosition, setCurrentPosition] = useState<Position | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'volume' | 'price' | 'change'>('volume');
  const [selectedCoin, setSelectedCoin] = useState<string | null>(null);

  // 초기 코인 데이터 로드
  useEffect(() => {
    async function loadCoins() {
      try {
        const tickers = await bithumbClient.getAllTickers();
        console.log(`Loaded ${tickers.length} coins from Bithumb API`);

        // 거래대금 기준 정렬
        const sortedTickers = tickers.sort((a, b) => b.volumeKrw - a.volumeKrw);
        setCoins(sortedTickers);
        setLoading(false);

        // WebSocket 구독 - 거래대금 상위 50개
        const topSymbols = sortedTickers.slice(0, 50).map(t => t.symbol);
        console.log(`WebSocket subscribing to ${topSymbols.length} coins`);
        bithumbWs.connect();
        bithumbWs.subscribe(topSymbols);
      } catch (error) {
        console.error('Failed to load coins:', error);
        setLoading(false);
      }
    }

    loadCoins();

    return () => {
      bithumbWs.disconnect();
    };
  }, []);

  // 실시간 가격 업데이트
  useEffect(() => {
    const handleTickerUpdate = (update: TickerUpdate) => {
      setCoins(prev =>
        prev.map(coin =>
          coin.symbol === update.symbol
            ? { ...coin, price: update.price, change24h: update.change24h }
            : coin
        )
      );
    };

    bithumbWs.on('ticker', handleTickerUpdate);

    return () => {
      bithumbWs.off('ticker', handleTickerUpdate);
    };
  }, []);

  // 검색 및 정렬
  const filteredCoins = coins
    .filter(coin =>
      coin.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      coin.koreanName.includes(searchQuery)
    )
    .sort((a, b) => {
      if (sortBy === 'volume') return b.volumeKrw - a.volumeKrw;
      if (sortBy === 'price') return b.price - a.price;
      return b.change24h - a.change24h;
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="text-white text-xl">실시간 데이터 로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">빗썸 실시간 트레이딩 대시보드</h1>
          <p className="text-gray-400">모든 코인 실시간 시세 및 자동매매</p>
        </div>

        {/* 현재 포지션 */}
        {currentPosition && (
          <div className="mb-6 bg-gray-900 rounded-lg p-6 border border-gray-800">
            <h2 className="text-xl font-semibold mb-4">현재 보유 포지션</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <p className="text-gray-400 text-sm">코인</p>
                <p className="font-semibold">{currentPosition.symbol}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">진입가</p>
                <p className="font-semibold">{currentPosition.entryPrice.toLocaleString()} KRW</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">현재가</p>
                <p className="font-semibold">{currentPosition.currentPrice.toLocaleString()} KRW</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">수익률</p>
                <p className={`font-semibold ${currentPosition.profitLossPct >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {currentPosition.profitLossPct.toFixed(2)}%
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">평가손익</p>
                <p className={`font-semibold ${currentPosition.profitLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {currentPosition.profitLoss.toLocaleString()} KRW
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 검색 및 정렬 */}
        <div className="mb-6 flex gap-4">
          <input
            type="text"
            placeholder="코인 검색 (예: BTC, 비트코인)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 text-white"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 text-white"
          >
            <option value="volume">거래대금순</option>
            <option value="price">가격순</option>
            <option value="change">변동률순</option>
          </select>
        </div>

        {/* 선택된 코인 차트 */}
        {selectedCoin && (
          <div className="mb-6">
            <TradingChart symbol={selectedCoin} interval="5m" />
          </div>
        )}

        {/* 코인 리스트 */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold">코인</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold">현재가</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold">24h 변동</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold">거래대금 (24h)</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold">거래량 (24h)</th>
                </tr>
              </thead>
              <tbody>
                {filteredCoins.map((coin, index) => (
                  <tr
                    key={coin.symbol}
                    onClick={() => setSelectedCoin(coin.symbol)}
                    className={`border-t border-gray-800 hover:bg-gray-800/50 transition-colors cursor-pointer ${
                      index % 2 === 0 ? 'bg-gray-900' : 'bg-gray-900/50'
                    } ${selectedCoin === coin.symbol ? 'ring-2 ring-blue-500' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold">
                          {coin.symbol.slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-semibold">{coin.symbol}</p>
                          <p className="text-sm text-gray-400">{coin.koreanName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="font-semibold">{coin.price.toLocaleString()} KRW</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span
                        className={`font-semibold ${
                          coin.change24h >= 0 ? 'text-green-500' : 'text-red-500'
                        }`}
                      >
                        {coin.change24h >= 0 ? '+' : ''}
                        {coin.change24h.toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-gray-300">
                        {(coin.volumeKrw / 100000000).toFixed(2)}억 원
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-gray-300">{coin.volume24h.toLocaleString()}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 통계 요약 */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <p className="text-gray-400 text-sm mb-2">전체 코인 수</p>
            <p className="text-2xl font-bold">{coins.length}개</p>
          </div>
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <p className="text-gray-400 text-sm mb-2">상승 코인</p>
            <p className="text-2xl font-bold text-green-500">
              {coins.filter(c => c.change24h > 0).length}개
            </p>
          </div>
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <p className="text-gray-400 text-sm mb-2">하락 코인</p>
            <p className="text-2xl font-bold text-red-500">
              {coins.filter(c => c.change24h < 0).length}개
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
