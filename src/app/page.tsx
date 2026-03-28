import { db } from '@/db/client';
import { taktPlans, tasks, companies, buildings } from '@/db/schema';
import { eq, count, sql } from 'drizzle-orm';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const plans = await db.select().from(taktPlans).orderBy(taktPlans.created_at);

  const stats = plans.length > 0
    ? await db
        .select({
          total: count(),
          completed: count(sql`CASE WHEN ${tasks.status} = 'completed' THEN 1 END`),
          delayed: count(sql`CASE WHEN ${tasks.status} = 'delayed' THEN 1 END`),
          in_progress: count(sql`CASE WHEN ${tasks.status} = 'in_progress' THEN 1 END`),
        })
        .from(tasks)
        .where(eq(tasks.takt_plan_id, plans[0].id))
    : [{ total: 0, completed: 0, delayed: 0, in_progress: 0 }];

  const companyCount = await db.select({ count: count() }).from(companies);
  const buildingList = await db.select().from(buildings);

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
            href="/tracking/import"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Import Schedule
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total Tasks" value={stats[0].total} />
            <StatCard label="In Progress" value={stats[0].in_progress} color="text-indigo-600" />
            <StatCard label="Completed" value={stats[0].completed} color="text-green-600" />
            <StatCard label="Delayed" value={stats[0].delayed} color="text-red-600" />
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
                    href={`/tracking/schedule/${plan.id}`}
                    className="flex justify-between text-sm p-2 rounded-lg hover:bg-gray-50 transition"
                  >
                    <span className="font-medium">{plan.name}</span>
                    <span className="text-gray-500">{plan.status}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            {plans.map((plan) => (
              <div key={plan.id} className="flex gap-2">
                <Link
                  href={`/tracking/schedule/${plan.id}`}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-sm font-medium"
                >
                  Timeline
                </Link>
                <Link
                  href={`/tracking/schedule/${plan.id}/site-walk`}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                >
                  Site Walk
                </Link>
                <Link
                  href={`/tracking/schedule/${plan.id}/map`}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-sm font-medium"
                >
                  Map
                </Link>
                <Link
                  href={`/tracking/schedule/${plan.id}/scorecard`}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-sm font-medium"
                >
                  Scorecard
                </Link>
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
