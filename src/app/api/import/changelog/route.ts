import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { importChangelog, importLogs } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { parseIntParam } from '@/lib/validations';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const importLogId = url.searchParams.get('importLogId');
  const planId = url.searchParams.get('planId');

  if (importLogId) {
    const parsed = parseIntParam(importLogId, 'importLogId');
    if ('error' in parsed) return parsed.error;
    const changes = await db
      .select()
      .from(importChangelog)
      .where(eq(importChangelog.import_log_id, parsed.value));
    return NextResponse.json(changes);
  }

  if (planId) {
    // Get the latest import log for this plan's project, then its changelog
    const logs = await db
      .select()
      .from(importLogs)
      .orderBy(desc(importLogs.created_at))
      .limit(5);

    const result = await Promise.all(
      logs.map(async (log) => {
        const changes = await db
          .select()
          .from(importChangelog)
          .where(eq(importChangelog.import_log_id, log.id));
        return {
          ...log,
          changes,
          summary: {
            dateShifts: changes.filter((c) => c.change_type === 'date_shift').length,
            newTasks: changes.filter((c) => c.change_type === 'new_task').length,
            removedTasks: changes.filter((c) => c.change_type === 'removed_task').length,
            statusChanges: changes.filter((c) => c.change_type === 'status_change').length,
          },
        };
      })
    );

    return NextResponse.json(result);
  }

  return NextResponse.json({ error: 'importLogId or planId required' }, { status: 400 });
}
