export interface Task {
  id: number;
  task_name: string;
  planned_start: string;
  planned_end: string;
  actual_start: string | null;
  actual_end: string | null;
  baseline_end: string | null;
  status: string;
  recovery_status: string | null;
  inherited_delay_days: number;
  recovery_points: number;
  activityColor: string | null;
  activityName: string;
  company: { name: string } | null;
  zoneName: string | null;
  zoneFloor: number | null;
  zoneType: string | null;
  buildingId: number | null;
}

export interface Building {
  id: number;
  code: string;
  name: string;
  num_floors: number;
}

export interface ZoneInfo {
  name: string;
  tasks: Task[];
  status: string;
}

export interface EntryRecord {
  id: number;
  task: Task;
  status: string;
  completedDate?: string;
  severity?: string | null;
  percentComplete?: number | null;
  notes?: string | null;
  photoThumbnailUrl?: string | null;
  photoOriginalUrl?: string | null;
  varianceCode?: string | null;
  delayDays?: number | null;
}

export const SEVERITY_DOT_COLORS: Record<string, string> = {
  low: 'bg-yellow-500',
  medium: 'bg-orange-500',
  high: 'bg-red-500',
  critical: 'bg-red-800',
};

export interface QueuedEntry {
  walkId: number;
  taskId: number;
  status: string;
  varianceCode: string | null;
  notes: string | null;
  delayDays: number | null;
}

export interface SuccessorTask {
  id: number;
  task_name: string;
  planned_start: string;
  planned_end: string;
  status: string;
  inherited_delay_days: number;
  activityName: string;
  activityColor: string | null;
  companyName: string | null;
  zoneName: string | null;
  zoneFloor: number | null;
  relationType: string;
  isDirectSuccessor?: boolean;
}

export type Step = 'select-zone' | 'zone-tasks' | 'toggle-status' | 'log-details' | 'completion-date' | 'impact-review' | 'summary';

export const STATUS_COLORS: Record<string, { bg: string; hover: string; text: string; label: string }> = {
  completed: { bg: 'bg-emerald-600', hover: 'hover:bg-emerald-700', text: 'text-white', label: 'Completed' },
  on_track: { bg: 'bg-green-500', hover: 'hover:bg-green-600', text: 'text-white', label: 'On Track' },
  delayed: { bg: 'bg-red-500', hover: 'hover:bg-red-600', text: 'text-white', label: 'Delayed' },
  recovered: { bg: 'bg-blue-500', hover: 'hover:bg-blue-600', text: 'text-white', label: 'Recovered' },
};

export const VARIANCE_CODES = [
  { code: 'labor', label: 'Labor', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { code: 'material', label: 'Material', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { code: 'prep', label: 'Prep', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { code: 'design', label: 'Design', color: 'bg-pink-100 text-pink-700 border-pink-200' },
  { code: 'weather', label: 'Weather', color: 'bg-sky-100 text-sky-700 border-sky-200' },
  { code: 'inspection', label: 'Inspection', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { code: 'prerequisite', label: 'Prerequisite', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  { code: 'other', label: 'Other', color: 'bg-gray-100 text-gray-700 border-gray-200' },
];

export const ZONE_STATUS_COLORS: Record<string, string> = {
  completed: 'bg-green-400 border-green-500',
  delayed: 'bg-red-400 border-red-500',
  on_track: 'bg-green-300 border-green-400',
  recovered: 'bg-blue-400 border-blue-500',
  not_started: 'bg-gray-200 border-gray-300',
  in_progress: 'bg-indigo-300 border-indigo-400',
  at_risk: 'bg-yellow-300 border-yellow-400',
};
