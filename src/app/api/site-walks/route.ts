import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { siteWalks, siteWalkEntries, tasks, zones, companies, activities } from '@/db/schema';
import { eq, and, gte, lte, inArray } from 'drizzle-orm';
import { propagateDelay } from '@/lib/recovery-engine';
import { z } from 'zod';
import { parseIntParam, validateBody, positiveInt } from '@/lib/validations';

// --- Zod schemas for POST actions (discriminated union per D-06) ---
const createAction = z.object({
  action: z.literal('create'),
  planId: positiveInt,
  conductedBy: z.string().optional(),
}).strip();

const addEntryAction = z.object({
  action: z.literal('add_entry'),
  walkId: positiveInt,
  taskId: positiveInt,
  status: z.enum(['on_track', 'delayed', 'recovered', 'completed']),
  varianceCode: z.enum(['labor', 'material', 'prep', 'design', 'weather', 'inspection', 'prerequisite', 'other']).nullable().optional(),
  notes: z.string().nullable().optional(),
  voiceNoteUrl: z.string().nullable().optional(),
  delayDays: positiveInt.nullable().optional(),
  conductedBy: z.string().nullable().optional(),
}).strip();

const completeAction = z.object({
  action: z.literal('complete'),
  walkId: positiveInt,
  notes: z.string().optional(),
}).strip();

const updateEntryAction = z.object({
  action: z.literal('update_entry'),
  entryId: positiveInt,
  severity: z.enum(['low', 'medium', 'high', 'critical']).nullable().optional(),
  percentComplete: z.number().int().min(0).max(100).nullable().optional(),
  notes: z.string().nullable().optional(),
}).strip();

const siteWalkPostSchema = z.discriminatedUnion('action', [
  createAction,
  addEntryAction,
  completeAction,
  updateEntryAction,
]);

// POST /api/site-walks — create, add entry, or complete a site walk
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = validateBody(siteWalkPostSchema, body);
    if ('error' in validated) return validated.error;
    const data = validated.data;

    switch (data.action) {
      case 'create': {
        const [walk] = await db.insert(siteWalks).values({
          takt_plan_id: data.planId,
          walk_date: new Date().toISOString().split('T')[0],
          conducted_by: data.conductedBy || null,
          status: 'in_progress',
        }).returning();
        return NextResponse.json(walk);
      }

      case 'add_entry': {
        const [entry] = await db.insert(siteWalkEntries).values({
          site_walk_id: data.walkId,
          task_id: data.taskId,
          status: data.status,
          variance_code: data.varianceCode || null,
          notes: data.notes || null,
          voice_note_url: data.voiceNoteUrl || null,
        }).returning();

        // Update the task's recovery status
        await db.update(tasks).set({
          recovery_status: data.status === 'completed' ? 'on_track' : data.status,
          updated_at: new Date().toISOString(),
        }).where(eq(tasks.id, data.taskId));

        // If delayed, optionally record a delay
        if (data.status === 'delayed' && data.delayDays) {
          await propagateDelay(
            data.taskId,
            data.delayDays,
            data.varianceCode || 'other',
            data.conductedBy || undefined
          );
        }

        return NextResponse.json(entry);
      }

      case 'complete': {
        await db.update(siteWalks).set({
          status: 'completed',
          notes: data.notes || null,
        }).where(eq(siteWalks.id, data.walkId));

        return NextResponse.json({ success: true });
      }

      case 'update_entry': {
        const updateFields: Record<string, any> = {};
        if (data.severity !== undefined) updateFields.severity = data.severity;
        if (data.percentComplete !== undefined) updateFields.percent_complete = data.percentComplete;
        if (data.notes !== undefined) updateFields.notes = data.notes;

        if (Object.keys(updateFields).length === 0) {
          return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
        }

        await db.update(siteWalkEntries).set(updateFields).where(eq(siteWalkEntries.id, data.entryId));
        return NextResponse.json({ success: true });
      }
    }
  } catch (error) {
    console.error('Error in site-walks POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/site-walks — list site walks for a plan with entry details (batch query)
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const planIdRaw = url.searchParams.get('planId');
  const fromDate = url.searchParams.get('from');
  const toDate = url.searchParams.get('to');

  if (!planIdRaw) {
    return NextResponse.json({ error: 'planId required' }, { status: 400 });
  }

  const parsed = parseIntParam(planIdRaw, 'planId');
  if ('error' in parsed) return parsed.error;
  const planId = parsed.value;

  // Build conditions for the walks query
  const conditions = [eq(siteWalks.takt_plan_id, planId)];

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

  // Batch fetch all entries for all walks in one query (per D-12)
  const walkIds = walks.map(w => w.id);
  const allEntries = walkIds.length > 0
    ? await db
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
        .where(inArray(siteWalkEntries.site_walk_id, walkIds))
    : [];

  // Group entries by walk ID in memory
  const entryMap = new Map<number, typeof allEntries>();
  for (const row of allEntries) {
    const walkId = row.entry.site_walk_id;
    if (!entryMap.has(walkId)) entryMap.set(walkId, []);
    entryMap.get(walkId)!.push(row);
  }

  // Assemble response
  const walksWithEntries = walks.map(walk => ({
    ...walk,
    entries: (entryMap.get(walk.id) || []).map(e => ({
      ...e.entry,
      taskName: e.taskName,
      taskStatus: e.taskStatus,
      zoneName: e.zoneName,
      zoneFloor: e.zoneFloor,
      companyName: e.companyName,
      companyColor: e.companyColor,
    })),
  }));

  return NextResponse.json(walksWithEntries);
}
