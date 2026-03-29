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

  return (
    <div className="rounded-xl border-2 border-gray-200 bg-white overflow-hidden">
      {/* Collapsed row */}
      <button
        onClick={onToggleExpand}
        className="w-full p-4 text-left flex items-center gap-3 min-h-[48px]"
      >
        {/* Status dot */}
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusBg}`} />

        {/* Task name + zone */}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{entry.task.task_name}</div>
          <div className="text-xs text-gray-500 truncate">{entry.task.zoneName || 'Unknown zone'}</div>
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
        <ChevronDown
          className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Expanded content */}
      <div
        className={`overflow-hidden transition-all duration-200 ease-out ${
          isExpanded ? 'max-h-[800px]' : 'max-h-0'
        }`}
      >
        {children}
      </div>
    </div>
  );
}
