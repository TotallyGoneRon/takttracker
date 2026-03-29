import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import {
  taktPlans, tasks, activities, zones, buildings, companies, taskDelays,
  taskRelationships, siteWalkEntries, siteWalks, predictiveFlags,
} from '@/db/schema';
import { eq, and, gte, lte, sql, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { parseIntParam, validateBody } from '@/lib/validations';

const planQuerySchema = z.object({
  start: z.string().optional(),
  end: z.string().optional(),
  status: z.string().optional(),
  building: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().nonnegative().optional(),
});

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

  // Get filter params
  const url = new URL(request.url);
  const validated = validateBody(planQuerySchema, Object.fromEntries(url.searchParams));
  if ('error' in validated) return validated.error;
  const { start: startFilter, end: endFilter, status: statusFilter, building: buildingFilter } = validated.data;
  const page = validated.data.page ?? 1;
  const rawLimit = validated.data.limit ?? 200;
  const noLimit = rawLimit === 0; // limit=0 means no limit (for map view)
  const limit = noLimit ? 99999 : Math.min(rawLimit, 10000);
  const offset = (page - 1) * limit;

  // Build WHERE conditions at SQL level
  const conditions = [eq(tasks.takt_plan_id, planId)];

  if (startFilter && endFilter) {
    // Tasks that overlap the requested date range
    conditions.push(lte(tasks.planned_start, endFilter));
    conditions.push(gte(tasks.planned_end, startFilter));
  }

  if (statusFilter && statusFilter !== 'all') {
    conditions.push(eq(tasks.status, statusFilter as any));
  }

  if (buildingFilter) {
    const bldgParsed = parseIntParam(buildingFilter, 'building');
    if ('error' in bldgParsed) return bldgParsed.error;
    conditions.push(eq(zones.building_id, bldgParsed.value));
  }

  const whereClause = and(...conditions);

  // Get total count for pagination
  const [{ count: total }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(tasks)
    .innerJoin(activities, eq(tasks.activity_id, activities.id))
    .leftJoin(zones, eq(tasks.zone_id, zones.id))
    .where(whereClause);

  // Get paginated tasks with SQL-level filtering
  const taskRows = await db
    .select({
      task: tasks,
      activityName: activities.name,
      activityColor: activities.color,
      activityPhase: activities.phase_name,
      activitySequence: activities.sequence_order,
      taskCode: activities.task_code,
      companyId: activities.company_id,
      zoneName: zones.name,
      zoneFloor: zones.floor_number,
      zoneType: zones.zone_type,
      zoneScheduleType: zones.schedule_type,
      buildingId: zones.building_id,
    })
    .from(tasks)
    .innerJoin(activities, eq(tasks.activity_id, activities.id))
    .leftJoin(zones, eq(tasks.zone_id, zones.id))
    .where(whereClause)
    .limit(limit)
    .offset(offset);

  // Get buildings for this plan's project
  const buildingList = await db.select().from(buildings).where(eq(buildings.project_id, plan.project_id));

  // Get companies
  const companyList = await db.select().from(companies).where(eq(companies.project_id, plan.project_id));
  const companyMap = new Map(companyList.map((c) => [c.id, c]));

  // Enrich tasks with company info
  const enrichedTasks = taskRows.map((t) => ({
    ...t.task,
    activityName: t.activityName,
    activityColor: t.activityColor,
    activityPhase: t.activityPhase,
    activitySequence: t.activitySequence,
    taskCode: t.taskCode,
    company: t.companyId ? companyMap.get(t.companyId) : null,
    zoneName: t.zoneName,
    zoneFloor: t.zoneFloor,
    zoneType: t.zoneType,
    zoneScheduleType: t.zoneScheduleType,
    buildingId: t.buildingId,
  }));

  // Stats (over the full filtered set, not just the page)
  const statsRows = await db
    .select({
      status: tasks.status,
      count: sql<number>`count(*)`,
    })
    .from(tasks)
    .innerJoin(activities, eq(tasks.activity_id, activities.id))
    .leftJoin(zones, eq(tasks.zone_id, zones.id))
    .where(whereClause)
    .groupBy(tasks.status);

  const stats: Record<string, number> = {
    total: Number(total),
    not_started: 0,
    in_progress: 0,
    completed: 0,
    delayed: 0,
    blocked: 0,
  };
  for (const row of statsRows) {
    stats[row.status] = Number(row.count);
  }

  return NextResponse.json({
    plan,
    tasks: enrichedTasks,
    buildings: buildingList,
    companies: companyList,
    stats,
    pagination: {
      page,
      limit,
      total: Number(total),
      hasMore: offset + limit < Number(total),
    },
  });
}

export async function DELETE(
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

  // Cascade delete relies on FK constraints, but we also clean up manually
  // for tables that reference tasks (which reference the plan)
  const planTaskIds = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(eq(tasks.takt_plan_id, planId));
  const taskIds = planTaskIds.map((t) => t.id);

  if (taskIds.length > 0) {
    // Delete task delays
    await db.delete(taskDelays).where(inArray(taskDelays.task_id, taskIds));
    // Delete task relationships
    await db.delete(taskRelationships).where(inArray(taskRelationships.predecessor_task_id, taskIds));
    await db.delete(taskRelationships).where(inArray(taskRelationships.successor_task_id, taskIds));
    // Delete site walk entries referencing these tasks
    await db.delete(siteWalkEntries).where(inArray(siteWalkEntries.task_id, taskIds));
  }

  // Delete predictive flags for this plan
  await db.delete(predictiveFlags).where(eq(predictiveFlags.takt_plan_id, planId));

  // Delete site walks for this plan
  await db.delete(siteWalks).where(eq(siteWalks.takt_plan_id, planId));

  // Delete activities for this plan
  await db.delete(activities).where(eq(activities.takt_plan_id, planId));

  // Delete tasks for this plan
  await db.delete(tasks).where(eq(tasks.takt_plan_id, planId));

  // Delete the plan itself
  await db.delete(taktPlans).where(eq(taktPlans.id, planId));

  return NextResponse.json({ success: true, deletedPlanId: planId });
}
