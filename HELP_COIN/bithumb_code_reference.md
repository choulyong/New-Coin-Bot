# Bithumb Code Reference

이 문서는 `python-bithumb`, `pybithumb`, `bithumb-ai-trader` 패키지에서 재사용하기 좋은 핵심 소스 코드를 정리한 것입니다. 각 항목은 파일 경로와 시작 줄 번호를 포함하므로 코드 작성 시 직접 인용하거나 참고할 수 있습니다.

## python-bithumb (REST v1 래퍼)
- **일관된 에러 처리:** `BithumbAPIException`과 `_handle_response`는 HTTP 오류와 빗썸 에러 본문을 파싱해 명시적인 예외를 발생시킵니다. (참조: `python-bithumb/python_bithumb/public_api.py:5`, `:20`)
- **배치 OHLCV 수집:** `get_ohlcv`는 최대 200개씩 반복 호출하여 데이터프레임으로 합치고 컬럼명을 정규화합니다. 장기 히스토리 수집 시 그대로 활용 가능합니다. (참조: `python-bithumb/python_bithumb/public_api.py:51`)
- **멀티 티커 실시간가:** `get_current_price`는 단일·복수 마켓 인자를 모두 처리하고 숫자형으로 변환합니다. 가격 조회 유틸로 재사용하기 좋습니다. (참조: `python-bithumb/python_bithumb/public_api.py:117`)
- **호가 구조 체계화:** `get_orderbook`는 원본 응답을 정제해 딕셔너리 구조를 반환하므로, 매수·매도 잔량 비교 로직에 바로 적용할 수 있습니다. (참조: `python-bithumb/python_bithumb/public_api.py:147`)
- **JWT 사인 포함 사설 API 래퍼:** `Bithumb` 클래스는 쿼리 해시 생성, 토큰 발급, 요청 공통 처리를 캡슐화합니다. 인증 요청을 붙일 때 이 클래스를 감싸 재사용하면 됩니다. (참조: `python-bithumb/python_bithumb/private_api.py:11`, `:91`)
- **주문/정산 유틸:** `buy_limit_order`, `sell_market_order`, `get_order_chance`, `cancel_order` 등은 엔드포인트별 파라미터 구성을 보여줍니다. 새 기능 추가 시 포맷 참고 용도로 활용하세요. (참조: `python-bithumb/python_bithumb/private_api.py:185`, `:213`, `:241`, `:363`)
- **리스트 파라미터 서명 예시:** `get_orders`는 `states[]`, `uuids[]` 처럼 배열 쿼리를 직접 구성해 SHA512 해시를 만드는 패턴을 담고 있습니다. 배열 파라미터가 필요한 다른 API에도 동일한 방식으로 적용 가능합니다. (참조: `python-bithumb/python_bithumb/private_api.py:277`)

> ⚠️ 네트워크 타임아웃과 재시도 로직이 없으므로 실서비스에서는 `requests` 호출에 `timeout`과 백오프를 추가하는 것이 안전합니다.

## pybithumb (레거시 REST + WebSocket)
- **공용/사설 엔드포인트 맵:** `PublicApi`와 `PrivateApi` 클래스가 구 REST 경로(`/public/...`, `/trade/...`)를 정리하고 있습니다. 구버전 엔드포인트 호환이 필요할 때 참고하세요. (참조: `pybithumb/pybithumb/core.py:11`, `:43`)
- **세션 재시도 래퍼:** `HttpMethod._requests_retry_session`은 `requests`와 `urllib3.Retry`를 이용해 공통 세션 재시도 설정을 보여줍니다. 새 HTTP 래퍼에도 그대로 이식 가능합니다. (참조: `pybithumb/pybithumb/core.py:78`)
- **시그니처 생성:** `BithumbHttp._signature`는 nonce, 엔드포인트, 파라미터를 결합해 HMAC-SHA512 서명을 생성하는 예시입니다. 레거시 인증이 필요한 경우 활용하세요. (참조: `pybithumb/pybithumb/core.py:119`)
- **고정 소수 처리:** `Bithumb._convert_unit`는 주문 수량을 소수점 네 자리로 내림 처리합니다. 주문 단위 제약이 있는 자산에 그대로 적용할 수 있습니다. (참조: `pybithumb/pybithumb/client.py:12`)
- **일괄 오더 헬퍼:** `buy_limit_order`, `sell_market_order`, `cancel_order` 등은 주문/취소 요청 페이로드 구성을 정리해 두었습니다. 다른 마켓에 맞춰 파라미터만 교체하면 됩니다. (참조: `pybithumb/pybithumb/client.py:215`, `:311`, `:295`)
- **웹소켓 프로세스 매니저:** `WebSocketManager`는 `multiprocessing.Process` 기반으로 빗썸 실시간 데이터를 큐에 적재합니다. 실시간 시세 수집 파이프라인에 사용할 수 있는 기본 골격입니다. (참조: `pybithumb/pybithumb/websocket.py:7`)

