'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ChevronUp, ChevronDown, X } from 'lucide-react';

import { STATUS_COLORS } from '@/lib/statusColors';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';

// --- Interfaces ---

interface ScorecardTask {
  id: number;
  taskName: string;
  status: string;
  plannedStart: string;
  plannedEnd: string;
  actualStart: string | null;
  actualEnd: string | null;
  delayDays: number;
  zoneName: string;
  zoneFloor: number | null;
  buildingCode: string;
  delays: Array<{
    id: number;
    delayDays: number;
    delayType: string;
    reason: string;
    notes: string | null;
    createdAt: string;
  }>;
}

interface ScorecardCompany {
  companyId: number;
  companyName: string;
  companyColor: string | null;
  totalTasks: number;
  completedTasks: number;
  onTimeTasks: number;
  lateTasks: number;
  onTimeRate: number;
  assignedDelayDays: number;
  ppc: number;
  inheritedDelayDays: number;
  recoveryPoints: number;
  recoveryRate: number;
  tasks: ScorecardTask[];
}

interface ScorecardOverall {
  totalTasks: number;
  completedTasks: number;
  onTimeRate: number;
  ppc: number;
  totalAssignedDelayDays: number;
  totalInheritedDays: number;
}

interface TrendPoint {
  week: string;
  onTimeRate: number;
  delayDays: number;
  completedCount: number;
}

interface ScorecardResponse {
  companies: ScorecardCompany[];
  overall: ScorecardOverall;
  trends: TrendPoint[];
  building: { id: number; code: string; name: string } | null;
}

interface Building {
  id: number;
  code: string;
  name: string;
}

// --- Helpers ---

function getPpcColor(ppc: number): string {
  if (ppc >= 80) return 'text-green-600';
  if (ppc >= 50) return 'text-yellow-600';
  return 'text-red-600';
}

// --- Chart Config ---

const chartConfig: ChartConfig = {
  delayDays: { label: 'Delay Days', color: '#ef4444' },
};

// --- Main Component ---

