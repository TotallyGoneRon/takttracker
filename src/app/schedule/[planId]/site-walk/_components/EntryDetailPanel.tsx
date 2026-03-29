'use client';

import { useState, useRef, useCallback } from 'react';
import { EntryRecord } from './types';
import { PhotoCapture } from './PhotoCapture';
import { PhotoThumbnail } from './PhotoThumbnail';
import { SeverityPicker } from './SeverityPicker';
import { PercentComplete } from './PercentComplete';

interface EntryDetailPanelProps {
  entry: EntryRecord;
  onPhotoUpload: (entryId: number, file: File) => void;
  onPhotoDelete: (entryId: number) => void;
  onSeverityChange: (entryId: number, severity: string | null) => void;
  onPercentChange: (entryId: number, percent: number | null) => void;
  onNotesChange: (entryId: number, notes: string) => void;
  photoUploading?: boolean;
  photoError?: boolean;
  onPhotoRetry?: () => void;
  onShowOverlay: () => void;
}

export function EntryDetailPanel({
  entry,
  onPhotoUpload,
  onPhotoDelete,
  onSeverityChange,
  onPercentChange,
  onNotesChange,
  photoUploading,
  photoError,
  onPhotoRetry,
  onShowOverlay,
}: EntryDetailPanelProps) {
  const [localNotes, setLocalNotes] = useState(entry.notes || '');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleNotesBlur = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onNotesChange(entry.id, localNotes);
    }, 500);
  }, [entry.id, localNotes, onNotesChange]);

  return (
    <div className="bg-gray-50 p-4 rounded-b-xl space-y-4">
      {/* Photo row */}
      <div className="flex items-center gap-3">
        <PhotoThumbnail
          thumbnailUrl={entry.photoThumbnailUrl || null}
          loading={photoUploading}
          error={photoError}
          onTap={onShowOverlay}
          onRetry={onPhotoRetry}
        />
        <PhotoCapture
          onCapture={(file) => onPhotoUpload(entry.id, file)}
          hasPhoto={!!entry.photoThumbnailUrl}
        />
      </div>

      {/* Severity picker */}
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Severity</label>
        <SeverityPicker
          value={entry.severity || null}
          onChange={(val) => onSeverityChange(entry.id, val)}
        />
      </div>

      {/* Percent complete */}
      <div>
        <label className="text-xs text-gray-500 mb-1 block">% Complete</label>
        <PercentComplete
          value={entry.percentComplete ?? null}
          onChange={(val) => onPercentChange(entry.id, val)}
        />
      </div>

      {/* Notes textarea */}
      <div>
        <textarea
          value={localNotes}
          onChange={(e) => setLocalNotes(e.target.value)}
          onBlur={handleNotesBlur}
          placeholder="Add a note..."
          rows={2}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
    </div>
  );
}
