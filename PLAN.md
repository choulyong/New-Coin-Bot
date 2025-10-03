# Implementation Plan: Bithumb Auto Trading Bot

## 프로젝트 개요

빗썸 거래소 기반 실시간 자동 매매 시스템 구축 프로젝트

**기술 스택**: Next.js 14 + Supabase + Radix UI + Emotion + Drizzle ORM + Upstash Redis

**목표**: 다중 기술 지표 기반 점수화 시스템으로 8% 익절 자동 매매

---

## Phase 1: 기반 구축 (Week 1-2)

### 1.1 프로젝트 초기 설정
- [x] Git 저장소 초기화
- [x] PRD, LLD, PLAN 문서 작성
- [x] Next.js 14 프로젝트 생성 (App Router)
- [x] TypeScript 5.3+ 설정
- [x] ESLint + Prettier 구성
- [ ] Dev Container 설정 (docker-compose.yml)

### 1.2 Supabase 설정
- [x] Supabase 프로젝트 생성 (완료: xhzqhvjkkfpeavdphoit)
- [x] Drizzle ORM 설치 및 설정
- [x] DB 스키마 정의 (schema.ts)
  - [x] users, trading_configs, trading_signals
  - [x] orders, positions, market_data
  - [x] backtest_results, simulation_balances
- [x] 마이그레이션 생성 및 실행
- [ ] Seed 데이터 작성

### 1.3 빗썸 API 연동
- [x] 빗썸 Public API 클라이언트 구현
  - [x] 시세 조회 (/public/ticker)
  - [x] 호가 조회 (/public/orderbook)
  - [x] 체결 내역 (/public/transaction_history)
  - [x] 캔들 데이터 (/public/candlestick)
- [x] 빗썸 Private API 클라이언트 구현
  - [x] HMAC-SHA512 인증 구현
  - [x] 잔고 조회 (/info/balance)
  - [x] 주문 등록 (/trade/place)
  - [x] 주문 조회/취소
- [x] WebSocket 연결 관리
  - [x] wss://pubwss.bithumb.com/pub/ws 연결
  - [x] 실시간 시세 구독
  - [x] Heartbeat 구현
  - [x] 자동 재연결 로직
- [x] Rate Limiting 처리
  - [x] Queue 방식 구현
  - [x] Public API: 초당 10회 제한
  - [x] Private API: 초당 8회 제한

### 1.4 Redis 캐시 설정
- [ ] Upstash Redis 계정 생성
- [ ] Redis 클라이언트 설정
- [ ] 캐싱 전략 구현
  - [ ] 시세 데이터 (TTL 60초)
  - [ ] 호가 데이터 (TTL 10초)
  - [ ] 지표 계산 결과 (TTL 5분)

### 1.5 기본 UI 구조
- [x] Radix UI + Emotion 설정
- [x] 공통 컴포넌트
  - [x] Button, Input, Select
  - [x] Card, Table, Modal
  - [x] Toast (알림)
- [x] 레이아웃
  - [x] 사이드바 네비게이션
  - [x] 헤더 (모드 전환 토글)
  - [x] 메인 컨텐츠 영역
- [ ] 인증 페이지
  - [ ] Supabase Auth 연동
  - [ ] 로그인/회원가입

### 1.6 전략 프레임워크 준비
- [x] 멀티레이어 신호 파이프라인 기본 구조 정의 (기술/변동성/감성/이벤트 계층)
- [x] Drizzle 스키마 확장 (strategy_slots, strategy_executions, trading_signals.confidence)
- [x] Strategy Portfolio Manager 골격 구현 (전략 슬롯/자본 배분 로직)
- [x] AI Strategy Copilot PoC 설계 (LLM 프롬프트, 로그 구조)
- [x] 확신도 게이트/리스크 가드 레일 정의

**완료 기준**:
✅ 빗썸 API로 실시간 시세 조회 가능
✅ WebSocket 연결 안정적
✅ 기본 UI 렌더링
✅ 인증 시스템 작동
✅ 전략 파이프라인 기본 골격 가동

