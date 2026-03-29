import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { siteWalks, siteWalkEntries, tasks, activities, zones, companies } from '@/db/schema';
import { eq, and, gte, lte, desc, ne } from 'drizzle-orm';
import { getToday } from '@/lib/dates';
import { parseIntParam } from '@/lib/validations';

// GET /api/site-walks/summary?planId=X&walkId=Y
// Returns previous walk on-track rate and next-up tasks for the summary UI
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const planIdRaw = url.searchParams.get('planId');
  const walkIdRaw = url.searchParams.get('walkId');

  if (!planIdRaw || !walkIdRaw) {
    return NextResponse.json(
      { error: 'planId and walkId are required' },
      { status: 400 }
    );
  }

  const parsedPlanId = parseIntParam(planIdRaw, 'planId');
  if ('error' in parsedPlanId) return parsedPlanId.error;
  const planId = parsedPlanId.value;

  const parsedWalkId = parseIntParam(walkIdRaw, 'walkId');
  if ('error' in parsedWalkId) return parsedWalkId.error;
  const walkId = parsedWalkId.value;

  try {
    // --- Previous walk trend (SUM-04) ---
    const previousWalks = await db
      .select()
      .from(siteWalks)
      .where(
        and(
          eq(siteWalks.takt_plan_id, planId),
          eq(siteWalks.status, 'completed'),
          ne(siteWalks.id, walkId),
        )
      )
      .orderBy(desc(siteWalks.walk_date))
      .limit(1);

    let previousWalk: { id: number; walkDate: string; onTrackRate: number } | null = null;

    if (previousWalks.length > 0) {
      const prev = previousWalks[0];
      const prevEntries = await db
        .select({ status: siteWalkEntries.status })
        .from(siteWalkEntries)
        .where(eq(siteWalkEntries.site_walk_id, prev.id));

      const total = prevEntries.length;
      if (total > 0) {
        const onTrackCount = prevEntries.filter(
          (e) => e.status === 'on_track' || e.status === 'completed'
        ).length;
        previousWalk = {
          id: prev.id,
          walkDate: prev.walk_date,
          onTrackRate: Math.round((onTrackCount / total) * 100),
        };
      } else {
        previousWalk = {
          id: prev.id,
          walkDate: prev.walk_date,
          onTrackRate: 0,
        };
      }
    }

    // --- Next-up tasks (SUM-03) ---
    const today = getToday();
    const endDate = new Date(today + 'T12:00:00');
    endDate.setDate(endDate.getDate() + 3);
    const endDateStr = endDate.toISOString().split('T')[0];

    const nextUpRows = await db
      .select({
        taskName: tasks.task_name,
        plannedStart: tasks.planned_start,
        taskStatus: tasks.status,
        zoneName: zones.name,
        companyName: companies.name,
      })
      .from(tasks)
      .innerJoin(activities, eq(tasks.activity_id, activities.id))
      .leftJoin(zones, eq(tasks.zone_id, zones.id))
      .leftJoin(companies, eq(activities.company_id, companies.id))
      .where(
        and(
          eq(tasks.takt_plan_id, planId),
          gte(tasks.planned_start, today),
          lte(tasks.planned_start, endDateStr),
          eq(tasks.is_trackable, true),
        )
      )
      .limit(50);

    // Filter out completed tasks in memory
    const nextUpTasks = nextUpRows
      .filter((t) => t.taskStatus !== 'completed')
      .map(({ taskName, plannedStart, zoneName, companyName }) => ({
        taskName,
        plannedStart,
        zoneName,
        companyName,
      }));

    return NextResponse.json({ previousWalk, nextUpTasks });
  } catch (error) {
    console.error('Error in site-walks/summary GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
