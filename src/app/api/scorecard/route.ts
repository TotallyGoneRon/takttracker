import { NextRequest, NextResponse } from 'next/server';
import { getScorecardData } from '@/lib/scorecard-service';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const planId = url.searchParams.get('planId');
    const buildingId = url.searchParams.get('buildingId');

    if (!planId) {
      return NextResponse.json({ error: 'planId required' }, { status: 400 });
    }

    const scorecard = await getScorecardData(
      parseInt(planId),
      buildingId ? parseInt(buildingId) : undefined,
    );
    return NextResponse.json(scorecard);
  } catch (err) {
    console.error('Scorecard error:', err);
    return NextResponse.json({ error: 'Failed to load scorecard' }, { status: 500 });
  }
}
