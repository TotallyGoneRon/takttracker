import { db } from '@/db/client';
import { tasks, zones, activities, predictiveFlags } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * When a task is delayed, flag the same activity on higher floors as "High Risk".
 *
 * Logic: If activity A is delayed on Floor N, find tasks with the same activity
 * (same task name + company) on Floors N+1, N+2, etc. and create predictive flags.
 */
export async function flagCascadingDelays(taskId: number, planId: number) {
  const task = await db.select().from(tasks).where(eq(tasks.id, taskId)).get();
  if (!task || !task.zone_id) return;

  // Get the zone's floor
  const zone = await db.select().from(zones).where(eq(zones.id, task.zone_id)).get();
  if (!zone || zone.floor_number === null) return;

  // Get the activity to find matching tasks on other floors
  const activity = await db.select().from(activities).where(eq(activities.id, task.activity_id)).get();
  if (!activity) return;

  // Find all tasks with the same activity on higher floors in the same building
  const allPlanTasks = await db
    .select({
      task: tasks,
      zone: zones,
    })
    .from(tasks)
    .leftJoin(zones, eq(tasks.zone_id, zones.id))
    .where(
      and(
        eq(tasks.takt_plan_id, planId),
        eq(tasks.activity_id, activity.id),
      )
    );

  const higherFloorTasks = allPlanTasks.filter((row) => {
    if (!row.zone || row.zone.floor_number === null) return false;
    if (row.zone.building_id !== zone.building_id) return false;
    return row.zone.floor_number > zone.floor_number!;
  });

  // Create predictive flags
  for (const row of higherFloorTasks) {
    if (row.task.status === 'completed') continue;

    // Check if flag already exists
    const existing = await db
      .select()
      .from(predictiveFlags)
      .where(
        and(
          eq(predictiveFlags.source_task_id, taskId),
          eq(predictiveFlags.flagged_task_id, row.task.id),
        )
      );

    if (existing.length > 0) continue;

    await db.insert(predictiveFlags).values({
      takt_plan_id: planId,
      source_task_id: taskId,
      flagged_task_id: row.task.id,
      risk_level: 'high',
      reason: `${activity.name} delayed on Floor ${zone.floor_number} — cascading risk to Floor ${row.zone!.floor_number}`,
    });
  }
}

/**
 * Get all active predictive flags for a plan.
 */
export async function getActiveFlags(planId: number) {
  const flags = await db
    .select()
    .from(predictiveFlags)
    .where(
      and(
        eq(predictiveFlags.takt_plan_id, planId),
        eq(predictiveFlags.is_dismissed, false),
      )
    );

  return flags;
}

/**
 * Dismiss a predictive flag.
 */
export async function dismissFlag(flagId: number) {
  await db
    .update(predictiveFlags)
    .set({ is_dismissed: true })
    .where(eq(predictiveFlags.id, flagId));
}
