# 빗썸 API v2.0 통합 가이드

본 문서는 빗썸 API v2.x(2025년 10월 기준) 기반으로 자동매매/대시보드를 구축하기 위한 핵심 지침을 정리합니다. 반드시 운영 전 빗썸 공식 문서와 공지사항을 교차 확인하세요.

## 1. API 키 발급 및 권한 설정

1. 빗썸 웹 > `MY PAGE` > `API 관리`에서 API 키 생성.
2. 권한 옵션: 지갑 정보, 주문, 매수, 매도, 주문 취소, 거래 내역, 출금 등 7가지. 필요한 권한만 체크.
3. 이메일/SMS 이중 인증 후 활성화. Secret Key는 재발급 불가이므로 안전한 비밀 저장소에 보관.
4. IP 화이트리스트 사용 권장.

> 참고: 공식 고객지원 가이드에서 API 발급 프로세스 및 권한 종류를 확인할 수 있습니다.

## 2. 인증 헤더 구성

빗썸 Private API는 HMAC-SHA512 기반 서명을 사용합니다.

```python
import base64
import hashlib
import hmac
import time
from urllib.parse import urlencode

API_KEY = "..."
API_SECRET = "..."  # base64 인코딩된 문자열

def sign(payload: dict, endpoint: str) -> dict:
    nonce = str(int(time.time() * 1000))
    payload['nonce'] = nonce
    qs = urlencode(payload)
    data = endpoint + chr(0) + qs
    signature = hmac.new(base64.b64decode(API_SECRET), data.encode(), hashlib.sha512)
    headers = {
        'Api-Key': API_KEY,
        'Api-Sign': base64.b64encode(signature.digest()).decode(),
        'Api-Nonce': nonce,
    }
    return headers, payload
```

- `endpoint`는 `/v1/trade/place`처럼 슬래시(`/`) 포함.
- 요청 본문은 `application/x-www-form-urlencoded` 권장.
- 모든 Private 호출은 `Api-Key`, `Api-Sign`, `Api-Nonce` 헤더를 포함해야 함.

## 3. 공용(REST) 엔드포인트

| 기능 | 메서드 | 엔드포인트 | 주요 파라미터 | 설명 |
|------|--------|-------------|----------------|------|
| 마켓 코드 조회 | GET | `https://api.bithumb.com/v1/market/all` | `platform`(optional) | 거래 지원 마켓 리스트 반환 |
| 현재가/체결 정보 | GET | `https://api.bithumb.com/v1/ticker/{market}` | `interval`(1h/24h 등) | 24시간 변동률, 거래대금 등 제공 |
| 호가 정보 | GET | `https://api.bithumb.com/v1/orderbook/{market}` | `count` | 매수/매도 상위 N레벨 |
| 캔들 데이터 | GET | `https://api.bithumb.com/v1/candles/{market}?interval=1m&count=200` | `interval`(1m,5m,1h,1d 등) | 차트용 시가/고가/저가/종가/거래량 |

- `market` 표기: 예) `BTC-KRW`, `ETH-BTC`.
- BTC 마켓 도입 이후 `payment_currency`(KRW/BTC)를 명시하지 않으면 오류 발생 가능.
- 캔들 데이터는 차트(TradingView, Lightweight Charts)와 백테스트에 공용 사용.

## 4. 개인(REST) 엔드포인트

| 기능 | 메서드 | 엔드포인트 | 필수 파라미터 | 비고 |
|------|--------|-------------|----------------|------|
| 잔고 조회 | POST | `https://api.bithumb.com/info/balance` | `currency`, `payment_currency` | 포트폴리오/현금잔고 모니터링 |
| 주문 등록 | POST | `https://api.bithumb.com/trade/place` | `order_currency`, `payment_currency`, `type`, `price`, `units` | 지정가/시장가 주문; type=`buy`/`sell` |
| 시장가 매수/매도 | POST | `https://api.bithumb.com/trade/market_buy`<br>`https://api.bithumb.com/trade/market_sell` | `units`, `payment_currency` | `price` 대신 총액 입력 |
| 주문 취소 | POST | `https://api.bithumb.com/trade/cancel` | `order_id`, `order_currency`, `payment_currency` | 부분취소 불가 |
| 체결내역 | POST | `https://api.bithumb.com/info/user_transactions` | `searchGb`, `start`, `end` 등 | 체결·수수료·잔고 변화 기록 |

