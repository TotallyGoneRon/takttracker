'use client';

import { formatDate, getToday, completionStatus } from '@/lib/dates';
import { Task, ZoneInfo, EntryRecord } from './types';

interface ZoneTaskListProps {
  zone: ZoneInfo;
  entries: EntryRecord[];
  onTaskSelect: (task: Task) => void;
  onMarkAllOnTrack: () => void;
  onBack: () => void;
  saving: boolean;
  error: string | null;
  onDismissError: () => void;
}

function ErrorBanner({ error, onDismiss }: { error: string | null; onDismiss: () => void }) {
  if (!error) return null;
  return (
    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
      <span className="text-red-500 text-lg flex-shrink-0">!</span>
      <p className="flex-1 text-sm text-red-700">{error}</p>
      <button onClick={onDismiss} className="text-red-400 hover:text-red-600 text-sm min-w-[44px] min-h-[44px] flex items-center justify-center">Dismiss</button>
    </div>
  );
}

export function ZoneTaskList({ zone, entries, onTaskSelect, onMarkAllOnTrack, onBack, saving, error, onDismissError }: ZoneTaskListProps) {
  const checkedIds = new Set(entries.map((e) => e.task.id));
  const sorted = [...zone.tasks].sort((a, b) => {
    const endCmp = a.planned_end.localeCompare(b.planned_end);
    if (endCmp !== 0) return endCmp;
    return a.planned_start.localeCompare(b.planned_start);
  });
  const uncheckedCount = sorted.filter((t) => !checkedIds.has(t.id)).length;
  const today = getToday();

  return (
    <div className="p-4">
      <button onClick={onBack}
        className="mb-4 text-base text-gray-700 hover:text-gray-900 min-h-[48px] flex items-center font-medium">
        &larr; Back to zones
      </button>
      <ErrorBanner error={error} onDismiss={onDismissError} />

      <div className="mb-4">
        <h2 className="text-xl font-bold">{zone.name}</h2>
        <p className="text-sm text-gray-500">{sorted.length} tasks · sorted by due date (earliest first)</p>
      </div>

      {uncheckedCount > 0 && (
        <button onClick={onMarkAllOnTrack} disabled={saving}
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
            <button key={task.id} onClick={() => onTaskSelect(task)}
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
        <button onClick={onBack}
          className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition min-h-[48px]">
          Done with this zone
        </button>
      </div>
    </div>
  );
}
