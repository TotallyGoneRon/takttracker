import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { tasks, taskDelays } from '@/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/tasks/[taskId]/delays — get all delays for a task
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

  return NextResponse.json({
    taskId,
    taskName: task.task_name,
    inherited_delay_days: task.inherited_delay_days,
    recovery_points: task.recovery_points,
    recovery_status: task.recovery_status,
    delays,
  });
}
