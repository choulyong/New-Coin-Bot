'use client';

import { useState, useEffect } from 'react';
import { TradingEngine, TradingConfig } from '@/lib/strategy/trading-engine';

export function TradingControl() {
  const [engine, setEngine] = useState<TradingEngine | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [config, setConfig] = useState<TradingConfig>({
    mode: 'simulation',
    investmentPercentage: 50,
    profitTarget: 8,
    minVolumeKrw: 3000000000, // 30억
    enabled: false,
  });

  useEffect(() => {
    const tradingEngine = new TradingEngine(config);

    tradingEngine.on('started', () => {
      setIsRunning(true);
      console.log('Trading started');
    });

    tradingEngine.on('stopped', () => {
      setIsRunning(false);
      console.log('Trading stopped');
    });

    tradingEngine.on('order_filled', (data) => {
      console.log('Order filled:', data);
    });

    tradingEngine.on('position_opened', (data) => {
      console.log('Position opened:', data);
    });

    tradingEngine.on('position_closed', (data) => {
      console.log('Position closed:', data);
    });

    setEngine(tradingEngine);

    return () => {
      tradingEngine.stop();
    };
  }, []);

  const handleStart = async () => {
    if (engine && !isRunning) {
      const updatedConfig = { ...config, enabled: true };
      engine.updateConfig(updatedConfig);
      await engine.start();
    }
  };

  const handleStop = () => {
    if (engine && isRunning) {
      engine.stop();
    }
  };

  const handleEmergencyStop = async () => {
    if (engine) {
      await engine.emergencyStop();
      alert('긴급 정지 완료 - 모든 포지션이 청산되었습니다.');
    }
  };

  const handleConfigChange = (key: keyof TradingConfig, value: any) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    if (engine) {
      engine.updateConfig(newConfig);
    }
  };

  return (
    <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
      <h2 className="text-xl font-semibold mb-4">자동매매 제어</h2>

      {/* 모드 선택 */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">거래 모드</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              value="simulation"
              checked={config.mode === 'simulation'}
              onChange={(e) => handleConfigChange('mode', e.target.value)}
              className="w-4 h-4"
            />
            <span>시뮬레이션</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              value="live"
              checked={config.mode === 'live'}
              onChange={(e) => handleConfigChange('mode', e.target.value)}
              className="w-4 h-4"
            />
            <span className="text-red-500 font-semibold">실전 (주의)</span>
          </label>
        </div>
      </div>

      {/* 투자 비율 */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          투자 비율: {config.investmentPercentage}%
        </label>
        <input
          type="range"
          min="10"
          max="100"
          step="10"
          value={config.investmentPercentage}
          onChange={(e) => handleConfigChange('investmentPercentage', parseInt(e.target.value))}
          className="w-full"
        />
      </div>

      {/* 익절 목표 */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          익절 목표: {config.profitTarget}%
        </label>
        <input
          type="range"
          min="3"
          max="20"
          step="1"
          value={config.profitTarget}
          onChange={(e) => handleConfigChange('profitTarget', parseInt(e.target.value))}
          className="w-full"
        />
      </div>

      {/* 최소 거래대금 */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">
          최소 거래대금: {(config.minVolumeKrw / 100000000).toFixed(0)}억 원
        </label>
        <input
          type="range"
          min="1000000000"
          max="10000000000"
          step="1000000000"
          value={config.minVolumeKrw}
          onChange={(e) => handleConfigChange('minVolumeKrw', parseInt(e.target.value))}
          className="w-full"
        />
      </div>

      {/* 제어 버튼 */}
      <div className="flex gap-3">
        {!isRunning ? (
          <button
            onClick={handleStart}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            자동매매 시작
          </button>
        ) : (
          <button
            onClick={handleStop}
            className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            자동매매 중지
          </button>
        )}
        <button
          onClick={handleEmergencyStop}
          className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          긴급 정지
        </button>
      </div>

      {/* 상태 표시 */}
      <div className="mt-4 p-4 bg-gray-800 rounded-lg">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-green-500' : 'bg-gray-500'}`}></div>
          <span className="text-sm">
            {isRunning ? '자동매매 실행 중' : '대기 중'}
          </span>
        </div>
      </div>

      {/* 경고 메시지 */}
      {config.mode === 'live' && (
        <div className="mt-4 p-4 bg-red-900/30 border border-red-700 rounded-lg">
          <p className="text-red-400 text-sm font-semibold">
            ⚠️ 실전 모드입니다. 실제 자금으로 거래가 실행됩니다.
          </p>
        </div>
      )}
    </div>
  );
}
