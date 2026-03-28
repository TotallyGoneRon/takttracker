import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { delayWeights } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

const DEFAULT_WEIGHTS: Record<string, { weight: number; impacts_score: boolean; description: string }> = {
  weather: { weight: 0.0, impacts_score: false, description: 'Not the trade\'s fault' },
  material: { weight: 0.8, impacts_score: true, description: 'Material delays' },
  labor: { weight: 1.0, impacts_score: true, description: 'Labor shortages or no-shows' },
  prep: { weight: 1.0, impacts_score: true, description: 'Inadequate preparation' },
  design: { weight: 0.5, impacts_score: true, description: 'Partially trade\'s fault' },
  inspection: { weight: 0.3, impacts_score: true, description: 'Inspection-related delays' },
  prerequisite: { weight: 0.0, impacts_score: false, description: 'Inherited, not their fault' },
  other: { weight: 1.0, impacts_score: true, description: 'Other delays' },
};

// GET /api/settings/delay-weights?projectId=X
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const projectId = url.searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 });
  }

  const pid = parseInt(projectId);
  let weights = await db
    .select()
    .from(delayWeights)
    .where(eq(delayWeights.project_id, pid));

  // If no weights exist, seed defaults
  if (weights.length === 0) {
    for (const [reason, config] of Object.entries(DEFAULT_WEIGHTS)) {
      await db.insert(delayWeights).values({
        project_id: pid,
        reason: reason as any,
        weight: config.weight,
        impacts_score: config.impacts_score,
        cascading_multiplier: 1.5,
        description: config.description,
      });
    }
    weights = await db
      .select()
      .from(delayWeights)
      .where(eq(delayWeights.project_id, pid));
  }

  return NextResponse.json(weights);
}

// PUT /api/settings/delay-weights — update weights
export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { projectId, weights, cascadingMultiplier } = body as {
    projectId: number;
    weights: Array<{
      reason: string;
      weight: number;
      impacts_score: boolean;
    }>;
    cascadingMultiplier?: number;
  };

  if (!projectId || !weights) {
    return NextResponse.json({ error: 'projectId and weights required' }, { status: 400 });
  }

  for (const w of weights) {
    const existing = await db
      .select()
      .from(delayWeights)
      .where(and(eq(delayWeights.project_id, projectId), eq(delayWeights.reason, w.reason as any)))
      .get();

    const multiplier = cascadingMultiplier ?? 1.5;

    if (existing) {
      await db
        .update(delayWeights)
        .set({
          weight: w.weight,
          impacts_score: w.impacts_score,
          cascading_multiplier: multiplier,
        })
        .where(eq(delayWeights.id, existing.id));
    } else {
      await db.insert(delayWeights).values({
        project_id: projectId,
        reason: w.reason as any,
        weight: w.weight,
        impacts_score: w.impacts_score,
        cascading_multiplier: multiplier,
        description: DEFAULT_WEIGHTS[w.reason]?.description || '',
      });
    }
  }

  const updated = await db
    .select()
    .from(delayWeights)
    .where(eq(delayWeights.project_id, projectId));

  return NextResponse.json(updated);
}
