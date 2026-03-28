'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

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

export default function SchedulePage() {
  const params = useParams();
  const planId = params.planId as string;
  const [data, setData] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [buildingFilter, setBuildingFilter] = useState('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>(() => {
    // Default to current week
    const now = new Date();
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      start: monday.toISOString().split('T')[0],
      end: sunday.toISOString().split('T')[0],
    };
  });
  const [showAllDates, setShowAllDates] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const params = new URLSearchParams();
      if (!showAllDates) {
        params.set('start', dateRange.start);
        params.set('end', dateRange.end);
      }
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (buildingFilter !== 'all') params.set('building', buildingFilter);

      const res = await fetch(`/tracking/api/plans/${planId}?${params}`);
      const json = await res.json();
      setData(json);
      setLoading(false);
    };
    fetchData();
  }, [planId, dateRange, statusFilter, buildingFilter, showAllDates]);

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

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!data) return <div className="p-6">Plan not found</div>;

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-3">
        <div>
          <h2 className="text-xl font-bold">{data.plan.name}</h2>
          <p className="text-sm text-gray-500">{data.stats.total} tasks shown</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link
            href={`/tracking/schedule/${planId}/site-walk`}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            Site Walk
          </Link>
          <Link
            href={`/tracking/schedule/${planId}/map`}
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            Map View
          </Link>
          <Link
            href={`/tracking/schedule/${planId}/scorecard`}
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            Scorecard
          </Link>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4">
        {Object.entries(data.stats).map(([key, val]) => (
          <div key={key} className="bg-white border border-gray-200 rounded-lg p-2 text-center">
            <div className="text-lg font-bold">{val}</div>
            <div className="text-xs text-gray-500 capitalize">{key.replace('_', ' ')}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 mb-4 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">Week:</label>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
            disabled={showAllDates}
            className="px-2 py-1 border border-gray-300 rounded text-sm disabled:bg-gray-100"
          />
          <span className="text-gray-400">to</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
            disabled={showAllDates}
            className="px-2 py-1 border border-gray-300 rounded text-sm disabled:bg-gray-100"
          />
          <label className="flex items-center gap-1 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={showAllDates}
              onChange={(e) => setShowAllDates(e.target.checked)}
              className="rounded"
            />
            All
          </label>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-2 py-1 border border-gray-300 rounded text-sm"
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
          className="px-2 py-1 border border-gray-300 rounded text-sm"
        >
          <option value="all">All Buildings</option>
          {data.buildings.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      {/* Task List grouped by building/zone */}
      <div className="space-y-4">
        {Array.from(groupedTasks.entries()).map(([building, zoneMap]: [string, Map<string, Task[]>]) => (
          <div key={building} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 font-semibold text-sm border-b border-gray-200">
              {building}
            </div>
            {Array.from(zoneMap.entries()).map(([zone, zoneTasks]: [string, Task[]]) => (
              <div key={zone} className="border-b border-gray-100 last:border-0">
                <div className="px-4 py-1.5 bg-gray-25 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {zone}
                </div>
                <div className="divide-y divide-gray-50">
                  {zoneTasks.map((task) => (
                    <div key={task.id} className="px-4 py-2 flex items-center gap-3 hover:bg-gray-50">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT_COLORS[task.status] || 'bg-gray-400'}`} />
                      <div
                        className="w-3 h-8 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: task.activityColor || '#9ca3af' }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{task.task_name}</div>
                        <div className="text-xs text-gray-500">
                          {task.company?.name || 'Unassigned'} · {task.planned_start} → {task.planned_end}
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[task.status] || ''}`}>
                        {task.status.replace('_', ' ')}
                      </span>
                      {task.recovery_points > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                          +{task.recovery_points} RP
                        </span>
                      )}
                      {task.inherited_delay_days > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                          {task.inherited_delay_days}d inherited
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {data.tasks.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500">
          No tasks match the current filters. Try expanding the date range or changing filters.
        </div>
      )}
    </div>
  );
}
