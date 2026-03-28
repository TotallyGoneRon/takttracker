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
  completed: { bg: 'bg-green-400', text: 'text-green-800', light: 'bg-green-100', border: 'border-green-500', dot: 'bg-green-500', label: 'Complete' },
  delayed: { bg: 'bg-red-400', text: 'text-red-800', light: 'bg-red-100', border: 'border-red-500', dot: 'bg-red-500', label: 'Delayed' },
  at_risk: { bg: 'bg-yellow-400', text: 'text-yellow-800', light: 'bg-yellow-100', border: 'border-yellow-500', dot: 'bg-yellow-500', label: 'At Risk' },
  recovered: { bg: 'bg-blue-400', text: 'text-blue-800', light: 'bg-blue-100', border: 'border-blue-500', dot: 'bg-blue-500', label: 'Recovered' },
  in_progress: { bg: 'bg-indigo-300', text: 'text-indigo-800', light: 'bg-indigo-100', border: 'border-indigo-500', dot: 'bg-indigo-500', label: 'In Progress' },
  not_started: { bg: 'bg-gray-200', text: 'text-gray-700', light: 'bg-gray-100', border: 'border-gray-400', dot: 'bg-gray-400', label: 'Not Started' },
  on_track: { bg: 'bg-green-300', text: 'text-green-800', light: 'bg-green-100', border: 'border-green-400', dot: 'bg-green-400', label: 'On Track' },
  blocked: { bg: 'bg-red-200', text: 'text-red-800', light: 'bg-red-200', border: 'border-red-700', dot: 'bg-red-700', label: 'Blocked' },
} as const;

export type StatusKey = keyof typeof STATUS_COLORS;
