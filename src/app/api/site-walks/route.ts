import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { siteWalks, siteWalkEntries, tasks } from '@/db/schema';
import { eq } from 'drizzle-orm';
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

// List site walks for a plan
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const planId = url.searchParams.get('planId');

  if (!planId) {
    return NextResponse.json({ error: 'planId required' }, { status: 400 });
  }

  const walks = await db
    .select()
    .from(siteWalks)
    .where(eq(siteWalks.takt_plan_id, parseInt(planId)));

  // Get entries for each walk
  const walksWithEntries = await Promise.all(
    walks.map(async (walk) => {
      const entries = await db
        .select()
        .from(siteWalkEntries)
        .where(eq(siteWalkEntries.site_walk_id, walk.id));
      return { ...walk, entries };
    })
  );

  return NextResponse.json(walksWithEntries);
}
