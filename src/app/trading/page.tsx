'use client';

import { useEffect, useState } from 'react';
import { TradingEngine, TradingConfig, Position } from '@/lib/strategy/trading-engine';

interface LogEntry {
  timestamp: Date;
  type: 'info' | 'success' | 'error' | 'trade';
  message: string;
}

export default function TradingPage() {
  const [engine, setEngine] = useState<TradingEngine | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<Position | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [config, setConfig] = useState<TradingConfig>({
    mode: 'simulation',
    investmentPercentage: 10,
    profitTarget: 8,
    minVolumeKrw: 3000000000,
    enabled: true,
  });

  // 로그 추가 헬퍼
  const addLog = (type: LogEntry['type'], message: string) => {
    setLogs(prev => [{
      timestamp: new Date(),
      type,
      message,
    }, ...prev].slice(0, 100)); // 최근 100개만 유지
  };

  // Trading Engine 초기화
  useEffect(() => {
    const tradingEngine = new TradingEngine(config);

    // 이벤트 리스너 등록
    tradingEngine.on('started', () => {
      setIsRunning(true);
      addLog('success', '자동매매가 시작되었습니다');
    });

    tradingEngine.on('stopped', () => {
      setIsRunning(false);
      addLog('info', '자동매매가 중지되었습니다');
    });

    tradingEngine.on('position_opened', (data: any) => {
      addLog('trade', `매수 체결: ${data.symbol} (점수: ${data.score})`);
    });

    tradingEngine.on('position_closed', (data: any) => {
      addLog('trade', `매도 체결: ${data.symbol} (수익률: ${data.profit.toFixed(2)}%)`);
    });

    tradingEngine.on('position_update', (position: Position) => {
      setCurrentPosition(position);
    });

    tradingEngine.on('order_filled', (data: any) => {
      addLog('success', `주문 체결: ${data.side.toUpperCase()} ${data.symbol} ${data.quantity} (${data.reason || ''})`);
    });

    tradingEngine.on('order_failed', (error: any) => {
      addLog('error', `주문 실패: ${error.message}`);
    });

    tradingEngine.on('no_opportunity', (data: any) => {
      addLog('info', data.reason);
    });

    tradingEngine.on('confidence_exit', (data: any) => {
      addLog('info', `확신도 하락으로 ${data.symbol} 청산 (신뢰도: ${(data.sentimentConfidence * 100).toFixed(0)}%)`);
    });

    tradingEngine.on('error', (error: any) => {
      addLog('error', `오류 발생: ${error.message}`);
    });

    setEngine(tradingEngine);

    return () => {
      if (tradingEngine) {
        tradingEngine.stop();
        tradingEngine.removeAllListeners();
      }
    };
  }, []);

  // 설정 변경 시 엔진 업데이트
  useEffect(() => {
    if (engine) {
      engine.updateConfig(config);
      addLog('info', '설정이 업데이트되었습니다');
    }
  }, [config]);

  const handleStart = async () => {
    if (engine) {
      await engine.start();
    }
  };

  const handleStop = () => {
    if (engine) {
      engine.stop();
    }
  };

  const handleEmergencyStop = async () => {
    if (engine && confirm('긴급 정지하시겠습니까? 현재 포지션이 즉시 청산됩니다.')) {
      await engine.emergencyStop();
      addLog('error', '긴급 정지 실행됨');
    }
  };

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return 'text-green-500';
      case 'error': return 'text-red-500';
      case 'trade': return 'text-blue-500';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">자동매매 제어</h1>
          <p className="text-gray-400">실시간 자동매매 모니터링 및 제어</p>
        </div>

        {/* 제어 패널 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* 상태 카드 */}
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <h2 className="text-xl font-semibold mb-4">상태</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">자동매매</span>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  isRunning ? 'bg-green-500/20 text-green-500' : 'bg-gray-700 text-gray-400'
                }`}>
                  {isRunning ? '실행 중' : '중지됨'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">모드</span>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  config.mode === 'live' ? 'bg-red-500/20 text-red-500' : 'bg-blue-500/20 text-blue-500'
                }`}>
                  {config.mode === 'live' ? '실전' : '시뮬레이션'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">포지션</span>
                <span className="font-semibold">
                  {currentPosition ? currentPosition.symbol : '없음'}
                </span>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              {!isRunning ? (
                <button
                  onClick={handleStart}
                  className="w-full bg-green-600 hover:bg-green-700 py-2 rounded-lg font-semibold transition-colors"
                >
                  자동매매 시작
                </button>
              ) : (
                <button
                  onClick={handleStop}
                  className="w-full bg-gray-600 hover:bg-gray-700 py-2 rounded-lg font-semibold transition-colors"
                >
                  자동매매 중지
                </button>
              )}

              <button
                onClick={handleEmergencyStop}
                disabled={!isRunning}
                className={`w-full py-2 rounded-lg font-semibold transition-colors ${
                  isRunning
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-gray-700 cursor-not-allowed'
                }`}
              >
                긴급 정지
              </button>
            </div>
          </div>

          {/* 설정 카드 */}
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <h2 className="text-xl font-semibold mb-4">설정</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">모드</label>
                <select
                  value={config.mode}
                  onChange={(e) => setConfig({ ...config, mode: e.target.value as any })}
                  disabled={isRunning}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white disabled:opacity-50"
                >
                  <option value="simulation">시뮬레이션</option>
                  <option value="live">실전</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  투자 비율 ({config.investmentPercentage}%)
                </label>
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="5"
                  value={config.investmentPercentage}
                  onChange={(e) => setConfig({ ...config, investmentPercentage: parseInt(e.target.value) })}
                  disabled={isRunning}
                  className="w-full disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  익절 목표 ({config.profitTarget}%)
                </label>
                <input
                  type="range"
                  min="3"
                  max="15"
                  step="1"
                  value={config.profitTarget}
                  onChange={(e) => setConfig({ ...config, profitTarget: parseInt(e.target.value) })}
                  disabled={isRunning}
                  className="w-full disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  최소 거래대금 (억 원)
                </label>
                <input
                  type="number"
                  value={config.minVolumeKrw / 100000000}
                  onChange={(e) => setConfig({ ...config, minVolumeKrw: parseFloat(e.target.value) * 100000000 })}
                  disabled={isRunning}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          {/* 현재 포지션 카드 */}
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <h2 className="text-xl font-semibold mb-4">현재 포지션</h2>
            {currentPosition ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">코인</span>
                  <span className="font-semibold text-lg">{currentPosition.symbol}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">진입가</span>
                  <span className="font-semibold">
                    {currentPosition.entryPrice.toLocaleString()} KRW
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">현재가</span>
                  <span className="font-semibold">
                    {currentPosition.currentPrice.toLocaleString()} KRW
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">수량</span>
                  <span className="font-semibold">
                    {currentPosition.quantity.toFixed(4)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">수익률</span>
                  <span className={`font-semibold text-lg ${
                    currentPosition.profitLossPct >= 0 ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {currentPosition.profitLossPct >= 0 ? '+' : ''}
                    {currentPosition.profitLossPct.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">평가손익</span>
                  <span className={`font-semibold ${
                    currentPosition.profitLoss >= 0 ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {currentPosition.profitLoss >= 0 ? '+' : ''}
                    {currentPosition.profitLoss.toLocaleString()} KRW
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">보유 시간</span>
                  <span className="text-sm text-gray-300">
                    {Math.floor((Date.now() - currentPosition.openedAt.getTime()) / 60000)}분
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-40">
                <p className="text-gray-500">보유 중인 포지션이 없습니다</p>
              </div>
            )}
          </div>
        </div>

        {/* 실시간 로그 */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
          <div className="p-6 border-b border-gray-800 flex justify-between items-center">
            <h2 className="text-xl font-semibold">실시간 로그</h2>
            <button
              onClick={() => setLogs([])}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              로그 지우기
            </button>
          </div>
          <div className="p-6 max-h-[500px] overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-gray-500 text-center py-10">아직 로그가 없습니다</p>
            ) : (
              <div className="space-y-2 font-mono text-sm">
                {logs.map((log, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="text-gray-500 whitespace-nowrap">
                      {log.timestamp.toLocaleTimeString()}
                    </span>
                    <span className={getLogColor(log.type)}>{log.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* AI 통합 안내 */}
        <div className="mt-6 bg-blue-900/20 border border-blue-700/50 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <div className="bg-blue-500 rounded-full p-2">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-blue-400 mb-2">AI 자동매매 작동 원리</h3>
              <p className="text-gray-300 text-sm mb-3">
                이 시스템은 <strong>ChatGPT AI</strong>와 <strong>멀티레이어 전략 분석</strong>을 결합하여 자동으로 매매합니다:
              </p>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-blue-400">•</span>
                  <span><strong>AI 전략 생성:</strong> ChatGPT가 시장 상황에 맞는 전략을 실시간 생성 및 조정</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400">•</span>
                  <span><strong>7가지 지표 분석:</strong> RSI, MACD, 볼린저, 거래량, 변동성, 감성, 이벤트 점수를 종합</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400">•</span>
                  <span><strong>확신도 게이트:</strong> 감성·이벤트 확신도 &lt; 0.5 시 거래 제한</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400">•</span>
                  <span><strong>AI 의사결정 로깅:</strong> 모든 AI 판단 근거를 콘솔에 기록 (개발자 도구에서 확인)</span>
                </li>
              </ul>
              <p className="mt-3 text-xs text-gray-400">
                💡 AI 로그는 브라우저 개발자 도구 콘솔(F12)에서 [AI Decision], [AI Outcome] 태그로 확인할 수 있습니다
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
