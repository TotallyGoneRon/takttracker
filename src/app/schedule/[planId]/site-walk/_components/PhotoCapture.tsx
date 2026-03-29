'use client';

import { useRef } from 'react';
import { Camera } from 'lucide-react';

interface PhotoCaptureProps {
  onCapture: (file: File) => void;
  hasPhoto: boolean;
  disabled?: boolean;
}

export function PhotoCapture({ onCapture, hasPhoto, disabled }: PhotoCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onCapture(file);
      // Reset so the same file can be re-selected
      e.target.value = '';
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        className="hidden"
      />
      <button
        onClick={handleClick}
        disabled={disabled}
        aria-label={hasPhoto ? 'Replace Photo' : 'Take photo'}
        className="min-h-[48px] min-w-[48px] flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition active:scale-95 disabled:opacity-50"
      >
        <Camera className="w-5 h-5" />
        <span className="text-sm font-medium">{hasPhoto ? 'Replace Photo' : 'Add Photo'}</span>
      </button>
    </>
  );
}
