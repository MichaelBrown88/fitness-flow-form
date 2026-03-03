import type { ScoreSummary, ScoreDetail } from '@/lib/scoring/types';
import type { RoadmapBlock, Trackable } from './types';

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
  return [
    {
      id: detail.id,
      label: detail.label,
      baseline: detail.score,
      target: targetForDetail(detail),
      current: detail.score,
      unit: detail.unit,
    },
  ];
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
