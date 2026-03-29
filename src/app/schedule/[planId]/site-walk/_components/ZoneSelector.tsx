'use client';

import { formatDate } from '@/lib/dates';
import { Building, Task, ZoneInfo, EntryRecord, ZONE_STATUS_COLORS } from './types';

interface ZoneSelectorProps {
  buildings: Building[];
  selectedBuilding: number | null;
  onBuildingSelect: (id: number) => void;
  floorGroups: Map<string, Task[]>;
  getZonesForFloor: (tasks: Task[]) => ZoneInfo[];
  checkedZones: Set<string>;
  onZoneClick: (zone: ZoneInfo) => void;
  entries: EntryRecord[];
  onCompleteWalk: () => void;
  showConfirm: boolean;
  onConfirmShow: () => void;
  onConfirmHide: () => void;
  totalZones: number;
  error: string | null;
  onDismissError: () => void;
}

function ProgressBar({ checkedZones, totalZones }: { checkedZones: Set<string>; totalZones: number }) {
  return (
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

export function ZoneSelector({
  buildings, selectedBuilding, onBuildingSelect, floorGroups, getZonesForFloor,
  checkedZones, onZoneClick, entries, onCompleteWalk, showConfirm, onConfirmShow,
  onConfirmHide, totalZones, error, onDismissError,
}: ZoneSelectorProps) {
  return (
    <div className="p-4 pb-28">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold">Site Walk</h2>
          <p className="text-sm text-gray-500">Tap a zone to update its status</p>
        </div>
        <span className="text-sm text-gray-500">{entries.length} entries</span>
      </div>
      <ErrorBanner error={error} onDismiss={onDismissError} />
      <ProgressBar checkedZones={checkedZones} totalZones={totalZones} />

      <div className="flex gap-2 mb-4 overflow-x-auto">
        {buildings.map((b) => (
          <button key={b.id} onClick={() => onBuildingSelect(b.id)}
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
                    const earliestDue = zone.tasks.reduce((min, t) => t.planned_end < min ? t.planned_end : min, zone.tasks[0]?.planned_end || '');
                    return (
                      <button key={zone.name} onClick={() => onZoneClick(zone)}
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
        <button onClick={onConfirmShow} disabled={entries.length === 0}
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
              <button onClick={onConfirmHide} className="flex-1 py-3 bg-gray-100 rounded-xl font-medium min-h-[48px]">Cancel</button>
              <button onClick={onCompleteWalk} className="flex-1 py-3 bg-green-600 text-white rounded-xl font-medium min-h-[48px]">Complete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
