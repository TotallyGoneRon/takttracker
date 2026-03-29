'use client';

import useSWR from 'swr';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { STATUS_COLORS } from '@/lib/statusColors';

interface WalkEntry {
  id: number;
  status: string;
  zoneName: string | null;
}

interface Walk {
  id: number;
  takt_plan_id: number;
  walk_date: string;
  status: string;
  notes: string | null;
  created_at: string;
  entries: WalkEntry[];
}

function computeStats(entries: WalkEntry[]) {
  return {
    entryCount: entries.length,
    onTrack: entries.filter(e => e.status === 'on_track').length,
    delayed: entries.filter(e => e.status === 'delayed').length,
    completed: entries.filter(e => e.status === 'completed').length,
    recovered: entries.filter(e => e.status === 'recovered').length,
    zoneCount: new Set(entries.map(e => e.zoneName).filter(Boolean)).size,
  };
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function WalkHistoryPage() {
  const params = useParams();
  const planId = params.planId as string;
  const { data: walks, isLoading } = useSWR<Walk[]>(`/api/site-walks?planId=${planId}`);

  const completedWalks = (walks || [])
    .filter(w => w.status === 'completed')
    .sort((a, b) => b.walk_date.localeCompare(a.walk_date));

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-2xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/schedule/${planId}/site-walk`}
          className="p-2 -ml-2 rounded-lg hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Walk History</h1>
      </div>

      {/* Empty state */}
      {completedWalks.length === 0 && (
        <div className="text-center py-16">
          <p className="text-gray-400 text-sm">No completed walks yet</p>
        </div>
      )}

      {/* Walk cards */}
      <div className="space-y-3">
        {completedWalks.map(walk => {
          const stats = computeStats(walk.entries);
          const good = stats.onTrack + stats.completed;

          return (
            <div
              key={walk.id}
              className="bg-white border border-gray-200 rounded-xl p-4 min-h-[48px] active:scale-95 transition-transform"
            >
              {/* Date */}
              <div className="font-semibold text-gray-900 mb-1">
                {formatDate(walk.walk_date)}
              </div>

              {/* Entry and zone count */}
              <div className="text-sm text-gray-500 mb-3">
                {stats.entryCount} {stats.entryCount === 1 ? 'entry' : 'entries'} across {stats.zoneCount} {stats.zoneCount === 1 ? 'zone' : 'zones'}
              </div>

              {/* Status breakdown */}
              <div className="flex gap-3 flex-wrap">
                {good > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS.on_track.dot}`} />
                    <span className="text-xs text-gray-600">{good} on track</span>
                  </div>
                )}
                {stats.delayed > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS.delayed.dot}`} />
                    <span className="text-xs text-gray-600">{stats.delayed} delayed</span>
                  </div>
                )}
                {stats.recovered > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS.recovered.dot}`} />
                    <span className="text-xs text-gray-600">{stats.recovered} recovered</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
