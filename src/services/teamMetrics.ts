/**
 * Team Metrics Service
 *
 * Computes per-coach and org-wide KPIs for the admin Team dashboard.
 * Reads all assessments in the org (no coachUid filter) and groups by coach.
 */

import { collection, query, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { getDb } from '@/services/firebase';
import { ORGANIZATION } from '@/lib/database/paths';
import { getOrgCoaches } from '@/services/coachManagement';
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
  /** Most recent assessment date */
  lastActive: Date | null;
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

// ── Helpers ──────────────────────────────────────────────────────────

function toDate(ts: unknown): Date | null {
  if (!ts) return null;
  if (ts instanceof Timestamp) return ts.toDate();
  if (ts instanceof Date) return ts;
  if (typeof ts === 'object' && 'seconds' in (ts as Record<string, unknown>)) {
    return new Timestamp(
      (ts as { seconds: number }).seconds,
      (ts as { nanoseconds: number }).nanoseconds ?? 0,
    ).toDate();
  }
  return null;
}

// ── Main function ────────────────────────────────────────────────────

export async function getTeamMetrics(orgId: string): Promise<TeamMetrics> {
  const db = getDb();

  // 1. Fetch coaches
  const coaches = await getOrgCoaches(orgId);

  // 2. Fetch ALL assessments in org (limited to most recent 500 for performance)
  const assessmentsRef = collection(db, ORGANIZATION.assessments.collection(orgId));
  const q = query(assessmentsRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);

  // 3. Group assessments by coachUid
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  interface AssessmentRecord {
    coachUid: string;
    clientName: string;
    overallScore: number;
    trend: number;
    createdAt: Date | null;
    assessmentCount: number;
  }

  const allAssessments: AssessmentRecord[] = [];
  snapshot.forEach(docSnap => {
    const d = docSnap.data();
    allAssessments.push({
      coachUid: d.coachUid || '',
      clientName: d.clientName || '',
      overallScore: typeof d.overallScore === 'number' ? d.overallScore : (d.scores?.overall ?? 0),
      trend: typeof d.trend === 'number' ? d.trend : 0,
      createdAt: toDate(d.createdAt),
      assessmentCount: typeof d.assessmentCount === 'number' ? d.assessmentCount : 1,
    });
  });

  // 4. Compute per-coach metrics
  const coachMap = new Map<string, AssessmentRecord[]>();
  for (const a of allAssessments) {
    if (!a.coachUid) continue;
    const list = coachMap.get(a.coachUid) || [];
    list.push(a);
    coachMap.set(a.coachUid, list);
  }

  const coachMetrics: CoachMetrics[] = coaches.map(coach => {
    const records = coachMap.get(coach.uid) || [];
    const uniqueClients = new Set(records.map(r => r.clientName));
    const recent30d = records.filter(r => r.createdAt && r.createdAt >= thirtyDaysAgo);
    const scores = records.filter(r => r.overallScore > 0).map(r => r.overallScore);
    const trends = records.filter(r => r.trend !== 0).map(r => r.trend);
    const latest = records.reduce<Date | null>((max, r) => {
      if (!r.createdAt) return max;
      if (!max) return r.createdAt;
      return r.createdAt > max ? r.createdAt : max;
    }, null);

    return {
      uid: coach.uid,
      displayName: coach.displayName,
      email: coach.email,
      role: coach.role,
      clientCount: uniqueClients.size,
      assessments30d: recent30d.length,
      avgScore: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
      avgTrend: trends.length > 0 ? Math.round((trends.reduce((a, b) => a + b, 0) / trends.length) * 10) / 10 : 0,
      lastActive: latest,
      overdueCount: 0, // Computed by the hook via reassessment queue
    };
  });

  // Include coaches that have assessments but aren't in the coaches collection
  for (const [uid, records] of coachMap) {
    if (coachMetrics.some(c => c.uid === uid)) continue;
    const uniqueClients = new Set(records.map(r => r.clientName));
    const recent30d = records.filter(r => r.createdAt && r.createdAt >= thirtyDaysAgo);
    const scores = records.filter(r => r.overallScore > 0).map(r => r.overallScore);
    const trends = records.filter(r => r.trend !== 0).map(r => r.trend);
    const latest = records.reduce<Date | null>((max, r) => {
      if (!r.createdAt) return max;
      if (!max) return r.createdAt;
      return r.createdAt > max ? r.createdAt : max;
    }, null);

    coachMetrics.push({
      uid,
      displayName: 'Unknown Coach',
      role: 'coach',
      clientCount: uniqueClients.size,
      assessments30d: recent30d.length,
      avgScore: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
      avgTrend: trends.length > 0 ? Math.round((trends.reduce((a, b) => a + b, 0) / trends.length) * 10) / 10 : 0,
      lastActive: latest,
      overdueCount: 0,
    });
  }

  // Sort by assessments in last 30d (most active first)
  coachMetrics.sort((a, b) => b.assessments30d - a.assessments30d);

  // 5. Compute org-wide summary
  const allClients = new Set(allAssessments.map(a => a.clientName));
  const assessmentsThisMonth = allAssessments.filter(
    a => a.createdAt && a.createdAt >= monthStart
  ).length;
  const allTrends = allAssessments.filter(a => a.trend !== 0).map(a => a.trend);
  const avgScoreChange = allTrends.length > 0
    ? Math.round((allTrends.reduce((a, b) => a + b, 0) / allTrends.length) * 10) / 10
    : 0;

  return {
    summary: {
      totalClients: allClients.size,
      totalCoaches: coachMetrics.length,
      assessmentsThisMonth,
      avgScoreChange,
    },
    coaches: coachMetrics,
  };
}
