'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface CompanyScore {
  companyId: number;
  companyName: string;
  companyColor: string | null;
  totalTasks: number;
  completedTasks: number;
  completedOnTime: number;
  completedLate: number;
  onTimeRate: number;        // -1 = no data
  assignedDelayDays: number;
  weightedDelayDays: number;
  inheritedDelayDays: number;
  recoveryPoints: number;
  recoveryRate: number;      // -1 = N/A
  healthScore: number;
}

interface Building {
  id: number;
  code: string;
  name: string;
}

interface Scorecard {
  companies: CompanyScore[];
  overall: {
    totalDelayDays: number;
    totalWeightedDelayDays: number;
    totalRecoveryPoints: number;
    totalInheritedDays: number;
  };
  building: Building | null;
}

export default function ScorecardPage() {
  const params = useParams();
  const planId = params.planId as string;
  const [scorecard, setScorecard] = useState<Scorecard | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<keyof CompanyScore>('healthScore');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('');

  const [error, setError] = useState<string | null>(null);
  const [expandedCompany, setExpandedCompany] = useState<number | null>(null);
  const [companyDetails, setCompanyDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Fetch buildings for the plan
  useEffect(() => {
    const fetchBuildings = async () => {
      try {
        const planRes = await fetch(`/tracking/api/plans/${planId}`);
        if (planRes.ok) {
          const planData = await planRes.json();
          if (planData.buildings) {
            setBuildings(planData.buildings);
          }
        }
      } catch {
        // Buildings are optional
      }
    };
    fetchBuildings();
  }, [planId]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const buildingParam = selectedBuildingId ? `&buildingId=${selectedBuildingId}` : '';
        const res = await fetch(`/tracking/api/scorecard?planId=${planId}${buildingParam}`);
        if (!res.ok) throw new Error('Failed to load');
        const data = await res.json();
        setScorecard(data);
      } catch (err) {
        setError('Failed to load scorecard data. Please check your connection and refresh.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [planId, selectedBuildingId]);

  const handleSort = (col: keyof CompanyScore) => {
    if (sortBy === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortDir('desc');
    }
  };

  const handleCompanyClick = async (companyId: number) => {
    if (expandedCompany === companyId) {
      setExpandedCompany(null);
      setCompanyDetails(null);
      return;
    }
    setExpandedCompany(companyId);
    setLoadingDetails(true);
    try {
      // Fetch all tasks for this company in this plan
      const res = await fetch(`/tracking/api/plans/${planId}?limit=0`);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      const companyTasks = data.tasks.filter((t: any) => t.company?.id === companyId);

      // Get delays for these tasks
      const delayPromises = companyTasks.slice(0, 50).map(async (t: any) => {
        const dRes = await fetch(`/tracking/api/tasks/${t.id}`);
        if (!dRes.ok) return { ...t, delays: [] };
        const taskData = await dRes.json();
        return { ...t, delays: taskData.delays || [] };
      });
      const tasksWithDelays = await Promise.all(delayPromises);

      setCompanyDetails({
        tasks: tasksWithDelays,
        total: companyTasks.length,
        completed: companyTasks.filter((t: any) => t.status === 'completed').length,
        delayed: companyTasks.filter((t: any) => t.status === 'delayed').length,
        onTrack: companyTasks.filter((t: any) => t.recovery_status === 'on_track').length,
      });
    } catch {
      setCompanyDetails(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <h3 className="text-lg font-semibold text-red-600">Unable to load scorecard</h3>
        <p className="text-gray-500 mt-2">{error}</p>
      </div>
    );
  }

  if (!scorecard) return <div className="p-6">No scorecard data</div>;

  const sorted = [...scorecard.companies].sort((a, b) => {
    const aVal = a[sortBy] ?? 0;
    const bVal = b[sortBy] ?? 0;
    return sortDir === 'desc'
      ? (bVal as number) - (aVal as number)
      : (aVal as number) - (bVal as number);
  });

  // Top 10 by recovery rate for bar chart
  const top10 = [...scorecard.companies]
    .sort((a, b) => b.recoveryRate - a.recoveryRate)
    .slice(0, 10);
  const maxRate = Math.max(...top10.map((c) => c.recoveryRate), 1);

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4 no-print">
        <div>
          <h2 className="text-xl font-bold">
            {scorecard.building
              ? `${scorecard.building.name} Scorecard`
              : 'Project Scorecard'}
          </h2>
          <p className="text-sm text-gray-500">Trade accountability & recovery tracking</p>
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
          <button
            onClick={() => window.print()}
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50 min-h-[44px]"
          >
            Print
          </button>
          <Link
            href={`/schedule/${planId}`}
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50 min-h-[44px] flex items-center"
          >
            ← Timeline
          </Link>
        </div>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-red-50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{scorecard.overall.totalDelayDays}</div>
          <div className="text-xs text-red-700">Total Assigned Delay Days</div>
        </div>
        <div className="bg-yellow-50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">{scorecard.overall.totalInheritedDays}</div>
          <div className="text-xs text-yellow-700">Total Inherited Delay Days</div>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{scorecard.overall.totalRecoveryPoints}</div>
          <div className="text-xs text-blue-700">Total Recovery Points</div>
        </div>
      </div>

      {/* Top 10 Recovery Rate Bar Chart */}
      {top10.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <h3 className="font-semibold text-sm mb-4">Top 10 Companies by Recovery Rate</h3>
          <div className="space-y-2">
            {top10.map((company) => {
              const barWidth = maxRate > 0 ? (company.recoveryRate / maxRate) * 100 : 0;
              const barColor =
                company.recoveryRate >= 80
                  ? 'bg-green-500'
                  : company.recoveryRate >= 50
                  ? 'bg-yellow-500'
                  : company.recoveryRate >= 1
                  ? 'bg-red-500'
                  : 'bg-gray-300';

              return (
                <div key={company.companyId} className="flex items-center gap-3">
                  <div className="w-28 flex-shrink-0 text-xs font-medium truncate text-right">
                    <span className="text-gray-900">
                      {company.companyName}
                    </span>
                  </div>
                  <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full print-bar transition-all duration-500 ${barColor}`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <div className="w-12 text-xs font-bold text-right">{company.recoveryRate}%</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Leaderboard */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto scorecard-table-scroll">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-3 py-3 font-semibold text-gray-600 sticky left-0 bg-gray-50 z-10 w-8">#</th>
                <th className="text-left px-3 py-3 font-semibold text-gray-600 cursor-pointer hover:text-gray-900 sticky left-8 bg-gray-50 z-10 min-w-[130px]"
                  onClick={() => handleSort('companyName')}>
                  Company {sortBy === 'companyName' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
                </th>
                <th className="text-center px-3 py-3 font-semibold text-gray-600 cursor-pointer hover:text-gray-900"
                  onClick={() => handleSort('healthScore')}>
                  Score {sortBy === 'healthScore' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
                </th>
                <th className="text-right px-3 py-3 font-semibold text-gray-600 cursor-pointer hover:text-gray-900"
                  onClick={() => handleSort('totalTasks')}>Tasks</th>
                <th className="text-right px-3 py-3 font-semibold text-gray-600 cursor-pointer hover:text-gray-900"
                  onClick={() => handleSort('onTimeRate')}>On-Time</th>
                <th className="text-right px-3 py-3 font-semibold text-gray-600 cursor-pointer hover:text-gray-900"
                  onClick={() => handleSort('assignedDelayDays')}>Caused</th>
                <th className="text-right px-3 py-3 font-semibold text-gray-600 cursor-pointer hover:text-gray-900"
                  onClick={() => handleSort('weightedDelayDays')}>Weighted</th>
                <th className="text-right px-3 py-3 font-semibold text-gray-600 cursor-pointer hover:text-gray-900"
                  onClick={() => handleSort('inheritedDelayDays')}>Inherited</th>
                <th className="text-right px-3 py-3 font-semibold text-gray-600 cursor-pointer hover:text-gray-900"
                  onClick={() => handleSort('recoveryRate')}>Recovery</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map((company, i) => {
                const isExpanded = expandedCompany === company.companyId;

                return (
                  <><tr key={company.companyId}
                    onClick={() => handleCompanyClick(company.companyId)}
                    className={`hover:bg-gray-50 cursor-pointer transition ${company.weightedDelayDays >= 5 ? 'bg-red-50/30' : ''} ${isExpanded ? 'bg-blue-50/50' : ''}`}>
                    <td className="px-3 py-3 text-gray-400 sticky left-0 bg-inherit z-10">{i + 1}</td>
                    <td className="px-3 py-3 sticky left-8 bg-inherit z-10">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: company.companyColor ? `#${company.companyColor}` : '#9ca3af' }} />
                        <span className="font-medium text-gray-900">{company.companyName}</span>
                        <span className="text-gray-400 text-xs">{isExpanded ? '▲' : '▼'}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <HealthBadge score={company.healthScore} />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div>{company.completedTasks}/{company.totalTasks}</div>
                      <div className="text-[10px] text-gray-400">
                        {company.totalTasks > 0 ? Math.round(company.completedTasks / company.totalTasks * 100) : 0}% done
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      {company.onTimeRate >= 0 ? (
                        <span className={`font-medium ${company.onTimeRate >= 90 ? 'text-green-600' : company.onTimeRate >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {company.onTimeRate}%
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">No data</span>
                      )}
                      {company.completedLate > 0 && (
                        <div className="text-[10px] text-red-500">{company.completedLate} late</div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {company.assignedDelayDays > 0 ? (
                        <span className="text-red-600 font-medium">{company.assignedDelayDays}d</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {company.weightedDelayDays > 0 ? (
                        <span className="text-red-700 font-bold">{company.weightedDelayDays}d</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {company.inheritedDelayDays > 0 ? (
                        <span className="text-yellow-600">{company.inheritedDelayDays}d</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {company.recoveryRate >= 0 ? (
                        <RateBar rate={company.recoveryRate} />
                      ) : (
                        <span className="text-gray-300 text-xs">N/A</span>
                      )}
                    </td>
                  </tr>
                  {/* Expanded detail row */}
                  {isExpanded && (
                    <tr key={`${company.companyId}-detail`}>
                      <td colSpan={9} className="px-4 py-4 bg-gray-50/80 border-b-2 border-blue-200">
                        {loadingDetails ? (
                          <div className="flex items-center justify-center py-4">
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent" />
                            <span className="ml-2 text-sm text-gray-500">Loading details...</span>
                          </div>
                        ) : companyDetails ? (
                          <div>
                            {/* Summary stats */}
                            <div className="grid grid-cols-4 gap-3 mb-4">
                              <div className="bg-white rounded-lg p-3 text-center border border-gray-200">
                                <div className="text-lg font-bold">{companyDetails.total}</div>
                                <div className="text-[10px] text-gray-500">Total Tasks</div>
                              </div>
                              <div className="bg-white rounded-lg p-3 text-center border border-gray-200">
                                <div className="text-lg font-bold text-green-600">{companyDetails.completed}</div>
                                <div className="text-[10px] text-gray-500">Completed</div>
                              </div>
                              <div className="bg-white rounded-lg p-3 text-center border border-gray-200">
                                <div className="text-lg font-bold text-red-600">{companyDetails.delayed}</div>
                                <div className="text-[10px] text-gray-500">Delayed</div>
                              </div>
                              <div className="bg-white rounded-lg p-3 text-center border border-gray-200">
                                <div className="text-lg font-bold text-blue-600">{companyDetails.onTrack}</div>
                                <div className="text-[10px] text-gray-500">On Track</div>
                              </div>
                            </div>

                            {/* Task list with delays */}
                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                              Recent Tasks ({Math.min(companyDetails.tasks.length, 50)} of {companyDetails.total})
                            </div>
                            <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                              {companyDetails.tasks.map((task: any) => (
                                <div key={task.id} className="bg-white rounded-lg px-3 py-2 border border-gray-100 flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                    task.status === 'completed' ? 'bg-green-500' :
                                    task.status === 'delayed' ? 'bg-red-500' :
                                    task.status === 'in_progress' ? 'bg-indigo-500' :
                                    'bg-gray-300'
                                  }`} />
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium truncate">{task.task_name}</div>
                                    <div className="text-[10px] text-gray-400">
                                      {task.zoneName || 'No zone'} · {task.planned_start} → {task.planned_end}
                                      {task.actual_end && (
                                        <span className={task.actual_end <= task.planned_end ? ' text-green-600' : ' text-red-600'}>
                                          {' '}(done {task.actual_end})
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end gap-0.5">
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                      task.status === 'completed' ? 'bg-green-100 text-green-700' :
                                      task.status === 'delayed' ? 'bg-red-100 text-red-700' :
                                      'bg-gray-100 text-gray-500'
                                    }`}>
                                      {task.status.replace('_', ' ')}
                                    </span>
                                    {task.inherited_delay_days > 0 && (
                                      <span className="text-[10px] text-yellow-600">{task.inherited_delay_days}d inherited</span>
                                    )}
                                    {task.delays?.length > 0 && task.delays.map((d: any, di: number) => (
                                      <span key={di} className={`text-[10px] ${d.delay_type === 'assigned' ? 'text-red-600 font-medium' : 'text-yellow-600'}`}>
                                        {d.delay_type}: {d.delay_days}d ({d.reason})
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center text-gray-400 text-sm py-4">No details available</div>
                        )}
                      </td>
                    </tr>
                  )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {sorted.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500 mt-4">
          No recovery data yet. Complete some site walks and record delays to see the scorecard.
        </div>
      )}
    </div>
  );
}

function RateBar({ rate }: { rate: number }) {
  const color =
    rate >= 80 ? 'bg-green-500' :
    rate >= 50 ? 'bg-yellow-500' :
    rate >= 1 ? 'bg-red-500' : 'bg-gray-300';

  return (
    <div className="flex items-center gap-2 justify-end">
      <div className="w-14 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full print-bar ${color}`} style={{ width: `${Math.min(100, rate)}%` }} />
      </div>
      <span className="text-xs font-medium w-8 text-right">{rate}%</span>
    </div>
  );
}

function HealthBadge({ score }: { score: number }) {
  const color = score >= 80 ? 'bg-green-100 text-green-700' :
    score >= 60 ? 'bg-yellow-100 text-yellow-700' :
    score >= 40 ? 'bg-orange-100 text-orange-700' :
    'bg-red-100 text-red-700';
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${color}`}>
      {score}
    </span>
  );
}