> ⚠️ 응답은 구 REST 명세 기반이라 최신 빗썸 API와 필드 구성이 다를 수 있습니다. 실제 호출 전에 엔드포인트 지원 여부를 확인하세요.

## bithumb-ai-trader (자동 매매 예제)
- **SQLite 거래 로그:** `init_db`와 `log_trade`는 단일 파일 DB로 거래 이력을 저장하는 최소 스키마를 제공합니다. 간단한 백테스트나 결과 기록에 바로 재사용할 수 있습니다. (참조: `bithumb-ai-trader/autotrade.py:28`, `:45`)
- **최근 거래 조회:** `get_recent_trades`는 정렬·리미트 예시를 포함해 JSON 유사 구조로 가공합니다. 대시보드/프롬프트 자료 구성에 활용하세요. (참조: `bithumb-ai-trader/autotrade.py:61`)
- **뉴스 & 텔레그램 통합:** `get_bitcoin_news`는 SerpAPI 호출 패턴, `send_telegram_message`/`run_async`는 비동기 봇 호출을 동기 코드와 섞는 방법을 보여줍니다. (참조: `bithumb-ai-trader/autotrade.py:81`, `:110`, `:117`)
- **AI 의사결정 파이프라인:** `get_ai_decision`은 시계열·뉴스·잔고 데이터를 한 번에 JSON으로 묶어 OpenAI Chat Completions에 전달하는 구조로, 프롬프트 설계 참고용입니다. (참조: `bithumb-ai-trader/autotrade.py:131`)
- **거래 실행 시나리오:** `execute_trade`는 AI 결과에 따라 주문금액을 스케일링하고 텔레그램 알림, 거래 기록까지 처리합니다. 실거래 자동화 로직 설계 시 체크리스트로 이용할 수 있습니다. (참조: `bithumb-ai-trader/autotrade.py:232`)
- **스케줄링 패턴:** `run_scheduler`는 `schedule` 기반으로 하루 여러 회 실행 예시를 제공합니다. 주기적 작업을 붙일 때 템플릿으로 사용하세요. (참조: `bithumb-ai-trader/autotrade.py:346`)
- **즉시 주문 스크립트:** `order_now.py`는 최소 금액 시장가 주문과 텔레그램 알림을 엮은 단순 실행 예시입니다. 수동 개입용 스크립트 작성에 참고할 수 있습니다. (참조: `bithumb-ai-trader/order_now.py:1`)
- **대시보드 UI:** `streamlit_app.py`는 거래 로그를 시계열 지표와 표로 시각화하며, Plotly 커스터마이징과 Streamlit 구성 패턴을 제공합니다. (참조: `bithumb-ai-trader/streamlit_app.py:1`)

> ⚠️ `.env` 기반 비밀키 로딩과 하드코딩된 스케줄(예: 03:17 실행)이 포함되어 있으니 재사용 시 환경 변수와 트리거 시간을 별도 설정값으로 분리하는 것이 좋습니다.

## 다음 작업 아이디어
1. `python-bithumb` 기반 요청 유틸에 공통 타임아웃/재시도 옵션 추가
2. `bithumb-ai-trader`의 주문 금액·스케줄을 환경설정화하고 예외 로깅 보강
3. `WebSocketManager`를 활용한 실시간 체결 데이터 수집 워커 작성
