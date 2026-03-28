import { db } from '@/db/client';
import { tasks, taskDelays, activities, companies, zones, buildings } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

// --- Interfaces ---

export interface ScorecardCompany {
  companyId: number;
  companyName: string;
  companyColor: string | null;
  totalTasks: number;
  completedTasks: number;
  onTimeTasks: number;
  lateTasks: number;
  onTimeRate: number;          // per D-01: primary metric. -1 if no completions
  assignedDelayDays: number;   // per D-01: primary metric
  ppc: number;                 // per D-08/D-09: per-trade PPC
  inheritedDelayDays: number;
  recoveryPoints: number;
  recoveryRate: number;        // -1 if no inherited delays
  tasks: ScorecardTask[];      // nested for drill-down per D-03/D-04
}

export interface ScorecardTask {
  id: number;
  taskName: string;
  status: string;
  plannedStart: string;
  plannedEnd: string;
  actualStart: string | null;
  actualEnd: string | null;
  delayDays: number;           // total assigned delay days for this task
  zoneName: string;
  zoneFloor: number | null;
  buildingCode: string;
  delays: Array<{
    id: number;
    delayDays: number;
    delayType: string;
    reason: string;
    notes: string | null;
    createdAt: string;
  }>;
}

export interface ScorecardOverall {
  totalTasks: number;
  completedTasks: number;
  onTimeRate: number;
  ppc: number;                 // per D-09: overall PPC
  totalAssignedDelayDays: number;
  totalInheritedDays: number;
}

export interface TrendPoint {
  week: string;               // ISO week format "2026-W13"
  onTimeRate: number;
  delayDays: number;
  completedCount: number;
}

export interface ScorecardResponse {
  companies: ScorecardCompany[];
  overall: ScorecardOverall;
  trends: TrendPoint[];
  building: { id: number; code: string; name: string } | null;
}

// --- Main Function ---

