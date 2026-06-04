import { describe, expect, it } from 'vitest';
import {
  hasAssessmentSnapshotHistory,
  hasStudioAssessmentSnapshotHistory,
  shouldShowClientArchetype,
  shouldShowCoachAxisDashboard,
  pillarDisplayScore,
} from './clientAxisOverview';
import type { ScoreSummary } from '@/lib/scoring';

describe('clientAxisOverview', () => {
  it('detects assessment snapshots', () => {
    expect(hasAssessmentSnapshotHistory([])).toBe(false);
    expect(hasAssessmentSnapshotHistory([{ type: 'full-assessment' }])).toBe(true);
    expect(hasAssessmentSnapshotHistory([{ type: 'partial-strength' }])).toBe(true);
  });

  it('hides dashboard while pre-assessment is pending or awaiting studio', () => {
    expect(
      shouldShowCoachAxisDashboard({
        snapshots: [],
        remoteIntakePending: true,
      }),
    ).toBe(false);
    expect(
      shouldShowCoachAxisDashboard({
        snapshots: [],
        remoteIntakeAwaitingStudio: true,
      }),
    ).toBe(false);
    expect(
      shouldShowCoachAxisDashboard({
        snapshots: [{ type: 'full-assessment' }],
        remoteIntakeAwaitingStudio: false,
      }),
    ).toBe(true);
  });

  it('ignores posture-only partial snapshots for studio dashboard', () => {
    expect(hasStudioAssessmentSnapshotHistory([{ type: 'partial-posture' }])).toBe(false);
    expect(
      shouldShowCoachAxisDashboard({
        snapshots: [{ type: 'partial-posture' }],
        remoteIntakeAwaitingStudio: false,
      }),
    ).toBe(false);
    expect(hasStudioAssessmentSnapshotHistory([{ type: 'partial-strength' }])).toBe(true);
  });

  it('shows archetype only for full profile or four+ assessed pillars', () => {
    const partial: ScoreSummary = {
      overall: 72,
      fullProfileScore: null,
      categories: [
        { id: 'lifestyle', title: 'Lifestyle', score: 80, assessed: true, details: [], strengths: [], weaknesses: [] },
        { id: 'movementQuality', title: 'Movement', score: 100, assessed: true, details: [], strengths: [], weaknesses: [] },
      ],
      synthesis: [],
    };
    expect(shouldShowClientArchetype(partial)).toBe(false);

    const full: ScoreSummary = {
      ...partial,
      fullProfileScore: 72,
    };
    expect(shouldShowClientArchetype(full)).toBe(true);
  });

  it('pillarDisplayScore respects assessed flag', () => {
    expect(pillarDisplayScore(100, false)).toBe(null);
    expect(pillarDisplayScore(100, true)).toBe(100);
    expect(pillarDisplayScore(0, true)).toBe(null);
  });
});
