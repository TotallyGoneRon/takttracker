'use client';

import { formatDate, getToday } from '@/lib/dates';
import { Task, STATUS_COLORS } from './types';

interface StatusSelectorProps {
  task: Task;
  onStatusSelect: (status: string) => void;
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

export function StatusSelector({ task, onStatusSelect, onBack, saving, error, onDismissError }: StatusSelectorProps) {
  const isOverdue = task.planned_end < getToday() && task.status !== 'completed';

  return (
    <div className="p-4 flex flex-col items-center justify-center min-h-[70vh]">
      <button onClick={onBack} className="self-start mb-6 text-base text-gray-700 hover:text-gray-900 min-h-[48px] flex items-center font-medium">
        &larr; Back
      </button>
      <ErrorBanner error={error} onDismiss={onDismissError} />
      {saving && <div className="mb-4 text-sm text-gray-500 flex items-center gap-2"><div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />Saving...</div>}

      <div className="text-center mb-8">
        <div className="text-lg font-bold">{task.zoneName || 'Zone'}</div>
        <div className="text-sm text-gray-500">{task.task_name}</div>
        <div className="text-sm text-gray-400">{task.company?.name}</div>
        <div className={`text-sm font-medium mt-2 ${isOverdue ? 'text-red-600' : 'text-gray-600'}`}>
          Due: {formatDate(task.planned_end)} {isOverdue && '(OVERDUE)'}
        </div>
      </div>

      <div className="w-full max-w-md space-y-4">
        {Object.entries(STATUS_COLORS).map(([key, config]) => (
          <button key={key} onClick={() => onStatusSelect(key)} disabled={saving}
            className={`w-full py-6 rounded-2xl text-xl font-bold ${config.bg} ${config.hover} ${config.text} transition-all active:scale-95 shadow-lg min-h-[72px] disabled:opacity-50`}>
            {config.label}
          </button>
        ))}
      </div>
    </div>
  );
}
