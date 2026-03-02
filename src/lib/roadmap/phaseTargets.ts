import type { RoadmapItem, RoadmapPhase, RoadmapCategory, PhaseTarget } from './types';
import type { ScoreSummary } from '@/lib/scoring/types';
import { PHASE_SCORE_TARGETS } from '@/constants/trainingThresholds';

const CATEGORY_LABELS: Record<string, string> = {
  bodyComp: 'Body Composition',
  movementQuality: 'Movement Quality',
  strength: 'Functional Strength',
  cardio: 'Metabolic Fitness',
  lifestyle: 'Lifestyle Factors',
  general: 'General',
};

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

  const phases: RoadmapPhase[] = ['foundation', 'development', 'performance'];
  for (const phase of phases) {
    const phaseItems = items.filter((i) => i.phase === phase);
    const categories = new Set(phaseItems.map((i) => i.category).filter((c) => c !== 'general'));
    const targetScore = PHASE_SCORE_TARGETS[phase] ?? 65;

    for (const cat of categories) {
      const baseline = scoreMap.get(cat) ?? 0;
      if (baseline >= targetScore) continue;
      targets[phase].push({
        category: cat as RoadmapCategory,
        targetScore,
        baselineScore: baseline,
        label: `${CATEGORY_LABELS[cat] || cat} to ${targetScore}`,
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
    if (range <= 0) { totalProgress += 100; continue; }
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