export default function ScorecardPage() {
  const params = useParams();
  const planId = params.planId as string;
  const [sortBy, setSortBy] = useState<string>('ppc');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('');

  const buildingParam = selectedBuildingId ? `&buildingId=${selectedBuildingId}` : '';
  const { data: scorecard, error, isLoading } = useSWR<ScorecardResponse>(
    `/api/scorecard?planId=${planId}${buildingParam}`
  );
  const { data: planData } = useSWR<{ buildings: Building[] }>(
    `/api/plans/${planId}`
  );
  const buildings = planData?.buildings || [];

  const handleSort = (col: string) => {
    if (sortBy === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortDir('desc');
    }
  };

  const selectedCompany = scorecard?.companies.find(c => c.companyId === selectedCompanyId) || null;
  const panelOpen = selectedCompanyId !== null;

  // Sort companies
  const sorted = scorecard ? [...scorecard.companies].sort((a, b) => {
    const aVal = (a as any)[sortBy] ?? 0;
    const bVal = (b as any)[sortBy] ?? 0;
    if (sortBy === 'recoveryRate') {
      if (aVal === -1 && bVal === -1) return 0;
      if (aVal === -1) return 1;
      if (bVal === -1) return -1;
    }
    return sortDir === 'desc' ? (bVal as number) - (aVal as number) : (aVal as number) - (bVal as number);
  }) : [];

  // --- Loading State ---
  if (isLoading) {
    return (
      <div className="p-4 md:p-6">
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-4 md:p-6 text-center">
                <Skeleton className="h-8 w-20 mx-auto mb-2" />
                <Skeleton className="h-3 w-24 mx-auto" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-[250px] w-full rounded-lg mb-8" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // --- Error State ---
  if (error) {
    return (
      <div className="p-4 md:p-6 text-center">
        <Card>
          <CardContent className="p-8">
            <h3 className="text-lg font-bold text-red-600">Unable to load scorecard</h3>
            <p className="text-sm text-gray-500 mt-2">Check your connection and refresh the page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!scorecard) return null;

  // --- Empty State ---
  if (scorecard.companies.length === 0) {
    return (
      <div className="p-4 md:p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <h3 className="text-lg font-bold text-gray-700">No scorecard data yet</h3>
            <p className="text-sm text-gray-500 mt-2">
              Complete site walks and record task progress to see trade performance rankings.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const SortIcon = ({ col }: { col: string }) => {
    if (sortBy !== col) return null;
    return sortDir === 'desc'
      ? <ChevronDown className="inline w-3 h-3 ml-0.5" />
      : <ChevronUp className="inline w-3 h-3 ml-0.5" />;
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Main Content — shrinks when panel is open */}
      <div className={`flex-1 min-w-0 transition-all duration-300 p-4 md:p-6 ${panelOpen ? 'md:mr-[480px]' : ''}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6 no-print">
          <div>
            <h2 className="text-xl font-bold">
              {scorecard.building ? `${scorecard.building.name} Scorecard` : 'Project Scorecard'}
            </h2>
            <p className="text-sm text-gray-500">Trade performance & accountability</p>
          </div>
          <div className="flex gap-2">
            {buildings.length > 0 && (
              <select
                value={selectedBuildingId}
                onChange={(e) => setSelectedBuildingId(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm min-h-[44px]"
              >
                <option value="">All Project</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            )}
            <Button variant="outline" className="min-h-[44px]" onClick={() => window.print()}>
              Print Scorecard
            </Button>
            <Link
              href={`/schedule/${planId}`}
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50 min-h-[44px] flex items-center"
            >
              ← Timeline
            </Link>
          </div>
        </div>

        {/* Stat Cards — 3 cards (removed On-Time Rate) */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 md:p-6 text-center">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <div>
                      <div className={`text-2xl font-bold ${getPpcColor(scorecard.overall.ppc)}`}>
                        {scorecard.overall.ppc}%
                      </div>
                      <div className="text-xs font-bold text-gray-500">Plan Complete (PPC)</div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Percent Plan Complete: completed tasks / tasks due by today</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 md:p-6 text-center">
              <div className={`text-2xl font-bold ${scorecard.overall.totalAssignedDelayDays > 0 ? 'text-red-600' : 'text-gray-300'}`}>
                {scorecard.overall.totalAssignedDelayDays > 0 ? scorecard.overall.totalAssignedDelayDays : '—'}
              </div>
              <div className="text-xs font-bold text-gray-500">Total Delay Days</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 md:p-6 text-center">
              <div className="text-2xl font-bold text-gray-900">
                {scorecard.overall.completedTasks}/{scorecard.overall.totalTasks}
              </div>
              <div className="text-xs font-bold text-gray-500">Tasks Complete</div>
            </CardContent>
          </Card>
        </div>

        {/* Trend Chart — Delay Days only */}
        <Card className="mb-8">
          <CardContent className="p-4">
            {scorecard.trends.length === 0 ? (
              <div className="text-center py-8">
                <h3 className="text-sm font-bold text-gray-700">Trend data will appear as tasks complete</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Weekly delay trends accumulate automatically from task completions.
                </p>
              </div>
            ) : (
              <div>
                <h3 className="text-sm font-bold text-gray-600 mb-3">Delay Days by Week</h3>
                <ChartContainer config={chartConfig} className="h-[200px] md:h-[250px] w-full">
                  <BarChart data={scorecard.trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" tickFormatter={(w: string) => w.replace(/^\d{4}-/, '')} />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="delayDays" fill="var(--color-delayDays)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Leaderboard Table — removed On-Time % column */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-3 py-3 font-bold text-gray-600 sticky left-0 bg-gray-50 z-10 w-8">#</th>
                  <th className="text-left px-3 py-3 font-bold text-gray-600 cursor-pointer hover:text-gray-900 sticky left-8 bg-gray-50 z-10 min-w-[130px]"
                    onClick={() => handleSort('companyName')}>
                    Company <SortIcon col="companyName" />
                  </th>
                  <th className="text-right px-3 py-3 font-bold text-gray-600 cursor-pointer hover:text-gray-900"
                    onClick={() => handleSort('totalTasks')}>
                    Tasks <SortIcon col="totalTasks" />
                  </th>
                  <th className="text-right px-3 py-3 font-bold text-gray-600 cursor-pointer hover:text-gray-900"
                    onClick={() => handleSort('assignedDelayDays')}>
                    Delay Days <SortIcon col="assignedDelayDays" />
                  </th>
                  <th className="text-right px-3 py-3 font-bold text-gray-600 cursor-pointer hover:text-gray-900"
                    onClick={() => handleSort('ppc')}>
                    PPC <SortIcon col="ppc" />
                  </th>
                  <th className="text-right px-3 py-3 font-normal text-gray-500 cursor-pointer hover:text-gray-900 hidden md:table-cell"
                    onClick={() => handleSort('recoveryRate')}>
                    Recovery <SortIcon col="recoveryRate" />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sorted.map((company, i) => (
                  <tr
                    key={company.companyId}
                    onClick={() => setSelectedCompanyId(company.companyId)}
                    className={`hover:bg-gray-50 cursor-pointer transition min-h-[44px] ${selectedCompanyId === company.companyId ? 'bg-blue-50/50' : ''}`}
                  >
                    <td className="px-3 py-3 text-gray-400 sticky left-0 bg-inherit z-10">{i + 1}</td>
                    <td className="px-3 py-3 sticky left-8 bg-inherit z-10">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: company.companyColor ? `#${company.companyColor}` : '#9ca3af' }}
                        />
                        <span className="font-bold text-gray-900">{company.companyName}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      {company.completedTasks}/{company.totalTasks}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {company.assignedDelayDays > 0 ? (
                        <span className="text-red-600 font-bold">{company.assignedDelayDays}d</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className={`font-bold ${getPpcColor(company.ppc)}`}>{company.ppc}%</span>
                    </td>
                    <td className="px-3 py-3 text-right hidden md:table-cell">
                      {company.recoveryRate >= 0 ? (
                        <RateBar rate={company.recoveryRate} />
                      ) : (
                        <span className="text-gray-300 text-xs">N/A</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Drill-Down Side Panel — pushes content over */}
      {panelOpen && selectedCompany && (
        <div className="fixed top-0 right-0 h-full w-full md:w-[480px] bg-white border-l border-gray-200 shadow-lg z-40 overflow-y-auto transition-transform duration-300">
          {/* Panel Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between z-10">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: selectedCompany.companyColor ? `#${selectedCompany.companyColor}` : '#9ca3af' }}
              />
              <h3 className="font-bold text-lg truncate">{selectedCompany.companyName}</h3>
            </div>
            <button
              onClick={() => setSelectedCompanyId(null)}
              className="p-2 hover:bg-gray-100 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <X className="w-5 h-5" />
              <span className="sr-only">Close trade detail panel</span>
            </button>
          </div>

          <div className="p-4">
            {/* Description */}
            <p className="text-sm text-gray-500 mb-4">
              {selectedCompany.totalTasks} tasks — {selectedCompany.completedTasks} completed — PPC {selectedCompany.ppc}%
            </p>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold">{selectedCompany.totalTasks}</div>
                <div className="text-xs text-gray-500">Total</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-green-600">{selectedCompany.completedTasks}</div>
                <div className="text-xs text-gray-500">Completed</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-red-600">
                  {selectedCompany.assignedDelayDays > 0 ? `${selectedCompany.assignedDelayDays}d` : '—'}
                </div>
                <div className="text-xs text-gray-500">Delay Days</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className={`text-lg font-bold ${getPpcColor(selectedCompany.ppc)}`}>{selectedCompany.ppc}%</div>
                <div className="text-xs text-gray-500">PPC</div>
              </div>
            </div>

            <Separator className="my-4" />

            {/* Task List */}
            <div className="space-y-2">
              {selectedCompany.tasks.map((task) => (
                <div key={task.id} className="bg-white rounded-lg border border-gray-100 p-3 min-h-[44px]">
                  <div className="flex items-start gap-2">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${
                      STATUS_COLORS[task.status as keyof typeof STATUS_COLORS]?.dot || 'bg-gray-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold truncate">{task.taskName}</div>
                      <div className="text-xs text-gray-500">
                        {task.zoneName} — {task.buildingCode} — Floor {task.zoneFloor ?? '—'}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        Planned: {task.plannedStart} to {task.plannedEnd}
                        {task.actualStart && (
                          <span> · Actual: {task.actualStart} to {task.actualEnd || 'ongoing'}</span>
                        )}
                      </div>
                      {task.delays.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {task.delays.map((d) => (
                            <Badge key={d.id} variant="outline" className="text-xs">
                              {d.delayType}: {d.delayDays}d ({d.reason})
                            </Badge>
                          ))}
                        </div>
                      )}
                      {task.delays.length === 0 && (
                        <div className="text-xs text-gray-400 mt-1">No delays recorded for this task.</div>
                      )}
                      <Link
                        href={`/schedule/${params.planId}`}
                        className="text-xs text-blue-600 hover:text-blue-800 mt-1 inline-block"
                      >
                        View downstream impact
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
              {selectedCompany.tasks.length === 0 && (
                <div className="text-center text-gray-400 text-sm py-4">No tasks found</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Sub-Components ---

function RateBar({ rate }: { rate: number }) {
  const color =
    rate >= 80 ? 'bg-green-500' :
    rate >= 50 ? 'bg-yellow-500' :
    rate >= 1 ? 'bg-red-500' : 'bg-gray-300';

  return (
    <div className="flex items-center gap-2 justify-end">
      <div className="w-10 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, rate)}%` }} />
      </div>
      <span className="text-xs font-normal text-gray-500 w-8 text-right">{rate}%</span>
    </div>
  );
}
