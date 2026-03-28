import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { siteWalks, siteWalkEntries, tasks, zones, companies, activities } from '@/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { propagateDelay } from '@/lib/recovery-engine';

// Create a new site walk
export async function POST(request: NextRequest) {
  const body = await request.json();

  if (body.action === 'create') {
    const [walk] = await db.insert(siteWalks).values({
      takt_plan_id: body.planId,
      walk_date: new Date().toISOString().split('T')[0],
      conducted_by: body.conductedBy || null,
      status: 'in_progress',
    }).returning();
    return NextResponse.json(walk);
  }

  if (body.action === 'add_entry') {
    // Add a site walk entry (the "three-tap" result)
    const [entry] = await db.insert(siteWalkEntries).values({
      site_walk_id: body.walkId,
      task_id: body.taskId,
      status: body.status, // on_track | delayed | recovered
      variance_code: body.varianceCode || null,
      notes: body.notes || null,
      voice_note_url: body.voiceNoteUrl || null,
    }).returning();

    // Update the task's recovery status
    await db.update(tasks).set({
      recovery_status: body.status,
      updated_at: new Date().toISOString(),
    }).where(eq(tasks.id, body.taskId));

    // If delayed, optionally record a delay
    if (body.status === 'delayed' && body.delayDays) {
      await propagateDelay(
        body.taskId,
        body.delayDays,
        body.varianceCode || 'other',
        body.conductedBy
      );
    }

    return NextResponse.json(entry);
  }

  if (body.action === 'complete') {
    await db.update(siteWalks).set({
      status: 'completed',
      notes: body.notes || null,
    }).where(eq(siteWalks.id, body.walkId));

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

// List site walks for a plan, with task details for each entry
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const planId = url.searchParams.get('planId');
  const fromDate = url.searchParams.get('from');
  const toDate = url.searchParams.get('to');

  if (!planId) {
    return NextResponse.json({ error: 'planId required' }, { status: 400 });
  }

  // Build conditions for the walks query
  const conditions = [eq(siteWalks.takt_plan_id, parseInt(planId))];

  if (fromDate) {
    conditions.push(gte(siteWalks.walk_date, fromDate));
  }
  if (toDate) {
    conditions.push(lte(siteWalks.walk_date, toDate));
  }

  const walks = await db
    .select()
    .from(siteWalks)
    .where(and(...conditions));

  // Get entries for each walk, joined with task details
  const walksWithEntries = await Promise.all(
    walks.map(async (walk) => {
      const entries = await db
        .select({
          entry: siteWalkEntries,
          taskName: tasks.task_name,
          taskStatus: tasks.status,
          zoneName: zones.name,
          zoneFloor: zones.floor_number,
          companyName: companies.name,
          companyColor: companies.color,
        })
        .from(siteWalkEntries)
        .innerJoin(tasks, eq(siteWalkEntries.task_id, tasks.id))
        .leftJoin(activities, eq(tasks.activity_id, activities.id))
        .leftJoin(zones, eq(tasks.zone_id, zones.id))
        .leftJoin(companies, eq(activities.company_id, companies.id))
        .where(eq(siteWalkEntries.site_walk_id, walk.id));

      const enrichedEntries = entries.map((e) => ({
        ...e.entry,
        taskName: e.taskName,
        taskStatus: e.taskStatus,
        zoneName: e.zoneName,
        zoneFloor: e.zoneFloor,
        companyName: e.companyName,
        companyColor: e.companyColor,
      }));

      return { ...walk, entries: enrichedEntries };
    })
  );

  return NextResponse.json(walksWithEntries);
}
