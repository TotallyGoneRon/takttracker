import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import {
  projects, importLogs, buildings, zones, companies,
  taktPlans, activities, tasks, taskRelationships, importChangelog,
} from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import {
  parseInTaktXLSX, mapInTaktStatus,
  type ParsedActivity, type DetectedZone, type DetectedBuilding,
} from '@/lib/import-parser';

// Note: Zod body validation is not applicable to FormData uploads.
// File presence is validated manually below (formData.get('file')).
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

    // ─── Insert buildings (idempotent) ────────────────────────
    // Load all existing buildings for this project once
    const existingBuildings = await db.select().from(buildings)
      .where(eq(buildings.project_id, project.id));
    const existingBuildingByCode = new Map(existingBuildings.map((b) => [b.code, b]));

    const buildingIdMap = new Map<string, number>();
    for (const b of result.buildings) {
      const existing = existingBuildingByCode.get(b.code);
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
        existingBuildingByCode.set(b.code, inserted);
      }
    }

    // ─── Insert zones (idempotent, keyed by uniqueKey) ────────
    // Load all existing zones for this project once
    const existingZones = await db.select().from(zones)
      .where(eq(zones.project_id, project.id));
    const existingZoneByUniqueKey = new Map(
      existingZones.filter((z) => z.unique_key).map((z) => [z.unique_key!, z])
    );

    // Map from uniqueKey -> zone id (for task assignment)
    const zoneIdByUniqueKey = new Map<string, number>();
    for (const z of result.zones) {
      const buildingId = z.buildingCode ? buildingIdMap.get(z.buildingCode) : null;
      const existing = existingZoneByUniqueKey.get(z.uniqueKey);

      if (existing) {
        zoneIdByUniqueKey.set(z.uniqueKey, existing.id);
      } else {
        const [inserted] = await db.insert(zones).values({
          project_id: project.id,
          building_id: buildingId ?? null,
          name: z.name,
          floor_number: z.floorNumber,
          zone_type: z.zoneType,
          schedule_type: z.scheduleType,
          unique_key: z.uniqueKey,
        }).returning();
        zoneIdByUniqueKey.set(z.uniqueKey, inserted.id);
        existingZoneByUniqueKey.set(z.uniqueKey, inserted);
      }
    }

    // Build a lookup: rawArea+phase -> uniqueKey -> zoneId (for task assignment)
    const zoneKeyByAreaPhase = new Map<string, string>();
    for (const z of result.zones) {
      zoneKeyByAreaPhase.set(`${z.rawArea}||${z.scheduleType}||${z.buildingCode || ''}`, z.uniqueKey);
    }

    // ─── Insert companies (idempotent) ────────────────────────
    // Load all existing companies for this project once
    const existingCompanies = await db.select().from(companies)
      .where(eq(companies.project_id, project.id));
    const existingCompanyByName = new Map(existingCompanies.map((c) => [c.name, c]));

    const companyIdMap = new Map<string, number>();
    for (const [name, color] of Array.from(result.companies.entries())) {
      const existing = existingCompanyByName.get(name);
      if (existing) {
        companyIdMap.set(name, existing.id);
      } else {
        const [inserted] = await db.insert(companies).values({
          project_id: project.id,
          name,
          color: color || null,
        }).returning();
        companyIdMap.set(name, inserted.id);
        existingCompanyByName.set(name, inserted);
      }
    }

    // ─── Check for existing plan (re-import) ──────────────────
    const existingPlan = await db.select().from(taktPlans)
      .where(eq(taktPlans.project_id, project.id))
      .get();

    const isReImport = !!existingPlan;
    let plan: typeof existingPlan;

    if (isReImport) {
      // Re-import: update existing plan
      plan = existingPlan;

      await db.update(taktPlans).set({
        import_log_id: importLog.id,
        name: `${projectName} — ${file.name}`,
      }).where(eq(taktPlans.id, plan!.id));
    } else {
      // First import: create new plan
      const [newPlan] = await db.insert(taktPlans).values({
        project_id: project.id,
        name: `${projectName} — ${file.name}`,
        import_log_id: importLog.id,
        status: 'active',
      }).returning();
      plan = newPlan;
    }

    const planId = plan!.id;

    // ─── Group activities by (company + taskName + phaseName) and insert/update ──
    const activityGroupKey = (a: ParsedActivity) =>
      `${a.company}||${a.taskName}||${a.phaseName}`;

    const activityGroups = new Map<string, ParsedActivity[]>();
    for (const a of nonMilestone) {
      const key = activityGroupKey(a);
      if (!activityGroups.has(key)) activityGroups.set(key, []);
      activityGroups.get(key)!.push(a);
    }

    // Load existing activities for re-import matching
    const existingActivities = isReImport
      ? await db.select().from(activities).where(eq(activities.takt_plan_id, planId))
      : [];
    const existingActivityByKey = new Map(
      existingActivities.map((a) => {
        // Reconstruct group key from activity fields
        const companyName = a.company_id
          ? [...companyIdMap.entries()].find(([, id]) => id === a.company_id)?.[0] || ''
          : '';
        return [`${companyName}||${a.name}||${a.phase_name || ''}`, a];
      })
    );

    const activityIdMap = new Map<string, number>(); // group key -> activity id
    let seqOrder = 0;
    for (const [key, group] of activityGroups) {
      const sample = group[0];
      const companyId = sample.company ? companyIdMap.get(sample.company) : null;

      // Check if activity already exists
      const existingActivity = existingActivityByKey.get(key);
      if (existingActivity) {
        // Update existing activity
        await db.update(activities).set({
          task_code: sample.taskCode || null,
          company_id: companyId ?? null,
          color: sample.color ? `#${sample.color}` : null,
          sequence_order: seqOrder++,
          takt_period: sample.taktPeriod,
        }).where(eq(activities.id, existingActivity.id));
        activityIdMap.set(key, existingActivity.id);
      } else {
        const [inserted] = await db.insert(activities).values({
          takt_plan_id: planId,
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
    }

    // ─── Insert/update tasks ──────────────────────────────────
    // Load existing tasks for re-import matching by intakt_task_id
    const existingTasks = isReImport
      ? await db.select().from(tasks).where(eq(tasks.takt_plan_id, planId))
      : [];
    const existingTaskByIntaktId = new Map(
      existingTasks.filter((t) => t.intakt_task_id).map((t) => [t.intakt_task_id!, t])
    );

    const importedIntaktIds = new Set<string>();
    const taskIntaktIdMap = new Map<string, number>(); // intakt task id -> our task id

    for (const a of nonMilestone) {
      const key = activityGroupKey(a);
      const activityId = activityIdMap.get(key);
      if (!activityId) continue;

      // Find zone using area + phase to distinguish same zone names across buildings
      let zoneId: number | null = null;
      if (a.area) {
        // Determine building code from phase first, then fallback to area prefix
        let bCode = /^SE\s+Building/i.test(a.phaseName) ? 'SE'
          : /^N\s+Building/i.test(a.phaseName) ? 'N'
          : /^SW\s+Building/i.test(a.phaseName) ? 'SW'
          : null;
        // Fallback: extract building code from area (e.g., "SE Building, Foundations 1" or "N, 9 (5PK)")
        if (!bCode) {
          const areaBuilding = a.area.match(/^(SE|N|SW)\s+Building/i) || a.area.match(/^(SE|N|SW),/);
          if (areaBuilding) bCode = areaBuilding[1].toUpperCase();
        }
        const sType = /Interiors?$/i.test(a.phaseName) ? 'interior'
          : /Exteriors?$/i.test(a.phaseName) ? 'exterior'
          : /Foundation/i.test(a.phaseName) ? 'foundation'
          : /Civil/i.test(a.phaseName) ? 'civil'
          : /Procurement/i.test(a.phaseName) ? 'procurement'
          : 'other';
        const lookupKey = `${a.area}||${sType}||${bCode || ''}`;
        const uniqueKey = zoneKeyByAreaPhase.get(lookupKey);
        if (uniqueKey) {
          zoneId = zoneIdByUniqueKey.get(uniqueKey) ?? null;
        }
      }
      const mappedStatus = mapInTaktStatus(a.status);
      importedIntaktIds.add(a.taskId);

      const existingTask = existingTaskByIntaktId.get(a.taskId);
      if (existingTask) {
        // Re-import: detect changes and log them
        const dateShifted = existingTask.planned_start !== a.startDate || existingTask.planned_end !== a.finishDate;
        const statusChanged = existingTask.intakt_status !== a.status;

        if (dateShifted) {
          await db.insert(importChangelog).values({
            import_log_id: importLog.id,
            change_type: 'date_shift',
            task_id: existingTask.id,
            intakt_task_id: a.taskId,
            description: `${a.taskName} dates shifted: ${existingTask.planned_start}→${a.startDate} to ${existingTask.planned_end}→${a.finishDate}`,
            old_value: `${existingTask.planned_start} - ${existingTask.planned_end}`,
            new_value: `${a.startDate} - ${a.finishDate}`,
          });
        }

        if (statusChanged) {
          await db.insert(importChangelog).values({
            import_log_id: importLog.id,
            change_type: 'status_change',
            task_id: existingTask.id,
            intakt_task_id: a.taskId,
            description: `${a.taskName} status: ${existingTask.intakt_status} → ${a.status}`,
            old_value: existingTask.intakt_status,
            new_value: a.status,
          });
        }

        // Update planned dates (preserve baseline and local tracking data)
        await db.update(tasks).set({
          activity_id: activityId,
          zone_id: zoneId ?? null,
          task_name: a.taskName,
          // Save previous dates before overwriting
          prev_planned_start: dateShifted ? existingTask.planned_start : existingTask.prev_planned_start,
          prev_planned_end: dateShifted ? existingTask.planned_end : existingTask.prev_planned_end,
          planned_start: a.startDate,
          planned_end: a.finishDate,
          intakt_status: a.status,
          crew_size: a.crewSize,
          area_raw: a.area || null,
          // Do NOT overwrite: baseline_start/end, actual_start/end, status, recovery_*, inherited_delay_days
          updated_at: new Date().toISOString(),
        }).where(eq(tasks.id, existingTask.id));

        taskIntaktIdMap.set(a.taskId, existingTask.id);
      } else {
        // New task (first import or new task added to schedule)
        const wasAlreadyCompleted = mappedStatus === 'completed';
        const [inserted] = await db.insert(tasks).values({
          takt_plan_id: planId,
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
          // Mark tasks imported as already completed — no recovery tracking possible
          imported_as_completed: wasAlreadyCompleted,
          is_trackable: !wasAlreadyCompleted,
        }).returning();

        // Log new tasks on re-imports
        if (isReImport) {
          await db.insert(importChangelog).values({
            import_log_id: importLog.id,
            change_type: 'new_task',
            task_id: inserted.id,
            intakt_task_id: a.taskId,
            description: `New task added: ${a.taskName} (${a.area || 'no zone'})`,
            new_value: `${a.startDate} - ${a.finishDate}`,
          });
        }

        taskIntaktIdMap.set(a.taskId, inserted.id);
      }
    }

    // Flag tasks that were removed from the import (mark as blocked)
    if (isReImport) {
      for (const existingTask of existingTasks) {
        if (existingTask.intakt_task_id && !importedIntaktIds.has(existingTask.intakt_task_id)) {
          // Task no longer in import file — flag it
          if (existingTask.status !== 'completed') {
            await db.update(tasks).set({
              status: 'blocked',
              notes: (existingTask.notes ? existingTask.notes + '\n' : '') +
                '[Re-import] Task removed from schedule file',
              updated_at: new Date().toISOString(),
            }).where(eq(tasks.id, existingTask.id));
          }
        }
      }
    }

    // ─── Insert/update relationships ──────────────────────────
    // For re-imports, clear old relationships and re-insert
    if (isReImport) {
      // Get all task IDs for this plan to delete their relationships
      const allPlanTaskIds = await db
        .select({ id: tasks.id })
        .from(tasks)
        .where(eq(tasks.takt_plan_id, planId));
      const planTaskIdSet = new Set(allPlanTaskIds.map((t) => t.id));

      // Delete existing relationships for this plan's tasks
      for (const tid of planTaskIdSet) {
        await db.delete(taskRelationships)
          .where(eq(taskRelationships.predecessor_task_id, tid));
      }
    }

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

    // Get changelog summary for re-imports
    const changelog = isReImport
      ? await db.select().from(importChangelog).where(eq(importChangelog.import_log_id, importLog.id))
      : [];
    const dateShifts = changelog.filter((c) => c.change_type === 'date_shift').length;
    const statusChanges = changelog.filter((c) => c.change_type === 'status_change').length;
    const newTasks = changelog.filter((c) => c.change_type === 'new_task').length;

    // Count pre-existing completed (first import only)
    const importedAsCompleted = isReImport ? 0 :
      nonMilestone.filter((a) => mapInTaktStatus(a.status) === 'completed').length;

    return NextResponse.json({
      success: true,
      planId: planId,
      reImport: isReImport,
      summary: {
        activities: activityGroups.size,
        tasks: taskIntaktIdMap.size,
        relationships: relCount,
        buildings: result.buildings.length,
        zones: result.zones.length,
        companies: result.companies.size,
        errors: result.errors.length,
        importedAsCompleted,
        trackableTasks: taskIntaktIdMap.size - importedAsCompleted,
        ...(isReImport ? {
          tasksUpdated: [...importedIntaktIds].filter((id) => existingTaskByIntaktId.has(id)).length,
          tasksAdded: newTasks,
          tasksRemoved: existingTasks.filter(
            (t) => t.intakt_task_id && !importedIntaktIds.has(t.intakt_task_id)
          ).length,
          dateShifts,
          statusChanges,
          changelog: changelog.slice(0, 50), // First 50 changes for UI display
        } : {}),
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
