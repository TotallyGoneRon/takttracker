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
  buildingId: number | null;
}

interface Building {
  id: number;
  code: string;
  name: string;
  num_floors: number;
}

const STATUS_STYLES: Record<string, { bg: string; border: string; label: string }> = {
  completed: { bg: 'bg-green-400', border: 'border-green-600', label: 'Complete' },
  delayed: { bg: 'bg-red-400', border: 'border-red-600', label: 'Delayed' },
  at_risk: { bg: 'bg-yellow-400', border: 'border-yellow-600', label: 'At Risk' },
  recovered: { bg: 'bg-blue-400', border: 'border-blue-600', label: 'Recovered' },
  in_progress: { bg: 'bg-indigo-300', border: 'border-indigo-500', label: 'In Progress' },
  not_started: { bg: 'bg-gray-200', border: 'border-gray-400', label: 'Not Started' },
};

export default function MapPage() {
  const params = useParams();
  const planId = params.planId as string;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedZone, setSelectedZone] = useState<{ name: string; tasks: Task[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch(`/tracking/api/plans/${planId}`);
      const data = await res.json();
      setTasks(data.tasks);
      setBuildings(data.buildings);
      setLoading(false);
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

  // Group tasks by building -> floor -> zone
  const buildingData = buildings.map((building) => {
    const buildingTasks = tasks.filter((t) => t.buildingId === building.id);

    const floors: { floor: number; zones: { name: string; status: string; tasks: Task[] }[] }[] = [];

    for (let f = building.num_floors; f >= 1; f--) {
      const floorTasks = buildingTasks.filter((t) => t.zoneFloor === f);
      const zoneMap = new Map<string, Task[]>();

      for (const task of floorTasks) {
        const key = task.zoneName || 'Unknown';
        if (!zoneMap.has(key)) zoneMap.set(key, []);
        zoneMap.get(key)!.push(task);
      }

      const zones = Array.from(zoneMap.entries()).map(([name, zoneTasks]) => {
        let status = 'not_started';
        const statuses = zoneTasks.map((t) => t.recovery_status || t.status);
        if (statuses.includes('delayed')) status = 'delayed';
        else if (statuses.some((s) => s === 'recovered')) status = 'recovered';
        else if (zoneTasks.some((t) => t.inherited_delay_days > 0 && t.status !== 'completed')) status = 'at_risk';
        else if (statuses.every((s) => s === 'completed')) status = 'completed';
        else if (statuses.includes('in_progress') || statuses.includes('on_track')) status = 'in_progress';
        return { name, status, tasks: zoneTasks };
      });

      if (zones.length > 0) {
        floors.push({ floor: f, zones });
      }
    }

    // Parkade, roof, etc.
    const specialTasks = buildingTasks.filter((t) => !t.zoneFloor);
    const specialZones = new Map<string, Task[]>();
    for (const task of specialTasks) {
      const key = task.zoneName || task.zoneType || 'Other';
      if (!specialZones.has(key)) specialZones.set(key, []);
      specialZones.get(key)!.push(task);
    }

    return { building, floors, specialZones };
  });

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold">Multi-Story Map</h2>
          <p className="text-sm text-gray-500">Visual overview of all buildings and zones</p>
        </div>
        <Link
          href={`/tracking/schedule/${planId}`}
          className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
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

      {/* Building stacks */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {buildingData.map(({ building, floors, specialZones }) => (
          <div key={building.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-gray-800 text-white px-4 py-2 font-semibold text-center">
              {building.name}
            </div>

            {/* Roof */}
            <div className="bg-gray-100 px-3 py-1 text-center">
              <div className="inline-block bg-gray-300 rounded px-4 py-1 text-xs text-gray-600">
                ▲ Roof
              </div>
            </div>

            {/* Floors (top to bottom) */}
            <div className="divide-y divide-gray-100">
              {floors.map(({ floor, zones }) => (
                <div key={floor} className="flex items-stretch">
                  <div className="w-16 bg-gray-50 flex items-center justify-center text-xs font-medium text-gray-500 border-r border-gray-200">
                    L{floor}
                  </div>
                  <div className="flex-1 p-2 flex gap-1.5 flex-wrap">
                    {zones.map((zone) => {
                      const style = STATUS_STYLES[zone.status] || STATUS_STYLES.not_started;
                      return (
                        <button
                          key={zone.name}
                          onClick={() => setSelectedZone(zone)}
                          className={`flex-1 min-w-[50px] py-2 px-2 rounded border-2 text-xs font-medium text-center transition-all active:scale-95 ${style.bg} ${style.border} hover:opacity-80`}
                        >
                          {zone.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Parkade */}
            {specialZones.size > 0 && (
              <div className="bg-gray-50 px-3 py-2 border-t border-gray-200">
                <div className="flex gap-1.5 flex-wrap">
                  {Array.from(specialZones.entries()).map(([name, zoneTasks]) => (
                    <button
                      key={name}
                      onClick={() => setSelectedZone({ name, tasks: zoneTasks })}
                      className="px-3 py-1.5 bg-gray-200 rounded text-xs hover:bg-gray-300 active:scale-95"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
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
                className="text-gray-400 hover:text-gray-600 text-xl"
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
