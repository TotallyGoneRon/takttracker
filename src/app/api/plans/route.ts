import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { taktPlans, tasks, projects } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

// GET /api/plans — list all plans (for dashboard)
export async function GET(request: NextRequest) {
  const plans = await db
    .select({
      plan: taktPlans,
      projectName: projects.name,
      taskCount: sql<number>`count(${tasks.id})`,
    })
    .from(taktPlans)
    .innerJoin(projects, eq(taktPlans.project_id, projects.id))
    .leftJoin(tasks, eq(tasks.takt_plan_id, taktPlans.id))
    .groupBy(taktPlans.id);

  const result = plans.map((row) => ({
    ...row.plan,
    projectName: row.projectName,
    taskCount: Number(row.taskCount),
  }));

  return NextResponse.json(result);
}
