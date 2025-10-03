import { NextResponse } from 'next/server';
import { bithumbClient } from '@/lib/bithumb/client';

export async function GET() {
  try {
    const tickers = await bithumbClient.getAllTickers();
    return NextResponse.json({ success: true, data: tickers });
  } catch (error) {
    console.error('Failed to fetch coins:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch coins' },
      { status: 500 }
    );
  }
}
