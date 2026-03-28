import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { activities } from '@/db/schema';
import { eq } from 'drizzle-orm';

// PATCH /api/activities/[id]/company — reassign activity to a different company
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const activityId = parseInt(params.id);
  const body = await request.json();
  const { company_id } = body;

  const activity = await db.select().from(activities).where(eq(activities.id, activityId)).get();
  if (!activity) {
    return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
  }

  await db
    .update(activities)
    .set({ company_id: company_id ?? null })
    .where(eq(activities.id, activityId));

  const updated = await db.select().from(activities).where(eq(activities.id, activityId)).get();
  return NextResponse.json(updated);
}