---

## Phase 2: 시장 데이터 & 지표 엔진 (Week 3-4)

### 2.1 Market Data Service
- [ ] 실시간 데이터 수집 서비스
  - [ ] WebSocket 메시지 파싱
  - [ ] 시세 업데이트 이벤트 발행
  - [ ] 체결 데이터 처리
- [ ] 캔들 데이터 관리
  - [ ] 1분/5분/15분/1시간/일봉 생성
  - [ ] DB 저장 (market_data 테이블)
  - [ ] Redis 캐싱
- [ ] 거래대금 Top 30 조회
  - [ ] 실시간 정렬
  - [ ] 30억 원 이상 필터링

### 2.2 기술 지표 엔진
- [x] RSI (Relative Strength Index)
  - [x] 계산 함수 구현 (14일 기준)
  - [x] 점수화 로직 (0-100점)
  - [x] 단위 테스트
- [x] MACD (Moving Average Convergence Divergence)
  - [x] EMA 계산 (12, 26)
  - [x] Signal Line (9일 EMA)
  - [x] 히스토그램 계산
  - [x] 골든크로스/데드크로스 감지
  - [x] 점수화 로직
  - [x] 단위 테스트
- [x] Bollinger Bands
  - [x] SMA 계산 (20일)
  - [x] 표준편차 계산
  - [x] 상단/하단 밴드 계산
  - [x] 점수화 로직
  - [x] 단위 테스트
- [x] 이동평균선 (Moving Average)
  - [x] 5일, 20일, 60일, 120일 MA
  - [x] 정배열/역배열 판단
- [x] 거래량 분석
  - [x] 평균 거래량 계산 (20일)
  - [x] 거래량 급증 감지 (1.5배, 2배, 3배)
  - [x] 점수화 로직

### 2.3 Signal Generator
- [x] 지표 통합 분석
  - [x] 개별 지표 점수 계산
  - [x] 가중치 적용 (RSI 20%, MACD 20%, Bollinger 15%, 거래량 15%, 변동성 10%, 감성 10%, 이벤트 10%)
  - [x] 종합 점수 산출 (0-100) 및 Confidence Score
- [x] 시그널 결정
  - [x] 70점 이상: 강한 매수
  - [x] 30-70점: 보유 (중립)
  - [x] 30점 이하: 매도
- [x] DB 저장
  - [x] trading_signals 테이블에 저장
  - [x] 지표 상세 값 JSON + 계층별 확신도 저장

### 2.4 멀티레이어 확장
- [x] 변동성 계층 엔진 (ATR, 주문잔량, 24h 고저폭)
- [x] 감성 수집 파이프라인 (뉴스/커뮤니티/SNS, 한국어 NLP)
- [x] 이벤트 캘린더 서비스 (거시 일정 + 거래소 공지)
- [x] 확신도 게이트 구현 및 경보 규칙 정의
- [x] Strategy Portfolio Manager 연동 (전략 추천/랭킹)
- [x] 멀티 소스 데이터 캐싱/Rate Limit 설계

### 2.5 차트 대시보드
- [x] Lightweight Charts 통합
  - [x] 라이브러리 설치 및 설정
  - [x] TradingView 스타일 적용
- [x] 캔들스틱 차트
  - [x] 실시간 업데이트
  - [x] 1분/5분/15분/1시간/일봉 전환
  - [x] 줌/팬 기능
- [x] 지표 오버레이
  - [x] RSI 서브차트 (0-100 범위)
  - [x] MACD 서브차트 (히스토그램 + 시그널)
  - [x] Bollinger Bands (메인 차트)
  - [x] 이동평균선 (메인 차트, 5/20/60/120일)
- [x] 거래량 차트
  - [x] 막대 그래프
  - [x] 평균 거래량 라인
- [x] 시그널 마커
  - [x] 매수 시그널: 초록 화살표 ↑
  - [x] 매도 시그널: 빨간 화살표 ↓
  - [x] 점수 라벨 표시

