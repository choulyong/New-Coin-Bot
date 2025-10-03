# 빗썸 AI 자동매매 봇

멀티레이어 전략 + ChatGPT 기반 실시간 암호화폐 자동매매 시스템

## 주요 기능

### 1. 멀티레이어 전략 분석
- **7단계 지표 종합 분석**
  - RSI (상대강도지수)
  - MACD (이동평균수렴확산)
  - Bollinger Bands (볼린저밴드)
  - Volume (거래량 분석)
  - Volatility (변동성 지표)
  - Sentiment (감성 분석)
  - Event Calendar (이벤트 캘린더)

### 2. AI Copilot (ChatGPT 통합)
- 전략 자동 생성
- 백테스트 결과 분석
- 시장 상황 요약 및 리스크 경고
- Guardrail 안전성 검증

### 3. 실시간 트레이딩
- 빗썸 실시간 WebSocket 데이터
- 자동 매수/매도 실행
- 8% 익절 목표 (조정 가능)
- 확신도 기반 손절 전략

### 4. 리스크 관리
- 투자 비율 조절 (10%~100%)
- 최소 거래대금 필터링
- 긴급 정지 기능
- 시뮬레이션/실전 모드

## 기술 스택

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Styling**: Tailwind CSS, Emotion CSS-in-JS
- **Charts**: Lightweight Charts (TradingView)
- **State**: Zustand, TanStack Query
- **Database**: Supabase (PostgreSQL), Drizzle ORM
- **Real-time**: WebSocket, Socket.io
- **AI**: OpenAI ChatGPT API (gpt-4o-mini)
- **Exchange**: Bithumb API v2

## 설치 및 실행

### 1. 환경변수 설정

`.env.local` 파일 생성:

```bash
# Bithumb API
BITHUMB_API_KEY=your_api_key
BITHUMB_API_SECRET=your_api_secret

# OpenAI
OPENAI_API_KEY=your_openai_key

# Supabase
DATABASE_URL=your_database_url
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# WebSocket
WS_PORT=3001
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 데이터베이스 마이그레이션

```bash
npm run db:generate
npm run db:push
```

### 4. 실행

```bash
# 웹 서버 실행
npm run dev

# WebSocket 서버 실행 (별도 터미널)
npm run ws-server
```

### 5. 접속

- 웹 애플리케이션: http://localhost:3000
- WebSocket 서버: ws://localhost:3001

## 프로젝트 구조

```
src/
├── app/                    # Next.js 앱 라우터
│   ├── page.tsx           # 메인 홈페이지
│   ├── dashboard/         # 실시간 대시보드
│   ├── strategy/          # 전략 분석 페이지
│   ├── backtest/          # 백테스트 페이지
│   └── api/               # API 엔드포인트
├── components/            # React 컴포넌트
│   ├── TradingControl.tsx
│   ├── TradingChart.tsx
│   └── ...
├── lib/
│   ├── bithumb/          # 빗썸 API 클라이언트
│   │   ├── client.ts     # REST API
│   │   └── websocket.ts  # WebSocket
│   ├── indicators/       # 기술 지표
│   │   └── technical.ts
│   ├── strategy/         # 트레이딩 전략
│   │   ├── multi-layer.ts
│   │   └── trading-engine.ts
│   ├── ai/               # AI Copilot
│   │   └── copilot.ts
│   └── db/               # 데이터베이스
│       └── schema.ts
└── server/               # WebSocket 서버
    └── websocket.ts
```

## 사용 방법

### 1. 실시간 대시보드
- 모든 빗썸 코인 실시간 시세 확인
- "코인명(한글명)" 형식으로 표시
- 거래대금/변동률 기준 정렬
- 검색 기능

### 2. 전략 분석
- "전체 코인 분석 시작" 버튼 클릭
- 각 코인의 7가지 지표 점수 확인
- 종합 점수 70점 이상 → 매수 시그널
- 차트 클릭으로 상세 보기

### 3. 자동매매
- 홈페이지에서 "자동매매 제어" 패널 설정
- 모드 선택: 시뮬레이션 또는 실전
- 투자 비율/익절 목표 설정
- "자동매매 시작" 클릭

### 4. 백테스트
- 코인, 기간, 초기 자본 설정
- "백테스트 시작" 클릭
- AI 분석 리포트 확인
- 거래 내역 및 성과 지표 검토

## 트레이딩 전략

### 진입 조건
1. 종합 점수 70점 이상
2. 확신도 게이트 통과 (sentiment confidence ≥ 0.5)
3. 거래대금 30억 원 이상
4. 심각한 bearish 이벤트 없음

### 청산 조건
1. **익절**: 8% 수익 달성 (조정 가능)
2. **손절**:
   - 강한 매도 시그널 (점수 30점 이하)
   - 확신도 하락
   - 심각한 bearish 이벤트 발생

### 리스크 관리
- 1회 투자 금액: 잔고의 10~100% (설정 가능)
- 긴급 정지: 모든 포지션 즉시 청산
- Circuit Breaker 내장

## API 엔드포인트

### GET /api/coins
모든 코인 정보 조회

### POST /api/analyze
```json
{
  "symbol": "BTC"
}
```

특정 코인 전략 분석

## WebSocket 이벤트

### Client → Server
- `subscribe`: 코인 구독
- `unsubscribe`: 구독 해제

### Server → Client
- `ticker`: 실시간 시세 업데이트
- `transaction`: 실시간 체결 데이터
- `error`: 에러 메시지

## 주의사항

⚠️ **실전 모드 사용 시**
- 실제 자금으로 거래가 실행됩니다
- 충분한 테스트 후 사용하세요
- API 키 관리에 주의하세요

⚠️ **Guardrails**
- 포지션 크기 최대 80%
- 손절/익절 필수
- 레버리지 사용 불가 (1x 고정)

## 라이선스

MIT License

## 개발자

빗썸 AI 트레이딩 봇 개발팀

---

**면책조항**: 이 소프트웨어는 교육 목적으로 제공됩니다. 실제 투자 시 발생하는 손실에 대해 개발자는 책임지지 않습니다.
