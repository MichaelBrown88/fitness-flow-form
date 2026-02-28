import { useMemo } from 'react';
import type { ScoreCategory, ScoreSummary } from '@/lib/scoring';
import { getPillarLabel } from '@/constants/pillars';
import { getCoachingText, FREQ_MULTIPLIERS, type CountdownTrend } from '@/constants/goalCountdown';

export interface PillarCountdown {
  pillarId: string;
  label: string;
  score: number;
  weeksToGoal: number;
  trend: CountdownTrend;
  trendDelta: number;
  coachingText: string;
  progressPct: number;
}

export interface GoalCountdownData {
  pillars: PillarCountdown[];
  avgWeeks3x: number;
  avgWeeks4x: number;
  avgWeeks5x: number;
}

function determineTrend(
  currentScore: number,
  previousScore: number | undefined,
  weeksToGoal: number,
): { trend: CountdownTrend; delta: number } {
  if (previousScore === undefined) return { trend: 'first-assessment', delta: 0 };
  if (weeksToGoal <= 4) return { trend: 'near-goal', delta: 0 };

  const scoreDelta = currentScore - previousScore;

  if (scoreDelta > 3) return { trend: 'accelerating', delta: Math.round(scoreDelta / 2) };
  if (scoreDelta < -2) return { trend: 'slowing', delta: Math.round(Math.abs(scoreDelta) / 2) };
  return { trend: 'on-track', delta: 0 };
}

export function useGoalCountdown(
  orderedCats: ScoreCategory[],
  weeksByCategory: Record<string, number>,
  previousScores?: ScoreSummary | null,
): GoalCountdownData {
  return useMemo(() => {
    const prevMap = new Map<string, number>();
    if (previousScores?.categories) {
      for (const cat of previousScores.categories) {
        prevMap.set(cat.id, cat.score);
      }
    }

    const pillars: PillarCountdown[] = orderedCats.map((cat) => {
      const weeksToGoal = Math.max(0, weeksByCategory[cat.id] ?? 12);
      const prevScore = prevMap.get(cat.id);
      const { trend, delta } = determineTrend(cat.score, prevScore, weeksToGoal);

      return {
        pillarId: cat.id,
        label: getPillarLabel(cat.id, 'full'),
        score: cat.score,
        weeksToGoal,
        trend,
        trendDelta: delta,
        coachingText: getCoachingText(cat.id, trend, weeksToGoal),
        progressPct: Math.min(100, Math.max(0, Math.round(cat.score))),
      };
    });

    const activePillars = orderedCats.map((c) => c.id);
    const avgWeeks = (multiplier: number) => {
      const weeks = activePillars.map(
        (id) => Math.round((weeksByCategory[id] ?? 12) * multiplier),
      );
      return weeks.length > 0
        ? Math.round(weeks.reduce((a, b) => a + b, 0) / weeks.length)
        : 12;
    };

    return {
      pillars,
      avgWeeks3x: avgWeeks(FREQ_MULTIPLIERS[3]),
      avgWeeks4x: avgWeeks(FREQ_MULTIPLIERS[4]),
      avgWeeks5x: avgWeeks(FREQ_MULTIPLIERS[5]),
    };
  }, [orderedCats, weeksByCategory, previousScores]);
}
