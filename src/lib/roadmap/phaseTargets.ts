/**
 * Phase target generation — what each phase commits to delivering.
 *
 * Replaces the legacy "every phase aims for score 65/70/75" model with
 * a journey-fraction model: foundation = ~30% of the improvement
 * journey, development = ~70%, performance = 100%. Each phase has an
 * achievable bite-sized milestone instead of compressing the whole
 * goal into 12 weeks.
 *
 * For backward compat: when items contain a category whose baseline is
 * already above the performance-tier ceiling, no targets are emitted
 * for that category (already past the journey).
 */

import type { RoadmapItem, RoadmapPhase, RoadmapCategory, PhaseTarget } from './types';
import type { ScoreSummary } from '@/lib/scoring/types';
import { PHASE_FRACTIONS } from '@/lib/physiology/rates';

const CATEGORY_LABELS: Record<string, string> = {
  bodyComp: 'Body Composition',
  movementQuality: 'Movement Quality',
  strength: 'Functional Strength',
  cardio: 'Metabolic Fitness',
  lifestyle: 'Lifestyle Factors',
  general: 'General',
};

/** Performance-tier ceiling — score we consider "goal hit" for a pillar. */
const PILLAR_CEILING = 80;

export function generatePhaseTargets(
  items: RoadmapItem[],
  scores: ScoreSummary,
): Record<RoadmapPhase, PhaseTarget[]> {
  const scoreMap = new Map(scores.categories.map((c) => [c.id, c.score]));
  const targets: Record<RoadmapPhase, PhaseTarget[]> = {
    foundation: [],
    development: [],
    performance: [],
  };

  // Categories that have at least one item ANYWHERE in the plan get a
  // target in every phase, scaled by phase fraction. This way each
  // phase has a meaningful milestone for every active pillar.
  const allCategories = new Set(
    items.map((i) => i.category).filter((c) => c !== 'general'),
  );

  const phases: RoadmapPhase[] = ['foundation', 'development', 'performance'];
  for (const phase of phases) {
    const fraction = PHASE_FRACTIONS[phase];
    for (const cat of allCategories) {
      const baseline = scoreMap.get(cat) ?? 0;
      if (baseline >= PILLAR_CEILING) continue; // already past the journey
      const targetScore = Math.round(baseline + (PILLAR_CEILING - baseline) * fraction);
      targets[phase].push({
        category: cat as RoadmapCategory,
        targetScore,
        baselineScore: baseline,
        label: `${CATEGORY_LABELS[cat] || cat} → ${targetScore}`,
      });
    }
  }

  return targets;
}

export function extractBaselineScores(scores: ScoreSummary): Record<string, number> {
  const result: Record<string, number> = { overall: scores.overall };
  for (const cat of scores.categories) result[cat.id] = cat.score;
  return result;
}

export function computePhaseProgress(
  targets: PhaseTarget[],
  currentScores: Record<string, number>,
): number {
  if (targets.length === 0) return 100;

  let totalProgress = 0;
  for (const t of targets) {
    const current = currentScores[t.category] ?? t.baselineScore;
    const range = t.targetScore - t.baselineScore;
    if (range <= 0) {
      totalProgress += 100;
      continue;
    }
    const progress = Math.min(100, Math.max(0, ((current - t.baselineScore) / range) * 100));
    totalProgress += progress;
  }

  return Math.round(totalProgress / targets.length);
}

export function determineActivePhase(
  phaseTargets: Record<RoadmapPhase, PhaseTarget[]>,
  currentScores: Record<string, number>,
): RoadmapPhase {
  const phases: RoadmapPhase[] = ['foundation', 'development', 'performance'];

  for (const phase of phases) {
    const targets = phaseTargets[phase];
    if (targets.length === 0) continue;
    const allMet = targets.every((t) => (currentScores[t.category] ?? 0) >= t.targetScore);
    if (!allMet) return phase;
  }

  return 'performance';
}
