import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { taktPlans, predictiveFlags, tasks, zones, activities } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { dismissFlag } from '@/lib/predictive';
import { z } from 'zod';
import { parseIntParam, validateBody, positiveInt } from '@/lib/validations';

// --- Zod schemas ---
const dismissFlagSchema = z.object({
  flagId: positiveInt,
}).strip();

// GET /api/plans/[planId]/flags — get predictive flags for a plan
export async function GET(
  request: NextRequest,
  { params }: { params: { planId: string } }
) {
  const parsed = parseIntParam(params.planId, 'planId');
  if ('error' in parsed) return parsed.error;
  const planId = parsed.value;

  const plan = await db.select().from(taktPlans).where(eq(taktPlans.id, planId)).get();
  if (!plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
  }

  const url = new URL(request.url);
  const includeAll = url.searchParams.get('all') === 'true';

  // Get flags with enriched source task details
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

  // Batch fetch all flagged tasks in one query (per D-11)
  const flaggedTaskIds = flags.map(f => f.flag.flagged_task_id);
  const flaggedTasks = flaggedTaskIds.length > 0
    ? await db
        .select({
          id: tasks.id,
          taskName: tasks.task_name,
          taskStatus: tasks.status,
          zoneName: zones.name,
          zoneFloor: zones.floor_number,
          activityName: activities.name,
        })
        .from(tasks)
        .leftJoin(zones, eq(tasks.zone_id, zones.id))
        .leftJoin(activities, eq(tasks.activity_id, activities.id))
        .where(inArray(tasks.id, flaggedTaskIds))
    : [];

  const flaggedTaskMap = new Map(flaggedTasks.map(t => [t.id, t]));

  // Enrich flags from the map (no extra queries)
  const enrichedFlags = flags.map((f) => {
    const ft = flaggedTaskMap.get(f.flag.flagged_task_id);
    return {
      ...f.flag,
      sourceTaskName: f.sourceTaskName,
      sourceTaskStatus: f.sourceTaskStatus,
      flaggedTaskName: ft?.taskName || null,
      flaggedTaskStatus: ft?.taskStatus || null,
      flaggedZoneName: ft?.zoneName || null,
      flaggedZoneFloor: ft?.zoneFloor || null,
      flaggedActivityName: ft?.activityName || null,
    };
  });

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
  const parsedPlanId = parseIntParam(params.planId, 'planId');
  if ('error' in parsedPlanId) return parsedPlanId.error;

  const body = await request.json();
  const validated = validateBody(dismissFlagSchema, body);
  if ('error' in validated) return validated.error;
  const { flagId } = validated.data;

  await dismissFlag(flagId);
  return NextResponse.json({ success: true });
}
