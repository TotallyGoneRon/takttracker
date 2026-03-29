'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import useSWR from 'swr';

interface Task {
  id: number;
  task_name: string;
  planned_start: string;
  planned_end: string;
  actual_start: string | null;
  actual_end: string | null;
  status: string;
  recovery_status: string | null;
  inherited_delay_days: number;
  recovery_points: number;
  crew_size: number | null;
  activityName: string;
  activityColor: string | null;
  activityPhase: string | null;
  activitySequence: number;
  taskCode: string | null;
  company: { id: number; name: string; color: string | null } | null;
  zoneName: string | null;
  zoneFloor: number | null;
  zoneType: string | null;
  buildingId: number | null;
  area_raw: string | null;
}

interface Building {
  id: number;
  code: string;
  name: string;
  num_floors: number;
}

interface PlanData {
  plan: { id: number; name: string; status: string };
  tasks: Task[];
  buildings: Building[];
  companies: { id: number; name: string; color: string | null }[];
  stats: Record<string, number>;
}

const STATUS_COLORS: Record<string, string> = {
  not_started: 'bg-gray-200 text-gray-700',
  in_progress: 'bg-indigo-100 text-indigo-700',
  completed: 'bg-green-100 text-green-700',
  delayed: 'bg-red-100 text-red-700',
  blocked: 'bg-red-200 text-red-800',
};

const STATUS_DOT_COLORS: Record<string, string> = {
  not_started: 'bg-gray-400',
  in_progress: 'bg-indigo-500',
  completed: 'bg-green-500',
  delayed: 'bg-red-500',
  blocked: 'bg-red-700',
};


function getCurrentWeek() {
  // Mountain Time, Mon-Fri work week (weekends don't count)
  const TZ = 'America/Edmonton';
  const nowStr = new Date().toLocaleString('en-US', { timeZone: TZ });
  const now = new Date(nowStr);
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  return {
    start: monday.toISOString().split('T')[0],
    end: friday.toISOString().split('T')[0],
  };
}

