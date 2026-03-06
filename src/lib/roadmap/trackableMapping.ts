import type { ScoreSummary, ScoreDetail } from '@/lib/scoring/types';
import type { RoadmapBlock, Trackable } from './types';

const LIFESTYLE_ZONE_IDS = new Set(['sleep', 'stress', 'nutrition', 'hydration', 'activity']);

const DEFAULT_ZONES: Trackable['zones'] = [
  { min: 0, max: 40, color: 'red', label: 'Needs focus' },
  { min: 40, max: 70, color: 'amber', label: 'Building' },
  { min: 70, max: 100, color: 'green', label: 'Optimal' },
];

function targetForDetail(detail: ScoreDetail): number {
  if (detail.score >= 80) return 90;
  if (detail.score >= 60) return 80;
  if (detail.score >= 40) return 70;
  return 65;
}

export function resolveTrackables(block: RoadmapBlock, scores: ScoreSummary): Trackable[] {
  const categoryId = block.scoreCategoryId;
  const detailId = block.scoreDetailId;
  if (!categoryId || !detailId) {
    if (block.id.startsWith('syn-')) return resolveSynthesisTrackables(block, scores);
    return [];
  }
  const category = scores.categories.find((c) => c.id === categoryId);
  if (!category) return [];
  const detail = category.details.find((d) => d.id === detailId);
  if (!detail || detail.score === 0) return [];
  const targetScore = targetForDetail(detail);
  const val = detail.value;
  const hasValue = detail.unit != null && typeof val === 'number' && !Number.isNaN(val);
  const isZoneMetric = categoryId === 'lifestyle' && LIFESTYLE_ZONE_IDS.has(detailId);
  const t: Trackable = {
    id: detail.id,
    label: detail.label,
    baseline: detail.score,
    target: targetScore,
    current: detail.score,
    unit: detail.unit,
    ...(isZoneMetric && { displayMode: 'zone' as const, zones: DEFAULT_ZONES }),
  };
  if (hasValue) {
    t.valueBaseline = val;
    t.valueCurrent = val;
  }
  return [t];
}

function resolveSynthesisTrackables(block: RoadmapBlock, scores: ScoreSummary): Trackable[] {
  const desc = (block.finding || block.description).toLowerCase();
  const trackables: Trackable[] = [];
  for (const cat of scores.categories) {
    if (desc.includes(cat.title.toLowerCase()) || desc.includes(cat.id.toLowerCase())) {
      trackables.push({
        id: cat.id,
        label: cat.title,
        baseline: cat.score,
        target: targetForDetail({ id: cat.id, label: cat.title, value: cat.score, score: cat.score }),
        current: cat.score,
      });
    }
  }
  return trackables;
}
