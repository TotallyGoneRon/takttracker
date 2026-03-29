import { NextRequest, NextResponse } from 'next/server';
import { getScorecardData } from '@/lib/scorecard-service';
import { z } from 'zod';
import { parseIntParam, validateBody, positiveInt } from '@/lib/validations';

const scorecardQuerySchema = z.object({
  planId: positiveInt,
  buildingId: positiveInt.optional(),
});

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const validated = validateBody(scorecardQuerySchema, Object.fromEntries(url.searchParams));
    if ('error' in validated) return validated.error;
    const { planId, buildingId } = validated.data;

    const scorecard = await getScorecardData(
      planId,
      buildingId,
    );
    return NextResponse.json(scorecard);
  } catch (err) {
    console.error('Scorecard error:', err);
    return NextResponse.json({ error: 'Failed to load scorecard' }, { status: 500 });
  }
}
