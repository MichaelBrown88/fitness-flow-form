/**
 * Score Color Helper
 *
 * Single source of truth for score-based color grading.
 * Every component that color-codes a score should use this
 * instead of hardcoding threshold values.
 */

import { SCORE_THRESHOLDS } from '@/lib/constants';

export type ScoreGrade = 'green' | 'amber' | 'red';

/** Returns a semantic color grade for a given score. */
export function scoreGrade(score: number): ScoreGrade {
  if (score >= SCORE_THRESHOLDS.EXCELLENT) return 'green';
  if (score >= SCORE_THRESHOLDS.GOOD) return 'amber';
  return 'red';
}
