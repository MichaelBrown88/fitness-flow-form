import type { ScoreSummary, ScoreDetail } from '@/lib/scoring/types';
import type { FormData } from '@/contexts/FormContext';
import type { RoadmapBlock, Trackable } from './types';
import { ambitionMultiplier, resolveGoalTarget } from './goalTargets';

const LIFESTYLE_ZONE_IDS = new Set(['sleep', 'stress', 'nutrition', 'hydration', 'activity']);

const DEFAULT_ZONES: Trackable['zones'] = [
  { min: 0, max: 40, color: 'red', label: 'Needs focus' },
  { min: 40, max: 70, color: 'amber', label: 'Building' },
  { min: 70, max: 100, color: 'green', label: 'Optimal' },
];

/**
 * Score-based target tier for a detail. Multiplied by an ambition
 * factor when the client has stated aggressive/maximizer goals — pushes
 * targets a tier higher.
 */
function targetForDetail(detail: ScoreDetail, ambition: number): number {
  let base: number;
  if (detail.score >= 80) base = 90;
  else if (detail.score >= 60) base = 80;
  else if (detail.score >= 40) base = 70;
  else base = 65;
  // Cap at 100 — score targets are 0-100.
  return Math.min(100, Math.round(base * ambition));
}

export function resolveTrackables(
  block: RoadmapBlock,
  scores: ScoreSummary,
  formData?: FormData,
): Trackable[] {
  const ambition = ambitionMultiplier(formData);

  const categoryId = block.scoreCategoryId;
  const detailId = block.scoreDetailId;
  if (!categoryId || !detailId) {
    if (block.id.startsWith('syn-')) return resolveSynthesisTrackables(block, scores, ambition);
    return [];
  }
  const category = scores.categories.find((c) => c.id === categoryId);
  if (!category) return [];
  const detail = category.details.find((d) => d.id === detailId);
  if (!detail || detail.score === 0) return [];

  const targetScore = targetForDetail(detail, ambition);
  const val = detail.value;
  const hasValue = detail.unit != null && typeof val === 'number' && !Number.isNaN(val);
  const isZoneMetric = categoryId === 'lifestyle' && LIFESTYLE_ZONE_IDS.has(detailId);

  const trackable: Trackable = {
    id: detail.id,
    label: detail.label,
    baseline: detail.score,
    target: targetScore,
    current: detail.score,
    unit: detail.unit,
    ...(isZoneMetric && { displayMode: 'zone' as const, zones: DEFAULT_ZONES }),
  };

  if (hasValue) {
    trackable.valueBaseline = val as number;
    trackable.valueCurrent = val as number;

    // Goal-driven numeric target — pulls from goalLevel* fields when a
    // stated goal applies to this detail. This is the "lose 10kg →
    // target weight = current − 10" wiring that was missing before.
    const age = parseInt(String(formData?.dateOfBirth ?? ''), 10);
    const ageInYears = computeAge(formData?.dateOfBirth);
    const goalTarget = resolveGoalTarget({
      category,
      detail,
      formData,
      gender: formData?.gender,
      age: Number.isFinite(ageInYears) ? ageInYears : Number.isFinite(age) ? age : undefined,
    });
    if (goalTarget) {
      trackable.valueTarget = goalTarget.valueTarget;
    }
  }

  return [trackable];
}

function resolveSynthesisTrackables(
  block: RoadmapBlock,
  scores: ScoreSummary,
  ambition: number,
): Trackable[] {
  const desc = (block.finding || block.description).toLowerCase();
  const trackables: Trackable[] = [];
  for (const cat of scores.categories) {
    if (desc.includes(cat.title.toLowerCase()) || desc.includes(cat.id.toLowerCase())) {
      trackables.push({
        id: cat.id,
        label: cat.title,
        baseline: cat.score,
        target: targetForDetail({ id: cat.id, label: cat.title, value: cat.score, score: cat.score }, ambition),
        current: cat.score,
      });
    }
  }
  return trackables;
}

function computeAge(dob: string | undefined): number {
  if (!dob) return NaN;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return NaN;
  const ms = Date.now() - d.getTime();
  return Math.floor(ms / (365.25 * 24 * 60 * 60 * 1000));
}