### 2.6 실시간 WebSocket 통신
- [x] Socket.io 서버 구현
  - [x] Express 서버 생성
  - [x] CORS 설정
- [x] 이벤트 정의
  - [x] subscribe_ticker
  - [x] subscribe_signals
  - [x] ticker_update
  - [x] signal_generated
- [x] 클라이언트 연결
  - [x] Socket.io Client 설정
  - [x] 자동 재연결
  - [x] 에러 핸들링

**완료 기준**:
✅ 모든 지표가 정확히 계산됨 (단위 테스트 통과)
✅ 변동성/감성/이벤트 계층 데이터가 수집·점수화됨
✅ 확신도 게이트와 Strategy Portfolio Manager가 시뮬레이션에서 동작
✅ 실시간 차트에 지표와 시그널 마커가 표시됨
✅ WebSocket으로 실시간 업데이트

---

## Phase 3: 자동 매매 시스템 (Week 5-6)

### 3.1 Trading Engine Core
- [x] TradingEngine 클래스 구현
  - [x] EventEmitter 상속
  - [x] start/stop 메서드
  - [x] 메인 루프 (5초마다)
- [x] 코인 선정 로직
  - [x] 거래대금 30억+ 필터링
  - [x] Top 30 코인 분석
  - [x] 최고 점수 코인 선택
- [x] 포지션 관리
  - [x] 현재 포지션 조회
  - [x] 포지션 오픈/클로즈
  - [x] 실시간 P&L 계산

### 3.2 매매 전략 구현
- [x] 매수 로직
  - [x] 시그널 점수 70점 이상 체크
  - [x] 투자금 계산 (잔고 × 투자 비율)
  - [x] 수량 계산 (투자금 / 현재가)
- [x] 익절 로직
  - [x] 수익률 계산 (현재가 - 매수가) / 매수가 × 100
  - [x] 8% 도달 시 자동 매도
  - [x] 체결 확인
- [x] 손절 로직
  - [x] 시그널 점수 30점 이하 체크
  - [x] 강한 매도 시그널 시 손절
  - [x] 최소화 원칙 (보수적 손절)

### 3.3 전략 포트폴리오 & AI Copilot
- [x] StrategyPortfolioManager 서비스 구현
  - [x] 전략 슬롯 CRUD (trend/grid/sentiment)
  - [x] 자본 배분 로직 (점수·변동성 기반 가중)
  - [x] 후보 랭킹/전략 추천 알고리즘
- [x] AI Strategy Copilot 연동
  - [x] LLM 프롬프트/시스템 메시지 확정
  - [x] 전략 제안 로그/결과 추적
  - [x] 사용자 목표 기반 전략 생성 UI 연동
- [x] 확신도 게이트 적용
  - [x] 감성/이벤트 확신도 <0.5 시 신호 차단
  - [x] 위험 이벤트 발생 시 자동 축소 로직
- [x] 전략 실행 로그 수집 (strategy_executions 테이블)

### 3.4 Order Executor
- [x] 주문 실행 클래스
  - [x] 실전/시뮬레이션 모드 분기
  - [x] 주문 검증 (잔고, 최소 금액 등)
- [x] 실전 주문
  - [x] 빗썸 API 주문 등록
  - [x] 체결 상태 추적
  - [x] 주문 ID 저장
- [x] 시뮬레이션 주문
  - [x] 가상 잔고 업데이트
  - [x] 현재가 기준 체결 처리
  - [x] simulation_balances 테이블 업데이트
- [x] 수수료 계산
  - [x] 0.04% 자동 계산
  - [x] 주문 금액에 반영

### 3.5 Risk Manager
- [x] 리스크 체크
  - [x] 일일 최대 손실 한도 (초기 자금 5%)
  - [x] 포지션 크기 제한 (최대 80%)
  - [x] 최소 현금 보유 (20%)
