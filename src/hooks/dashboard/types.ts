/**
 * Dashboard Types
 *
 * Type definitions for dashboard data hooks.
 */

import type { CoachAssessmentSummary } from '@/services/coachAssessments';
import type { PillarCadence } from '@/types/client';

/** Dashboard view tabs */
export type DashboardView = 'clients' | 'schedule';

/** Simplified analytics — only business-relevant counts */
export type Analytics = {
  totalClients: number;
  totalAssessments: number;
};

export type ClientGroup = {
  /** Unique stable identifier (Firestore summary doc id) */
  id: string;
  name: string;
  assessments: CoachAssessmentSummary[];
  latestScore: number;
  latestDate: Date | null;
  scoreChange?: number;
  /** Recurring cadence intervals (if available) */
  retestSchedule?: {
    recommended: PillarCadence;
    custom?: Partial<PillarCadence>;
  };
  /** One-time absolute due date overrides (pillar → Date) */
  dueDateOverrides?: Record<string, Date>;
};
