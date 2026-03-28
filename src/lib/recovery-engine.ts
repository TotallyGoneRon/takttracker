import { db } from '@/db/client';
import { tasks, taskDelays, taskRelationships } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { flagCascadingDelays } from '@/lib/predictive';

/**
 * Calculate recovery points when a task completes.
 * Recovery = inherited delay days absorbed (finished on or before baseline end).
 */
export async function calculateRecovery(taskId: number) {
  const task = await db.select().from(tasks).where(eq(tasks.id, taskId)).get();
  if (!task || task.status !== 'completed' || !task.actual_end) return;

  const inheritedDelays = await db
    .select()
    .from(taskDelays)
    .where(and(eq(taskDelays.task_id, taskId), eq(taskDelays.delay_type, 'inherited')));

  const totalInherited = inheritedDelays.reduce((sum, d) => sum + d.delay_days, 0);

  if (totalInherited === 0) {
    await db.update(tasks).set({
      inherited_delay_days: 0,
      recovery_points: 0,
      recovery_status: 'on_track',
      updated_at: new Date().toISOString(),
    }).where(eq(tasks.id, taskId));
    return;
  }

  const baselineEnd = task.baseline_end;
  const actualEnd = task.actual_end;

  if (!baselineEnd) {
    // No baseline to compare against
    await db.update(tasks).set({
      inherited_delay_days: totalInherited,
      recovery_points: 0,
      updated_at: new Date().toISOString(),
    }).where(eq(tasks.id, taskId));
    return;
  }

  let recoveryPoints = 0;
  if (actualEnd <= baselineEnd) {
    // Full recovery: finished on or before original baseline
    recoveryPoints = totalInherited;
  } else {
    // Partial recovery: finished between baseline and baseline + inherited days
    const daysOverBaseline = daysBetween(baselineEnd, actualEnd);
    recoveryPoints = Math.max(0, totalInherited - daysOverBaseline);
  }

  await db.update(tasks).set({
    inherited_delay_days: totalInherited,
    recovery_points: recoveryPoints,
    recovery_status: recoveryPoints > 0 ? 'recovered' : 'delayed',
    updated_at: new Date().toISOString(),
  }).where(eq(tasks.id, taskId));
}

/**
 * When a delay is recorded, propagate inherited delays to successors.
 * Propagates to both FS (finish-to-start) and SS (start-to-start) successors.
 * Also flags cascading delays on higher floors via predictive engine.
 */
export async function propagateDelay(
  taskId: number,
  delayDays: number,
  reason: string,
  createdBy?: string,
) {
  // Record assigned delay on the source task
  await db.insert(taskDelays).values({
    task_id: taskId,
    delay_days: delayDays,
    delay_type: 'assigned',
    reason: reason as any,
    notes: null,
    created_by: createdBy || null,
  });

  // Update task status
  await db.update(tasks).set({
    status: 'delayed',
    recovery_status: 'delayed',
    updated_at: new Date().toISOString(),
  }).where(eq(tasks.id, taskId));

  // Look up the plan for this task (needed for flagCascadingDelays)
  const sourceTask = await db.select().from(tasks).where(eq(tasks.id, taskId)).get();
  const planId = sourceTask?.takt_plan_id;

  // Find FS and SS successors that haven't started
  const successors = await db
    .select({
      successorId: taskRelationships.successor_task_id,
      relationType: taskRelationships.relation_type,
    })
    .from(taskRelationships)
    .where(eq(taskRelationships.predecessor_task_id, taskId));

  for (const rel of successors) {
    // Propagate to both FS and SS successors
    if (rel.relationType !== 'FS' && rel.relationType !== 'SS') continue;

    const successor = await db.select().from(tasks).where(eq(tasks.id, rel.successorId)).get();
    if (!successor || successor.status === 'completed') continue;

    // Record inherited delay
    await db.insert(taskDelays).values({
      task_id: rel.successorId,
      delay_days: delayDays,
      delay_type: 'inherited',
      reason: reason as any,
      source_task_id: taskId,
      created_by: createdBy || null,
    });

    // Update successor's inherited delay count
    const totalInherited = successor.inherited_delay_days + delayDays;
    await db.update(tasks).set({
      inherited_delay_days: totalInherited,
      updated_at: new Date().toISOString(),
    }).where(eq(tasks.id, rel.successorId));
  }

  // Flag cascading delays on higher floors
  if (planId) {
    await flagCascadingDelays(taskId, planId);
  }
}

