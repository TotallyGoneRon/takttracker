import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import {
  projects, importLogs, buildings, zones, companies,
  taktPlans, activities, tasks, taskRelationships,
} from '@/db/schema';
import { eq } from 'drizzle-orm';
import {
  parseInTaktXLSX, mapInTaktStatus,
  type ParsedActivity, type DetectedZone, type DetectedBuilding,
} from '@/lib/import-parser';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const projectName = formData.get('projectName') as string || 'HV - BROOKLYN';

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = parseInTaktXLSX(buffer);

    // Filter out milestone-only activities
    const nonMilestone = result.activities.filter(
      (a) => a.phaseName !== 'Milestones' && a.startDate && a.finishDate
    );

    // ─── Create or get project ────────────────────────────────
    let project = await db.select().from(projects).where(eq(projects.name, projectName)).get();
    if (!project) {
      const [newProject] = await db.insert(projects).values({ name: projectName }).returning();
      project = newProject;
    }

    // ─── Log import ───────────────────────────────────────────
    const [importLog] = await db.insert(importLogs).values({
      project_id: project.id,
      file_name: file.name,
      file_type: 'xlsx',
      status: 'processing',
      row_count: nonMilestone.length,
    }).returning();

    // ─── Insert buildings ─────────────────────────────────────
    const buildingIdMap = new Map<string, number>();
    for (const b of result.buildings) {
      const allBuildings = await db.select().from(buildings)
        .where(eq(buildings.project_id, project.id));
      const existing = allBuildings.find((r) => r.code === b.code);

      if (existing) {
        buildingIdMap.set(b.code, existing.id);
      } else {
        const [inserted] = await db.insert(buildings).values({
          project_id: project.id,
          code: b.code,
          name: b.name,
          num_floors: b.numFloors,
        }).returning();
        buildingIdMap.set(b.code, inserted.id);
      }
    }

    // ─── Insert zones ─────────────────────────────────────────
    const zoneIdMap = new Map<string, number>(); // rawArea -> zone id
    for (const z of result.zones) {
      const buildingId = z.buildingCode ? buildingIdMap.get(z.buildingCode) : null;

      const allZones = await db.select().from(zones)
        .where(eq(zones.project_id, project.id));
      const existing = allZones.find((r) => r.name === z.name && r.building_id === (buildingId ?? null));

      if (existing) {
        zoneIdMap.set(z.rawArea, existing.id);
      } else {
        const [inserted] = await db.insert(zones).values({
          project_id: project.id,
          building_id: buildingId ?? null,
          name: z.name,
          floor_number: z.floorNumber,
          zone_type: z.zoneType,
        }).returning();
        zoneIdMap.set(z.rawArea, inserted.id);
      }
    }

    // ─── Insert companies ─────────────────────────────────────
    const companyIdMap = new Map<string, number>();
    for (const [name, color] of Array.from(result.companies.entries())) {
      const allCompanies = await db.select().from(companies)
        .where(eq(companies.project_id, project.id));
      const existing = allCompanies.find((r) => r.name === name);

      if (existing) {
        companyIdMap.set(name, existing.id);
      } else {
        const [inserted] = await db.insert(companies).values({
          project_id: project.id,
          name,
          color: color || null,
        }).returning();
        companyIdMap.set(name, inserted.id);
      }
    }

    // ─── Create takt plan ─────────────────────────────────────
    const [plan] = await db.insert(taktPlans).values({
      project_id: project.id,
      name: `${projectName} — ${file.name}`,
      import_log_id: importLog.id,
      status: 'active',
    }).returning();

    // ─── Group activities by (company + taskName + phaseName) and insert ──
    const activityGroupKey = (a: ParsedActivity) =>
      `${a.company}||${a.taskName}||${a.phaseName}`;

    const activityGroups = new Map<string, ParsedActivity[]>();
    for (const a of nonMilestone) {
      const key = activityGroupKey(a);
      if (!activityGroups.has(key)) activityGroups.set(key, []);
      activityGroups.get(key)!.push(a);
    }

    const activityIdMap = new Map<string, number>(); // group key -> activity id
    let seqOrder = 0;
    for (const [key, group] of activityGroups) {
      const sample = group[0];
      const companyId = sample.company ? companyIdMap.get(sample.company) : null;
      const [inserted] = await db.insert(activities).values({
        takt_plan_id: plan.id,
        name: sample.taskName,
        task_code: sample.taskCode || null,
        company_id: companyId ?? null,
        color: sample.color ? `#${sample.color}` : null,
        sequence_order: seqOrder++,
        takt_period: sample.taktPeriod,
        phase_name: sample.phaseName,
      }).returning();
      activityIdMap.set(key, inserted.id);
    }

    // ─── Insert tasks ─────────────────────────────────────────
    const taskIntaktIdMap = new Map<string, number>(); // intakt task id -> our task id
    for (const a of nonMilestone) {
      const key = activityGroupKey(a);
      const activityId = activityIdMap.get(key);
      if (!activityId) continue;

      const zoneId = a.area ? zoneIdMap.get(a.area) : null;
      const mappedStatus = mapInTaktStatus(a.status);

      const [inserted] = await db.insert(tasks).values({
        takt_plan_id: plan.id,
        activity_id: activityId,
        zone_id: zoneId ?? null,
        intakt_task_id: a.taskId,
        task_name: a.taskName,
        planned_start: a.startDate,
        planned_end: a.finishDate,
        baseline_start: a.startDate,
        baseline_end: a.finishDate,
        status: mappedStatus,
        intakt_status: a.status,
        crew_size: a.crewSize,
        area_raw: a.area || null,
      }).returning();

      taskIntaktIdMap.set(a.taskId, inserted.id);
    }

    // ─── Insert relationships ─────────────────────────────────
    let relCount = 0;
    for (const rel of result.relationships) {
      const predId = taskIntaktIdMap.get(rel.predecessorId);
      const succId = taskIntaktIdMap.get(rel.successorId);
      if (predId && succId) {
        await db.insert(taskRelationships).values({
          predecessor_task_id: predId,
          successor_task_id: succId,
          relation_type: rel.relationType,
          lag_hours: rel.lagHours,
        });
        relCount++;
      }
    }

    // ─── Update import log ────────────────────────────────────
    await db.update(importLogs)
      .set({
        status: 'completed',
        error_log: result.errors.length > 0 ? JSON.stringify(result.errors) : null,
      })
      .where(eq(importLogs.id, importLog.id));

    return NextResponse.json({
      success: true,
      planId: plan.id,
      summary: {
        activities: activityGroups.size,
        tasks: taskIntaktIdMap.size,
        relationships: relCount,
        buildings: result.buildings.length,
        zones: result.zones.length,
        companies: result.companies.size,
        errors: result.errors.length,
      },
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Import failed' },
      { status: 500 }
    );
  }
}
