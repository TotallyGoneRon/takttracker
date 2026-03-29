'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface Task {
  id: number;
  task_name: string;
  planned_start: string;
  planned_end: string;
  actual_start: string | null;
  actual_end: string | null;
  baseline_end: string | null;
  status: string;
  recovery_status: string | null;
  inherited_delay_days: number;
  recovery_points: number;
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

interface ZoneInfo {
  name: string;
  tasks: Task[];
  status: string;
}

interface EntryRecord {
  task: Task;
  status: string;
  completedDate?: string;
}

interface QueuedEntry {
  walkId: number;
  taskId: number;
  status: string;
  varianceCode: string | null;
  notes: string | null;
  delayDays: number | null;
}

interface SuccessorTask {
  id: number;
  task_name: string;
  planned_start: string;
  planned_end: string;
  status: string;
  inherited_delay_days: number;
  activityName: string;
  activityColor: string | null;
  companyName: string | null;
  zoneName: string | null;
  zoneFloor: number | null;
  relationType: string;
  isDirectSuccessor?: boolean;
}

type Step = 'select-zone' | 'zone-tasks' | 'toggle-status' | 'log-details' | 'completion-date' | 'impact-review' | 'summary';

const STATUS_COLORS: Record<string, { bg: string; hover: string; text: string; label: string }> = {
  completed: { bg: 'bg-emerald-600', hover: 'hover:bg-emerald-700', text: 'text-white', label: 'Completed' },
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

const QUEUE_KEY = 'taktflow_failed_entries';

function getQueuedEntries(): QueuedEntry[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function setQueuedEntries(entries: QueuedEntry[]) {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(entries)); } catch {}
}

import {
  formatDate, getToday, getYesterday, completionStatus, getCurrentWeek,
} from '@/lib/dates';

