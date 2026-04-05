/**
 * Dashboard Types
 *
 * Type definitions for dashboard data hooks.
 */

import type { CoachAssessmentSummary } from '@/services/coachAssessments';
import type { PillarCadence, PartialAssessmentCategory } from '@/types/client';

/** Dashboard view tabs (router-backed workspace) */
export type DashboardView = 'assistant' | 'clients' | 'work' | 'team';

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
  /** UID of the coach who owns this client (from latest assessment) */
  coachUid?: string | null;
  /** Recurring cadence intervals (if available) */
  retestSchedule?: {
    recommended: PillarCadence;
    custom?: Partial<PillarCadence>;
  };
  /** One-time absolute due date overrides (pillar → Date) */
  dueDateOverrides?: Record<string, Date>;
  /** Per-pillar last-completed dates for accurate overdue calculation */
  pillarDates?: Record<string, Date>;
  /** Client account status */
  clientStatus?: 'active' | 'inactive' | 'paused' | 'archived';
  /** Which pillars are actively tracked for this client */
  activePillars?: PartialAssessmentCategory[];
  /** Training start date — scheduling clock starts here */
  trainingStartDate?: Date;
  /** Fallback baseline date from the client profile (used when pillar dates are missing) */
  lastAssessmentDate?: Date;
  /** Internal coaching note pinned to the client card */
  notes?: string;
  /** Set when client profile has an active public report link */
  shareToken?: string;
  /** Remote lifestyle (etc.) done; coach-only phases may remain */
  remoteIntakeAwaitingStudio?: boolean;
};
