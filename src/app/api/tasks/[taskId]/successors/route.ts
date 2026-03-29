import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { tasks, taskRelationships, activities, zones, companies } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { parseIntParam, validateBody } from '@/lib/validations';

const successorQuerySchema = z.object({
  limit: z.coerce.number().int().positive().optional(),
});

const propagateSchema = z.object({
  daysLate: z.number().int().positive(),
  selectedSuccessorIds: z.array(z.number().int().positive()).min(1),
  createdBy: z.string().optional(),
}).strip();

// Get successor tasks that would be impacted by a late completion
export async function GET(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  const parsed = parseIntParam(params.taskId, 'taskId');
  if ('error' in parsed) return parsed.error;
  const taskId = parsed.value;

  const task = await db.select().from(tasks).where(eq(tasks.id, taskId)).get();
  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  // Find the next N upcoming trades in the SAME ZONE, sorted by planned_start.
  // This walks the takt sequence — not just direct relationship links — to show
  // the next 4 trades that will work in this zone after the delayed task.
  const url = new URL(request.url);
  const qValidated = validateBody(successorQuerySchema, Object.fromEntries(url.searchParams));
  if ('error' in qValidated) return qValidated.error;
  const MAX_TRADES = qValidated.data.limit ?? 4;

  // Get all non-completed tasks in the same zone, sorted by planned_start
  const sameZoneTasks = task.zone_id
    ? await db
        .select({
          task: tasks,
          activityName: activities.name,
          activityColor: activities.color,
          companyName: companies.name,
          zoneName: zones.name,
          zoneFloor: zones.floor_number,
          zoneId: zones.id,
        })
        .from(tasks)
        .innerJoin(activities, eq(tasks.activity_id, activities.id))
        .leftJoin(zones, eq(tasks.zone_id, zones.id))
        .leftJoin(companies, eq(activities.company_id, companies.id))
        .where(eq(tasks.zone_id, task.zone_id))
    : [];

  // Filter to tasks that come AFTER the source task and aren't completed
  const upcomingInZone = sameZoneTasks
    .filter((row) =>
      row.task.id !== taskId &&
      row.task.status !== 'completed' &&
      row.task.planned_start >= task.planned_start
    )
    .sort((a, b) => a.task.planned_start.localeCompare(b.task.planned_start))
    .slice(0, MAX_TRADES);

  // Also check direct relationship successors (even if in different zones) as fallback
  const rels = await db
    .select()
    .from(taskRelationships)
    .where(eq(taskRelationships.predecessor_task_id, taskId));

  const directSuccessorIds = new Set(
    rels.filter((r) => r.relation_type === 'FS' || r.relation_type === 'SS')
      .map((r) => r.successor_task_id)
  );

  const successors = upcomingInZone.map((row) => ({
    id: row.task.id,
    task_name: row.task.task_name,
    planned_start: row.task.planned_start,
    planned_end: row.task.planned_end,
    status: row.task.status,
    inherited_delay_days: row.task.inherited_delay_days,
    activityName: row.activityName,
    activityColor: row.activityColor,
    companyName: row.companyName,
    zoneName: row.zoneName,
    zoneFloor: row.zoneFloor,
    relationType: directSuccessorIds.has(row.task.id) ? 'FS' : 'sequence',
    isDirectSuccessor: directSuccessorIds.has(row.task.id),
  }));

  return NextResponse.json(successors);
}

// Propagate late completion delay to selected successors
export async function POST(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  const parsedId = parseIntParam(params.taskId, 'taskId');
  if ('error' in parsedId) return parsedId.error;
  const taskId = parsedId.value;
  const body = await request.json();
  const validated = validateBody(propagateSchema, body);
  if ('error' in validated) return validated.error;
  const { daysLate, selectedSuccessorIds } = validated.data;

  const task = await db.select().from(tasks).where(eq(tasks.id, taskId)).get();
  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  const { taskDelays } = await import('@/db/schema');
  const { flagCascadingDelays } = await import('@/lib/predictive');

  // Record an ASSIGNED delay on the SOURCE task (fixes scorecard showing 0 assigned delays)
  await db.insert(taskDelays).values({
    task_id: taskId,
    delay_days: daysLate,
    delay_type: 'assigned',
    reason: 'other',
    notes: `Completed ${daysLate}d late`,
    created_by: validated.data.createdBy || null,
  });

  const updated = [];
  for (const successorId of selectedSuccessorIds) {
    const successor = await db.select().from(tasks).where(eq(tasks.id, successorId)).get();
    if (!successor || successor.status === 'completed') continue;

    // Record inherited delay
    await db.insert(taskDelays).values({
      task_id: successorId,
      delay_days: daysLate,
      delay_type: 'inherited',
      reason: 'prerequisite',
      source_task_id: taskId,
      notes: `Inherited ${daysLate}d delay from late completion of "${task.task_name}"`,
      created_by: validated.data.createdBy || null,
    });

    // Shift the successor's planned end date
    const newEnd = shiftDate(successor.planned_end, daysLate);
    const newStart = successor.status === 'not_started'
      ? shiftDate(successor.planned_start, daysLate)
      : successor.planned_start;

    await db.update(tasks).set({
      inherited_delay_days: successor.inherited_delay_days + daysLate,
      planned_start: newStart,
      planned_end: newEnd,
      prev_planned_start: successor.planned_start,
      prev_planned_end: successor.planned_end,
      updated_at: new Date().toISOString(),
    }).where(eq(tasks.id, successorId));

    updated.push({
      id: successorId,
      task_name: successor.task_name,
      daysInherited: daysLate,
      newPlannedEnd: newEnd,
    });
  }

  // Flag cascading delays on higher floors
  if (task.takt_plan_id) {
    await flagCascadingDelays(taskId, task.takt_plan_id);
  }

  return NextResponse.json({
    success: true,
    sourceTask: task.task_name,
    daysLate,
    impactedTasks: updated,
  });
}

/** Shift a date forward by N working days (skips weekends).
 *  Also ensures the result never lands on a weekend. */
function shiftDate(dateStr: string, workingDays: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  let remaining = workingDays;
  while (remaining > 0) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) remaining--;
  }
  // Safety: if result is somehow on a weekend, push to next Monday
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }
  return d.toISOString().split('T')[0];
}
