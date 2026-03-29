'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { completionStatus } from '@/lib/dates';
import { apiMutate } from '@/lib/fetcher';
import { EntryRecord, SEVERITY_DOT_COLORS, VARIANCE_CODES, STATUS_COLORS } from './types';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface WalkSummaryProps {
  entries: EntryRecord[];
  checkedZones: Set<string>;
  planId: string;
  walkId: number | null;
}

interface CompanyGroup {
  companyName: string;
  entries: EntryRecord[];
  onTrack: number;
  delayed: number;
  completed: number;
  recovered: number;
}

interface SummaryData {
  previousWalk: { id: number; walkDate: string; onTrackRate: number } | null;
  nextUpTasks: Array<{ taskName: string; zoneName: string | null; companyName: string | null; plannedStart: string }>;
}

export function WalkSummary({ entries, checkedZones, planId, walkId }: WalkSummaryProps) {
  const router = useRouter();
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  // Fetch summary data (previous walk trend + next-up tasks)
  useEffect(() => {
    if (!walkId) {
      setSummaryLoading(false);
      return;
    }
    apiMutate(`/api/site-walks/summary?planId=${planId}&walkId=${walkId}`, { method: 'GET' })
      .then((data) => setSummaryData(data))
      .catch(() => {})
      .finally(() => setSummaryLoading(false));
  }, [planId, walkId]);

  // Top-level status counts
  const onTrack = entries.filter((e) => e.status === 'on_track').length;
  const delayed = entries.filter((e) => e.status === 'delayed').length;
  const recovered = entries.filter((e) => e.status === 'recovered').length;
  const completed = entries.filter((e) => e.status === 'completed').length;
  const earlyOrOnTime = entries.filter(
    (e) => e.status === 'completed' && e.completedDate && completionStatus(e.completedDate, e.task.planned_end).days <= 0
  ).length;

  // Company grouping with delayed-first sort
  const companyGroups = useMemo(() => {
    const groupMap = new Map<string, EntryRecord[]>();
    for (const entry of entries) {
      const name = entry.task.company?.name || 'Unassigned';
      if (!groupMap.has(name)) groupMap.set(name, []);
      groupMap.get(name)!.push(entry);
    }

    const groups: CompanyGroup[] = [];
    for (const [companyName, companyEntries] of groupMap) {
      groups.push({
        companyName,
        entries: companyEntries,
        onTrack: companyEntries.filter((e) => e.status === 'on_track').length,
        delayed: companyEntries.filter((e) => e.status === 'delayed').length,
        completed: companyEntries.filter((e) => e.status === 'completed').length,
        recovered: companyEntries.filter((e) => e.status === 'recovered').length,
      });
    }

    // Sort: delayed companies first (desc by delayed count), then alphabetical
    groups.sort((a, b) => {
      if (a.delayed > 0 && b.delayed === 0) return -1;
      if (a.delayed === 0 && b.delayed > 0) return 1;
      if (a.delayed !== b.delayed) return b.delayed - a.delayed;
      return a.companyName.localeCompare(b.companyName);
    });

    return groups;
  }, [entries]);

  // On-track rate and trend
  const currentOnTrackRate = entries.length > 0
    ? Math.round(((onTrack + completed) / entries.length) * 100)
    : 0;

  const trend = useMemo(() => {
    if (!summaryData?.previousWalk) return 'none';
    const prev = summaryData.previousWalk.onTrackRate;
    if (currentOnTrackRate > prev) return 'up';
    if (currentOnTrackRate < prev) return 'down';
    return 'same';
  }, [summaryData, currentOnTrackRate]);

  // Next-up tasks grouped by company
  const nextUpByCompany = useMemo(() => {
    if (!summaryData?.nextUpTasks?.length) return [];
    const map = new Map<string, SummaryData['nextUpTasks']>();
    for (const t of summaryData.nextUpTasks) {
      const name = t.companyName || 'Unassigned';
      if (!map.has(name)) map.set(name, []);
      map.get(name)!.push(t);
    }
    return Array.from(map.entries()).map(([name, tasks]) => ({ companyName: name, tasks }));
  }, [summaryData]);

  function formatPlannedStart(dateStr: string): string {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function getVarianceInfo(code: string | null | undefined) {
    if (!code) return null;
    return VARIANCE_CODES.find((v) => v.code === code) || null;
  }

  return (
    <div className="p-4 md:p-6 max-w-md mx-auto">
      {/* Section: Status Overview */}
      <div className="text-center mb-8">
        <div className="text-4xl mb-2">&#10003;</div>
        <h2 className="text-2xl font-bold">Walk Complete</h2>
        <p className="text-gray-500">{entries.length} tasks updated across {checkedZones.size} zones</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-8">
        <div className="bg-green-50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{onTrack}</div>
          <div className="text-xs text-green-700">On Track</div>
        </div>
        <div className="bg-emerald-50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-emerald-600">{completed}</div>
          <div className="text-xs text-emerald-700">Completed{earlyOrOnTime > 0 ? ` (${earlyOrOnTime} on time)` : ''}</div>
        </div>
        <div className="bg-red-50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{delayed}</div>
          <div className="text-xs text-red-700">Delayed</div>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{recovered}</div>
          <div className="text-xs text-blue-700">Recovered</div>
        </div>
      </div>

      {/* Section: Company Breakdown */}
      <h3 className="text-lg font-semibold mb-3">Company Breakdown</h3>

      {delayed === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-700 text-sm mb-4">
          All trades on track
        </div>
      )}

      {companyGroups.map((group) => (
        <div key={group.companyName} className="bg-white border border-gray-200 rounded-xl p-4 mb-3">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-semibold text-gray-900">{group.companyName}</h4>
            <span className="text-sm text-gray-500">{group.entries.length} tasks</span>
          </div>

          {/* Status breakdown badges */}
          <div className="flex gap-2 flex-wrap mb-3">
            {group.onTrack > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">{group.onTrack} on track</span>
            )}
            {group.completed > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">{group.completed} completed</span>
            )}
            {group.delayed > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">{group.delayed} delayed</span>
            )}
            {group.recovered > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{group.recovered} recovered</span>
            )}
          </div>

          {/* Entry list */}
          {group.entries.map((entry) => {
            if (entry.status === 'delayed') {
              const variance = getVarianceInfo(entry.varianceCode);
              return (
                <div key={entry.id} className="py-2 border-t border-gray-100">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-900">{entry.task.task_name}</span>
                    <span className="text-xs text-gray-500">{entry.task.zoneName}</span>
                  </div>
                  <div className="flex gap-2 mt-1 items-center flex-wrap">
                    {variance && (
                      <span className={`text-xs px-1.5 py-0.5 rounded border ${variance.color}`}>{variance.label}</span>
                    )}
                    {entry.delayDays != null && entry.delayDays > 0 && (
                      <span className="text-xs text-red-600">{entry.delayDays}d late</span>
                    )}
                    {entry.severity && SEVERITY_DOT_COLORS[entry.severity] && (
                      <span className="inline-flex items-center gap-1 text-xs">
                        <span className={`w-2 h-2 rounded-full ${SEVERITY_DOT_COLORS[entry.severity]}`}></span>
                        {entry.severity}
                      </span>
                    )}
                  </div>
                </div>
              );
            }
            // On-track / completed / recovered: compact format
            return (
              <div key={entry.id} className="py-1.5 border-t border-gray-100 flex justify-between">
                <span className="text-sm text-gray-700">{entry.task.task_name}</span>
                <span className="text-xs text-gray-400">{entry.task.zoneName}</span>
              </div>
            );
          })}
        </div>
      ))}

      {/* Section: Next Up */}
      <h3 className="text-lg font-semibold mb-3 mt-6">Next Up (3 days)</h3>

      {summaryLoading && (
        <p className="text-sm text-gray-400">Loading...</p>
      )}

      {!summaryLoading && (!nextUpByCompany.length) && (
        <p className="text-sm text-gray-400">No tasks starting in the next 3 days</p>
      )}

      {!summaryLoading && nextUpByCompany.map(({ companyName, tasks }) => (
        <div key={companyName} className="mb-3">
          <h4 className="text-sm font-medium text-gray-600 mb-1">{companyName}</h4>
          {tasks.map((t, i) => (
            <div key={i} className="flex justify-between py-1 text-sm">
              <span>{t.taskName} <span className="text-gray-400">- {t.zoneName}</span></span>
              <span className="text-gray-500">{formatPlannedStart(t.plannedStart)}</span>
            </div>
          ))}
        </div>
      ))}

      {/* Section: Walk Trend */}
      <h3 className="text-lg font-semibold mb-3 mt-6">Walk Trend</h3>

      <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-3">
        <div className="text-2xl font-bold text-gray-900">{currentOnTrackRate}%</div>
        <div className="text-sm text-gray-500">on track</div>
        <div className="ml-auto flex items-center gap-1.5">
          {trend === 'up' && (
            <>
              <ArrowUp className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-600">Improved from {summaryData?.previousWalk?.onTrackRate}%</span>
            </>
          )}
          {trend === 'down' && (
            <>
              <ArrowDown className="w-4 h-4 text-red-600" />
              <span className="text-sm text-red-600">Down from {summaryData?.previousWalk?.onTrackRate}%</span>
            </>
          )}
          {trend === 'same' && (
            <>
              <Minus className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-400">Same as last walk</span>
            </>
          )}
          {trend === 'none' && (
            <>
              <Minus className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-400">First walk</span>
            </>
          )}
        </div>
      </div>

      {/* Section: Action Buttons */}
      <div className="space-y-3 mt-6">
        <button onClick={() => router.push(`/schedule/${planId}`)} className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 min-h-[48px]">View Timeline</button>
        <button onClick={() => router.push(`/schedule/${planId}/scorecard`)} className="w-full py-3 bg-white border border-gray-200 rounded-xl font-medium hover:bg-gray-50 min-h-[48px]">View Scorecard</button>
      </div>
    </div>
  );
}
