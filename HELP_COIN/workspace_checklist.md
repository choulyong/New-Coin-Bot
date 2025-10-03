# 구현 체크리스트 (HELP_COIN)

## Phase 1 – 기반 구축

- [ ] Next.js 15.x 프로젝트 생성(App Router, RSC) 및 Turbopack 빌드 검증.
- [ ] Dev Container / Docker Compose로 Node.js 22 LTS 환경 고정.
- [ ] Supabase 드리즐 스키마에 `strategy_slots`, `strategy_executions`, `trading_signals.confidence` 반영.
- [ ] Redis(Upstash) 연결: 실시간 시세/감성/이벤트 TTL 캐시 설정.
- [ ] 기본 UI(레이아웃, 인증, 전략 보드) 뼈대 구현.

## Phase 2 – 데이터 & 지표

- [ ] 빗썸 WebSocket 수집기 구축, `market_data` 테이블/캐시 업데이트.
- [ ] Layer 1~4 지표 계산 서비스 및 단위 테스트 통과.
- [ ] 확신도 게이트/이벤트 경보 로직 구현.
- [ ] Socket.io 채널로 종합 점수/전략 추천 브로드캐스트.

## Phase 3 – 자동 매매

- [ ] Strategy Portfolio Manager → 전략 추천/자본 배분/추가 로그 저장.
- [ ] Order Executor → 지정가/시장가 주문, 슬리피지/수수료 반영.
- [ ] Risk Manager → 일일 손실 한도, Circuit Breaker, 긴급 정지 버튼.
- [ ] AI Copilot → 전략 생성/검증/로그 연계 및 Guardrail 검증.

## Phase 4 – 백테스트/모니터링

- [ ] 백테스트 엔진 워크포워드/시뮬레이션 파이프라인 자동화.
- [ ] 전략별 KPI 대시보드 (월간 손익률, MDD, 샤프, 확신도).
- [ ] Loki/Grafana로 주문/오류/AI 로그 모니터링.

## 운영 수칙

- [ ] API Key와 Secret은 Secrets Manager/환경변수에서만 접근.
- [ ] 빗썸 요청 실패(HTTP 4xx/5xx) 시 재시도 + Slack 알림.
- [ ] Copilot 응답 스키마 검증 실패 → 재요청 및 관리자 알림.
- [ ] 시장 위험 이벤트 감지 시 포지션 축소/거래 중지 자동화.