// Loading skeleton component
function TaskSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((group) => (
        <div key={group} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
          </div>
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="px-4 py-3 flex items-center gap-3 border-b border-gray-50">
              <div className="w-2 h-2 rounded-full bg-gray-200 animate-pulse" />
              <div className="w-3 h-8 rounded-sm bg-gray-200 animate-pulse" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-1/2 bg-gray-100 rounded animate-pulse" />
              </div>
              <div className="h-5 w-16 bg-gray-200 rounded-full animate-pulse" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function SchedulePage() {
  const params = useParams();
  const planId = params.planId as string;
  const [statusFilter, setStatusFilter] = useState('all');
  const [buildingFilter, setBuildingFilter] = useState('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>(getCurrentWeek);
  const [showAllDates, setShowAllDates] = useState(false);
  const [expandedBuildings, setExpandedBuildings] = useState<Set<string>>(new Set());
  const [expandedFloors, setExpandedFloors] = useState<Set<string>>(new Set());

  const toggleBuilding = useCallback((key: string) => {
    setExpandedBuildings(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const toggleFloor = useCallback((key: string) => {
    setExpandedFloors(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const countTasks = (zoneMap: Map<string, Task[]>): number => {
    let count = 0;
    zoneMap.forEach(tasks => { count += tasks.length; });
    return count;
  };

  // Reset to current week
  const resetToThisWeek = useCallback(() => {
    setShowAllDates(false);
    setDateRange(getCurrentWeek());
  }, []);

  const swrParams = useMemo(() => {
    const p = new URLSearchParams();
    if (!showAllDates) {
      p.set('start', dateRange.start);
      p.set('end', dateRange.end);
    }
    if (statusFilter !== 'all') p.set('status', statusFilter);
    if (buildingFilter !== 'all') p.set('building', buildingFilter);
    return p.toString();
  }, [dateRange, statusFilter, buildingFilter, showAllDates]);

  const { data, error: swrError, isLoading, isValidating } = useSWR<PlanData>(
    planId ? `/api/plans/${planId}?${swrParams}` : null
  );
  const loading = isLoading || isValidating;
  const error = swrError ? 'Failed to load schedule data. Please check your connection and refresh.' : null;

  // Reset expanded state when building filter changes
  useEffect(() => {
    setExpandedBuildings(new Set());
    setExpandedFloors(new Set());
  }, [buildingFilter]);

  // Group tasks by building -> floor -> zone
  const groupedTasks = useMemo(() => {
    if (!data) return new Map<string, Map<string, Task[]>>();
    const map = new Map<string, Map<string, Task[]>>();

    for (const task of data.tasks) {
      const buildingKey = task.buildingId
        ? data.buildings.find((b) => b.id === task.buildingId)?.name || 'Other'
        : task.activityPhase || 'Other';
      const zoneKey = task.zoneName
        ? (task.zoneFloor ? `Floor ${task.zoneFloor} — ${task.zoneName}` : task.zoneName)
        : 'Unassigned';

      if (!map.has(buildingKey)) map.set(buildingKey, new Map());
      const buildingMap = map.get(buildingKey)!;
      if (!buildingMap.has(zoneKey)) buildingMap.set(zoneKey, []);
      buildingMap.get(zoneKey)!.push(task);
    }

    return map;
  }, [data]);

  if (loading && !data) {
    return (
      <div className="p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-3">
          <div>
            <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg p-2">
              <div className="h-6 w-8 bg-gray-200 rounded animate-pulse mx-auto mb-1" />
              <div className="h-3 w-12 bg-gray-100 rounded animate-pulse mx-auto" />
            </div>
          ))}
        </div>
        <TaskSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-6 text-center">
        <h3 className="text-lg font-semibold text-red-600">Unable to load schedule</h3>
        <p className="text-gray-500 mt-2">{error}</p>
      </div>
    );
  }

  if (!data) return <div className="p-4 md:p-6">Plan not found</div>;

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-3">
        <div>
          <h2 className="text-xl font-bold">{data.plan.name}</h2>
          <p className="text-sm text-gray-500">
            {data.stats.total} tasks shown
          </p>
        </div>
        <div className="hidden md:flex gap-2 flex-wrap">
          <Link
            href={`/schedule/${planId}/site-walk`}
            className="px-4 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 min-h-[44px] flex items-center"
          >
            Site Walk
          </Link>
          <Link
            href={`/schedule/${planId}/map`}
            className="px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 min-h-[44px] flex items-center"
          >
            Map View
          </Link>
          <Link
            href={`/schedule/${planId}/scorecard`}
            className="px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 min-h-[44px] flex items-center"
          >
            Scorecard
          </Link>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4">
        {Object.entries(data.stats)
          .filter(([key]) => !key.startsWith('_'))
          .map(([key, val]) => (
          <div key={key} className="bg-white border border-gray-200 rounded-lg p-2 text-center">
            <div className="text-lg font-bold">{val}</div>
            <div className="text-xs text-gray-500 capitalize">{key.replace('_', ' ')}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 mb-4 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-sm font-medium text-gray-600">Week:</label>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
            disabled={showAllDates}
            className="px-3 py-2.5 border border-gray-300 rounded text-sm disabled:bg-gray-100 min-h-[44px]"
          />
          <span className="text-gray-400">to</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
            disabled={showAllDates}
            className="px-3 py-2.5 border border-gray-300 rounded text-sm disabled:bg-gray-100 min-h-[44px]"
          />
          <button
            onClick={resetToThisWeek}
            className="px-3 py-2.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-sm font-medium hover:bg-blue-100 transition min-h-[44px]"
          >
            This Week
          </button>
          <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer px-3 py-2.5 rounded hover:bg-gray-50 min-h-[44px]">
            <input
              type="checkbox"
              checked={showAllDates}
              onChange={(e) => setShowAllDates(e.target.checked)}
              className="rounded"
            />
            Show All
          </label>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 border border-gray-300 rounded text-sm min-h-[44px]"
        >
          <option value="all">All Statuses</option>
          <option value="not_started">Not Started</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="delayed">Delayed</option>
          <option value="blocked">Blocked</option>
        </select>

        <select
          value={buildingFilter}
          onChange={(e) => setBuildingFilter(e.target.value)}
          className="px-3 py-2.5 border border-gray-300 rounded text-sm min-h-[44px]"
        >
          <option value="all">All Buildings</option>
          {data.buildings.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      {/* Loading overlay for filter changes */}
      {loading && data && (
        <div className="text-center py-2 text-sm text-gray-500 mb-2">
          <span className="inline-block animate-spin mr-2">&#8635;</span>
          Updating...
        </div>
      )}

      {/* Task List — Collapsible Building > Floor > Tasks (D-11, D-12) */}
      <div className="space-y-2">
        {Array.from(groupedTasks.entries()).map(([building, zoneMap]) => {
          const buildingExpanded = expandedBuildings.has(building);
          const taskCount = countTasks(zoneMap);
          return (
            <div key={building} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {/* Building header — collapsible (D-11) */}
              <button
                onClick={() => toggleBuilding(building)}
                className="w-full flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-left min-h-[44px] hover:bg-gray-100 transition"
              >
                <ChevronRight
                  className={`w-4 h-4 text-gray-400 transition-transform duration-200 flex-shrink-0 ${
                    buildingExpanded ? 'rotate-90' : ''
                  }`}
                />
                <span className="font-semibold text-sm">{building}</span>
                <span className="text-xs text-gray-500 ml-auto">{taskCount} tasks</span>
              </button>

              {/* Only render children when expanded (conditional rendering, NOT display:none) */}
              {buildingExpanded && (
                <div>
                  {Array.from(zoneMap.entries()).map(([zone, zoneTasks]) => {
                    const floorKey = `${building}::${zone}`;
                    const floorExpanded = expandedFloors.has(floorKey);
                    return (
                      <div key={zone} className="border-b border-gray-100 last:border-0">
                        {/* Floor/zone sub-header — collapsible (D-12) */}
                        <button
                          onClick={() => toggleFloor(floorKey)}
                          className="w-full flex items-center gap-2 pl-8 pr-4 py-2 text-left min-h-[44px] hover:bg-gray-50 transition"
                        >
                          <ChevronRight
                            className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 flex-shrink-0 ${
                              floorExpanded ? 'rotate-90' : ''
                            }`}
                          />
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{zone}</span>
                          <span className="text-xs text-gray-400 ml-auto">{zoneTasks.length} tasks</span>
                        </button>

                        {/* Tasks — only rendered when floor is expanded */}
                        {floorExpanded && (
                          <div className="divide-y divide-gray-50">
                            {zoneTasks.map((task) => (
                              <div key={task.id} className="pl-14 pr-4 py-2 flex items-center gap-3 hover:bg-gray-50">
                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT_COLORS[task.status] || 'bg-gray-400'}`} />
                                <div
                                  className="w-3 h-8 rounded-sm flex-shrink-0"
                                  style={{ backgroundColor: task.activityColor || '#9ca3af' }}
                                  title={task.activityName}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium truncate">{task.task_name}</div>
                                  <div className="text-xs text-gray-500">
                                    {task.company?.name || 'Unassigned'} · {task.planned_start} → {task.planned_end}
                                  </div>
                                </div>
                                <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${STATUS_COLORS[task.status] || ''}`}>
                                  {task.status.replace('_', ' ')}
                                </span>
                                {task.recovery_points > 0 && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 whitespace-nowrap hidden sm:inline-flex">
                                    +{task.recovery_points} RP
                                  </span>
                                )}
                                {task.inherited_delay_days > 0 && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 whitespace-nowrap hidden sm:inline-flex">
                                    {task.inherited_delay_days}d inherited
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {data.tasks.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500">
          No tasks match the current filters. Try expanding the date range or changing filters.
        </div>
      )}
    </div>
  );
}
