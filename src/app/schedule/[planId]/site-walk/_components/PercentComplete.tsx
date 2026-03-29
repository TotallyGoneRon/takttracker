'use client';

interface PercentCompleteProps {
  value: number | null;
  onChange: (value: number | null) => void;
}

const PERCENTS = [0, 25, 50, 75, 100];

export function PercentComplete({ value, onChange }: PercentCompleteProps) {
  return (
    <div className="flex gap-1">
      {PERCENTS.map((p) => (
        <button
          key={p}
          onClick={() => onChange(value === p ? null : p)}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition min-h-[44px] active:scale-95 ${
            value === p ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
          }`}
        >
          {p}%
        </button>
      ))}
    </div>
  );
}
