import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { tasks, taskDelays } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { calculateRecovery, propagateDelay } from '@/lib/recovery-engine';

// Update a task (status change, delay recording, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  const taskId = parseInt(params.taskId);
  const body = await request.json();

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

  // Calculate recovery if task just completed
  if (body.status === 'completed') {
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
  const taskId = parseInt(params.taskId);

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