/**
 * Generate the recovery scorecard for a plan.
 * Optionally filter by buildingId to show building-level scorecard.
 */
export async function getScorecard(planId: number, buildingId?: number) {
  const allTasksRaw = await db
    .select()
    .from(tasks)
    .where(eq(tasks.takt_plan_id, planId));

  // Exclude tasks imported as already completed — they have no tracking data
  let allTasks = allTasksRaw.filter((t) => t.is_trackable);

  // If buildingId specified, filter to tasks in zones belonging to that building
  if (buildingId) {
    const { zones } = await import('@/db/schema');
    const buildingZones = await db
      .select({ id: zones.id })
      .from(zones)
      .where(eq(zones.building_id, buildingId));
    const buildingZoneIds = new Set(buildingZones.map((z) => z.id));
    allTasks = allTasks.filter((t) => t.zone_id && buildingZoneIds.has(t.zone_id));
  }

  // Only load delays for tasks in this plan (not ALL delays)
  const taskIds = allTasks.map((t) => t.id);
  const planDelays = taskIds.length > 0
    ? await db
        .select()
        .from(taskDelays)
        .where(inArray(taskDelays.task_id, taskIds))
    : [];

  // Build lookup: task id -> company info
  const { activities, companies, delayWeights, taktPlans } = await import('@/db/schema');
  const activityList = await db.select().from(activities).where(eq(activities.takt_plan_id, planId));
  const companyList = await db.select().from(companies);

  // Load delay weights for this project
  const plan = await db.select().from(taktPlans).where(eq(taktPlans.id, planId)).get();
  const projectId = plan?.project_id;

  type WeightConfig = { weight: number; impacts_score: boolean; cascading_multiplier: number };
  const weightMap = new Map<string, WeightConfig>();

  if (projectId) {
    const weights = await db
      .select()
      .from(delayWeights)
      .where(eq(delayWeights.project_id, projectId));
    for (const w of weights) {
      weightMap.set(w.reason, {
        weight: w.weight,
        impacts_score: w.impacts_score,
        cascading_multiplier: w.cascading_multiplier,
      });
    }
  }

  // Build a set of task IDs that caused cascading inherited delays on other tasks
  const cascadingSourceTaskIds = new Set<number>();
  for (const delay of planDelays) {
    if (delay.delay_type === 'inherited' && delay.source_task_id) {
      cascadingSourceTaskIds.add(delay.source_task_id);
    }
  }

  const activityCompanyMap = new Map<number, number>();
  for (const a of activityList) {
    if (a.company_id) activityCompanyMap.set(a.id, a.company_id);
  }

  const companyMap = new Map<number, { id: number; name: string; color: string | null }>();
  for (const c of companyList) {
    companyMap.set(c.id, c);
  }

  // Group by company
  type CompanyScore = {
    companyId: number;
    companyName: string;
    companyColor: string | null;
    totalTasks: number;
    completedTasks: number;
    completedOnTime: number;   // finished on or before planned_end
    completedLate: number;     // finished after planned_end
    onTimeRate: number;        // completedOnTime / completedTasks * 100 (or -1 if no completions)
    assignedDelayDays: number;
    weightedDelayDays: number;
    inheritedDelayDays: number;
    recoveryPoints: number;
    recoveryRate: number;      // -1 if no inherited delays (N/A)
    healthScore: number;       // 0-100 composite score
  };

  const scores = new Map<number, CompanyScore>();

  for (const task of allTasks) {
    const companyId = activityCompanyMap.get(task.activity_id);
    if (!companyId) continue;

    if (!scores.has(companyId)) {
      const company = companyMap.get(companyId);
      scores.set(companyId, {
        companyId,
        companyName: company?.name || 'Unknown',
        companyColor: company?.color || null,
        totalTasks: 0,
        completedTasks: 0,
        completedOnTime: 0,
        completedLate: 0,
        onTimeRate: -1,
        assignedDelayDays: 0,
        weightedDelayDays: 0,
        inheritedDelayDays: 0,
        recoveryPoints: 0,
        recoveryRate: -1,
        healthScore: 0,
      });
    }

    const score = scores.get(companyId)!;
    score.totalTasks++;
    if (task.status === 'completed') {
      score.completedTasks++;
      // Check if completed on time (actual_end <= planned_end)
      if (task.actual_end && task.baseline_end) {
        if (task.actual_end <= task.baseline_end) {
          score.completedOnTime++;
        } else {
          score.completedLate++;
        }
      } else {
        // No actual_end means it was imported as completed — count as on-time
        score.completedOnTime++;
      }
    }
    score.inheritedDelayDays += task.inherited_delay_days;
    score.recoveryPoints += task.recovery_points;
  }

  // Add assigned delays with weights applied
  const taskCompanyMap = new Map<number, number>();
  for (const task of allTasks) {
    const companyId = activityCompanyMap.get(task.activity_id);
    if (companyId) taskCompanyMap.set(task.id, companyId);
  }

  for (const delay of planDelays) {
    if (delay.delay_type !== 'assigned') continue;
    const companyId = taskCompanyMap.get(delay.task_id);
    if (!companyId || !scores.has(companyId)) continue;

    const score = scores.get(companyId)!;
    score.assignedDelayDays += delay.delay_days;

    // Apply weight based on reason
    const wConfig = weightMap.get(delay.reason);
    if (wConfig && !wConfig.impacts_score) {
      // Weight=0, doesn't impact score — skip weighted calculation
      continue;
    }

    let weight = wConfig?.weight ?? 1.0;

    // Apply cascading multiplier if this delay's task caused inherited delays on other tasks
    if (cascadingSourceTaskIds.has(delay.task_id)) {
      const multiplier = wConfig?.cascading_multiplier ?? 1.5;
      weight *= multiplier;
    }

    score.weightedDelayDays += Math.round(delay.delay_days * weight * 10) / 10;
  }

  // Calculate rates and health scores
  for (const score of scores.values()) {
    // On-time rate: % of completed tasks that finished on or before deadline
    score.onTimeRate = score.completedTasks > 0
      ? Math.round((score.completedOnTime / score.completedTasks) * 100)
      : -1; // -1 = no data yet

    // Recovery rate: only meaningful if they inherited delays
    score.recoveryRate = score.inheritedDelayDays > 0
      ? Math.round((score.recoveryPoints / score.inheritedDelayDays) * 100)
      : -1; // -1 = N/A (no inherited delays)

    // Health score: composite 0-100
    // Only penalizes for delays the trade CAUSED (assigned/weighted).
    // Inherited delays do NOT penalize — they're not the trade's fault.
    // Recovery is a BONUS — recovering from inherited delays earns points, not recovering doesn't penalize.
    //
    // Formula: on-time completion (60%) + low caused delays (40%) + recovery bonus (up to +10)
    const onTimePart = score.onTimeRate >= 0 ? score.onTimeRate : 50; // neutral if no completions
    const delayPenalty = Math.min(100, score.weightedDelayDays * 10); // 10 weighted delay days = 100% penalty
    const delayPart = Math.max(0, 100 - delayPenalty);
    const baseScore = Math.round(onTimePart * 0.6 + delayPart * 0.4);
    // Recovery bonus: if they inherited delays and recovered, add up to 10 points
    const recoveryBonus = score.recoveryRate > 0 ? Math.round(score.recoveryRate / 10) : 0;
    score.healthScore = Math.min(100, baseScore + recoveryBonus);
  }

  // Sort by health score (best first)
  const result = Array.from(scores.values()).sort((a, b) => b.healthScore - a.healthScore);

  const overall = {
    totalDelayDays: result.reduce((s, c) => s + c.assignedDelayDays, 0),
    totalWeightedDelayDays: result.reduce((s, c) => s + c.weightedDelayDays, 0),
    totalRecoveryPoints: result.reduce((s, c) => s + c.recoveryPoints, 0),
    totalInheritedDays: result.reduce((s, c) => s + c.inheritedDelayDays, 0),
  };

  // If buildingId, include building info
  let building = null;
  if (buildingId) {
    const { buildings } = await import('@/db/schema');
    building = await db.select().from(buildings).where(eq(buildings.id, buildingId)).get();
  }

  return { companies: result, overall, building };
}

// ─── Helpers ───────────────────────────────────────────────────

function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1 + 'T00:00:00');
  const d2 = new Date(date2 + 'T00:00:00');
  return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}
