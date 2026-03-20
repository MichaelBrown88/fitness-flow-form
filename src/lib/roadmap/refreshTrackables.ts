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
 * Snaps the baseline of each trackable to its current value for items in a
 * specific phase. Call this when the client advances to a new phase so that
 * drift detection and progress bars measure against the new starting point.
 */
export function snapTrackableBaselines(
  items: RoadmapItem[],
  phase: string,
): RoadmapItem[] {
  return items.map((item) => {
    if (item.phase !== phase || !item.trackables?.length) return item;
    const snapped = item.trackables.map((t) => ({
      ...t,
      baseline: t.current,
      ...(t.valueCurrent != null ? { valueBaseline: t.valueCurrent } : {}),
    }));
    return { ...item, trackables: snapped };
  });
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
      const mergedT: Trackable = {
        ...t,
        baseline: prev?.baseline ?? t.baseline,
        target: prev?.target ?? t.target,
        current: t.current,
      };
      if (t.valueCurrent != null) mergedT.valueCurrent = t.valueCurrent;
      if (t.valueBaseline != null)
        mergedT.valueBaseline = prev?.valueBaseline ?? t.valueBaseline;
      if (t.valueTarget != null || prev?.valueTarget != null)
        mergedT.valueTarget = prev?.valueTarget ?? t.valueTarget ?? undefined;
      return mergedT;
    });
    return { ...item, trackables: merged };
  });
}
