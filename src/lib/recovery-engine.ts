import { db } from '@/db/client';
import { tasks, taskDelays, taskRelationships } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

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

  // Find FS (finish-to-start) successors that haven't started
  const successors = await db
    .select({
      successorId: taskRelationships.successor_task_id,
      relationType: taskRelationships.relation_type,
    })
    .from(taskRelationships)
    .where(eq(taskRelationships.predecessor_task_id, taskId));

  for (const rel of successors) {
    if (rel.relationType !== 'FS') continue;

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
}

/**
 * Generate the recovery scorecard for a plan.
 */
export async function getScorecard(planId: number) {
  const allTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.takt_plan_id, planId));

  const allDelays = await db
    .select()
    .from(taskDelays);

  // Build lookup: task id -> company info
  const { activities, companies } = await import('@/db/schema');
  const activityList = await db.select().from(activities).where(eq(activities.takt_plan_id, planId));
  const companyList = await db.select().from(companies);

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
    assignedDelayDays: number;
    inheritedDelayDays: number;
    recoveryPoints: number;
    recoveryRate: number;
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
        assignedDelayDays: 0,
        inheritedDelayDays: 0,
        recoveryPoints: 0,
        recoveryRate: 0,
      });
    }

    const score = scores.get(companyId)!;
    score.totalTasks++;
    if (task.status === 'completed') score.completedTasks++;
    score.inheritedDelayDays += task.inherited_delay_days;
    score.recoveryPoints += task.recovery_points;
  }

  // Add assigned delays
  const taskCompanyMap = new Map<number, number>();
  for (const task of allTasks) {
    const companyId = activityCompanyMap.get(task.activity_id);
    if (companyId) taskCompanyMap.set(task.id, companyId);
  }

  for (const delay of allDelays) {
    if (delay.delay_type !== 'assigned') continue;
    const companyId = taskCompanyMap.get(delay.task_id);
    if (companyId && scores.has(companyId)) {
      scores.get(companyId)!.assignedDelayDays += delay.delay_days;
    }
  }

  // Calculate recovery rates
  for (const score of scores.values()) {
    score.recoveryRate =
      score.inheritedDelayDays > 0
        ? Math.round((score.recoveryPoints / score.inheritedDelayDays) * 100)
        : 100;
  }

  const result = Array.from(scores.values()).sort((a, b) => b.recoveryRate - a.recoveryRate);

  const overall = {
    totalDelayDays: result.reduce((s, c) => s + c.assignedDelayDays, 0),
    totalRecoveryPoints: result.reduce((s, c) => s + c.recoveryPoints, 0),
    totalInheritedDays: result.reduce((s, c) => s + c.inheritedDelayDays, 0),
  };

  return { companies: result, overall };
}

// ─── Helpers ───────────────────────────────────────────────────

function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1 + 'T00:00:00');
  const d2 = new Date(date2 + 'T00:00:00');
  return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}
