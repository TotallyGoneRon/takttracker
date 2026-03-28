'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface Task {
  id: number;
  task_name: string;
  planned_start: string;
  planned_end: string;
  status: string;
  recovery_status: string | null;
  activityColor: string | null;
  activityName: string;
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

type Step = 'select-zone' | 'toggle-status' | 'log-details' | 'summary';

const STATUS_COLORS = {
  on_track: { bg: 'bg-green-500', hover: 'hover:bg-green-600', text: 'text-white', label: 'On Track' },
  delayed: { bg: 'bg-red-500', hover: 'hover:bg-red-600', text: 'text-white', label: 'Delayed' },
  recovered: { bg: 'bg-blue-500', hover: 'hover:bg-blue-600', text: 'text-white', label: 'Recovered' },
};

const VARIANCE_CODES = [
  { code: 'labor', label: 'Labor', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { code: 'material', label: 'Material', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { code: 'prep', label: 'Prep', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { code: 'design', label: 'Design', color: 'bg-pink-100 text-pink-700 border-pink-200' },
  { code: 'weather', label: 'Weather', color: 'bg-sky-100 text-sky-700 border-sky-200' },
  { code: 'inspection', label: 'Inspection', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { code: 'prerequisite', label: 'Prerequisite', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  { code: 'other', label: 'Other', color: 'bg-gray-100 text-gray-700 border-gray-200' },
];

const ZONE_STATUS_COLORS: Record<string, string> = {
  completed: 'bg-green-400 border-green-500',
  delayed: 'bg-red-400 border-red-500',
  on_track: 'bg-green-300 border-green-400',
  recovered: 'bg-blue-400 border-blue-500',
  not_started: 'bg-gray-200 border-gray-300',
  in_progress: 'bg-indigo-300 border-indigo-400',
  at_risk: 'bg-yellow-300 border-yellow-400',
};

export default function SiteWalkPage() {
  const params = useParams();
  const router = useRouter();
  const planId = params.planId as string;

  const [step, setStep] = useState<Step>('select-zone');
  const [walkId, setWalkId] = useState<number | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<number | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [varianceCode, setVarianceCode] = useState<string | null>(null);
  const [delayDays, setDelayDays] = useState(1);
  const [notes, setNotes] = useState('');
  const [entries, setEntries] = useState<{ task: Task; status: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch tasks for this plan (current week)
  useEffect(() => {
    const fetchData = async () => {
      const now = new Date();
      const day = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      const params = new URLSearchParams({
        start: monday.toISOString().split('T')[0],
        end: sunday.toISOString().split('T')[0],
      });

      const res = await fetch(`/tracking/api/plans/${planId}?${params}`);
      const data = await res.json();
      setTasks(data.tasks);
      setBuildings(data.buildings);
      if (data.buildings.length > 0) {
        setSelectedBuilding(data.buildings[0].id);
      }
      setLoading(false);
    };
    fetchData();
  }, [planId]);

  // Start a new walk
  useEffect(() => {
    const startWalk = async () => {
      const res = await fetch('/tracking/api/site-walks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', planId: parseInt(planId) }),
      });
      const walk = await res.json();
      setWalkId(walk.id);
    };
    startWalk();
  }, [planId]);

  // Group tasks by floor for the selected building
  const floorGroups = (() => {
    const filtered = selectedBuilding
      ? tasks.filter((t) => t.buildingId === selectedBuilding)
      : tasks;

    const map = new Map<string, Task[]>();
    for (const task of filtered) {
      const floorKey = task.zoneFloor ? `Floor ${task.zoneFloor}` : (task.zoneType || 'Other');
      if (!map.has(floorKey)) map.set(floorKey, []);
      map.get(floorKey)!.push(task);
    }
    return map;
  })();

  // Get unique zones per floor
  const getZonesForFloor = (floorTasks: Task[]) => {
    const zoneMap = new Map<string, { name: string; tasks: Task[]; status: string }>();
    for (const task of floorTasks) {
      const zoneKey = task.zoneName || 'Unassigned';
      if (!zoneMap.has(zoneKey)) {
        zoneMap.set(zoneKey, { name: zoneKey, tasks: [], status: 'not_started' });
      }
      zoneMap.get(zoneKey)!.tasks.push(task);
    }

    // Determine zone color from worst task status
    for (const zone of zoneMap.values()) {
      const statuses = zone.tasks.map((t) => t.recovery_status || t.status);
      if (statuses.includes('delayed')) zone.status = 'delayed';
      else if (statuses.includes('in_progress')) zone.status = 'in_progress';
      else if (statuses.some((s) => s === 'recovered')) zone.status = 'recovered';
      else if (statuses.every((s) => s === 'completed')) zone.status = 'completed';
      else if (statuses.some((s) => s === 'on_track')) zone.status = 'on_track';
    }

    return Array.from(zoneMap.values());
  };

  const handleZoneClick = (task: Task) => {
    setSelectedTask(task);
    setStep('toggle-status');
  };

  const handleStatusSelect = (status: string) => {
    setSelectedStatus(status);
    if (status === 'delayed') {
      setStep('log-details');
    } else {
      // For on_track and recovered, save immediately
      saveEntry(status, null);
    }
  };

  const saveEntry = async (status: string, variance: string | null) => {
    if (!selectedTask || !walkId) return;

    await fetch('/tracking/api/site-walks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add_entry',
        walkId,
        taskId: selectedTask.id,
        status,
        varianceCode: variance,
        notes: notes || null,
        delayDays: status === 'delayed' ? delayDays : null,
      }),
    });

    setEntries([...entries, { task: selectedTask, status }]);

    // Reset for next zone
    setSelectedTask(null);
    setSelectedStatus(null);
    setVarianceCode(null);
    setDelayDays(1);
    setNotes('');
    setStep('select-zone');
  };

  const handleSaveDelayed = () => {
    if (varianceCode) {
      saveEntry('delayed', varianceCode);
    }
  };

  const completeWalk = async () => {
    if (!walkId) return;
    await fetch('/tracking/api/site-walks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'complete', walkId }),
    });
    setStep('summary');
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  // ─── STEP 1: Select Zone ─────────────────────────────────────
  if (step === 'select-zone') {
    return (
      <div className="p-4 pb-24">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold">Site Walk</h2>
            <p className="text-sm text-gray-500">Tap a zone to update its status</p>
          </div>
          <div className="flex gap-2">
            <span className="text-sm text-gray-500">{entries.length} entries</span>
            <button
              onClick={completeWalk}
              disabled={entries.length === 0}
              className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:bg-gray-300"
            >
              Complete Walk
            </button>
          </div>
        </div>

        {/* Building selector */}
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {buildings.map((b) => (
            <button
              key={b.id}
              onClick={() => setSelectedBuilding(b.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                selectedBuilding === b.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {b.name}
            </button>
          ))}
        </div>

        {/* Multi-story zone grid */}
        <div className="space-y-3">
          {Array.from(floorGroups.entries())
            .sort(([a], [b]) => {
              const numA = parseInt(a.replace(/\D/g, '')) || 0;
              const numB = parseInt(b.replace(/\D/g, '')) || 0;
              return numB - numA; // Top floor first
            })
            .map(([floor, floorTasks]) => {
              const zones = getZonesForFloor(floorTasks);
              return (
                <div key={floor} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 px-3 py-2 text-sm font-semibold border-b border-gray-200">
                    {floor}
                  </div>
                  <div className="p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {zones.map((zone) => (
                      <button
                        key={zone.name}
                        onClick={() => handleZoneClick(zone.tasks[0])}
                        className={`p-3 rounded-lg border-2 text-left transition-all active:scale-95 min-h-[60px] ${
                          ZONE_STATUS_COLORS[zone.status] || ZONE_STATUS_COLORS.not_started
                        }`}
                      >
                        <div className="font-medium text-sm truncate">{zone.name}</div>
                        <div className="text-xs opacity-75 mt-0.5">
                          {zone.tasks.length} task{zone.tasks.length !== 1 ? 's' : ''}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    );
  }

  // ─── STEP 2: Toggle Status ───────────────────────────────────
  if (step === 'toggle-status' && selectedTask) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[70vh]">
        <button
          onClick={() => { setStep('select-zone'); setSelectedTask(null); }}
          className="self-start mb-6 text-sm text-gray-500 hover:text-gray-700"
        >
          ← Back to zones
        </button>

        <div className="text-center mb-8">
          <div className="text-lg font-bold">{selectedTask.zoneName || 'Zone'}</div>
          <div className="text-sm text-gray-500">{selectedTask.task_name}</div>
          <div className="text-sm text-gray-400">{selectedTask.company?.name}</div>
        </div>

        <div className="w-full max-w-md space-y-4">
          {Object.entries(STATUS_COLORS).map(([key, config]) => (
            <button
              key={key}
              onClick={() => handleStatusSelect(key)}
              className={`w-full py-6 rounded-2xl text-xl font-bold ${config.bg} ${config.hover} ${config.text} transition-all active:scale-95 shadow-lg`}
            >
              {config.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ─── STEP 3: Log Details (Delayed) ──────────────────────────
  if (step === 'log-details' && selectedTask) {
    return (
      <div className="p-4">
        <button
          onClick={() => setStep('toggle-status')}
          className="mb-4 text-sm text-gray-500 hover:text-gray-700"
        >
          ← Back
        </button>

        <div className="text-center mb-6">
          <div className="text-lg font-bold text-red-600">Delayed</div>
          <div className="text-sm text-gray-500">{selectedTask.zoneName} — {selectedTask.task_name}</div>
        </div>

        {/* Variance Code Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Variance Code</label>
          <div className="grid grid-cols-2 gap-2">
            {VARIANCE_CODES.map((vc) => (
              <button
                key={vc.code}
                onClick={() => setVarianceCode(vc.code)}
                className={`px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all active:scale-95 ${
                  varianceCode === vc.code
                    ? 'border-red-500 bg-red-50 ring-2 ring-red-200'
                    : `${vc.color} border`
                }`}
              >
                {vc.label}
              </button>
            ))}
          </div>
        </div>

        {/* Delay Days */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Delay Duration (days)</label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDelayDays(Math.max(1, delayDays - 1))}
              className="w-12 h-12 bg-gray-100 rounded-lg text-xl font-bold hover:bg-gray-200 active:scale-95"
            >
              −
            </button>
            <span className="text-2xl font-bold w-12 text-center">{delayDays}</span>
            <button
              onClick={() => setDelayDays(delayDays + 1)}
              className="w-12 h-12 bg-gray-100 rounded-lg text-xl font-bold hover:bg-gray-200 active:scale-95"
            >
              +
            </button>
          </div>
        </div>

        {/* Notes */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg h-24 resize-none"
            placeholder="Add notes about the delay..."
          />
        </div>

        <button
          onClick={handleSaveDelayed}
          disabled={!varianceCode}
          className="w-full py-4 bg-red-600 text-white rounded-xl text-lg font-bold hover:bg-red-700 disabled:bg-gray-300 transition active:scale-95"
        >
          Save & Next Zone
        </button>
      </div>
    );
  }

  // ─── STEP 4: Summary ────────────────────────────────────────
  if (step === 'summary') {
    const onTrack = entries.filter((e) => e.status === 'on_track').length;
    const delayed = entries.filter((e) => e.status === 'delayed').length;
    const recovered = entries.filter((e) => e.status === 'recovered').length;

    return (
      <div className="p-6 max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">✅</div>
          <h2 className="text-2xl font-bold">Walk Complete</h2>
          <p className="text-gray-500">{entries.length} zones checked</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-green-50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{onTrack}</div>
            <div className="text-xs text-green-700">On Track</div>
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

        <div className="space-y-3">
          <button
            onClick={() => router.push(`/tracking/schedule/${planId}`)}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700"
          >
            View Timeline
          </button>
          <button
            onClick={() => router.push(`/tracking/schedule/${planId}/scorecard`)}
            className="w-full py-3 bg-white border border-gray-200 rounded-xl font-medium hover:bg-gray-50"
          >
            View Scorecard
          </button>
        </div>
      </div>
    );
  }

  return null;
}
