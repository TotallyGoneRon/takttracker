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
  assignedDelayDays: number;
  inheritedDelayDays: number;
  recoveryPoints: number;
  recoveryRate: number;
}

interface Scorecard {
  companies: CompanyScore[];
  overall: {
    totalDelayDays: number;
    totalRecoveryPoints: number;
    totalInheritedDays: number;
  };
}

export default function ScorecardPage() {
  const params = useParams();
  const planId = params.planId as string;
  const [scorecard, setScorecard] = useState<Scorecard | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<keyof CompanyScore>('recoveryRate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch(`/tracking/api/scorecard?planId=${planId}`);
      const data = await res.json();
      setScorecard(data);
      setLoading(false);
    };
    fetchData();
  }, [planId]);

  const handleSort = (col: keyof CompanyScore) => {
    if (sortBy === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortDir('desc');
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
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

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold">Recovery Scorecard</h2>
          <p className="text-sm text-gray-500">Trade accountability & recovery tracking</p>
        </div>
        <Link
          href={`/tracking/schedule/${planId}`}
          className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
        >
          ← Timeline
        </Link>
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

      {/* Leaderboard */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">#</th>
                <th
                  className="text-left px-4 py-3 font-semibold text-gray-600 cursor-pointer hover:text-gray-900"
                  onClick={() => handleSort('companyName')}
                >
                  Company {sortBy === 'companyName' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
                </th>
                <th
                  className="text-right px-4 py-3 font-semibold text-gray-600 cursor-pointer hover:text-gray-900"
                  onClick={() => handleSort('totalTasks')}
                >
                  Tasks
                </th>
                <th
                  className="text-right px-4 py-3 font-semibold text-gray-600 cursor-pointer hover:text-gray-900"
                  onClick={() => handleSort('completedTasks')}
                >
                  Done
                </th>
                <th
                  className="text-right px-4 py-3 font-semibold text-gray-600 cursor-pointer hover:text-gray-900"
                  onClick={() => handleSort('assignedDelayDays')}
                >
                  Assigned Delays
                </th>
                <th
                  className="text-right px-4 py-3 font-semibold text-gray-600 cursor-pointer hover:text-gray-900"
                  onClick={() => handleSort('inheritedDelayDays')}
                >
                  Inherited
                </th>
                <th
                  className="text-right px-4 py-3 font-semibold text-gray-600 cursor-pointer hover:text-gray-900"
                  onClick={() => handleSort('recoveryPoints')}
                >
                  Recovery
                </th>
                <th
                  className="text-right px-4 py-3 font-semibold text-gray-600 cursor-pointer hover:text-gray-900"
                  onClick={() => handleSort('recoveryRate')}
                >
                  Rate
                </th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map((company, i) => {
                const isTopPerformer = company.recoveryRate >= 80 && company.recoveryPoints > 0;
                const isChronicDelayer = company.assignedDelayDays >= 5;

                return (
                  <tr
                    key={company.companyId}
                    className={`hover:bg-gray-50 ${isTopPerformer ? 'bg-green-50/50' : ''} ${isChronicDelayer ? 'bg-red-50/50' : ''}`}
                  >
                    <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: company.companyColor ? `#${company.companyColor}` : '#9ca3af' }}
                        />
                        <span className="font-medium">{company.companyName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">{company.totalTasks}</td>
                    <td className="px-4 py-3 text-right">{company.completedTasks}</td>
                    <td className="px-4 py-3 text-right">
                      {company.assignedDelayDays > 0 ? (
                        <span className="text-red-600 font-medium">{company.assignedDelayDays}d</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {company.inheritedDelayDays > 0 ? (
                        <span className="text-yellow-600">{company.inheritedDelayDays}d</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {company.recoveryPoints > 0 ? (
                        <span className="text-blue-600 font-medium">+{company.recoveryPoints}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <RateBar rate={company.recoveryRate} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isTopPerformer && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">
                          Star
                        </span>
                      )}
                      {isChronicDelayer && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">
                          Flag
                        </span>
                      )}
                    </td>
                  </tr>
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
      <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, rate)}%` }} />
      </div>
      <span className="text-xs font-medium w-8 text-right">{rate}%</span>
    </div>
  );
}
