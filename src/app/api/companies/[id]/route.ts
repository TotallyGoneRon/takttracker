import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { companies } from '@/db/schema';
import { eq } from 'drizzle-orm';

// PATCH /api/companies/[id] — update company name/color
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id);
  const body = await request.json();

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