- [x] Circuit Breaker
  - [x] 연속 실패 5회 시 자동 중지
  - [x] 1분 후 재시도
- [x] 긴급 정지
  - [x] 모든 포지션 즉시 청산
  - [x] 시장가 매도
  - [x] 자동 매매 중지

### 3.6 포트폴리오 대시보드
- [x] 현재 포지션 표시
  - [x] 코인 심볼 / 수량
  - [x] 매수 평균가
  - [x] 현재가 / 실시간 업데이트
  - [x] 평가 손익 (원화 / 퍼센트)
- [x] 잔고 현황
  - [x] 가용 현금
  - [x] 투자 중 금액
  - [x] 총 자산
  - [x] 수익률 차트
- [x] 거래 내역
  - [x] 최근 20개 주문
  - [x] 체결 가격 / 수량
  - [x] 수수료
  - [x] 상태 (체결/대기/취소)

### 3.7 모드 전환 UI
- [x] 실전/시뮬레이션 토글
  - [x] 헤더에 스위치 버튼
  - [x] 경고 모달 (실전 모드 전환 시)
- [x] 시뮬레이션 모드
  - [x] 가상 잔고 1천만 원 기본값
  - [x] "SIMULATION" 워터마크
- [x] 실전 모드
  - [x] 빗썸 API 키 입력
  - [x] 실제 잔고 조회
  - [x] "LIVE TRADING" 경고 배너

**완료 기준**:
✅ 시뮬레이션 모드에서 자동 매매 정상 작동
✅ 8% 익절 자동 실행
✅ 포트폴리오 대시보드 실시간 업데이트
✅ 긴급 정지 버튼 작동
✅ 전략 포트폴리오 자동 전환 및 AI Copilot 로그 검증

---

## Phase 4: 백테스팅 & 최적화 (Week 7-8)

### 4.1 백테스팅 엔진
- [x] BacktestEngine 클래스 구현
  - [x] 과거 데이터 로드
  - [x] 시뮬레이션 루프
  - [x] 거래 기록
- [x] 과거 데이터 수집
  - [x] 빗썸 API에서 과거 캔들 다운로드
  - [x] 최소 3개월 데이터
  - [x] DB 저장
- [x] 동일 로직 적용
  - [x] 실전과 동일한 지표 계산
  - [x] 동일한 시그널 생성
  - [x] 동일한 매매 전략
- [x] 수수료/슬리피지 반영
  - [x] 0.04% 수수료
  - [x] 0.3% 슬리피지 가정

### 4.2 성과 메트릭 계산
- [x] 수익률 분석
  - [x] 총 수익률 (%)
  - [x] 연환산 수익률
  - [x] 월별 수익률
- [x] 리스크 지표
  - [x] MDD (Maximum Drawdown)
  - [x] Sharpe Ratio
  - [x] Sortino Ratio
- [x] 거래 통계
  - [x] 총 거래 횟수
  - [x] 승률 (%)
  - [x] 손익비 (Avg Win / Avg Loss)
  - [x] 평균 보유 기간
- [x] DB 저장
  - [x] backtest_results 테이블
  - [x] 거래 상세 JSON

### 4.3 백테스팅 UI
- [x] 설정 패널
  - [x] 기간 선택 (날짜 피커)
  - [x] 초기 자금 입력
  - [x] 익절 목표 (%)
  - [x] 지표 가중치 슬라이더
- [x] 실행 버튼
  - [x] 백테스팅 시작
  - [x] 진행률 표시
  - [x] 취소 버튼
- [x] 결과 차트
  - [x] 자산 곡선 (Equity Curve)
  - [x] 드로다운 차트
  - [x] 거래 마커 (매수/매도)
- [x] 통계 테이블
  - [x] 주요 지표 요약
  - [x] 거래 상세 내역 (펼치기)
- [x] 결과 저장/공유
  - [x] 백테스트 결과 저장
  - [x] 이름 지정
  - [x] 목록에서 재조회

