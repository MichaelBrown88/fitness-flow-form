/**
 * Team Metrics Service
 *
 * Delegates computation to the getTeamMetrics Cloud Function.
 * The server-side function scans org assessments without exposing raw data to the client.
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import { logger } from '@/lib/utils/logger';

// ── Types ────────────────────────────────────────────────────────────

export interface CoachMetrics {
  uid: string;
  displayName: string;
  email?: string;
  role: string;
  /** Number of unique clients with at least one assessment */
  clientCount: number;
  /** Assessments created in the last 30 days */
  assessments30d: number;
  /** Average overallScore across all latest client assessments */
  avgScore: number;
  /** Average trend (score improvement) across latest client assessments */
  avgTrend: number;
  /** Most recent assessment date (ISO string from server) */
  lastActive: string | null;
  /** Number of clients with overdue pillar schedules (computed externally) */
  overdueCount: number;
}

export interface TeamSummary {
  totalClients: number;
  totalCoaches: number;
  assessmentsThisMonth: number;
  avgScoreChange: number;
}

export interface TeamMetrics {
  summary: TeamSummary;
  coaches: CoachMetrics[];
}

// ── Main function ────────────────────────────────────────────────────

export async function getTeamMetrics(orgId: string): Promise<TeamMetrics> {
  try {
    const functions = getFunctions();
    const fn = httpsCallable<{ orgId: string }, TeamMetrics>(functions, 'getTeamMetrics');
    const result = await fn({ orgId });
    return result.data;
  } catch (error) {
    logger.error('[teamMetrics] Cloud Function call failed:', error);
    throw error;
  }
}
