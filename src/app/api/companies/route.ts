import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { companies, activities, tasks } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { parseIntParam, validateBody, positiveInt } from '@/lib/validations';

// --- Zod schemas ---
const companyCreateSchema = z.object({
  name: z.string().min(1),
  color: z.string().nullable().optional(),
  project_id: positiveInt,
}).strip();

// GET /api/companies — list all companies with task counts (single JOIN query)
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const projectIdRaw = url.searchParams.get('projectId');

  let projectId: number | null = null;
  if (projectIdRaw) {
    const parsed = parseIntParam(projectIdRaw, 'projectId');
    if ('error' in parsed) return parsed.error;
    projectId = parsed.value;
  }

  // Single JOIN query replacing N*M nested loops (per D-10)
  const result = await db
    .select({
      id: companies.id,
      name: companies.name,
      color: companies.color,
      project_id: companies.project_id,
      created_at: companies.created_at,
      taskCount: sql<number>`count(${tasks.id})`,
    })
    .from(companies)
    .leftJoin(activities, eq(activities.company_id, companies.id))
    .leftJoin(tasks, eq(tasks.activity_id, activities.id))
    .where(projectId ? eq(companies.project_id, projectId) : undefined)
    .groupBy(companies.id);

  return NextResponse.json(result);
}

// POST /api/companies — create a new company
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = validateBody(companyCreateSchema, body);
    if ('error' in validated) return validated.error;
    const { name, color, project_id } = validated.data;

    const result = await db.insert(companies).values({
      name,
      color: color || null,
      project_id,
    });

    const newCompany = await db
      .select()
      .from(companies)
      .where(eq(companies.id, Number(result.lastInsertRowid)))
      .get();

    return NextResponse.json(newCompany, { status: 201 });
  } catch (error) {
    console.error('Error creating company:', error);
    return NextResponse.json({ error: 'Failed to create company' }, { status: 500 });
  }
}
