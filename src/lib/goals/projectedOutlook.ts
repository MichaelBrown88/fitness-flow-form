import type { FormData } from '@/contexts/FormContext';
import type { ScoreSummary } from '@/lib/scoring/types';
import { buildGoalHorizons, type GoalHorizonBlock, type GoalHorizonsOutlook } from './goalHorizons';

export type { GoalHorizonBlock, GoalHorizonsOutlook };

/** @deprecated Use GoalHorizonsOutlook */
export interface ProjectedOutlook {
  headline: string;
  bullets: string[];
  horizonWeeks: number;
  horizons?: GoalHorizonBlock[];
}

export function buildProjectedOutlook(
  formData: FormData | undefined,
  scores: ScoreSummary | undefined,
  goals: string[] | undefined,
): ProjectedOutlook | null {
  const horizons = buildGoalHorizons(formData, scores, goals);
  if (!horizons) return null;
  return {
    headline: horizons.headline,
    bullets: horizons.bullets,
    horizonWeeks: horizons.horizonWeeks,
    horizons: horizons.horizons,
  };
}
