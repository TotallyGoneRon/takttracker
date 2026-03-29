'use client';

interface SeverityPickerProps {
  value: string | null;
  onChange: (value: string | null) => void;
}

const SEVERITIES = [
  { key: 'low', label: 'Low', inactive: 'bg-yellow-100 text-yellow-800', active: 'bg-yellow-500 text-white' },
  { key: 'medium', label: 'Med', inactive: 'bg-orange-100 text-orange-800', active: 'bg-orange-500 text-white' },
  { key: 'high', label: 'High', inactive: 'bg-red-100 text-red-800', active: 'bg-red-500 text-white' },
  { key: 'critical', label: 'Crit', inactive: 'bg-red-200 text-red-900', active: 'bg-red-800 text-white' },
];

export function SeverityPicker({ value, onChange }: SeverityPickerProps) {
  return (
    <div className="flex gap-2">
      {SEVERITIES.map((s) => (
        <button
          key={s.key}
          onClick={() => onChange(value === s.key ? null : s.key)}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition min-h-[44px] active:scale-95 ${
            value === s.key ? s.active : s.inactive
          }`}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