### 4.4 전략 최적화
- [ ] 파라미터 튜닝 UI
  - [ ] 지표 가중치 조정
  - [ ] 익절 목표 변경
  - [ ] 최소 거래대금 조정
- [ ] A/B 테스트
  - [ ] 여러 전략 동시 백테스트
  - [ ] 결과 비교 차트
  - [ ] 최적 전략 선택
- [ ] 자동 최적화
  - [ ] Grid Search
  - [ ] 최고 수익률 조합 찾기

### 4.5 리스크 관리 강화
- [ ] 최대 손실 한도 설정
  - [ ] 일일 한도 (기본 5%)
  - [ ] 주간 한도
  - [ ] 월간 한도
- [ ] 포지션 크기 조정
  - [ ] 변동성 기반 조정
  - [ ] Kelly Criterion 적용
- [ ] 알림 시스템
  - [ ] 거래 체결 알림
  - [ ] 익절/손절 알림
  - [ ] 한도 도달 알림
  - [ ] 이메일/브라우저 푸시

**완료 기준**:
✅ 백테스팅 결과가 신뢰할 수 있음 (3개월 데이터)
✅ 성과 메트릭 정확히 계산
✅ 전략 최적화 기능 작동
✅ 알림 시스템 작동

---

## Phase 5: 고급 기능 & 배포 (Week 9-10)

### 5.1 고급 기능
- [ ] 다중 전략 지원
  - [ ] 공격적/보수적 전략 프리셋
  - [ ] 사용자 정의 전략 저장
- [ ] 시장 상황 감지
  - [ ] 추세 시장 (Trending)
  - [ ] 횡보 시장 (Sideways)
  - [ ] 전략 자동 전환
- [ ] 자동 리밸런싱
  - [ ] 주기적 포트폴리오 재조정
  - [ ] 수익 실현 후 재투자
- [ ] 통계 분석
  - [ ] 일/주/월별 성과 리포트
  - [ ] 코인별 수익률 분석
  - [ ] 지표별 기여도 분석

### 5.2 모니터링 & 로깅
- [ ] Loki + Grafana 설정
  - [ ] Docker Compose 구성
  - [ ] Loki 설정 파일
  - [ ] Grafana 데이터소스 연결
- [ ] 로깅 시스템
  - [ ] Winston Logger 설정
  - [ ] Loki Transport 추가
  - [ ] 구조화된 로그 (JSON)
- [ ] Grafana 대시보드
  - [ ] 거래 로그 패널
  - [ ] 에러 로그 패널
  - [ ] 성능 메트릭 (API 응답시간 등)
- [ ] Sentry 에러 추적
  - [ ] Sentry 프로젝트 생성
  - [ ] Next.js 통합
  - [ ] 에러 알림 설정

### 5.3 성능 최적화
- [ ] 프론트엔드 최적화
  - [ ] Code Splitting
  - [ ] 이미지 최적화
  - [ ] 번들 크기 분석
- [ ] 백엔드 최적화
  - [ ] DB 쿼리 최적화 (인덱스)
  - [ ] Redis 캐싱 확대
  - [ ] N+1 쿼리 제거
- [ ] WebSocket 최적화
  - [ ] 메시지 압축
  - [ ] 배치 업데이트
  - [ ] Throttle/Debounce

### 5.4 보안 강화
- [ ] API 키 관리
  - [ ] Supabase Vault 통합
  - [ ] 암호화 저장
  - [ ] 환경변수 분리
- [ ] 주문 검증 강화
  - [ ] 최소/최대 금액 체크
  - [ ] 중복 주문 방지
  - [ ] 슬리피지 제한
- [ ] Rate Limiting
  - [ ] API 엔드포인트 제한
  - [ ] DDoS 방어

### 5.5 배포
- [ ] 환경 설정
  - [ ] .env.example 작성
  - [ ] 환경변수 문서화
- [ ] Vercel 배포 (Frontend)
  - [ ] vercel.json 설정
  - [ ] 빌드 명령어 확인
  - [ ] 도메인 연결
