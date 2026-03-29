/**
 * Schedule Health Index calculation.
 * Composite score (0-100) combining PPC, SPI, and compression ratio.
 */

import { db } from '@/db/client';
import { tasks } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getToday } from '@/lib/dates';

// --- Interfaces ---

export interface HealthIndex {
  score: number;       // 0-100 composite, -1 = no tasks due yet
  ppc: number;         // 0-100 percent plan complete
  spi: number;         // schedule performance index (ratio around 1.0)
  compression: number; // compression ratio (1.0 = no compression, 0.0 = fully compressed)
  label: string;       // 'On Track' | 'At Risk' | 'Behind Schedule' | 'No tasks due yet'
}

// --- Weights ---

const W_PPC = 0.4;
const W_SPI = 0.35;
const W_COMPRESSION = 0.25;

// --- Main Function ---

/**
 * Calculate the composite Schedule Health Index for a given plan.
 * Combines PPC (40%), SPI (35%), and compression ratio (25%) into a 0-100 score.
 */
export async function calculateHealthIndex(planId: number): Promise<HealthIndex> {
  const allTasks = await db.select().from(tasks).where(eq(tasks.takt_plan_id, planId));
  const today = getToday();

  if (allTasks.length === 0) {
    return { score: -1, ppc: 100, spi: 1.0, compression: 1.0, label: 'No tasks due yet' };
  }

  // --- PPC (Percent Plan Complete) ---
  const shouldBeDone = allTasks.filter(t => t.planned_end <= today);
  const completedOfShouldBeDone = shouldBeDone.filter(t => t.status === 'completed');
  const ppc = shouldBeDone.length === 0
    ? 100
    : Math.round((completedOfShouldBeDone.length / shouldBeDone.length) * 100);

  // --- SPI (Schedule Performance Index) ---
  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter(t => t.status === 'completed').length;
  const ev = completedTasks / totalTasks;
  const pv = shouldBeDone.length / totalTasks;
  const spi = pv === 0 ? 1.0 : ev / pv;

  // --- Compression Ratio ---
  // Fraction of remaining work NOT yet past its planned start
  // 1.0 = healthy (no compression), 0.0 = fully compressed
  const incompleteTasks = allTasks.filter(t => t.status !== 'completed');
  const pastStartTasks = incompleteTasks.filter(t => t.planned_start && t.planned_start <= today);
  const compression = incompleteTasks.length === 0
    ? 1.0
    : 1 - (pastStartTasks.length / incompleteTasks.length);

  // --- Edge case: no tasks due yet ---
  if (shouldBeDone.length === 0 && completedTasks === 0) {
    return { score: -1, ppc: 100, spi: 1.0, compression: 1.0, label: 'No tasks due yet' };
  }

  // --- Composite Score ---
  const ppcNorm = ppc; // already 0-100
  const spiNorm = (Math.min(spi, 1.2) / 1.2) * 100;
  const compressionNorm = (Math.min(compression, 1.5) / 1.5) * 100;
  const score = Math.round(W_PPC * ppcNorm + W_SPI * spiNorm + W_COMPRESSION * compressionNorm);

  // --- Label ---
  let label: string;
  if (score >= 80) {
    label = 'On Track';
  } else if (score >= 60) {
    label = 'At Risk';
  } else {
    label = 'Behind Schedule';
  }

  return { score, ppc, spi, compression, label };
}

// --- Color Helper ---

/**
 * Return Tailwind text + background color classes for a Health Index score.
 * Score of -1 (N/A) gets gray styling.
 */
export function getHealthColor(score: number): string {
  if (score < 0) return 'text-gray-500 bg-gray-50';
  if (score >= 80) return 'text-green-600 bg-green-50';
  if (score >= 60) return 'text-yellow-600 bg-yellow-50';
  return 'text-red-600 bg-red-50';
}