> 파라미터 규격 및 응답 포맷은 빗썸 공식 API 참고. 요청 파라미터에 `payment_currency` 누락 시 `Invalid Parameter` 오류가 발생합니다.

### 주문 예시 (Python)

```python
import requests

endpoint = '/trade/place'
url = f'https://api.bithumb.com{endpoint}'
body = {
    'order_currency': 'BTC',
    'payment_currency': 'KRW',
    'type': 'buy',         # buy or sell
    'price': '76000000',   # 지정가
    'units': '0.01',
}
headers, payload = sign(body, endpoint)
response = requests.post(url, data=payload, headers=headers, timeout=5)
print(response.json())
```

- 응답 `status == "0000"`이면 성공. 다른 코드면 에러 케이스 처리.
- 주문 실패 시 `status`, `message` 기반 재시도/알림 로직 구성.
- 시세 급변 시 슬리피지 고려.

## 5. WebSocket (실시간)

- 엔드포인트: `wss://pubwss.bithumb.com/pub/ws`
- 구독 메시지 예시:

```json
{
  "type": "ticker",
  "symbols": ["BTC_KRW"],
  "tickTypes": ["24H"]
}
```

- 채널 종류: `ticker`, `transaction`, `orderbookdepth` 등.
- Heartbeat 응답: 서버가 `PING` 전송 시 `PONG` 반환.
- 연결이 끊어지면 백오프 전략(예: 1s → 5s → 15s)으로 재연결.

## 6. 포트폴리오/대시보드 구성 팁

- 잔고 조회(`info/balance`) 응답의 `available_{currency}`, `in_use_{currency}`, `xcoin_last` 필드를 이용해 유동성, 평가금액, 미체결 수량 계산.
- 거래내역(`info/user_transactions`)을 Supabase에 적재하여 PnL, 수수료, 체결 속도 분석.
- Lightweight Charts용 데이터: REST 캔들 + WebSocket 틱 데이터를 병합하여 실시간 차트 업데이트.

## 7. 오류 코드 처리

- `0000`: 성공.
- `1000`대: 인증 실패 → 키 확인/재발급.
- `2000`대: 파라미터 오류 → 필수 파라미터 확인 (`payment_currency` 등).
- `3000`대: 서버 에러/타임아웃 → 재시도 및 모니터링.

## 8. 테스트 전략

1. **샌드박스 부재**: 실계정 소액(예: 10,000 KRW)으로 테스트하며 주문 실패 시 즉시 취소.
2. **시뮬레이션 모드**: REST 캔들 데이터를 기반으로 실시간 모의 체결(체결가 ± 슬리피지)을 구현.
3. **로그 수집**: 모든 요청/응답을 Loki→Grafana 대시보드에 적재.

## 9. 보안 권고

- API Key는 환경변수나 Secrets Manager(AWS KMS, HashiCorp Vault 등)에 저장.
- 서버와 빗썸 간 TLS 버전 > 1.2 유지.
- IP 고정 및 방화벽 설정.
- 비정상 응답/잔고 변동 시 즉시 알림(Slack/Telegram Webhook).

## 10. 참고 자료

- 빗썸 API 발급/권한 안내.
- BTC 마켓 오픈에 따른 `payment_currency` 필수화 안내.
- HMAC 서명 및 주문 예시 코드.
- API 거래 시 주의사항과 시장가 주문 샘플.
