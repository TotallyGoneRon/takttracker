'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiMutate } from '@/lib/fetcher';
import { getToday, completionStatus, getCurrentWeek } from '@/lib/dates';

import { Task, Building, ZoneInfo, EntryRecord, QueuedEntry, SuccessorTask, Step } from './_components/types';
import { ZoneSelector } from './_components/ZoneSelector';
import { ZoneTaskList } from './_components/ZoneTaskList';
import { StatusSelector } from './_components/StatusSelector';
import { DelayDetails } from './_components/DelayDetails';
import { CompletionDate } from './_components/CompletionDate';
import { ImpactReview } from './_components/ImpactReview';
import { WalkSummary } from './_components/WalkSummary';
import { PhotoOverlay } from './_components/PhotoOverlay';

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
  const [successors, setSuccessors] = useState<SuccessorTask[]>([]);
  const [selectedSuccessors, setSelectedSuccessors] = useState<Set<number>>(new Set());
  const [daysLate, setDaysLate] = useState(0);
  const [lastCompletedTaskId, setLastCompletedTaskId] = useState<number | null>(null);

  // Photo and observation state (lifted to page level)
  const [photoStates, setPhotoStates] = useState<Record<number, { uploading: boolean; error: boolean }>>({});
  const [photoOverlayEntry, setPhotoOverlayEntry] = useState<EntryRecord | null>(null);

  const totalZones = (() => {
    const filtered = selectedBuilding ? tasks.filter((t) => t.buildingId === selectedBuilding) : tasks;
    const names = new Set<string>();
    for (const t of filtered) names.add(t.zoneName || 'Unassigned');
    return names.size;
  })();

  const ensureWalk = useCallback(async (): Promise<number | null> => {
    if (walkId) return walkId;
    try {
      const walk = await apiMutate('/api/site-walks', {
        method: 'POST',
        body: JSON.stringify({ action: 'create', planId: parseInt(planId) }),
      });
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
        await apiMutate('/api/site-walks', {
          method: 'POST',
          body: JSON.stringify({ action: 'add_entry', ...entry }),
        });
      } catch { stillFailed.push(entry); }
    }
    setQueuedEntries(stillFailed);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const week = getCurrentWeek();
        const endDate = new Date(week.end + 'T12:00:00');
        endDate.setDate(endDate.getDate() + 21);
        const p = new URLSearchParams({
          start: week.start,
          end: endDate.toISOString().split('T')[0],
          limit: '0',
        });
        const data = await apiMutate(`/api/plans/${planId}?${p}`, { method: 'GET' });
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
    const hasRecordedEntries = zone.tasks.some((t) => entries.some((e) => e.task.id === t.id));
    if (hasRecordedEntries) {
      // Always show task list if any entries exist — lets user access photos/severity/details
      setStep('zone-tasks');
    } else if (zone.tasks.length === 1) {
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

  const resetAfterEntry = () => {
    setSelectedTask(null);
    setSelectedStatus(null);
    setVarianceCode(null);
    setDelayDays(1);
    setNotes('');
    setCompletionDate(getToday());
  };

  const navigateAfterEntry = () => {
    if (selectedZone) {
      // Always go to zone-tasks after recording — shows entry card with photo/details
      setStep('zone-tasks');
    } else {
      setStep('select-zone');
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

      const savedEntry = await apiMutate('/api/site-walks', {
        method: 'POST',
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

      if (status === 'completed' && completedOn) {
        await apiMutate(`/api/tasks/${selectedTask.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            status: 'completed',
            actual_end: completedOn,
            recovery_status: 'on_track',
          }),
        });
      }

      setEntries([...entries, {
        id: savedEntry.id,
        task: selectedTask,
        status,
        completedDate: completedOn,
        varianceCode: variance,
        delayDays: status === 'delayed' ? delayDays : null,
      }]);
      if (selectedTask.zoneName) {
        setCheckedZones((prev) => new Set(prev).add(selectedTask.zoneName!));
      }

      if (status === 'completed' && completedOn && selectedTask.planned_end) {
        const late = completionStatus(completedOn, selectedTask.planned_end);
        if (late.days > 0) {
          try {
            const succs: SuccessorTask[] = await apiMutate(`/api/tasks/${selectedTask.id}/successors`, { method: 'GET' });
            if (succs.length > 0) {
              setSuccessors(succs);
              setSelectedSuccessors(new Set(succs.filter((s) => s.isDirectSuccessor).map((s) => s.id)));
              setDaysLate(late.days);
              setLastCompletedTaskId(selectedTask.id);
              setSaving(false);
              setStep('impact-review');
              return;
            }
          } catch {
            // If fetching successors fails, just continue normally
          }
        }
      }

      resetAfterEntry();
      navigateAfterEntry();
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
        const savedEntry = await apiMutate('/api/site-walks', {
          method: 'POST',
          body: JSON.stringify({ action: 'add_entry', walkId: cw, taskId: task.id, status: 'on_track', varianceCode: null, notes: null, delayDays: null }),
        });
        setEntries((prev) => [...prev, { id: savedEntry.id, task, status: 'on_track' }]);
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
      await apiMutate('/api/site-walks', {
        method: 'POST',
        body: JSON.stringify({ action: 'complete', walkId }),
      });
      setStep('summary');
    } catch {
      setError('Failed to complete walk. Check connection.');
    }
  };

  const finishAfterImpact = () => {
    setSuccessors([]);
    setSelectedSuccessors(new Set());
    setDaysLate(0);
    setLastCompletedTaskId(null);
    resetAfterEntry();
    navigateAfterEntry();
  };

  const handlePropagateDelays = async () => {
    if (selectedSuccessors.size === 0 || !lastCompletedTaskId) {
      finishAfterImpact();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiMutate(`/api/tasks/${lastCompletedTaskId}/successors`, {
        method: 'POST',
        body: JSON.stringify({
          daysLate,
          selectedSuccessorIds: Array.from(selectedSuccessors),
        }),
      });
      finishAfterImpact();
    } catch {
      setError('Failed to propagate delays. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const toggleSuccessor = (id: number) => {
    setSelectedSuccessors((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ─── Photo & Observation Handlers ─────────────────────────────

  const handlePhotoUpload = async (entryId: number, file: File) => {
    setPhotoStates((prev) => ({ ...prev, [entryId]: { uploading: true, error: false } }));
    try {
      const formData = new FormData();
      formData.append('photo', file);
      formData.append('entryId', String(entryId));
      const result = await apiMutate('/api/site-walks/photos', {
        method: 'POST',
        body: formData,
      });
      setEntries((prev) => prev.map((e) =>
        e.id === entryId
          ? { ...e, photoThumbnailUrl: result.thumbnailUrl, photoOriginalUrl: result.originalUrl }
          : e
      ));
      setPhotoStates((prev) => ({ ...prev, [entryId]: { uploading: false, error: false } }));
    } catch {
      setPhotoStates((prev) => ({ ...prev, [entryId]: { uploading: false, error: true } }));
    }
  };

  const handlePhotoDelete = async (entryId: number) => {
    try {
      await apiMutate('/api/site-walks/photos', {
        method: 'DELETE',
        body: JSON.stringify({ entryId }),
        headers: { 'Content-Type': 'application/json' },
      });
      setEntries((prev) => prev.map((e) =>
        e.id === entryId
          ? { ...e, photoThumbnailUrl: null, photoOriginalUrl: null }
          : e
      ));
      setPhotoOverlayEntry(null);
    } catch {
      setError('Failed to delete photo. Try again.');
    }
  };

  const handleSeverityChange = async (entryId: number, severity: string | null) => {
    // Optimistic update
    setEntries((prev) => prev.map((e) =>
      e.id === entryId ? { ...e, severity } : e
    ));
    try {
      await apiMutate('/api/site-walks', {
        method: 'POST',
        body: JSON.stringify({ action: 'update_entry', entryId, severity }),
      });
    } catch {
      // Revert on failure
      setError('Failed to save severity.');
    }
  };

  const handlePercentChange = async (entryId: number, percentComplete: number | null) => {
    // Optimistic update
    setEntries((prev) => prev.map((e) =>
      e.id === entryId ? { ...e, percentComplete } : e
    ));
    try {
      await apiMutate('/api/site-walks', {
        method: 'POST',
        body: JSON.stringify({ action: 'update_entry', entryId, percentComplete }),
      });
    } catch {
      setError('Failed to save percent complete.');
    }
  };

  const handleNotesChange = async (entryId: number, entryNotes: string) => {
    setEntries((prev) => prev.map((e) =>
      e.id === entryId ? { ...e, notes: entryNotes } : e
    ));
    try {
      await apiMutate('/api/site-walks', {
        method: 'POST',
        body: JSON.stringify({ action: 'update_entry', entryId, notes: entryNotes }),
      });
    } catch {
      setError('Failed to save notes.');
    }
  };

  const handlePhotoRetake = () => {
    if (!photoOverlayEntry) return;
    // Close overlay, trigger a new photo capture by re-opening the file input
    // The user will tap the camera button on the entry card after overlay closes
    setPhotoOverlayEntry(null);
  };

  const handlePhotoRetry = (entryId: number) => {
    // Clear the error state so user can try again via the camera button
    setPhotoStates((prev) => ({ ...prev, [entryId]: { uploading: false, error: false } }));
  };

  // ─── Render ────────────────────────────────────────────────────

  if (loading) {
    return <div className="p-4 md:p-6 flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" /></div>;
  }

  return (
    <>
      {/* Photo overlay (rendered at page level, above all wizard steps) */}
      {photoOverlayEntry && photoOverlayEntry.photoOriginalUrl && (
        <PhotoOverlay
          originalUrl={photoOverlayEntry.photoOriginalUrl}
          onClose={() => setPhotoOverlayEntry(null)}
          onRetake={handlePhotoRetake}
          onDelete={() => handlePhotoDelete(photoOverlayEntry.id)}
        />
      )}

      {step === 'select-zone' && (
        <ZoneSelector buildings={buildings} selectedBuilding={selectedBuilding} onBuildingSelect={setSelectedBuilding} floorGroups={floorGroups} getZonesForFloor={getZonesForFloor} checkedZones={checkedZones} onZoneClick={handleZoneClick} entries={entries} onCompleteWalk={completeWalk} showConfirm={showConfirm} onConfirmShow={() => setShowConfirm(true)} onConfirmHide={() => setShowConfirm(false)} totalZones={totalZones} error={error} onDismissError={() => setError(null)} />
      )}

      {step === 'zone-tasks' && selectedZone && (
        <ZoneTaskList
          zone={selectedZone} entries={entries} onTaskSelect={handleTaskSelect}
          onMarkAllOnTrack={handleMarkAllOnTrack}
          onBack={() => { setStep('select-zone'); setSelectedZone(null); }}
          saving={saving} error={error} onDismissError={() => setError(null)}
          onPhotoUpload={handlePhotoUpload}
          onPhotoDelete={handlePhotoDelete}
          onSeverityChange={handleSeverityChange}
          onPercentChange={handlePercentChange}
          onNotesChange={handleNotesChange}
          onShowPhotoOverlay={setPhotoOverlayEntry}
          photoStates={photoStates}
          onPhotoRetry={handlePhotoRetry}
        />
      )}

      {step === 'toggle-status' && selectedTask && (
        <StatusSelector task={selectedTask} onStatusSelect={handleStatusSelect} onBack={() => { if (selectedZone && selectedZone.tasks.length > 1) { setStep('zone-tasks'); } else { setStep('select-zone'); setSelectedZone(null); } setSelectedTask(null); }} saving={saving} error={error} onDismissError={() => setError(null)} />
      )}

      {step === 'completion-date' && selectedTask && (
        <CompletionDate task={selectedTask} completionDate={completionDate} onDateChange={setCompletionDate} notes={notes} onNotesChange={setNotes} onSave={(date) => saveEntry('completed', null, date)} onBack={() => setStep('toggle-status')} saving={saving} error={error} onDismissError={() => setError(null)} />
      )}

      {step === 'log-details' && selectedTask && selectedStatus === 'delayed' && (
        <DelayDetails task={selectedTask} varianceCode={varianceCode} onVarianceCodeChange={setVarianceCode} delayDays={delayDays} onDelayDaysChange={setDelayDays} notes={notes} onNotesChange={setNotes} onSave={() => { if (varianceCode) saveEntry('delayed', varianceCode); }} onBack={() => setStep('toggle-status')} saving={saving} error={error} onDismissError={() => setError(null)} />
      )}

      {step === 'impact-review' && successors.length > 0 && (
        <ImpactReview successors={successors} selectedSuccessors={selectedSuccessors} daysLate={daysLate} onToggleSuccessor={toggleSuccessor} onSelectAll={() => setSelectedSuccessors(new Set(successors.map((s) => s.id)))} onSelectNone={() => setSelectedSuccessors(new Set())} onPropagate={handlePropagateDelays} onSkip={finishAfterImpact} saving={saving} error={error} onDismissError={() => setError(null)} />
      )}

      {step === 'summary' && (
        <WalkSummary entries={entries} checkedZones={checkedZones} planId={planId} walkId={walkId} />
      )}
    </>
  );
}
