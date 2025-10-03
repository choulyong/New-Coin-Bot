# ChatGPT API 기반 전략 Copilot 가이드

## 1. 목적

- 사용자 목표(목표 수익률, 허용 손실, 운용 자본)를 입력 받아 전략 파라미터/리스크 한도를 제안.
- 백테스트/실거래 로그를 분석해 LLM이 리포트를 생성.
- 전략 실행 전 `Guardrail`을 통해 과최적화/과도한 레버리지 명령을 차단.

## 2. API 선택

- ChatGPT(API) → Responses API(`POST https://api.openai.com/v1/responses`).
- 모델 후보: `gpt-4.1-mini`(균형), `gpt-4.1`(고성능), `gpt-4o` 계열(멀티모달 필요 시).
- 시스템 메시지에 규칙/금지 단어/출력 포맷을 정의.

## 3. 기본 요청 패턴 (TypeScript)

```ts
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateStrategy(prompt: StrategyPrompt) {
  const response = await client.responses.create({
    model: "gpt-4.1-mini",
    input: [
      {
        role: "system",
        content: `You are a trading-strategy copilot.
        - Never suggest leverage > 1x.
        - Always require validation via backtest metrics.
        - Respond in JSON with fields: strategy, riskControls, checklist.`
      },
      {
        role: "user",
        content: JSON.stringify(prompt)
      }
    ],
    temperature: 0.2,
    max_output_tokens: 1024,
  });

  return JSON.parse(response.output_text);
}
```

### 요청 항목 설계

| 필드 | 설명 |
|------|------|
| `prompt.targetReturn` | 월간 목표 수익률 (%) |
| `prompt.maxDrawdown` | 허용 MDD (%) |
| `prompt.capital` | 운용 자본 (KRW) |
| `prompt.constraints` | 거래 제한(레버리지 금지 등) |
| `prompt.marketContext` | 변동성/감성 지표 요약 |

## 4. Guardrail 전략

1. **프롬프트 레벨**: 시스템 메시지에서 금지 조건 명시.
2. **출력 검증**: JSON Schema(`ajv`)로 응답 필드 검증.
3. **리스크 한도 체크**: Copilot 제안값이 내부 한도 초과 시 재요청.
4. **활동 로그**: `ai_decision`, `ai_outcome` 이벤트를 분석 대시보드에 기록.

## 5. 워크플로우 통합

1. 사용자가 대시보드에서 전략 요청.
2. 백테스트/실시간 핵심 지표 요약을 Copilot Prompt에 포함.
3. 응답 JSON을 Strategy Portfolio Manager에 전달.
4. 전략 실행 전 수동 승인 또는 자동 승인(확신도 ≥ 0.7) 정책 적용.
5. 실행 후 실적을 Copilot에 피드백 → 학습 보고서 생성.

## 6. 비용/성능 최적화

- 초안은 `gpt-4.1-mini`, 최종 검증 리포트는 `gpt-4.1` 등급.
- 프롬프트 압축: 지표 요약은 Bullet/CSV 형태.
- 재사용 가능한 맥락은 시스템 메시지 또는 벡터 스토어에 저장.

## 7. 추가 기능 아이디어

- **시나리오 생성**: 다중 시장 시나리오(상승/하락/횡보)를 LLM에 요청 후 백테스트 파이프라인 자동 실행.
- **리스크 경보 요약**: 감성 급락, 이벤트 경보를 한글 요약으로 사용자에게 푸시.
- **Strategy Diff**: 과거 전략과 다른 변경점을 Diff 포맷으로 제공.

## 8. 운영 체크리스트

- [ ] OPENAI API Key를 Secrets Manager에 저장.
- [ ] 요청/응답 로그에서 사용자 식별자 제거(프라이버시).
- [ ] 실패 시 백오프 재시도 및 사용자 알림.
- [ ] 월별 비용 리포트 생성.
