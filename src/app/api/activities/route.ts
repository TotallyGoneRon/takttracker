import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { activities, companies, tasks } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { parseIntParam } from '@/lib/validations';

// GET /api/activities?planId=X — list all activities for a plan with company info
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const planIdRaw = url.searchParams.get('planId');

  if (!planIdRaw) {
    return NextResponse.json({ error: 'planId required' }, { status: 400 });
  }

  const parsed = parseIntParam(planIdRaw, 'planId');
  if ('error' in parsed) return parsed.error;
  const planId = parsed.value;

  const rows = await db
    .select({
      id: activities.id,
      name: activities.name,
      task_code: activities.task_code,
      company_id: activities.company_id,
      color: activities.color,
      sequence_order: activities.sequence_order,
      phase_name: activities.phase_name,
      takt_plan_id: activities.takt_plan_id,
      companyName: companies.name,
      companyColor: companies.color,
      taskCount: sql<number>`(SELECT count(*) FROM tasks WHERE tasks.activity_id = ${activities.id})`,
    })
    .from(activities)
    .leftJoin(companies, eq(activities.company_id, companies.id))
    .where(eq(activities.takt_plan_id, planId));

  const result = rows.map((r) => ({
    id: r.id,
    name: r.name,
    task_code: r.task_code,
    company_id: r.company_id,
    color: r.color,
    sequence_order: r.sequence_order,
    phase_name: r.phase_name,
    takt_plan_id: r.takt_plan_id,
    companyName: r.companyName,
    companyColor: r.companyColor,
    taskCount: Number(r.taskCount),
  }));

  return NextResponse.json(result);
}
