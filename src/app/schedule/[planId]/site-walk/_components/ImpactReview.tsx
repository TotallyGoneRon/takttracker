'use client';

import { formatDate } from '@/lib/dates';
import { SuccessorTask } from './types';

interface ImpactReviewProps {
  successors: SuccessorTask[];
  selectedSuccessors: Set<number>;
  daysLate: number;
  onToggleSuccessor: (id: number) => void;
  onSelectAll: () => void;
  onSelectNone: () => void;
  onPropagate: () => void;
  onSkip: () => void;
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

export function ImpactReview({
  successors, selectedSuccessors, daysLate, onToggleSuccessor,
  onSelectAll, onSelectNone, onPropagate, onSkip, saving, error, onDismissError,
}: ImpactReviewProps) {
  return (
    <div className="p-4">
      <ErrorBanner error={error} onDismiss={onDismissError} />

      <div className="text-center mb-6">
        <div className="text-lg font-bold text-amber-600">Late Completion &mdash; {daysLate} day{daysLate !== 1 ? 's' : ''} late</div>
        <p className="text-sm text-gray-500 mt-1">
          These trades follow in the same zone. Select which ones are impacted &mdash; their finish dates will be pushed back by {daysLate} day{daysLate !== 1 ? 's' : ''}.
        </p>
      </div>

      {/* Select All / None */}
      <div className="flex gap-2 mb-4">
        <button onClick={onSelectAll}
          className="px-3 py-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-sm font-medium min-h-[44px]">
          Select All
        </button>
        <button onClick={onSelectNone}
          className="px-3 py-2 bg-gray-50 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium min-h-[44px]">
          Select None
        </button>
      </div>

      {/* Successor task list */}
      <div className="space-y-2 mb-6">
        {successors.map((succ) => {
          const isSelected = selectedSuccessors.has(succ.id);
          const newEnd = (() => {
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
              onClick={() => onToggleSuccessor(succ.id)}
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
                  <div className="text-xs text-gray-500">{succ.companyName || 'Unassigned'}{succ.zoneName ? ` \u00B7 ${succ.zoneName}` : ''}</div>
                  <div className="text-xs mt-1.5 flex items-center gap-2">
                    <span className="text-gray-500">Due: {formatDate(succ.planned_end)}</span>
                    {isSelected && (
                      <>
                        <span className="text-amber-600">&rarr;</span>
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
          onClick={onPropagate}
          disabled={saving}
          className="w-full py-4 bg-amber-600 text-white rounded-xl text-base font-bold hover:bg-amber-700 transition active:scale-95 min-h-[56px] disabled:opacity-50"
        >
          {saving ? 'Applying...' : selectedSuccessors.size > 0
            ? `Push ${selectedSuccessors.size} trade${selectedSuccessors.size !== 1 ? 's' : ''} back ${daysLate} day${daysLate !== 1 ? 's' : ''}`
            : 'Skip \u2014 No Impact'}
        </button>
        <button
          onClick={onSkip}
          className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition min-h-[48px]"
        >
          Skip &mdash; delay doesn&#39;t affect these trades
        </button>
      </div>
    </div>
  );
}