- [ ] Railway 배포 (WebSocket Server)
  - [ ] Dockerfile 작성
  - [ ] railway.yml 설정
  - [ ] Health Check 엔드포인트
- [ ] CI/CD 파이프라인
  - [ ] GitHub Actions 워크플로우
  - [ ] 자동 테스트
  - [ ] 자동 배포

### 5.6 문서화
- [ ] API 문서
  - [ ] Swagger/OpenAPI 스펙
  - [ ] 엔드포인트 설명
  - [ ] 요청/응답 예시
- [ ] 사용자 가이드
  - [ ] 설치 방법
  - [ ] 설정 방법 (API 키 등)
  - [ ] 사용 방법 (차트, 백테스팅)
- [ ] 트레이딩 전략 문서
  - [ ] 지표 설명
  - [ ] 점수화 로직 설명
  - [ ] 매매 전략 설명
- [ ] 개발자 문서
  - [ ] 아키텍처 설명
  - [ ] 코드 구조
  - [ ] 기여 가이드

**최종 완료 기준**:
✅ 실전 모드에서 안정적 작동
✅ 모니터링 시스템 작동
✅ 배포 완료 (Vercel + Railway)
✅ 문서화 완료

---

## 진행 현황

### 전체 Phase 체크리스트
- [x] **Phase 0**: 문서 작성 (PRD, LLD, PLAN) ✅
- [x] **Phase 1**: 기반 구축 (Week 1-2) ✅
- [x] **Phase 2**: 시장 데이터 & 지표 엔진 (Week 3-4) ✅
- [x] **Phase 3**: 자동 매매 시스템 (Week 5-6) ✅
- [x] **Phase 4**: 백테스팅 & 최적화 (Week 7-8) ✅ (백테스팅 UI 완료)
- [ ] **Phase 5**: 고급 기능 & 배포 (Week 9-10)

**현재 단계**: Phase 4 완료, Phase 5 진행 중
**다음 작업**: 최종 테스팅 및 배포 준비

---

## 마일스톤

| Phase | 목표 | 기간 | 완료일 |
|-------|------|------|--------|
| 0 | 문서 작성 | - | 2024-10-04 |
| 1 | 기반 구축 | Week 1-2 | - |
| 2 | 지표 & 차트 | Week 3-4 | - |
| 3 | 자동 매매 | Week 5-6 | - |
| 4 | 백테스팅 | Week 7-8 | - |
| 5 | 배포 | Week 9-10 | - |

---

## 리스크 관리

### 주요 리스크
1. **빗썸 API 장애**
   - 대응: WebSocket 재연결, REST API fallback
   - 모니터링: 연결 상태 체크

2. **지표 계산 오류**
   - 대응: 단위 테스트 철저히
   - 검증: 실제 차트와 비교

3. **수익률 미달**
   - 대응: 백테스팅으로 사전 검증
   - 최적화: 파라미터 튜닝

4. **보안 이슈**
   - 대응: API 키 암호화 저장
   - 검증: 주문 검증 강화

### 품질 기준
- **테스트 커버리지**: 80% 이상
- **API 응답시간**: 1초 이내
- **차트 렌더링**: 60 FPS
- **백테스팅 정확도**: 오차 < 1%

---

## GitHub 커밋 전략

### 커밋 컨벤션
```
[Phase N] feat: 기능 설명
[Phase N] fix: 버그 수정
[Phase N] docs: 문서 업데이트
[Phase N] refactor: 리팩토링
[Phase N] test: 테스트 추가
```

### 브랜치 전략
- `main`: 배포 브랜치
- `develop`: 개발 브랜치
- `feature/phase-N-xxx`: 기능 브랜치

### Phase 완료 시
1. PLAN.md 체크리스트 업데이트
2. 커밋 & 푸시
3. PR 생성 및 리뷰
4. `develop`에 머지
5. 다음 Phase 시작

---

**작성일**: 2024-10-04
**최종 수정**: 2024-10-04
