import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { activities } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { parseIntParam, validateBody, positiveInt } from '@/lib/validations';

const assignCompanySchema = z.object({
  company_id: positiveInt.nullable(),
}).strip();

// PATCH /api/activities/[id]/company — reassign activity to a different company
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const parsed = parseIntParam(params.id, 'id');
  if ('error' in parsed) return parsed.error;
  const activityId = parsed.value;
  const body = await request.json();
  const validated = validateBody(assignCompanySchema, body);
  if ('error' in validated) return validated.error;
  const { company_id } = validated.data;

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
