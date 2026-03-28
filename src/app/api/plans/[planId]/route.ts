import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { taktPlans, tasks, activities, zones, buildings, companies, taskDelays } from '@/db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { planId: string } }
) {
  const planId = parseInt(params.planId);

  const plan = await db.select().from(taktPlans).where(eq(taktPlans.id, planId)).get();
  if (!plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
  }

  // Get filter params
  const url = new URL(request.url);
  const startFilter = url.searchParams.get('start');
  const endFilter = url.searchParams.get('end');
  const statusFilter = url.searchParams.get('status');
  const buildingFilter = url.searchParams.get('building');

  // Get all tasks for this plan with their activity and zone info
  let taskQuery = db
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
      buildingId: zones.building_id,
    })
    .from(tasks)
    .innerJoin(activities, eq(tasks.activity_id, activities.id))
    .leftJoin(zones, eq(tasks.zone_id, zones.id))
    .where(eq(tasks.takt_plan_id, planId));

  const allTasks = await taskQuery;

  // Apply filters in memory (simpler for SQLite)
  let filtered = allTasks;

  if (startFilter && endFilter) {
    filtered = filtered.filter((t) =>
      t.task.planned_end >= startFilter && t.task.planned_start <= endFilter
    );
  }

  if (statusFilter && statusFilter !== 'all') {
    filtered = filtered.filter((t) => t.task.status === statusFilter);
  }

  if (buildingFilter) {
    const buildingId = parseInt(buildingFilter);
    filtered = filtered.filter((t) => t.buildingId === buildingId);
  }

  // Get buildings for this plan's project
  const buildingList = await db.select().from(buildings).where(eq(buildings.project_id, plan.project_id));

  // Get companies
  const companyList = await db.select().from(companies).where(eq(companies.project_id, plan.project_id));
  const companyMap = new Map(companyList.map((c) => [c.id, c]));

  // Enrich tasks with company info
  const enrichedTasks = filtered.map((t) => ({
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
    buildingId: t.buildingId,
  }));

  // Stats
  const stats = {
    total: enrichedTasks.length,
    not_started: enrichedTasks.filter((t) => t.status === 'not_started').length,
    in_progress: enrichedTasks.filter((t) => t.status === 'in_progress').length,
    completed: enrichedTasks.filter((t) => t.status === 'completed').length,
    delayed: enrichedTasks.filter((t) => t.status === 'delayed').length,
    blocked: enrichedTasks.filter((t) => t.status === 'blocked').length,
  };

  return NextResponse.json({
    plan,
    tasks: enrichedTasks,
    buildings: buildingList,
    companies: companyList,
    stats,
  });
}
