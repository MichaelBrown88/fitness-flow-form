import type { ScoreSummary } from '@/lib/scoring/types';
import type { RoadmapItem, RoadmapBlock, Trackable } from './types';
import { resolveTrackables } from './trackableMapping';

/**
 * Converts a RoadmapItem to a minimal block shape for resolveTrackables.
 */
function itemToBlockLike(item: RoadmapItem): RoadmapBlock {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    category: item.category,
    phase: item.phase,
    targetWeeks: item.targetWeeks,
    urgency: item.urgency ?? 'optional',
    blocksGoal: false,
    finding: item.finding ?? '',
    rationale: item.rationale ?? '',
    action: item.action ?? '',
    contraindications: item.contraindications ?? [],
    score: item.score ?? 0,
    icon: item.icon ?? 'Target',
    scoreCategoryId: item.scoreCategoryId,
    scoreDetailId: item.scoreDetailId,
  };
}

/**
 * Refreshes each item's trackables[].current from the latest assessment scores.
 * Preserves baseline and target from existing trackables so the client view shows
 * progress toward the original goals; only current is updated from scores.
 */
export function refreshTrackablesFromScores(
  items: RoadmapItem[],
  scores: ScoreSummary,
): RoadmapItem[] {
  return items.map((item) => {
    const fresh = resolveTrackables(itemToBlockLike(item), scores);
    if (fresh.length === 0) return item;
    const existing = item.trackables ?? [];
    const merged: Trackable[] = fresh.map((t) => {
      const prev = existing.find((e) => e.id === t.id);
      return {
        ...t,
        baseline: prev?.baseline ?? t.baseline,
        target: prev?.target ?? t.target,
        current: t.current,
      };
    });
    return { ...item, trackables: merged };
  });
}