export default function SiteWalkPage() {
  const params = useParams();
  const router = useRouter();
  const planId = params.planId as string;

  const [step, setStep] = useState<Step>('select-zone');
  const [walkId, setWalkId] = useState<number | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<number | null>(null);
  const [selectedZone, setSelectedZone] = useState<ZoneInfo | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [varianceCode, setVarianceCode] = useState<string | null>(null);
  const [delayDays, setDelayDays] = useState(1);
  const [notes, setNotes] = useState('');
  const [completionDate, setCompletionDate] = useState(getToday());
  const [entries, setEntries] = useState<EntryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [checkedZones, setCheckedZones] = useState<Set<string>>(new Set());
  const [showConfirm, setShowConfirm] = useState(false);
  // Impact review state (for late completions)
  const [successors, setSuccessors] = useState<SuccessorTask[]>([]);
  const [selectedSuccessors, setSelectedSuccessors] = useState<Set<number>>(new Set());
  const [daysLate, setDaysLate] = useState(0);
  const [lastCompletedTaskId, setLastCompletedTaskId] = useState<number | null>(null);

  const totalZones = (() => {
    const filtered = selectedBuilding ? tasks.filter((t) => t.buildingId === selectedBuilding) : tasks;
    const names = new Set<string>();
    for (const t of filtered) names.add(t.zoneName || 'Unassigned');
    return names.size;
  })();

  const ensureWalk = useCallback(async (): Promise<number | null> => {
    if (walkId) return walkId;
    try {
      const res = await fetch('/tracking/api/site-walks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', planId: parseInt(planId) }),
      });
      if (!res.ok) throw new Error('Failed to create walk');
      const walk = await res.json();
      setWalkId(walk.id);
      return walk.id;
    } catch {
      setError('Failed to start walk. Check your connection.');
      return null;
    }
  }, [walkId, planId]);

  const retryQueuedEntries = useCallback(async () => {
    const queued = getQueuedEntries();
    if (queued.length === 0) return;
    const stillFailed: QueuedEntry[] = [];
    for (const entry of queued) {
      try {
        const res = await fetch('/tracking/api/site-walks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'add_entry', ...entry }),
        });
        if (!res.ok) stillFailed.push(entry);
      } catch { stillFailed.push(entry); }
    }
    setQueuedEntries(stillFailed);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Load current week + next 3 weeks so zone views show upcoming trades
        const week = getCurrentWeek();
        const endDate = new Date(week.end + 'T12:00:00');
        endDate.setDate(endDate.getDate() + 21); // +3 more weeks
        const p = new URLSearchParams({
          start: week.start,
          end: endDate.toISOString().split('T')[0],
          limit: '0',
        });
        const res = await fetch(`/tracking/api/plans/${planId}?${p}`);
        if (!res.ok) throw new Error('Failed to load tasks');
        const data = await res.json();
        setTasks(data.tasks);
        setBuildings(data.buildings);
        if (data.buildings.length > 0) setSelectedBuilding(data.buildings[0].id);
      } catch {
        setError('Failed to load schedule data. Check your connection.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [planId]);

  // Sort tasks by planned_end (earliest first), then planned_start
  const sortedTasks = (taskList: Task[]) =>
    [...taskList].sort((a, b) => {
      const endCmp = a.planned_end.localeCompare(b.planned_end);
      if (endCmp !== 0) return endCmp;
      return a.planned_start.localeCompare(b.planned_start);
    });

  const floorGroups = (() => {
    const filtered = selectedBuilding ? tasks.filter((t) => t.buildingId === selectedBuilding) : tasks;
    const map = new Map<string, Task[]>();
    for (const task of filtered) {
      const key = task.zoneFloor ? `Floor ${task.zoneFloor}` : (task.zoneType || 'Other');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(task);
    }
    return map;
  })();

  const getZonesForFloor = (floorTasks: Task[]): ZoneInfo[] => {
    const zoneMap = new Map<string, ZoneInfo>();
    for (const task of floorTasks) {
      const key = task.zoneName || 'Unassigned';
      if (!zoneMap.has(key)) zoneMap.set(key, { name: key, tasks: [], status: 'not_started' });
      zoneMap.get(key)!.tasks.push(task);
    }
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

  const handleZoneClick = (zone: ZoneInfo) => {
    setSelectedZone(zone);
    if (zone.tasks.length === 1) {
      setSelectedTask(zone.tasks[0]);
      setStep('toggle-status');
    } else {
      setStep('zone-tasks');
    }
  };

  const handleTaskSelect = (task: Task) => {
    setSelectedTask(task);
    setStep('toggle-status');
  };

  const handleStatusSelect = (status: string) => {
    setSelectedStatus(status);
    if (status === 'delayed') {
      setStep('log-details');
    } else if (status === 'completed') {
      setCompletionDate(getToday());
      setStep('completion-date');
    } else {
      saveEntry(status, null);
    }
  };

  const saveEntry = async (status: string, variance: string | null, completedOn?: string) => {
    if (!selectedTask) return;
    setSaving(true);
    setError(null);
    try {
      await retryQueuedEntries();
      const currentWalkId = await ensureWalk();
      if (!currentWalkId) { setSaving(false); return; }

      // Save site walk entry
      const res = await fetch('/tracking/api/site-walks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_entry',
          walkId: currentWalkId,
          taskId: selectedTask.id,
          status,
          varianceCode: variance,
          notes: notes || null,
          delayDays: status === 'delayed' ? delayDays : null,
        }),
      });
      if (!res.ok) throw new Error('Save failed');

      // If completed, also update the task via the task API
      if (status === 'completed' && completedOn) {
        await fetch(`/tracking/api/tasks/${selectedTask.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'completed',
            actual_end: completedOn,
            recovery_status: 'on_track',
          }),
        });
      }

      setEntries([...entries, { task: selectedTask, status, completedDate: completedOn }]);
      if (selectedTask.zoneName) {
        setCheckedZones((prev) => new Set(prev).add(selectedTask.zoneName!));
      }

      // If completed late, check for successor tasks to propagate delay
      if (status === 'completed' && completedOn && selectedTask.planned_end) {
        const late = completionStatus(completedOn, selectedTask.planned_end);
        if (late.days > 0) {
          // Fetch successor tasks
          try {
            const succRes = await fetch(`/tracking/api/tasks/${selectedTask.id}/successors`);
            if (succRes.ok) {
              const succs: SuccessorTask[] = await succRes.json();
              if (succs.length > 0) {
                setSuccessors(succs);
                // Pre-select direct successors (next trade), others shown but unchecked
                setSelectedSuccessors(new Set(succs.filter((s) => s.isDirectSuccessor).map((s) => s.id)));
                setDaysLate(late.days);
                setLastCompletedTaskId(selectedTask.id);
                setSaving(false);
                setStep('impact-review');
                return; // Don't navigate away — show impact review
              }
            }
          } catch {
            // If fetching successors fails, just continue normally
          }
        }
      }

      // Reset and navigate back
      setSelectedTask(null);
      setSelectedStatus(null);
      setVarianceCode(null);
      setDelayDays(1);
      setNotes('');
      setCompletionDate(getToday());

      if (selectedZone && selectedZone.tasks.length > 1) {
        setStep('zone-tasks');
      } else {
        setSelectedZone(null);
        setStep('select-zone');
      }
    } catch {
      const cw = walkId;
      if (cw && selectedTask) {
        const q = getQueuedEntries();
        q.push({ walkId: cw, taskId: selectedTask.id, status, varianceCode: variance, notes: notes || null, delayDays: status === 'delayed' ? delayDays : null });
        setQueuedEntries(q);
      }
      setError('Failed to save. Queued for retry.');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkAllOnTrack = async () => {
    if (!selectedZone) return;
    const checkedIds = new Set(entries.map((e) => e.task.id));
    const unchecked = selectedZone.tasks.filter((t) => !checkedIds.has(t.id));
    if (unchecked.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const cw = await ensureWalk();
      if (!cw) { setSaving(false); return; }
      for (const task of unchecked) {
        const res = await fetch('/tracking/api/site-walks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'add_entry', walkId: cw, taskId: task.id, status: 'on_track', varianceCode: null, notes: null, delayDays: null }),
        });
        if (!res.ok) throw new Error('Save failed');
        setEntries((prev) => [...prev, { task, status: 'on_track' }]);
        if (task.zoneName) setCheckedZones((prev) => new Set(prev).add(task.zoneName!));
      }
      setSelectedZone(null);
      setStep('select-zone');
    } catch {
      setError('Failed to mark all. Check connection.');
    } finally {
      setSaving(false);
    }
  };

  const completeWalk = async () => {
    if (!walkId) return;
    setShowConfirm(false);
    try {
      const res = await fetch('/tracking/api/site-walks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete', walkId }),
      });
      if (!res.ok) throw new Error('Failed');
      setStep('summary');
    } catch {
      setError('Failed to complete walk. Check connection.');
    }
  };

  const ErrorBanner = () => {
    if (!error) return null;
    return (
      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
        <span className="text-red-500 text-lg flex-shrink-0">!</span>
        <p className="flex-1 text-sm text-red-700">{error}</p>
        <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 text-sm min-w-[44px] min-h-[44px] flex items-center justify-center">Dismiss</button>
      </div>
    );
  };

  const ProgressBar = () => (
    <div className="mb-4">
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-gray-600">{checkedZones.size} of {totalZones} zones</span>
        <span className="font-medium">{totalZones > 0 ? Math.round((checkedZones.size / totalZones) * 100) : 0}%</span>
      </div>
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${totalZones > 0 ? (checkedZones.size / totalZones) * 100 : 0}%` }} />
      </div>
    </div>
  );

  if (loading) {
    return <div className="p-4 md:p-6 flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" /></div>;
  }

  // ─── STEP 1: Select Zone ─────────────────────────────────────
  if (step === 'select-zone') {
    return (
      <div className="p-4 pb-28">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold">Site Walk</h2>
            <p className="text-sm text-gray-500">Tap a zone to update its status</p>
          </div>
          <span className="text-sm text-gray-500">{entries.length} entries</span>
        </div>
        <ErrorBanner />
        <ProgressBar />

        <div className="flex gap-2 mb-4 overflow-x-auto">
          {buildings.map((b) => (
            <button key={b.id} onClick={() => setSelectedBuilding(b.id)}
              className={`px-4 py-3 rounded-xl text-sm font-medium whitespace-nowrap transition min-h-[48px] ${selectedBuilding === b.id ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
              {b.name}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {Array.from(floorGroups.entries())
            .sort(([a], [b]) => {
              const numA = parseInt(a.replace(/\D/g, '')) || 0;
              const numB = parseInt(b.replace(/\D/g, '')) || 0;
              return numB - numA;
            })
            .map(([floor, floorTasks]) => {
              const zones = getZonesForFloor(floorTasks);
              return (
                <div key={floor} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 px-3 py-2 text-sm font-semibold border-b border-gray-200">{floor}</div>
                  <div className="p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {zones.map((zone) => {
                      const isChecked = checkedZones.has(zone.name);
                      // Earliest due date in this zone
                      const earliestDue = zone.tasks.reduce((min, t) => t.planned_end < min ? t.planned_end : min, zone.tasks[0]?.planned_end || '');
                      return (
                        <button key={zone.name} onClick={() => handleZoneClick(zone)}
                          className={`p-3 rounded-lg border-2 text-left transition-all active:scale-95 min-h-[68px] ${isChecked ? 'ring-2 ring-blue-400 ring-offset-1' : ''} ${ZONE_STATUS_COLORS[zone.status] || ZONE_STATUS_COLORS.not_started}`}>
                          <div className="font-medium text-sm truncate">
                            {isChecked && <span className="mr-1">&#10003;</span>}
                            {zone.name}
                          </div>
                          <div className="text-xs opacity-75 mt-0.5">
                            {zone.tasks.length} task{zone.tasks.length !== 1 ? 's' : ''} · due {formatDate(earliestDue)}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-white border-t border-gray-200 shadow-lg z-40">
          <button onClick={() => setShowConfirm(true)} disabled={entries.length === 0}
            className="w-full py-4 bg-green-600 text-white rounded-xl text-base font-bold hover:bg-green-700 disabled:bg-gray-300 disabled:text-gray-500 transition active:scale-95 min-h-[56px]">
            Complete Walk ({entries.length} entries)
          </button>
        </div>

        {showConfirm && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
              <h3 className="text-lg font-bold mb-2">Complete this walk?</h3>
              <p className="text-gray-500 mb-6">{entries.length} entries will be saved.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowConfirm(false)} className="flex-1 py-3 bg-gray-100 rounded-xl font-medium min-h-[48px]">Cancel</button>
                <button onClick={completeWalk} className="flex-1 py-3 bg-green-600 text-white rounded-xl font-medium min-h-[48px]">Complete</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── STEP 1.5: Zone Tasks List (sorted by due date) ─────────
  if (step === 'zone-tasks' && selectedZone) {
    const checkedIds = new Set(entries.map((e) => e.task.id));
    const sorted = sortedTasks(selectedZone.tasks);
    const uncheckedCount = sorted.filter((t) => !checkedIds.has(t.id)).length;
    const today = getToday();

    return (
      <div className="p-4">
        <button onClick={() => { setStep('select-zone'); setSelectedZone(null); }}
          className="mb-4 text-base text-gray-700 hover:text-gray-900 min-h-[48px] flex items-center font-medium">
          ← Back to zones
        </button>
        <ErrorBanner />

        <div className="mb-4">
          <h2 className="text-xl font-bold">{selectedZone.name}</h2>
          <p className="text-sm text-gray-500">{sorted.length} tasks · sorted by due date (earliest first)</p>
        </div>

        {uncheckedCount > 0 && (
          <button onClick={handleMarkAllOnTrack} disabled={saving}
            className="w-full mb-4 py-3 bg-green-50 border-2 border-green-300 text-green-700 rounded-xl font-medium hover:bg-green-100 transition active:scale-95 min-h-[48px] disabled:opacity-50">
            {saving ? 'Saving...' : `All On Track (${uncheckedCount} remaining)`}
          </button>
        )}

        <div className="space-y-2">
          {sorted.map((task) => {
            const isChecked = checkedIds.has(task.id);
            const entry = entries.find((e) => e.task.id === task.id);
            const isOverdue = !isChecked && task.planned_end < today && task.status !== 'completed';
            const isDueToday = task.planned_end === today;
            const compStatus = entry?.status === 'completed' && entry.completedDate
              ? completionStatus(entry.completedDate, task.planned_end)
              : null;

            return (
              <button key={task.id} onClick={() => handleTaskSelect(task)}
                className={`w-full p-4 rounded-xl border-2 text-left transition-all active:scale-98 ${
                  isChecked ? (entry?.status === 'completed' ? 'border-emerald-300 bg-emerald-50' : entry?.status === 'delayed' ? 'border-red-300 bg-red-50' : 'border-green-300 bg-green-50')
                  : isOverdue ? 'border-red-200 bg-red-50/50'
                  : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-12 rounded-sm flex-shrink-0" style={{ backgroundColor: task.activityColor || '#9ca3af' }} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{task.task_name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{task.company?.name || 'Unassigned'}</div>
                    <div className={`text-xs mt-1 font-medium ${isOverdue ? 'text-red-600' : isDueToday ? 'text-amber-600' : 'text-gray-500'}`}>
                      Due: {formatDate(task.planned_end)}
                      {isOverdue && ' (OVERDUE)'}
                      {isDueToday && ' (TODAY)'}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {isChecked && entry && (
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        entry.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                        entry.status === 'on_track' ? 'bg-green-100 text-green-700' :
                        entry.status === 'delayed' ? 'bg-red-100 text-red-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {entry.status === 'completed' ? 'Done' : entry.status.replace('_', ' ')}
                      </span>
                    )}
                    {compStatus && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${compStatus.color}`}>
                        {compStatus.label}
                      </span>
                    )}
                    {task.status === 'completed' && !isChecked && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Already done</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-6">
          <button onClick={() => { setStep('select-zone'); setSelectedZone(null); }}
            className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition min-h-[48px]">
            Done with this zone
          </button>
        </div>
      </div>
    );
  }

  // ─── STEP 2: Toggle Status ───────────────────────────────────
  if (step === 'toggle-status' && selectedTask) {
    const isOverdue = selectedTask.planned_end < getToday() && selectedTask.status !== 'completed';
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[70vh]">
        <button onClick={() => {
          if (selectedZone && selectedZone.tasks.length > 1) { setStep('zone-tasks'); }
          else { setStep('select-zone'); setSelectedZone(null); }
          setSelectedTask(null);
        }} className="self-start mb-6 text-base text-gray-700 hover:text-gray-900 min-h-[48px] flex items-center font-medium">
          ← Back
        </button>
        <ErrorBanner />
        {saving && <div className="mb-4 text-sm text-gray-500 flex items-center gap-2"><div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />Saving...</div>}

        <div className="text-center mb-8">
          <div className="text-lg font-bold">{selectedTask.zoneName || 'Zone'}</div>
          <div className="text-sm text-gray-500">{selectedTask.task_name}</div>
          <div className="text-sm text-gray-400">{selectedTask.company?.name}</div>
          <div className={`text-sm font-medium mt-2 ${isOverdue ? 'text-red-600' : 'text-gray-600'}`}>
            Due: {formatDate(selectedTask.planned_end)} {isOverdue && '(OVERDUE)'}
          </div>
        </div>

        <div className="w-full max-w-md space-y-4">
          {Object.entries(STATUS_COLORS).map(([key, config]) => (
            <button key={key} onClick={() => handleStatusSelect(key)} disabled={saving}
              className={`w-full py-6 rounded-2xl text-xl font-bold ${config.bg} ${config.hover} ${config.text} transition-all active:scale-95 shadow-lg min-h-[72px] disabled:opacity-50`}>
              {config.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ─── STEP 2.5: Completion Date Picker ─────────────────────────
  if (step === 'completion-date' && selectedTask) {
    const planned = selectedTask.planned_end;
    const previewStatus = completionDate ? completionStatus(completionDate, planned) : null;

    return (
      <div className="p-4">
        <button onClick={() => setStep('toggle-status')}
          className="mb-4 text-base text-gray-700 hover:text-gray-900 min-h-[48px] flex items-center font-medium">
          ← Back
        </button>
        <ErrorBanner />

        <div className="text-center mb-6">
          <div className="text-lg font-bold text-emerald-600">Completed</div>
          <div className="text-sm text-gray-500">{selectedTask.zoneName} — {selectedTask.task_name}</div>
          <div className="text-sm text-gray-400 mt-1">Planned end: {formatDate(planned)}</div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">When was it completed?</label>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button onClick={() => setCompletionDate(getToday())}
              className={`py-4 rounded-xl text-base font-medium transition active:scale-95 min-h-[56px] ${completionDate === getToday() ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              Today
            </button>
            <button onClick={() => setCompletionDate(getYesterday())}
              className={`py-4 rounded-xl text-base font-medium transition active:scale-95 min-h-[56px] ${completionDate === getYesterday() ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              Yesterday
            </button>
          </div>
          <div>
            <label className="text-sm text-gray-500 mb-1 block">Or pick a date:</label>
            <input type="date" value={completionDate} onChange={(e) => setCompletionDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base min-h-[48px]" />
          </div>
        </div>

        {previewStatus && (
          <div className={`mb-6 p-4 rounded-xl text-center ${previewStatus.color}`}>
            <div className="text-lg font-bold">{previewStatus.label}</div>
            <div className="text-sm opacity-75">
              {previewStatus.days === 0 ? 'Finished right on the planned date' :
               previewStatus.days < 0 ? `Finished ${Math.abs(previewStatus.days)} days before the deadline` :
               `Finished ${previewStatus.days} days after the deadline`}
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optional)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg h-20 resize-none" placeholder="Any notes about completion..." />
        </div>

        <button onClick={() => saveEntry('completed', null, completionDate)} disabled={!completionDate || saving}
          className="w-full py-4 bg-emerald-600 text-white rounded-xl text-lg font-bold hover:bg-emerald-700 transition active:scale-95 min-h-[56px] disabled:opacity-50">
          {saving ? 'Saving...' : 'Mark Complete'}
        </button>
      </div>
    );
  }

  // ─── STEP 3: Log Details (delayed only) ─────────────────────
  if (step === 'log-details' && selectedTask && selectedStatus === 'delayed') {
    return (
      <div className="p-4">
        <button onClick={() => setStep('toggle-status')}
          className="mb-4 text-base text-gray-700 hover:text-gray-900 min-h-[48px] flex items-center font-medium">← Back</button>
        <ErrorBanner />
        <div className="text-center mb-6">
          <div className="text-lg font-bold text-red-600">Delayed</div>
          <div className="text-sm text-gray-500">{selectedTask.zoneName} — {selectedTask.task_name}</div>
          <div className="text-sm text-gray-400 mt-1">Was due: {formatDate(selectedTask.planned_end)}</div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Variance Code</label>
          <div className="grid grid-cols-2 gap-2">
            {VARIANCE_CODES.map((vc) => (
              <button key={vc.code} onClick={() => setVarianceCode(vc.code)}
                className={`px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all active:scale-95 min-h-[48px] ${varianceCode === vc.code ? 'border-red-500 bg-red-50 ring-2 ring-red-200' : `${vc.color} border`}`}>
                {vc.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Delay Duration (days)</label>
          <div className="flex items-center gap-3">
            <button onClick={() => setDelayDays(Math.max(1, delayDays - 1))} className="w-12 h-12 bg-gray-100 rounded-lg text-xl font-bold hover:bg-gray-200 active:scale-95">−</button>
            <span className="text-2xl font-bold w-12 text-center">{delayDays}</span>
            <button onClick={() => setDelayDays(delayDays + 1)} className="w-12 h-12 bg-gray-100 rounded-lg text-xl font-bold hover:bg-gray-200 active:scale-95">+</button>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optional)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg h-24 resize-none" placeholder="Notes about the delay..." />
        </div>

        <button onClick={() => { if (varianceCode) saveEntry('delayed', varianceCode); }} disabled={!varianceCode || saving}
          className="w-full py-4 bg-red-600 text-white rounded-xl text-lg font-bold hover:bg-red-700 disabled:bg-gray-300 transition active:scale-95 min-h-[56px] disabled:opacity-50">
          {saving ? 'Saving...' : 'Save & Next'}
        </button>
      </div>
    );
  }

  // ─── STEP 3.5: Impact Review (late completion → successor trades) ──
  if (step === 'impact-review' && successors.length > 0) {
    const toggleSuccessor = (id: number) => {
      setSelectedSuccessors((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    };

    const handlePropagateDelays = async () => {
      if (selectedSuccessors.size === 0 || !lastCompletedTaskId) {
        // Skip — no successors selected, just go back
        finishAfterImpact();
        return;
      }
      setSaving(true);
      setError(null);
      try {
        const res = await fetch(`/tracking/api/tasks/${lastCompletedTaskId}/successors`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            daysLate,
            selectedSuccessorIds: Array.from(selectedSuccessors),
          }),
        });
        if (!res.ok) throw new Error('Failed to propagate');
        finishAfterImpact();
      } catch {
        setError('Failed to propagate delays. Try again.');
      } finally {
        setSaving(false);
      }
    };

    const finishAfterImpact = () => {
      setSuccessors([]);
      setSelectedSuccessors(new Set());
      setDaysLate(0);
      setLastCompletedTaskId(null);
      setSelectedTask(null);
      setSelectedStatus(null);
      setVarianceCode(null);
      setDelayDays(1);
      setNotes('');
      setCompletionDate(getToday());
      if (selectedZone && selectedZone.tasks.length > 1) {
        setStep('zone-tasks');
      } else {
        setSelectedZone(null);
        setStep('select-zone');
      }
    };

    return (
      <div className="p-4">
        <ErrorBanner />

        <div className="text-center mb-6">
          <div className="text-lg font-bold text-amber-600">Late Completion — {daysLate} day{daysLate !== 1 ? 's' : ''} late</div>
          <p className="text-sm text-gray-500 mt-1">
            These trades follow in the same zone. Select which ones are impacted — their finish dates will be pushed back by {daysLate} day{daysLate !== 1 ? 's' : ''}.
          </p>
        </div>

        {/* Select All / None */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => setSelectedSuccessors(new Set(successors.map((s) => s.id)))}
            className="px-3 py-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-sm font-medium min-h-[44px]">
            Select All
          </button>
          <button onClick={() => setSelectedSuccessors(new Set())}
            className="px-3 py-2 bg-gray-50 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium min-h-[44px]">
            Select None
          </button>
        </div>

        {/* Successor task list */}
        <div className="space-y-2 mb-6">
          {successors.map((succ) => {
            const isSelected = selectedSuccessors.has(succ.id);
            const newEnd = (() => {
              // Shift by working days (skip weekends)
              let d = new Date(succ.planned_end + 'T12:00:00');
              let remaining = daysLate;
              while (remaining > 0) {
                d.setDate(d.getDate() + 1);
                const day = d.getDay();
                if (day !== 0 && day !== 6) remaining--;
              }
              return d.toISOString().split('T')[0];
            })();

            return (
              <button
                key={succ.id}
                onClick={() => toggleSuccessor(succ.id)}
                className={`w-full p-4 rounded-xl border-2 text-left transition-all active:scale-98 ${
                  isSelected
                    ? 'border-amber-400 bg-amber-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    isSelected ? 'bg-amber-500 border-amber-500 text-white' : 'border-gray-300'
                  }`}>
                    {isSelected && <span className="text-sm">&#10003;</span>}
                  </div>
                  <div
                    className="w-3 h-10 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: succ.activityColor || '#9ca3af' }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{succ.task_name}</span>
                      {succ.isDirectSuccessor ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">Next up</span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">Later</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">{succ.companyName || 'Unassigned'}{succ.zoneName ? ` · ${succ.zoneName}` : ''}</div>
                    <div className="text-xs mt-1.5 flex items-center gap-2">
                      <span className="text-gray-500">Due: {formatDate(succ.planned_end)}</span>
                      {isSelected && (
                        <>
                          <span className="text-amber-600">→</span>
                          <span className="text-amber-600 font-medium">{formatDate(newEnd)}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">+{daysLate}d</span>
                        </>
                      )}
                    </div>
                    {succ.inherited_delay_days > 0 && (
                      <div className="text-xs text-yellow-600 mt-0.5">Already has {succ.inherited_delay_days}d inherited delay</div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handlePropagateDelays}
            disabled={saving}
            className="w-full py-4 bg-amber-600 text-white rounded-xl text-base font-bold hover:bg-amber-700 transition active:scale-95 min-h-[56px] disabled:opacity-50"
          >
            {saving ? 'Applying...' : selectedSuccessors.size > 0
              ? `Push ${selectedSuccessors.size} trade${selectedSuccessors.size !== 1 ? 's' : ''} back ${daysLate} day${daysLate !== 1 ? 's' : ''}`
              : 'Skip — No Impact'}
          </button>
          <button
            onClick={finishAfterImpact}
            className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition min-h-[48px]"
          >
            Skip — delay doesn&#39;t affect these trades
          </button>
        </div>
      </div>
    );
  }

  // ─── STEP 4: Summary ────────────────────────────────────────
  if (step === 'summary') {
    const onTrack = entries.filter((e) => e.status === 'on_track').length;
    const delayed = entries.filter((e) => e.status === 'delayed').length;
    const recovered = entries.filter((e) => e.status === 'recovered').length;
    const completed = entries.filter((e) => e.status === 'completed').length;
    const earlyOrOnTime = entries.filter((e) => e.status === 'completed' && e.completedDate && completionStatus(e.completedDate, e.task.planned_end).days <= 0).length;

    return (
      <div className="p-4 md:p-6 max-w-md mx-auto">
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

        <div className="space-y-3">
          <button onClick={() => router.push(`/schedule/${planId}`)} className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 min-h-[48px]">View Timeline</button>
          <button onClick={() => router.push(`/schedule/${planId}/scorecard`)} className="w-full py-3 bg-white border border-gray-200 rounded-xl font-medium hover:bg-gray-50 min-h-[48px]">View Scorecard</button>
        </div>
      </div>
    );
  }

  return null;
}
