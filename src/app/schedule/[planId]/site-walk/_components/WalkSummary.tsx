'use client';

import { useRouter } from 'next/navigation';
import { completionStatus } from '@/lib/dates';
import { EntryRecord } from './types';

interface WalkSummaryProps {
  entries: EntryRecord[];
  checkedZones: Set<string>;
  planId: string;
}

export function WalkSummary({ entries, checkedZones, planId }: WalkSummaryProps) {
  const router = useRouter();
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
