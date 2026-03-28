import { db } from '@/db/client';
import { taktPlans, tasks, companies, buildings, importLogs } from '@/db/schema';
import { eq, count, sql, desc } from 'drizzle-orm';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  let plans, stats, companyCount, buildingList, lastImportDate;

  try {
    plans = await db.select().from(taktPlans).orderBy(taktPlans.created_at);

    // Use LATEST plan (last), not first
    const latestPlan = plans.length > 0 ? plans[plans.length - 1] : null;

    stats = latestPlan
      ? await db
          .select({
            total: count(),
            completed: count(sql`CASE WHEN ${tasks.status} = 'completed' THEN 1 END`),
            delayed: count(sql`CASE WHEN ${tasks.status} = 'delayed' THEN 1 END`),
            in_progress: count(sql`CASE WHEN ${tasks.status} = 'in_progress' THEN 1 END`),
          })
          .from(tasks)
          .where(eq(tasks.takt_plan_id, latestPlan.id))
      : [{ total: 0, completed: 0, delayed: 0, in_progress: 0 }];

    companyCount = await db.select({ count: count() }).from(companies);
    buildingList = await db.select().from(buildings);

    // Get last import date
    const lastImport = await db
      .select({ created_at: importLogs.created_at, file_name: importLogs.file_name })
      .from(importLogs)
      .orderBy(desc(importLogs.created_at))
      .limit(1);

    lastImportDate = lastImport.length > 0 ? lastImport[0].created_at : null;
  } catch (err) {
    return (
      <div className="p-6 text-center">
        <h3 className="text-lg font-semibold text-red-600">Unable to load dashboard</h3>
        <p className="text-gray-500 mt-2">Please check your connection and refresh.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">Dashboard</h2>
        <p className="text-gray-600">Takt-Flow Recovery System — Track delays, measure recovery, hold trades accountable.</p>
      </div>

      {plans.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="text-gray-400 text-5xl mb-4">📋</div>
          <h3 className="text-lg font-semibold mb-2">No schedule imported yet</h3>
          <p className="text-gray-500 mb-6">Upload your inTakt XLSX export to get started.</p>
          <Link
            href="/import"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition text-base font-medium min-h-[48px]"
          >
            Import Schedule
          </Link>
        </div>
      ) : (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <StatCard label="Total Tasks" value={stats[0].total} />
            <StatCard label="In Progress" value={stats[0].in_progress} color="text-indigo-600" />
            <StatCard label="Completed" value={stats[0].completed} color="text-green-600" />
            <StatCard label="Delayed" value={stats[0].delayed} color="text-red-600" />
            <StatCard label="Companies" value={companyCount[0].count} color="text-purple-600" />
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-sm text-gray-500">Last Import</div>
              <div className="text-sm font-bold text-gray-900 mt-1">
                {lastImportDate
                  ? new Date(lastImportDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'Never'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="font-semibold mb-3">Buildings</h3>
              <div className="space-y-2">
                {buildingList.map((b) => (
                  <div key={b.id} className="flex justify-between text-sm">
                    <span>{b.name}</span>
                    <span className="text-gray-500">{b.num_floors} floors</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="font-semibold mb-3">Active Plans</h3>
              <div className="space-y-2">
                {plans.map((plan) => (
                  <Link
                    key={plan.id}
                    href={`/schedule/${plan.id}`}
                    className="flex justify-between items-center text-sm p-3 rounded-lg hover:bg-gray-50 transition min-h-[48px]"
                  >
                    <span className="font-medium">{plan.name}</span>
                    <span className="text-gray-500">{plan.status}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Navigation buttons - more prominent, tablet-friendly */}
          <div className="space-y-4">
            {plans.map((plan) => (
              <div key={plan.id}>
                <div className="text-sm font-medium text-gray-500 mb-2">{plan.name}</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  <Link
                    href={`/schedule/${plan.id}`}
                    className="flex items-center justify-center px-4 py-4 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 text-sm font-medium transition min-h-[56px]"
                  >
                    Timeline
                  </Link>
                  <Link
                    href={`/schedule/${plan.id}/site-walk`}
                    className="flex items-center justify-center px-4 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-medium transition min-h-[56px]"
                  >
                    Site Walk
                  </Link>
                  <Link
                    href={`/schedule/${plan.id}/map`}
                    className="flex items-center justify-center px-4 py-4 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 text-sm font-medium transition min-h-[56px]"
                  >
                    Map
                  </Link>
                  <Link
                    href={`/schedule/${plan.id}/scorecard`}
                    className="flex items-center justify-center px-4 py-4 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 text-sm font-medium transition min-h-[56px]"
                  >
                    Scorecard
                  </Link>
                  <Link
                    href="/import"
                    className="flex items-center justify-center px-4 py-4 bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl hover:bg-gray-200 text-sm font-medium text-gray-600 transition min-h-[56px]"
                  >
                    Re-Import
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, color = 'text-gray-900' }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}
