/**
 * Score Color Helper
 *
 * Single source of truth for score-based color grading.
 * Every component that color-codes a score should use this
 * instead of hardcoding threshold values or Tailwind classes.
 *
 * Traffic light CSS variables are defined in index.css and mapped
 * in tailwind.config.ts under `colors.score.*`.
 */

import { SCORE_THRESHOLDS } from '@/lib/constants';

export type ScoreGrade = 'green' | 'amber' | 'red';

/** Returns a semantic color grade for a given score. */
export function scoreGrade(score: number): ScoreGrade {
  if (score >= SCORE_THRESHOLDS.EXCELLENT) return 'green';
  if (score >= SCORE_THRESHOLDS.GOOD) return 'amber';
  return 'red';
}

/**
 * Pre-built Tailwind class sets for every traffic-light variant.
 * Change one entry here → every badge/pill/circle across the app updates.
 */
export const SCORE_COLORS: Record<
  ScoreGrade,
  {
    /** Dark badge — bold bg, white text (e.g. score badges in tables) */
    badge: string;
    /** Light pill — light bg, colored text, muted border */
    pill: string;
    /** Circle/ring — base border, dark text */
    circle: string;
    /** Text-only color */
    text: string;
    /** Icon color */
    icon: string;
    /** Small dot / indicator */
    dot: string;
  }
> = {
  green: {
    badge: 'bg-score-green text-white',
    pill: 'bg-score-green-light text-score-green-fg border border-score-green-muted',
    circle: 'border-score-green text-score-green-fg',
    text: 'text-score-green-fg',
    icon: 'text-score-green',
    dot: 'bg-score-green',
  },
  amber: {
    badge: 'bg-score-amber text-white',
    pill: 'bg-score-amber-light text-score-amber-fg border border-score-amber-muted',
    circle: 'border-score-amber text-score-amber-fg',
    text: 'text-score-amber-fg',
    icon: 'text-score-amber',
    dot: 'bg-score-amber',
  },
  red: {
    badge: 'bg-score-red text-white',
    pill: 'bg-score-red-light text-score-red-fg border border-score-red-muted',
    circle: 'border-score-red text-score-red-fg',
    text: 'text-score-red-fg',
    icon: 'text-score-red',
    dot: 'bg-score-red',
  },
};

/**
 * Maps a schedule status to its equivalent ScoreGrade.
 * Useful for PriorityView / ScheduleInsights where statuses
 * use the same traffic light palette as scores.
 */
export type ScheduleStatus = 'overdue' | 'due-soon' | 'up-to-date';

export const STATUS_GRADE: Record<ScheduleStatus, ScoreGrade> = {
  'overdue': 'red',
  'due-soon': 'amber',
  'up-to-date': 'green',
};
