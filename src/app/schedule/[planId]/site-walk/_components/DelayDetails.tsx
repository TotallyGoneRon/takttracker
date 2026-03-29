'use client';

import { formatDate } from '@/lib/dates';
import { Task, VARIANCE_CODES } from './types';

interface DelayDetailsProps {
  task: Task;
  varianceCode: string | null;
  onVarianceCodeChange: (code: string) => void;
  delayDays: number;
  onDelayDaysChange: (days: number) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  onSave: () => void;
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

export function DelayDetails({
  task, varianceCode, onVarianceCodeChange, delayDays, onDelayDaysChange,
  notes, onNotesChange, onSave, onBack, saving, error, onDismissError,
}: DelayDetailsProps) {
  return (
    <div className="p-4">
      <button onClick={onBack}
        className="mb-4 text-base text-gray-700 hover:text-gray-900 min-h-[48px] flex items-center font-medium">&larr; Back</button>
      <ErrorBanner error={error} onDismiss={onDismissError} />
      <div className="text-center mb-6">
        <div className="text-lg font-bold text-red-600">Delayed</div>
        <div className="text-sm text-gray-500">{task.zoneName} &mdash; {task.task_name}</div>
        <div className="text-sm text-gray-400 mt-1">Was due: {formatDate(task.planned_end)}</div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Variance Code</label>
        <div className="grid grid-cols-2 gap-2">
          {VARIANCE_CODES.map((vc) => (
            <button key={vc.code} onClick={() => onVarianceCodeChange(vc.code)}
              className={`px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all active:scale-95 min-h-[48px] ${varianceCode === vc.code ? 'border-red-500 bg-red-50 ring-2 ring-red-200' : `${vc.color} border`}`}>
              {vc.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Delay Duration (days)</label>
        <div className="flex items-center gap-3">
          <button onClick={() => onDelayDaysChange(Math.max(1, delayDays - 1))} className="w-12 h-12 bg-gray-100 rounded-lg text-xl font-bold hover:bg-gray-200 active:scale-95">&minus;</button>
          <span className="text-2xl font-bold w-12 text-center">{delayDays}</span>
          <button onClick={() => onDelayDaysChange(delayDays + 1)} className="w-12 h-12 bg-gray-100 rounded-lg text-xl font-bold hover:bg-gray-200 active:scale-95">+</button>
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optional)</label>
        <textarea value={notes} onChange={(e) => onNotesChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg h-24 resize-none" placeholder="Notes about the delay..." />
      </div>

      <button onClick={onSave} disabled={!varianceCode || saving}
        className="w-full py-4 bg-red-600 text-white rounded-xl text-lg font-bold hover:bg-red-700 disabled:bg-gray-300 transition active:scale-95 min-h-[56px] disabled:opacity-50">
        {saving ? 'Saving...' : 'Save & Next'}
      </button>
    </div>
  );
}
