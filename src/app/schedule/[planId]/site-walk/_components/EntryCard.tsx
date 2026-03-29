'use client';

import { Camera, ChevronDown } from 'lucide-react';
import { EntryRecord, STATUS_COLORS, SEVERITY_DOT_COLORS } from './types';

interface EntryCardProps {
  entry: EntryRecord;
  isExpanded: boolean;
  onToggleExpand: () => void;
  children?: React.ReactNode;
}

export function EntryCard({ entry, isExpanded, onToggleExpand, children }: EntryCardProps) {
  const statusColor = STATUS_COLORS[entry.status];
  const statusBg = statusColor?.bg || 'bg-gray-400';
  const borderColor = entry.status === 'delayed' ? 'border-red-300 bg-red-50/30'
    : entry.status === 'completed' ? 'border-emerald-300 bg-emerald-50/30'
    : 'border-green-300 bg-green-50/30';

  return (
    <div className={`rounded-xl border-2 ${borderColor} overflow-hidden`}>
      {/* Collapsed row */}
      <button
        onClick={onToggleExpand}
        className="w-full p-4 text-left flex items-center gap-3 min-h-[48px]"
      >
        {/* Status badge */}
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
          entry.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
          entry.status === 'on_track' ? 'bg-green-100 text-green-700' :
          entry.status === 'delayed' ? 'bg-red-100 text-red-700' :
          'bg-blue-100 text-blue-700'
        }`}>
          {entry.status === 'completed' ? 'Done' : entry.status === 'on_track' ? 'On Track' : entry.status.replace('_', ' ')}
        </span>

        {/* Task name + company */}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{entry.task.task_name}</div>
          <div className="text-xs text-gray-500 truncate">{entry.task.company?.name || 'Unassigned'}</div>
        </div>

        {/* Badge row */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {entry.photoThumbnailUrl && (
            <Camera className="w-3.5 h-3.5 text-gray-400" />
          )}
          {entry.severity && SEVERITY_DOT_COLORS[entry.severity] && (
            <div className={`w-2 h-2 rounded-full ${SEVERITY_DOT_COLORS[entry.severity]}`} />
          )}
          {entry.percentComplete != null && (
            <span className="text-xs text-gray-500">{entry.percentComplete}%</span>
          )}
        </div>

        {/* Chevron */}
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 flex-shrink-0">
          <ChevronDown
            className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {/* Expanded content — conditional render instead of CSS hide */}
      {isExpanded && (
        <div className="border-t border-gray-200">
          {children}
        </div>
      )}
    </div>
  );
}
