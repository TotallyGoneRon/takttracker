import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { companies } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { parseIntParam, validateBody } from '@/lib/validations';

const companyUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  color: z.string().nullable().optional(),
}).strip();

// PATCH /api/companies/[id] — update company name/color
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const parsed = parseIntParam(params.id, 'id');
  if ('error' in parsed) return parsed.error;
  const id = parsed.value;
  const body = await request.json();
  const validated = validateBody(companyUpdateSchema, body);
  if ('error' in validated) return validated.error;

  const company = await db.select().from(companies).where(eq(companies.id, id)).get();
  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }

  const updates: Record<string, any> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.color !== undefined) updates.color = body.color;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
  }

  await db.update(companies).set(updates).where(eq(companies.id, id));

  const updated = await db.select().from(companies).where(eq(companies.id, id)).get();
  return NextResponse.json(updated);
}
