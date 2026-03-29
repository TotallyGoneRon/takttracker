'use client';

import { formatDate, getToday, getYesterday, completionStatus } from '@/lib/dates';
import { Task } from './types';

interface CompletionDateProps {
  task: Task;
  completionDate: string;
  onDateChange: (date: string) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  onSave: (date: string) => void;
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

export function CompletionDate({
  task, completionDate, onDateChange, notes, onNotesChange, onSave, onBack,
  saving, error, onDismissError,
}: CompletionDateProps) {
  const planned = task.planned_end;
  const previewStatus = completionDate ? completionStatus(completionDate, planned) : null;

  return (
    <div className="p-4">
      <button onClick={onBack}
        className="mb-4 text-base text-gray-700 hover:text-gray-900 min-h-[48px] flex items-center font-medium">
        &larr; Back
      </button>
      <ErrorBanner error={error} onDismiss={onDismissError} />

      <div className="text-center mb-6">
        <div className="text-lg font-bold text-emerald-600">Completed</div>
        <div className="text-sm text-gray-500">{task.zoneName} &mdash; {task.task_name}</div>
        <div className="text-sm text-gray-400 mt-1">Planned end: {formatDate(planned)}</div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">When was it completed?</label>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button onClick={() => onDateChange(getToday())}
            className={`py-4 rounded-xl text-base font-medium transition active:scale-95 min-h-[56px] ${completionDate === getToday() ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            Today
          </button>
          <button onClick={() => onDateChange(getYesterday())}
            className={`py-4 rounded-xl text-base font-medium transition active:scale-95 min-h-[56px] ${completionDate === getYesterday() ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            Yesterday
          </button>
        </div>
        <div>
          <label className="text-sm text-gray-500 mb-1 block">Or pick a date:</label>
          <input type="date" value={completionDate} onChange={(e) => onDateChange(e.target.value)}
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
        <textarea value={notes} onChange={(e) => onNotesChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg h-20 resize-none" placeholder="Any notes about completion..." />
      </div>

      <button onClick={() => onSave(completionDate)} disabled={!completionDate || saving}
        className="w-full py-4 bg-emerald-600 text-white rounded-xl text-lg font-bold hover:bg-emerald-700 transition active:scale-95 min-h-[56px] disabled:opacity-50">
        {saving ? 'Saving...' : 'Mark Complete'}
      </button>
    </div>
  );
}
