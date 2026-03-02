import type { ScoreSummary, ScoreDetail } from '@/lib/scoring/types';
import type { RoadmapBlock, Trackable } from './types';

const BLOCK_DETAIL_MAP: Record<string, string[]> = {
  'mq-pain': ['posture', 'movement', 'mobility'],
  'mq-upper_crossed': ['posture', 'movement'],
  'mq-lower_crossed': ['posture', 'movement'],
  'mq-knee_valgus': ['posture', 'movement'],
  'mq-posterior_pelvic_tilt': ['posture', 'movement'],
  'mq-feet_pronation': ['posture', 'movement'],
  'mq-mobility': ['mobility'],
  'mq-patterns': ['movement'],
  'cat-cardio': ['rhr', 'hrr', 'hr60', 'vo2'],
  'cat-strength': ['pushups', 'squats', 'plank', 'grip'],
  'cat-bodyComp': ['bf', 'smm', 'visceral', 'whr'],
  'ls-sleep': ['sleep'],
  'ls-stress': ['stress'],
  'ls-nutrition': ['nutrition'],
  'ls-activity': ['activity'],
  'ls-hydration': ['hydration'],
};

const CATEGORY_FALLBACK: Record<string, string> = {
  movementQuality: 'movementQuality',
  cardio: 'cardio',
  strength: 'strength',
  bodyComp: 'bodyComp',
  lifestyle: 'lifestyle',
};

function targetForDetail(detail: ScoreDetail): number {
  if (detail.score >= 80) return 90;
  if (detail.score >= 60) return 80;
  if (detail.score >= 40) return 70;
  return 65;
}

export function resolveTrackables(block: RoadmapBlock, scores: ScoreSummary): Trackable[] {
  const detailIds = BLOCK_DETAIL_MAP[block.id];
  const categoryId = CATEGORY_FALLBACK[block.category];
  const category = scores.categories.find((c) => c.id === categoryId);

  if (!category) {
    if (block.id.startsWith('syn-')) return resolveSynthesisTrackables(block, scores);
    return [];
  }

  if (detailIds) {
    return category.details
      .filter((d) => detailIds.includes(d.id) && d.score > 0)
      .map((d) => ({
        id: d.id,
        label: d.label,
        baseline: d.score,
        target: targetForDetail(d),
        current: d.score,
        unit: d.unit,
      }));
  }

  return category.details
    .filter((d) => d.score > 0 && d.score < 90)
    .map((d) => ({
      id: d.id,
      label: d.label,
      baseline: d.score,
      target: targetForDetail(d),
      current: d.score,
      unit: d.unit,
    }));
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
