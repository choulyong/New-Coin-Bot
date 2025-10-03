# 멀티레이어 전략 파이프라인 가이드

## 1. 파이프라인 개요

1. **Layer 1 – 기술 지표**: RSI, MACD, Bollinger Bands, 이동평균선, 거래량 점수화.
2. **Layer 2 – 변동성**: ATR(14), 24시간 고저폭 대비 현재가 비율, 호가 잔량 비대칭, 거래량 스파이크.
3. **Layer 3 – 감성**: 한국어 뉴스/커뮤니티/SNS를 NLP로 분석, 확신도(confidence) 산출.
4. **Layer 4 – 이벤트**: 거시 경제 일정(FOMC 등), 빗썸 공지, 상장/상폐 및 정책 이벤트.
5. **신호 융합**: 각 계층 가중치(20/20/15/15/10/10/10 기본)를 적용해 종합 점수(0~100)와 확신도 값을 생성.
6. **확신도 게이트**: 감성·이벤트 확신도 < 0.5 또는 고위험 이벤트 감지 시 신규 진입 보류/포지션 축소.

## 2. 데이터 파이프라인

- **실시간 시세**: 빗썸 WebSocket `pubwss.bithumb.com/pub/ws`로 Ticker/Transaction 스트림을 수집 후 Redis TTL(60s) 캐시.
- **기술 지표 계산**: Lightweight 스태틱 함수(예: `calculateRSI(prices, 14)`) + 드리즐/Redis 조합으로 5분 분봉 등 생성.
- **변동성**: `calculateATR`, `computeOrderBookImbalance`, `volumeSpike` 함수를 비동기 호출.
- **감성 수집**: 한국어 데이터 공급처(뉴스 API, 커뮤니티 RSS, SNS) → 큐 → Kafka/Redis → NLP 서비스에서 감성 점수와 확신도 산출.
- **이벤트 캘린더**: ICS/JSON 기반 일정 저장, REST 크롤러가 빗썸 공지·거시 일정 업데이트.

### 예시 TypeScript 스니펫

```ts
const scores: IndicatorScores = {
  rsi: scoreRSI(rsi),
  macd: scoreMACD(macd, prevMACD),
  bollinger: scoreBollinger(currentPrice, bands),
  volume: scoreVolume(latestVolume, avgVolume),
  volatility: scoreVolatility(volSnapshot),
  sentiment: scoreSentiment(sentSnapshot),
  event: scoreEvent(events)
};

const confidenceOk = computeConfidenceGate(sentSnapshot, events);
const totalScore = calculateTotalScore(scores);
const shouldTrade = confidenceOk && totalScore >= 70;
```

## 3. Strategy Portfolio Manager

- **전략 슬롯**: `trend-momentum`, `grid-balance`, `sentiment-momentum` 최소 3개 구성.
- **배분 로직**: 기본 비중 + 점수 기반 가중치 + 변동성 클램프(`Math.max(0.5, 1 - atr * 10)`).
- **랭킹**: `score DESC`, 동률 시 `recommended.confidence DESC`.
- **로그 저장**: `strategy_executions` 테이블에 실행 기록, PnL, 확신도 저장.

### 실행 흐름

1. 후보 티커 분석 → 확신도 게이트 체크.
2. Portfolio Manager가 전략 추천 및 자본 배분 계산.
3. `shouldExecuteTrade(score, confidenceOk)` 통과 시 주문 실행.
4. 실행/청산 시 전략 로그 기록, AI Copilot에 결과 전송.

## 4. 위험 관리

- **위험 이벤트**: 이벤트 계층에서 영향도 `bearish` & `high` & confidence ≥ 0.7 → 즉시 포지션 축소.
- **과최적화 방지**: 워크포워드/시멘틱 테스트, 백테스트 성과 하락 20% 이상 시 파라미터 재튜닝.
- **재튜닝 파이프라인**: 전략별 월간 손익률·MDD·샤프 수집 후 자동 LLM 리포트 생성.

## 5. 백테스트 & 실전 전환

| 단계 | 기간 | 조건 |
|------|------|------|
| 백테스트 | 3개월 이상 데이터 | 샤프 ≥ 1.5, MDD ≤ 15% |
| 시뮬레이션 | 최소 30일 | 실시간 스트림 + 전략 자동 전환 검증 |
| 소액 실전 | 14일 | 확신도 이벤트 대응 로그 확인 |
| 전체 전환 | 이후 | 긴급 정지·알림 등 실전 시나리오 점검 |

## 6. 대시보드 연동

- 실시간 점수/확신도/전략 추천을 Socket.io 채널 `signal_update`로 푸시.
- 감성 타임라인, 이벤트 일정, 전략 슬롯 상태를 별도 패널로 시각화.

## 7. TODO 체크리스트

- [ ] Redis Streams로 감성/이벤트 데이터 버퍼 구축.
- [ ] `StrategyPortfolioManager` 서비스/테스트 구현.
- [ ] LLM Copilot → 전략 제안 & 실행 로그 저장 자동화.
- [ ] 대시보드에 확신도 게이지/위험 이벤트 배너 표시.
