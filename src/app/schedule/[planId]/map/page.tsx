'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Task {
  id: number;
  task_name: string;
  status: string;
  recovery_status: string | null;
  inherited_delay_days: number;
  activityName: string;
  activityColor: string | null;
  company: { name: string } | null;
  zoneName: string | null;
  zoneFloor: number | null;
  zoneType: string | null;
  zoneScheduleType: string | null;
  buildingId: number | null;
}

interface Building {
  id: number;
  code: string;
  name: string;
  num_floors: number;
}

interface ZoneData {
  name: string;
  status: string;
  tasks: Task[];
}

interface BuildingData {
  building: Building;
  interiorFloors: { floor: number; zones: ZoneData[] }[];
  exteriorZones: ZoneData[];
  foundationZones: ZoneData[];
  otherZones: ZoneData[];
  stats: { total: number; completed: number; delayed: number; pctComplete: number; pctDelayed: number };
}

const STATUS_STYLES: Record<string, { bg: string; border: string; label: string }> = {
  completed: { bg: 'bg-green-400', border: 'border-green-600', label: 'Complete' },
  delayed: { bg: 'bg-red-400', border: 'border-red-600', label: 'Delayed' },
  at_risk: { bg: 'bg-yellow-400', border: 'border-yellow-600', label: 'At Risk' },
  recovered: { bg: 'bg-blue-400', border: 'border-blue-600', label: 'Recovered' },
  in_progress: { bg: 'bg-indigo-300', border: 'border-indigo-500', label: 'In Progress' },
  not_started: { bg: 'bg-gray-200', border: 'border-gray-400', label: 'Not Started' },
};

function computeZoneStatus(tasks: Task[]): string {
  const statuses = tasks.map((t) => t.recovery_status || t.status);
  if (statuses.includes('delayed')) return 'delayed';
  if (statuses.some((s) => s === 'recovered')) return 'recovered';
  if (tasks.some((t) => t.inherited_delay_days > 0 && t.status !== 'completed')) return 'at_risk';
  if (statuses.every((s) => s === 'completed')) return 'completed';
  if (statuses.includes('in_progress') || statuses.includes('on_track')) return 'in_progress';
  return 'not_started';
}

function groupToZones(tasks: Task[]): ZoneData[] {
  const map = new Map<string, Task[]>();
  for (const t of tasks) {
    const key = t.zoneName || 'Unknown';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(t);
  }
  return Array.from(map.entries()).map(([name, zoneTasks]) => ({
    name,
    status: computeZoneStatus(zoneTasks),
    tasks: zoneTasks,
  }));
}

