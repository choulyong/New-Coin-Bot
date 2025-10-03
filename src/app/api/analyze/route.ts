import { NextRequest, NextResponse } from 'next/server';
import { analyzeMarket } from '@/lib/strategy/multi-layer';

export async function POST(req: NextRequest) {
  try {
    const { symbol } = await req.json();

    if (!symbol) {
      return NextResponse.json(
        { success: false, error: 'Symbol is required' },
        { status: 400 }
      );
    }

    const analysis = await analyzeMarket(symbol);

    return NextResponse.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    console.error('Analysis failed:', error);
    return NextResponse.json(
      { success: false, error: 'Analysis failed' },
      { status: 500 }
    );
  }
}
