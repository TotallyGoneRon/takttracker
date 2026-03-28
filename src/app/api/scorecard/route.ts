import { NextRequest, NextResponse } from 'next/server';
import { getScorecard } from '@/lib/recovery-engine';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const planId = url.searchParams.get('planId');

  if (!planId) {
    return NextResponse.json({ error: 'planId required' }, { status: 400 });
  }

  const scorecard = await getScorecard(parseInt(planId));
  return NextResponse.json(scorecard);
}