export default function MapPage() {
  const params = useParams();
  const planId = params.planId as string;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedZone, setSelectedZone] = useState<ZoneData | null>(null);
  const [selectedBuildingTab, setSelectedBuildingTab] = useState<number | null>(null);
  const [scheduleView, setScheduleView] = useState<'interior' | 'exterior'>('interior');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all tasks (limit=0 = no limit) for full map view
        const res = await fetch(`/tracking/api/plans/${planId}?limit=0`);
        if (!res.ok) throw new Error('Failed to load');
        const data = await res.json();
        setTasks(data.tasks);
        setBuildings(data.buildings);
        if (data.buildings.length > 0) {
          setSelectedBuildingTab(data.buildings[0].id);
        }
      } catch (err) {
        setError('Failed to load map data. Please check your connection and refresh.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [planId]);

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
        <h3 className="text-lg font-semibold text-red-600">Unable to load map</h3>
        <p className="text-gray-500 mt-2">{error}</p>
      </div>
    );
  }

  // Build data per building with interior/exterior/foundation separation
  const buildingDataMap = new Map<number, BuildingData>();

  for (const building of buildings) {
    const bTasks = tasks.filter((t) => t.buildingId === building.id);

    // Interior: tasks with zoneScheduleType=interior, grouped by floor
    const intTasks = bTasks.filter((t) => t.zoneScheduleType === 'interior');
    const interiorFloors: { floor: number; zones: ZoneData[] }[] = [];
    for (let f = building.num_floors; f >= 1; f--) {
      const floorTasks = intTasks.filter((t) => t.zoneFloor === f);
      const zones = groupToZones(floorTasks);
      if (zones.length > 0) interiorFloors.push({ floor: f, zones });
    }
    // Interior zones without floor (parkade, roof, elevator, stairs, hallways)
    const intNoFloor = intTasks.filter((t) => !t.zoneFloor);

    // Exterior: tasks with zoneScheduleType=exterior
    const extTasks = bTasks.filter((t) => t.zoneScheduleType === 'exterior');
    const exteriorZones = groupToZones(extTasks);

    // Foundation: tasks with zoneScheduleType=foundation
    const foundTasks = bTasks.filter((t) => t.zoneScheduleType === 'foundation');
    const foundationZones = groupToZones(foundTasks);

    // Other (no schedule type match)
    const otherTasks = bTasks.filter((t) =>
      !t.zoneScheduleType || !['interior', 'exterior', 'foundation'].includes(t.zoneScheduleType)
    );
    const otherZones = [
      ...groupToZones(intNoFloor),
      ...groupToZones(otherTasks),
    ];

    const total = bTasks.length;
    const completed = bTasks.filter((t) => t.status === 'completed').length;
    const delayed = bTasks.filter((t) => t.status === 'delayed').length;

    buildingDataMap.set(building.id, {
      building,
      interiorFloors,
      exteriorZones,
      foundationZones,
      otherZones,
      stats: {
        total,
        completed,
        delayed,
        pctComplete: total > 0 ? Math.round((completed / total) * 100) : 0,
        pctDelayed: total > 0 ? Math.round((delayed / total) * 100) : 0,
      },
    });
  }

  const allBuildingData = Array.from(buildingDataMap.values());
  const selectedBuildingData = selectedBuildingTab
    ? buildingDataMap.get(selectedBuildingTab)
    : allBuildingData[0];

  const renderZoneButton = (zone: ZoneData) => {
    const style = STATUS_STYLES[zone.status] || STATUS_STYLES.not_started;
    return (
      <button
        key={zone.name}
        onClick={() => setSelectedZone(zone)}
        className={`flex-1 min-w-[60px] py-3 px-2 rounded border-2 text-xs font-medium text-center transition-all active:scale-95 min-h-[52px] ${style.bg} ${style.border} hover:opacity-80`}
      >
        <div className="truncate">{zone.name}</div>
        <div className="opacity-60 text-[10px] mt-0.5">{zone.tasks.length} tasks</div>
      </button>
    );
  };

  const renderBuildingCard = (bd: BuildingData) => {
    const showInterior = scheduleView === 'interior';
    const intCount = bd.interiorFloors.reduce((s, f) => s + f.zones.reduce((zs, z) => zs + z.tasks.length, 0), 0);
    const extCount = bd.exteriorZones.reduce((s, z) => s + z.tasks.length, 0);

    return (
      <div key={bd.building.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Building header */}
        <div className="bg-gray-800 text-white px-4 py-2 font-semibold text-center">
          <div>{bd.building.name}</div>
          <div className="flex justify-center gap-4 text-xs mt-1 font-normal opacity-80">
            <span>{bd.stats.pctComplete}% complete</span>
            <span>{bd.stats.pctDelayed}% delayed</span>
            <span>{bd.stats.total} tasks</span>
          </div>
        </div>

        {/* Interior / Exterior toggle */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setScheduleView('interior')}
            className={`flex-1 py-2 text-xs font-medium text-center transition min-h-[44px] ${
              showInterior ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            Interior ({intCount})
          </button>
          <button
            onClick={() => setScheduleView('exterior')}
            className={`flex-1 py-2 text-xs font-medium text-center transition min-h-[44px] ${
              !showInterior ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            Exterior ({extCount})
          </button>
        </div>

        {/* Interior view: floors with zone rooms */}
        {showInterior && (
          <>
            {/* Roof */}
            <div className="bg-gray-100 px-3 py-1 text-center">
              <div className="inline-block bg-gray-300 rounded px-4 py-1 text-xs text-gray-600">
                &#9650; Roof
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {bd.interiorFloors.map(({ floor, zones }) => (
                <div key={floor} className="flex items-stretch">
                  <div className="w-14 bg-gray-50 flex items-center justify-center text-xs font-semibold text-gray-500 border-r border-gray-200">
                    L{floor}
                  </div>
                  <div className="flex-1 p-2 flex gap-1.5 flex-wrap">
                    {zones.map(renderZoneButton)}
                  </div>
                </div>
              ))}
            </div>

            {/* Parkade, Elevator, Stairs, etc. */}
            {bd.otherZones.length > 0 && (
              <div className="bg-gray-50 px-3 py-2 border-t border-gray-200">
                <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1.5">Parkade / Common</div>
                <div className="flex gap-1.5 flex-wrap">
                  {bd.otherZones.map(renderZoneButton)}
                </div>
              </div>
            )}

            {bd.interiorFloors.length === 0 && bd.otherZones.length === 0 && (
              <div className="p-4 text-center text-sm text-gray-400">No interior zones</div>
            )}
          </>
        )}

        {/* Exterior view: pack zones */}
        {!showInterior && (
          <div className="p-3">
            {bd.exteriorZones.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {bd.exteriorZones.map(renderZoneButton)}
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-gray-400">No exterior zones</div>
            )}
          </div>
        )}

        {/* Foundation zones (if any) */}
        {bd.foundationZones.length > 0 && (
          <div className="bg-amber-50 px-3 py-2 border-t border-amber-200">
            <div className="text-[10px] text-amber-600 uppercase tracking-wide mb-1.5">Foundations</div>
            <div className="flex gap-1.5 flex-wrap">
              {bd.foundationZones.map(renderZoneButton)}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold">Multi-Story Map</h2>
          <p className="text-sm text-gray-500">Visual overview — {tasks.length} tasks across {buildings.length} buildings</p>
        </div>
        <Link
          href={`/schedule/${planId}`}
          className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50 min-h-[44px] flex items-center"
        >
          ← Timeline
        </Link>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4 text-xs">
        {Object.entries(STATUS_STYLES).map(([key, style]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded ${style.bg}`} />
            <span>{style.label}</span>
          </div>
        ))}
      </div>

      {/* Mobile: Building tab selector */}
      <div className="md:hidden flex gap-2 mb-4 overflow-x-auto">
        {buildings.map((b) => {
          const bd = buildingDataMap.get(b.id);
          return (
            <button
              key={b.id}
              onClick={() => setSelectedBuildingTab(b.id)}
              className={`px-4 py-3 rounded-xl text-sm font-medium whitespace-nowrap transition min-h-[48px] flex-shrink-0 ${
                selectedBuildingTab === b.id
                  ? 'bg-gray-800 text-white'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div>{b.name}</div>
              {bd && (
                <div className="text-[10px] opacity-70 mt-0.5">{bd.stats.pctComplete}% done</div>
              )}
            </button>
          );
        })}
      </div>

      {/* Mobile: Show only selected building */}
      <div className="md:hidden">
        {selectedBuildingData && renderBuildingCard(selectedBuildingData)}
      </div>

      {/* Desktop: Grid of all buildings */}
      <div className="hidden md:grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {allBuildingData.map((bd) => renderBuildingCard(bd))}
      </div>

      {/* Zone Detail Slide-over */}
      {selectedZone && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSelectedZone(null)}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="relative w-full max-w-sm bg-white h-full shadow-xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-bold text-lg">{selectedZone.name}</h3>
              <button
                onClick={() => setSelectedZone(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl w-12 h-12 min-w-[48px] min-h-[48px] flex items-center justify-center"
              >
                ×
              </button>
            </div>
            <div className="p-4 space-y-3">
              {selectedZone.tasks.map((task) => (
                <div key={task.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="w-3 h-3 rounded-sm"
                      style={{ backgroundColor: task.activityColor || '#9ca3af' }}
                    />
                    <span className="font-medium text-sm">{task.task_name}</span>
                  </div>
                  <div className="text-xs text-gray-500 space-y-0.5">
                    <div>Company: {task.company?.name || 'N/A'}</div>
                    <div>Status: {task.status.replace('_', ' ')}</div>
                    {task.recovery_status && (
                      <div>Recovery: {task.recovery_status.replace('_', ' ')}</div>
                    )}
                    {task.inherited_delay_days > 0 && (
                      <div className="text-yellow-600">Inherited delay: {task.inherited_delay_days} days</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
