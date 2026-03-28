import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { taktPlans, predictiveFlags, tasks, zones, activities } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getActiveFlags, dismissFlag } from '@/lib/predictive';

// GET /api/plans/[planId]/flags — get predictive flags for a plan
export async function GET(
  request: NextRequest,
  { params }: { params: { planId: string } }
) {
  const planId = parseInt(params.planId);

  const plan = await db.select().from(taktPlans).where(eq(taktPlans.id, planId)).get();
  if (!plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
  }

  const url = new URL(request.url);
  const includeAll = url.searchParams.get('all') === 'true';

  // Get flags with enriched task details
  const conditions = [eq(predictiveFlags.takt_plan_id, planId)];
  if (!includeAll) {
    conditions.push(eq(predictiveFlags.is_dismissed, false));
  }

  const flags = await db
    .select({
      flag: predictiveFlags,
      sourceTaskName: tasks.task_name,
      sourceTaskStatus: tasks.status,
    })
    .from(predictiveFlags)
    .innerJoin(tasks, eq(predictiveFlags.source_task_id, tasks.id))
    .where(and(...conditions));

  // Enrich with flagged task info
  const enrichedFlags = await Promise.all(
    flags.map(async (f) => {
      const flaggedTask = await db
        .select({
          task: tasks,
          zoneName: zones.name,
          zoneFloor: zones.floor_number,
          activityName: activities.name,
        })
        .from(tasks)
        .leftJoin(zones, eq(tasks.zone_id, zones.id))
        .leftJoin(activities, eq(tasks.activity_id, activities.id))
        .where(eq(tasks.id, f.flag.flagged_task_id))
        .get();

      return {
        ...f.flag,
        sourceTaskName: f.sourceTaskName,
        sourceTaskStatus: f.sourceTaskStatus,
        flaggedTaskName: flaggedTask?.task.task_name || null,
        flaggedTaskStatus: flaggedTask?.task.status || null,
        flaggedZoneName: flaggedTask?.zoneName || null,
        flaggedZoneFloor: flaggedTask?.zoneFloor || null,
        flaggedActivityName: flaggedTask?.activityName || null,
      };
    })
  );

  return NextResponse.json({
    planId,
    flags: enrichedFlags,
    total: enrichedFlags.length,
  });
}

// PATCH /api/plans/[planId]/flags — dismiss a flag
export async function PATCH(
  request: NextRequest,
  { params }: { params: { planId: string } }
) {
  const body = await request.json();
  const flagId = body.flagId;

  if (!flagId) {
    return NextResponse.json({ error: 'flagId required' }, { status: 400 });
  }

  await dismissFlag(flagId);
  return NextResponse.json({ success: true });
}
