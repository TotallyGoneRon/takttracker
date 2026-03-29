'use client';

import { useState, useEffect, useCallback } from 'react';
import { Camera, Trash2, X } from 'lucide-react';

interface PhotoOverlayProps {
  originalUrl: string;
  onClose: () => void;
  onRetake: () => void;
  onDelete: () => void;
}

export function PhotoOverlay({ originalUrl, onClose, onRetake, onDelete }: PhotoOverlayProps) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(false), 3000);
    return () => clearTimeout(timer);
  }, [confirming]);

  const handleDelete = () => {
    if (confirming) {
      onDelete();
    } else {
      setConfirming(true);
    }
  };

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col" onClick={handleBackdropClick}>
      {/* Top bar */}
      <div className="flex justify-end p-2">
        <button
          onClick={onClose}
          aria-label="Close photo"
          className="w-11 h-11 flex items-center justify-center text-white hover:bg-white/10 rounded-full transition"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Image */}
      <div className="flex-1 flex items-center justify-center px-4" onClick={handleBackdropClick}>
        <img
          src={'/tracking' + originalUrl}
          alt="Full size photo"
          className="object-contain max-w-[100vw] max-h-[calc(100vh-120px)]"
        />
      </div>

      {/* Bottom bar */}
      <div className="flex justify-center gap-4 p-4">
        <button
          onClick={onRetake}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white text-white hover:bg-white/10 transition active:scale-95 min-h-[44px]"
        >
          <Camera className="w-5 h-5" />
          <span className="text-sm font-medium">Retake</span>
        </button>
        <button
          onClick={handleDelete}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition active:scale-95 min-h-[44px] ${
            confirming
              ? 'bg-red-600 text-white'
              : 'bg-red-500 text-white hover:bg-red-600'
          }`}
        >
          <Trash2 className="w-5 h-5" />
          <span className="text-sm font-medium">{confirming ? 'Confirm Delete?' : 'Delete'}</span>
        </button>
      </div>
    </div>
  );
}
