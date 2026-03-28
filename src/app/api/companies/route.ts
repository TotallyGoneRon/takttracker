import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { companies, activities, tasks } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

// GET /api/companies — list all companies with task counts
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const projectId = url.searchParams.get('projectId');

  const rows = projectId
    ? await db.select().from(companies).where(eq(companies.project_id, parseInt(projectId)))
    : await db.select().from(companies);

  // Count tasks per company via activities
  const result = [];
  for (const company of rows) {
    const activityIds = await db
      .select({ id: activities.id })
      .from(activities)
      .where(eq(activities.company_id, company.id));

    let taskCount = 0;
    for (const a of activityIds) {
      const count = await db
        .select({ count: sql<number>`count(*)` })
        .from(tasks)
        .where(eq(tasks.activity_id, a.id));
      taskCount += count[0]?.count ?? 0;
    }

    result.push({
      ...company,
      taskCount,
    });
  }

  return NextResponse.json(result);
}

// POST /api/companies — create a new company
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, color, project_id } = body;

  if (!name || !project_id) {
    return NextResponse.json({ error: 'name and project_id required' }, { status: 400 });
  }

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
}
