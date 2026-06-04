import type { ScoreSummary } from '@/lib/scoring';
import type { AssessmentSnapshot } from '@/services/assessmentHistory';

const REMOTE_ONLY_SNAPSHOT_TYPES = new Set(['partial-posture', 'pillar-posture']);

/** True when at least one saved assessment snapshot exists (full or pillar), not profile-only intake. */
export function hasAssessmentSnapshotHistory(
  snapshots: readonly Pick<AssessmentSnapshot, 'type'>[],
): boolean {
  return snapshots.some((s) => {
    const t = String(s.type ?? '');
    return (
      t === 'full-assessment' ||
      t === 'full' ||
      t.startsWith('partial-') ||
      t.startsWith('pillar-')
    );
  });
}

/** Studio assessment history — excludes posture-only partials from remote pre-assessment. */
export function hasStudioAssessmentSnapshotHistory(
  snapshots: readonly Pick<AssessmentSnapshot, 'type'>[],
): boolean {
  return snapshots.some((s) => {
    const t = String(s.type ?? '');
    if (REMOTE_ONLY_SNAPSHOT_TYPES.has(t)) return false;
    return (
      t === 'full-assessment' ||
      t === 'full' ||
      t.startsWith('partial-') ||
      t.startsWith('pillar-')
    );
  });
}

export interface CoachAxisDashboardInput {
  snapshots: readonly Pick<AssessmentSnapshot, 'type'>[];
  remoteIntakePending?: boolean;
  remoteIntakeAwaitingStudio?: boolean;
}

/**
 * Coach Summary tab: show scores, journey, and pillar grid only after real in-app
 * assessment history — not while waiting on or just finished remote pre-assessment.
 */
export function shouldShowCoachAxisDashboard(input: CoachAxisDashboardInput): boolean {
  if (input.remoteIntakePending) return false;
  if (input.remoteIntakeAwaitingStudio) return false;
  return hasStudioAssessmentSnapshotHistory(input.snapshots);
}

/** Archetype and headline AXIS need enough assessed pillars — never default labels from intake-only data. */
export function shouldShowClientArchetype(scores: ScoreSummary | null): boolean {
  if (!scores) return false;
  if (scores.fullProfileScore != null) return true;
  const assessed = scores.categories.filter((c) => c.assessed);
  return assessed.length >= 4 && scores.overall > 0;
}

/** Pillar tile score — null means show an em dash (not assessed). */
export function pillarDisplayScore(
  categoryScore: number | undefined,
  assessed: boolean | undefined,
): number | null {
  if (!assessed) return null;
  if (categoryScore == null || categoryScore <= 0) return null;
  return categoryScore;
}
