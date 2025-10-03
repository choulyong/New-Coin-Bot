import OpenAI from 'openai';

// 서버 사이드에서만 클라이언트 생성
function getClient() {
  if (typeof window !== 'undefined') {
    throw new Error('OpenAI client can only be used on server side');
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export interface StrategyPrompt {
  targetReturn: number; // 월간 목표 수익률 (%)
  maxDrawdown: number; // 허용 MDD (%)
  capital: number; // 운용 자본 (KRW)
  constraints: string[]; // 제약 조건
  marketContext: {
    volatility: number;
    sentiment: number;
    recentPerformance: string;
  };
}

export interface StrategyRecommendation {
  strategy: string;
  parameters: Record<string, any>;
  riskControls: {
    maxPositionSize: number;
    stopLoss: number;
    profitTarget: number;
  };
  rationale: string;
  checklist: string[];
}

const STRATEGY_SYSTEM_PROMPT = `You are an expert cryptocurrency trading strategy advisor.

RULES:
- NEVER suggest leverage > 1x
- All strategies must include stop-loss and profit-target
- Risk controls are MANDATORY
- Always validate via backtesting metrics
- Provide actionable, specific parameters

OUTPUT FORMAT: JSON with these exact fields:
{
  "strategy": "strategy name",
  "parameters": { specific parameter values },
  "riskControls": {
    "maxPositionSize": number (1-100),
    "stopLoss": number (% as negative),
    "profitTarget": number (% as positive)
  },
  "rationale": "why this strategy fits the goals",
  "checklist": ["validation step 1", "validation step 2", ...]
}`;

/**
 * ChatGPT 기반 전략 생성
 */
export async function generateStrategy(prompt: StrategyPrompt): Promise<StrategyRecommendation> {
  try {
    const client = getClient();
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: STRATEGY_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: JSON.stringify({
            userGoals: {
              targetReturn: prompt.targetReturn,
              maxDrawdown: prompt.maxDrawdown,
              capital: prompt.capital,
            },
            constraints: prompt.constraints,
            marketContext: prompt.marketContext,
          }),
        },
      ],
      temperature: 0.2,
      max_tokens: 1024,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    // JSON 파싱
    const recommendation = JSON.parse(content) as StrategyRecommendation;

    // Guardrail 검증
    validateStrategy(recommendation);

    return recommendation;
  } catch (error) {
    console.error('AI strategy generation failed:', error);
    throw error;
  }
}

/**
 * Guardrail 검증 (안전성 체크)
 */
function validateStrategy(recommendation: StrategyRecommendation): void {
  // 포지션 크기 제한
  if (recommendation.riskControls.maxPositionSize > 80) {
    throw new Error('Position size too large (max 80%)');
  }

  // 손절 필수
  if (!recommendation.riskControls.stopLoss || recommendation.riskControls.stopLoss >= 0) {
    throw new Error('Invalid stop-loss value');
  }

  // 익절 필수
  if (!recommendation.riskControls.profitTarget || recommendation.riskControls.profitTarget <= 0) {
    throw new Error('Invalid profit target');
  }

  // 체크리스트 필수
  if (!recommendation.checklist || recommendation.checklist.length === 0) {
    throw new Error('Validation checklist is required');
  }
}

/**
 * 백테스트 결과 분석 리포트 생성
 */
export async function analyzeBacktestResult(params: {
  strategyName: string;
  totalReturn: number;
  maxDrawdown: number;
  winRate: number;
  totalTrades: number;
  trades: any[];
}): Promise<string> {
  try {
    const client = getClient();
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a trading performance analyst. Analyze backtest results and provide actionable insights in Korean.

Focus on:
1. Overall performance assessment
2. Risk-adjusted returns
3. Consistency of results
4. Areas for improvement
5. Recommendations for parameter tuning`,
        },
        {
          role: 'user',
          content: JSON.stringify({
            strategy: params.strategyName,
            results: {
              totalReturn: params.totalReturn,
              maxDrawdown: params.maxDrawdown,
              winRate: params.winRate,
              totalTrades: params.totalTrades,
            },
            sampleTrades: params.trades.slice(0, 5),
          }),
        },
      ],
      temperature: 0.3,
      max_tokens: 1024,
    });

    return response.choices[0]?.message?.content || 'Analysis failed';
  } catch (error) {
    console.error('Backtest analysis failed:', error);
    throw error;
  }
}

/**
 * 시장 상황 요약 및 리스크 경고
 */
export async function generateMarketSummary(params: {
  sentiment: number;
  volatility: number;
  events: string[];
}): Promise<string> {
  try {
    const client = getClient();
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a market analyst. Summarize current market conditions and provide risk warnings in Korean.

Be concise and actionable.`,
        },
        {
          role: 'user',
          content: JSON.stringify({
            marketConditions: {
              sentimentScore: params.sentiment,
              volatilityLevel: params.volatility,
              upcomingEvents: params.events,
            },
          }),
        },
      ],
      temperature: 0.4,
      max_tokens: 512,
    });

    return response.choices[0]?.message?.content || 'Summary generation failed';
  } catch (error) {
    console.error('Market summary failed:', error);
    throw error;
  }
}

/**
 * AI 의사결정 로그 기록
 */
export function logAIDecision(event: {
  symbol: string;
  strategy: string;
  score: number;
  confidence: number;
  metadata: any;
}): void {
  console.log('[AI Decision]', {
    ...event,
    timestamp: new Date().toISOString(),
  });
  // 실제로는 analytics 서비스나 DB에 저장
}

/**
 * AI 결과 로그 기록
 */
export function logAIOutcome(event: {
  symbol: string;
  action: 'exit' | 'hold';
  score: number;
  profitPct: number;
  confidenceOk: boolean;
}): void {
  console.log('[AI Outcome]', {
    ...event,
    timestamp: new Date().toISOString(),
  });
  // 실제로는 analytics 서비스나 DB에 저장
}
