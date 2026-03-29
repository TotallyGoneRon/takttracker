/**
 * Unified status color definitions for consistent use across all pages.
 *
 * Color mapping:
 *   green  = completed / on_track
 *   red    = delayed
 *   yellow = at_risk
 *   blue   = recovered
 *   indigo = in_progress
 *   gray   = not_started
 */
export const STATUS_COLORS = {
  completed: { bg: 'bg-green-400', text: 'text-green-800', light: 'bg-green-100', border: 'border-green-500', dot: 'bg-green-500', hover: 'hover:bg-green-500', label: 'Complete' },
  delayed: { bg: 'bg-red-400', text: 'text-red-800', light: 'bg-red-100', border: 'border-red-500', dot: 'bg-red-500', hover: 'hover:bg-red-500', label: 'Delayed' },
  at_risk: { bg: 'bg-yellow-400', text: 'text-yellow-800', light: 'bg-yellow-100', border: 'border-yellow-500', dot: 'bg-yellow-500', hover: 'hover:bg-yellow-500', label: 'At Risk' },
  recovered: { bg: 'bg-blue-400', text: 'text-blue-800', light: 'bg-blue-100', border: 'border-blue-500', dot: 'bg-blue-500', hover: 'hover:bg-blue-500', label: 'Recovered' },
  in_progress: { bg: 'bg-indigo-300', text: 'text-indigo-800', light: 'bg-indigo-100', border: 'border-indigo-500', dot: 'bg-indigo-500', hover: 'hover:bg-indigo-400', label: 'In Progress' },
  not_started: { bg: 'bg-gray-200', text: 'text-gray-700', light: 'bg-gray-100', border: 'border-gray-400', dot: 'bg-gray-400', hover: 'hover:bg-gray-300', label: 'Not Started' },
  on_track: { bg: 'bg-green-300', text: 'text-green-800', light: 'bg-green-100', border: 'border-green-400', dot: 'bg-green-400', hover: 'hover:bg-green-400', label: 'On Track' },
  blocked: { bg: 'bg-red-200', text: 'text-red-800', light: 'bg-red-200', border: 'border-red-700', dot: 'bg-red-700', hover: 'hover:bg-red-300', label: 'Blocked' },
} as const;

export type StatusKey = keyof typeof STATUS_COLORS;

export const ZONE_STATUS_COLORS: Record<string, string> = Object.fromEntries(
  Object.entries(STATUS_COLORS).map(([key, val]) => [key, `${val.bg} ${val.border}`])
);

export const WALK_STATUSES = ['completed', 'on_track', 'delayed', 'recovered'] as const;

export const WALK_BUTTON_COLORS: Record<string, { bg: string; hover: string; text: string; label: string }> = {
  completed: { bg: 'bg-emerald-600', hover: 'hover:bg-emerald-700', text: 'text-white', label: 'Completed' },
  on_track: { bg: 'bg-green-500', hover: 'hover:bg-green-600', text: 'text-white', label: 'On Track' },
  delayed: { bg: 'bg-red-500', hover: 'hover:bg-red-600', text: 'text-white', label: 'Delayed' },
  recovered: { bg: 'bg-blue-500', hover: 'hover:bg-blue-600', text: 'text-white', label: 'Recovered' },
};
