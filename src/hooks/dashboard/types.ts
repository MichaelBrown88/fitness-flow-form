/**
 * Dashboard Types
 *
 * Type definitions for dashboard data hooks.
 */

import type { CoachAssessmentSummary } from '@/services/coachAssessments';
import type { PillarCadence } from '@/types/client';

export type Analytics = {
  totalClients: number;
  totalAssessments: number;
  averageScore: number;
  mostCommonIssues: { issue: string; count: number }[];
  highestCategory: { name: string; avgScore: number } | null;
  lowestCategory: { name: string; avgScore: number } | null;
  assessmentsThisMonth: number;
  clientsThisMonth: number;
};

export type ClientGroup = {
  /** Unique stable identifier (Firestore summary doc id) */
  id: string;
  name: string;
  assessments: CoachAssessmentSummary[];
  latestScore: number;
  latestDate: Date | null;
  scoreChange?: number;
  /** Total assessments for this client (from denormalized assessmentCount) */
  assessmentCount?: number;
  /** Recurring cadence intervals (if available) */
  retestSchedule?: {
    recommended: PillarCadence;
    custom?: Partial<PillarCadence>;
  };
  /** One-time absolute due date overrides (pillar → Date) */
  dueDateOverrides?: Record<string, Date>;
};

export type RecentChange = {
  clientName: string;
  category: string;
  date: Date;
  type: string;
};
