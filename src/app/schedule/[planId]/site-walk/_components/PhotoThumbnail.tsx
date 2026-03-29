'use client';

import { Skeleton } from '@/components/ui/skeleton';

interface PhotoThumbnailProps {
  thumbnailUrl: string | null;
  loading?: boolean;
  error?: boolean;
  onTap: () => void;
  onRetry?: () => void;
}

export function PhotoThumbnail({ thumbnailUrl, loading, error, onTap, onRetry }: PhotoThumbnailProps) {
  if (loading) {
    return <Skeleton className="w-16 h-16 rounded-lg flex-shrink-0" />;
  }

  if (error) {
    return (
      <button
        onClick={onRetry}
        className="w-16 h-16 rounded-lg border-2 border-red-300 bg-red-50 flex flex-col items-center justify-center flex-shrink-0"
      >
        <span className="text-xs text-red-600 text-center leading-tight px-1">Upload failed. Tap to retry.</span>
      </button>
    );
  }

  if (thumbnailUrl) {
    return (
      <button onClick={onTap} className="flex-shrink-0">
        <img
          src={'/tracking' + thumbnailUrl}
          alt="Entry photo"
          className="w-16 h-16 rounded-lg object-cover"
        />
      </button>
    );
  }

  return null;
}