export async function getScorecardData(
  planId: number,
  buildingId?: number,
): Promise<ScorecardResponse> {
  // 1. Fetch plan tasks with JOINs (single query, not N+1)
  const planTasks = await db
    .select({
      task: tasks,
      activityName: activities.name,
      companyId: activities.company_id,
      companyName: companies.name,
      companyColor: companies.color,
      zoneName: zones.name,
      zoneFloor: zones.floor_number,
      buildingCode: buildings.code,
      buildingId: buildings.id,
    })
    .from(tasks)
    .innerJoin(activities, eq(tasks.activity_id, activities.id))
    .leftJoin(companies, eq(activities.company_id, companies.id))
    .leftJoin(zones, eq(tasks.zone_id, zones.id))
    .leftJoin(buildings, eq(zones.building_id, buildings.id))
    .where(eq(tasks.takt_plan_id, planId));

  // 2. Filter by building if provided
  let filteredTasks = buildingId
    ? planTasks.filter(t => t.buildingId === buildingId)
    : planTasks;

  // 3. Filter to trackable tasks only
  filteredTasks = filteredTasks.filter(t => t.task.is_trackable);

  // 4. Fetch delays using subquery (avoids SQLite 999 variable limit)
  const planDelays = await db
    .select()
    .from(taskDelays)
    .where(
      inArray(
        taskDelays.task_id,
        db.select({ id: tasks.id }).from(tasks).where(eq(tasks.takt_plan_id, planId)),
      ),
    );

  // Build delay lookup: taskId -> delay[]
  const delayMap = new Map<number, typeof planDelays>();
  for (const delay of planDelays) {
    const existing = delayMap.get(delay.task_id) || [];
    existing.push(delay);
    delayMap.set(delay.task_id, existing);
  }

  // 5. Group by company and compute metrics
  const today = new Date().toISOString().split('T')[0];
  const companyAccum = new Map<number, {
    companyName: string;
    companyColor: string | null;
    totalTasks: number;
    completedTasks: number;
    onTimeTasks: number;
    lateTasks: number;
    assignedDelayDays: number;
    inheritedDelayDays: number;
    recoveryPoints: number;
    shouldBeDone: number;
    shouldBeDoneCompleted: number;
    tasks: ScorecardTask[];
  }>();

  for (const row of filteredTasks) {
    const companyId = row.companyId;
    if (!companyId) continue;

    if (!companyAccum.has(companyId)) {
      companyAccum.set(companyId, {
        companyName: row.companyName || 'Unknown',
        companyColor: row.companyColor || null,
        totalTasks: 0,
        completedTasks: 0,
        onTimeTasks: 0,
        lateTasks: 0,
        assignedDelayDays: 0,
        inheritedDelayDays: 0,
        recoveryPoints: 0,
        shouldBeDone: 0,
        shouldBeDoneCompleted: 0,
        tasks: [],
      });
    }

    const accum = companyAccum.get(companyId)!;
    accum.totalTasks++;

    // On-time / late calculation (completed tasks only)
    if (row.task.status === 'completed') {
      accum.completedTasks++;
      if (row.task.actual_end && row.task.actual_end <= row.task.planned_end) {
        accum.onTimeTasks++;
      } else if (row.task.actual_end && row.task.actual_end > row.task.planned_end) {
        accum.lateTasks++;
      }
    }

    // PPC: count tasks that should be done by today
    if (row.task.planned_end <= today) {
      accum.shouldBeDone++;
      if (row.task.status === 'completed') {
        accum.shouldBeDoneCompleted++;
      }
    }

    // Inherited delays and recovery from task columns
    accum.inheritedDelayDays += row.task.inherited_delay_days;
    accum.recoveryPoints += row.task.recovery_points;

    // Assigned delay days from delay records
    const taskDelayRecords = delayMap.get(row.task.id) || [];
    const assignedDelays = taskDelayRecords.filter(d => d.delay_type === 'assigned');
    const totalAssigned = assignedDelays.reduce((sum, d) => sum + d.delay_days, 0);
    accum.assignedDelayDays += totalAssigned;

    // Build task detail for drill-down
    accum.tasks.push({
      id: row.task.id,
      taskName: row.task.task_name,
      status: row.task.status,
      plannedStart: row.task.planned_start,
      plannedEnd: row.task.planned_end,
      actualStart: row.task.actual_start,
      actualEnd: row.task.actual_end,
      delayDays: totalAssigned,
      zoneName: row.zoneName || 'Unknown',
      zoneFloor: row.zoneFloor,
      buildingCode: row.buildingCode || 'Unknown',
      delays: taskDelayRecords.map(d => ({
        id: d.id,
        delayDays: d.delay_days,
        delayType: d.delay_type,
        reason: d.reason,
        notes: d.notes,
        createdAt: d.created_at,
      })),
    });
  }

  // Build company results
  const companyResults: ScorecardCompany[] = [];
  for (const [companyId, accum] of companyAccum) {
    const onTimeRate = accum.completedTasks > 0
      ? Math.round((accum.onTimeTasks / accum.completedTasks) * 100)
      : -1;
    const ppc = accum.shouldBeDone === 0
      ? 100
      : Math.round((accum.shouldBeDoneCompleted / accum.shouldBeDone) * 100);
    const recoveryRate = accum.inheritedDelayDays > 0
      ? Math.round((accum.recoveryPoints / accum.inheritedDelayDays) * 100)
      : -1;

    companyResults.push({
      companyId,
      companyName: accum.companyName,
      companyColor: accum.companyColor,
      totalTasks: accum.totalTasks,
      completedTasks: accum.completedTasks,
      onTimeTasks: accum.onTimeTasks,
      lateTasks: accum.lateTasks,
      onTimeRate,
      assignedDelayDays: accum.assignedDelayDays,
      ppc,
      inheritedDelayDays: accum.inheritedDelayDays,
      recoveryPoints: accum.recoveryPoints,
      recoveryRate,
      tasks: accum.tasks,
    });
  }

  // 8. Sort by on-time rate descending; trades with -1 (no completions) sort to bottom
  companyResults.sort((a, b) => {
    if (a.onTimeRate === -1 && b.onTimeRate === -1) return 0;
    if (a.onTimeRate === -1) return 1;
    if (b.onTimeRate === -1) return -1;
    return b.onTimeRate - a.onTimeRate;
  });

  // 6. Compute overall metrics (D-09)
  const allCompleted = filteredTasks.filter(t => t.task.status === 'completed');
  const allOnTime = allCompleted.filter(t => t.task.actual_end && t.task.actual_end <= t.task.planned_end);
  const allShouldBeDone = filteredTasks.filter(t => t.task.planned_end <= today);
  const overallPpc = allShouldBeDone.length === 0
    ? 100
    : Math.round(allShouldBeDone.filter(t => t.task.status === 'completed').length / allShouldBeDone.length * 100);

  const overall: ScorecardOverall = {
    totalTasks: filteredTasks.length,
    completedTasks: allCompleted.length,
    onTimeRate: allCompleted.length > 0
      ? Math.round((allOnTime.length / allCompleted.length) * 100)
      : -1,
    ppc: overallPpc,
    totalAssignedDelayDays: companyResults.reduce((s, c) => s + c.assignedDelayDays, 0),
    totalInheritedDays: companyResults.reduce((s, c) => s + c.inheritedDelayDays, 0),
  };

  // 7. Compute weekly trends (D-05/D-06)
  // Filter to completed tasks with actual_end, excluding imported_as_completed (per D-06)
  const trendTasks = filteredTasks.filter(
    t => t.task.status === 'completed'
      && t.task.actual_end
      && !t.task.imported_as_completed,
  );

  const weekBuckets = new Map<string, { onTime: number; total: number; delayDays: number }>();
  for (const row of trendTasks) {
    const weekKey = getISOWeek(row.task.actual_end!);
    const bucket = weekBuckets.get(weekKey) || { onTime: 0, total: 0, delayDays: 0 };
    bucket.total++;
    if (row.task.actual_end! <= row.task.planned_end) {
      bucket.onTime++;
    }
    // Sum assigned delay days for tasks completed this week
    const taskDelayRecords = delayMap.get(row.task.id) || [];
    const assignedDays = taskDelayRecords
      .filter(d => d.delay_type === 'assigned')
      .reduce((sum, d) => sum + d.delay_days, 0);
    bucket.delayDays += assignedDays;
    weekBuckets.set(weekKey, bucket);
  }

  const trends: TrendPoint[] = Array.from(weekBuckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, data]) => ({
      week,
      onTimeRate: data.total > 0 ? Math.round((data.onTime / data.total) * 100) : 0,
      delayDays: data.delayDays,
      completedCount: data.total,
    }));

  // 9. If buildingId, fetch building info
  let building: { id: number; code: string; name: string } | null = null;
  if (buildingId) {
    const buildingRow = await db.select().from(buildings).where(eq(buildings.id, buildingId)).get();
    if (buildingRow) {
      building = { id: buildingRow.id, code: buildingRow.code, name: buildingRow.name };
    }
  }

  // 10. Return response
  return { companies: companyResults, overall, trends, building };
}

// --- Helpers ---

function getISOWeek(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const yearStart = new Date(d.getFullYear(), 0, 4);
  const weekNum = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}
