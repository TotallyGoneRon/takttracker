/**
 * Date utilities for Takt-Flow.
 * All dates are in Mountain Time. Weekends (Sat/Sun) don't count as working days.
 */

const TZ = 'America/Edmonton'; // Mountain Time

/** Get today's date in Mountain Time as YYYY-MM-DD */
export function getToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ });
}

/** Get yesterday's date in Mountain Time as YYYY-MM-DD */
export function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString('en-CA', { timeZone: TZ });
}

/** Get current Mountain Time date as Date object */
export function getMountainNow(): Date {
  const str = new Date().toLocaleString('en-US', { timeZone: TZ });
  return new Date(str);
}

/** Check if a date is a weekend (Saturday=6, Sunday=0) */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/** Check if a date string (YYYY-MM-DD) falls on a weekend */
export function isWeekendStr(dateStr: string): boolean {
  const d = new Date(dateStr + 'T12:00:00'); // noon to avoid timezone issues
  return isWeekend(d);
}

/**
 * Count working days between two dates (excludes weekends).
 * Positive if date2 > date1, negative if date2 < date1.
 */
export function workingDaysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1 + 'T12:00:00');
  const d2 = new Date(date2 + 'T12:00:00');

  if (d1.getTime() === d2.getTime()) return 0;

  const direction = d2 > d1 ? 1 : -1;
  const start = direction === 1 ? d1 : d2;
  const end = direction === 1 ? d2 : d1;

  let count = 0;
  const cursor = new Date(start);
  cursor.setDate(cursor.getDate() + 1); // don't count start day

  while (cursor <= end) {
    if (!isWeekend(cursor)) count++;
    cursor.setDate(cursor.getDate() + 1);
  }

  return count * direction;
}

/**
 * Shift a date by N working days (skips weekends).
 * Positive = forward, negative = backward.
 */
export function shiftByWorkingDays(dateStr: string, workingDays: number): string {
  if (workingDays === 0) return dateStr;

  const d = new Date(dateStr + 'T12:00:00');
  const direction = workingDays > 0 ? 1 : -1;
  let remaining = Math.abs(workingDays);

  while (remaining > 0) {
    d.setDate(d.getDate() + direction);
    if (!isWeekend(d)) remaining--;
  }

  return d.toISOString().split('T')[0];
}

/**
 * Get the Monday and Friday (or Sunday for display) of the current week in Mountain Time.
 */
export function getCurrentWeek(): { start: string; end: string } {
  const now = getMountainNow();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4); // Mon-Fri = work week
  return {
    start: monday.toISOString().split('T')[0],
    end: friday.toISOString().split('T')[0],
  };
}

/** Format a date string for display: "Mar 27" */
export function formatDate(d: string): string {
  const date = new Date(d + 'T12:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Calculate completion status: early / on-time / late in WORKING days.
 */
export function completionStatus(actualEnd: string, plannedEnd: string): {
  label: string;
  color: string;
  days: number;
  workingDays: number;
} {
  const wDays = workingDaysBetween(plannedEnd, actualEnd);

  if (wDays < 0) {
    return {
      label: `${Math.abs(wDays)}d early`,
      color: 'text-green-600 bg-green-50',
      days: wDays,
      workingDays: wDays,
    };
  }
  if (wDays === 0) {
    return {
      label: 'On time',
      color: 'text-green-600 bg-green-50',
      days: 0,
      workingDays: 0,
    };
  }
  return {
    label: `${wDays}d late`,
    color: 'text-red-600 bg-red-50',
    days: wDays,
    workingDays: wDays,
  };
}
