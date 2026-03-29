import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { tasks, taskDelays } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { calculateRecovery, propagateDelay } from '@/lib/recovery-engine';
import { z } from 'zod';
import { parseIntParam, validateBody } from '@/lib/validations';

const taskUpdateSchema = z.object({
  status: z.string().optional(),
  actual_start: z.string().nullable().optional(),
  actual_end: z.string().nullable().optional(),
  recovery_status: z.string().optional(),
  delay_days: z.number().int().nonnegative().optional(),
  inherited_delay_days: z.number().int().nonnegative().optional(),
  recovery_points: z.number().int().nonnegative().optional(),
  notes: z.string().optional(),
  delay: z.object({
    days: z.number().int().positive(),
    reason: z.string(),
    created_by: z.string().optional(),
  }).optional(),
}).strip();

// Update a task (status change, delay recording, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  const parsed = parseIntParam(params.taskId, 'taskId');
  if ('error' in parsed) return parsed.error;
  const taskId = parsed.value;
  const body = await request.json();
  const validated = validateBody(taskUpdateSchema, body);
  if ('error' in validated) return validated.error;

  const task = await db.select().from(tasks).where(eq(tasks.id, taskId)).get();
  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  // Status update
  if (body.status) {
    updates.status = body.status;

    if (body.status === 'in_progress' && !task.actual_start) {
      updates.actual_start = new Date().toISOString().split('T')[0];
    }

    if (body.status === 'completed' && !task.actual_end) {
      updates.actual_end = new Date().toISOString().split('T')[0];
    }
  }

  // Recovery status from site walk
  if (body.recovery_status) {
    updates.recovery_status = body.recovery_status;
  }

  if (body.notes !== undefined) {
    updates.notes = body.notes;
  }

  if (body.actual_start !== undefined) {
    updates.actual_start = body.actual_start;
  }

  if (body.actual_end !== undefined) {
    updates.actual_end = body.actual_end;
  }

  await db.update(tasks).set(updates).where(eq(tasks.id, taskId));

  // Record delay if provided
  if (body.delay) {
    await propagateDelay(
      taskId,
      body.delay.days,
      body.delay.reason,
      body.delay.created_by
    );
  }

  // Auto-record assigned delay when completed late
  if (body.status === 'completed') {
    const updatedTask = await db.select().from(tasks).where(eq(tasks.id, taskId)).get();
    if (updatedTask && updatedTask.actual_end && updatedTask.planned_end) {
      const actualEnd = new Date(updatedTask.actual_end + 'T00:00:00');
      const plannedEnd = new Date(updatedTask.planned_end + 'T00:00:00');
      const daysLate = Math.round((actualEnd.getTime() - plannedEnd.getTime()) / (1000 * 60 * 60 * 24));
      if (daysLate > 0) {
        await db.insert(taskDelays).values({
          task_id: taskId,
          delay_days: daysLate,
          delay_type: 'assigned',
          reason: 'other',
          notes: `Completed ${daysLate}d late`,
        });
      }
    }

    // Calculate recovery if task just completed
    await calculateRecovery(taskId);
  }

  const updated = await db.select().from(tasks).where(eq(tasks.id, taskId)).get();
  return NextResponse.json(updated);
}

// Get task with delays
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

  const delays = await db
    .select()
    .from(taskDelays)
    .where(eq(taskDelays.task_id, taskId));

  return NextResponse.json({ ...task, delays });
}
