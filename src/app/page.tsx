import { db } from '@/db/client';
import { taktPlans, tasks, companies, buildings, importLogs } from '@/db/schema';
import { eq, count, sql, desc } from 'drizzle-orm';
import Link from 'next/link';
import { calculateHealthIndex, getHealthColor } from '@/lib/health-index';
import { getScorecardData } from '@/lib/scorecard-service';
import { Card, CardContent } from '@/components/ui/card';

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

    // Health Index and scorecard data
    const healthIndex = latestPlan ? await calculateHealthIndex(latestPlan.id) : null;
    const scorecard = latestPlan ? await getScorecardData(latestPlan.id) : null;

    // Top/bottom trades by PPC
    const sortedCompanies = scorecard?.companies?.slice().sort((a, b) => b.ppc - a.ppc) ?? [];
    const topTrades = sortedCompanies.slice(0, 3);
    const bottomTrades = sortedCompanies.filter(c => c.totalTasks > 0).slice(-3).reverse();

    return (
      <div className="p-4 md:p-6 max-w-6xl mx-auto">
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
            {/* Hero: Health Index + PPC/SPI */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {/* Health Index Hero Card */}
              <Card className="md:col-span-1">
                <CardContent className="pt-6 text-center">
                  <div className={`text-5xl font-semibold ${healthIndex && healthIndex.score >= 0 ? getHealthColor(healthIndex.score).split(' ')[0] : 'text-gray-500'}`}>
                    {healthIndex && healthIndex.score >= 0 ? healthIndex.score : 'N/A'}
                  </div>
                  <div className="text-xs font-semibold text-gray-500 mt-2">Schedule Health</div>
                  <div className="text-sm mt-1">{healthIndex?.label ?? 'No tasks due yet'}</div>
                </CardContent>
              </Card>

              {/* PPC + SPI cards (hidden on mobile per D-03) */}
              <div className="hidden md:grid md:col-span-2 md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-gray-500 font-semibold">Plan Complete</div>
                    <div className="text-2xl font-bold mt-1">{healthIndex?.ppc ?? 0}%</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-gray-500 font-semibold">Schedule Index</div>
                    <div className="text-2xl font-bold mt-1">{healthIndex?.spi?.toFixed(2) ?? '1.00'}</div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Top/Bottom Trades (hidden on mobile per D-03) */}
            <div className="hidden md:grid md:grid-cols-2 gap-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm font-semibold text-gray-500 mb-3">Top Performers</div>
                  {topTrades.map(t => (
                    <div key={t.companyId} className="flex justify-between text-sm py-1.5">
                      <span>{t.companyName}</span>
                      <span className="font-medium text-green-600">{t.ppc}%</span>
                    </div>
                  ))}
                  {topTrades.length === 0 && <div className="text-sm text-gray-400">No data yet</div>}
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm font-semibold text-gray-500 mb-3">Needs Attention</div>
                  {bottomTrades.map(t => (
                    <div key={t.companyId} className="flex justify-between text-sm py-1.5">
                      <span>{t.companyName}</span>
                      <span className="font-medium text-red-600">{t.ppc}%</span>
                    </div>
                  ))}
                  {bottomTrades.length === 0 && <div className="text-sm text-gray-400">No data yet</div>}
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions (always visible) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              <Link
                href={`/schedule/${latestPlan!.id}/site-walk`}
                className="flex items-center justify-center px-4 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-medium transition min-h-[56px] active:scale-95"
              >
                Start Site Walk
              </Link>
              <Link
                href={`/schedule/${latestPlan!.id}/scorecard`}
                className="flex items-center justify-center px-4 py-4 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 text-sm font-medium transition min-h-[56px] active:scale-95"
              >
                View Scorecard
              </Link>
              <Link
                href={`/schedule/${latestPlan!.id}`}
                className="flex items-center justify-center px-4 py-4 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 text-sm font-medium transition min-h-[56px] active:scale-95"
              >
                Open Timeline
              </Link>
            </div>

            {/* Active Plans + Buildings (hidden on mobile - less important on phone) */}
            <div className="hidden md:block">
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
            </div>
          </>
        )}
      </div>
    );
  } catch (err) {
    return (
      <div className="p-6 text-center">
        <h3 className="text-lg font-semibold text-red-600">Unable to load dashboard</h3>
        <p className="text-gray-500 mt-2">Please check your connection and refresh.</p>
      </div>
    );
  }
}
