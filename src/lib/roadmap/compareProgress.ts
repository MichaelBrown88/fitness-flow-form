import type { ScoreSummary, ScoreCategory } from '@/lib/scoring/types';
import type { RoadmapItem, RoadmapCategory, ProgressSuggestion } from './types';

const CATEGORY_MAP: Record<RoadmapCategory, ScoreCategory['id'] | null> = {
  bodyComp: 'bodyComp',
  movementQuality: 'movementQuality',
  strength: 'strength',
  cardio: 'cardio',
  lifestyle: 'lifestyle',
  general: null,
};

const ACHIEVED_THRESHOLD = 75;
const PROGRESS_THRESHOLD = 5;

function findCategoryScore(scores: ScoreSummary, category: ScoreCategory['id']): number {
  return scores.categories.find((c) => c.id === category)?.score ?? 0;
}

export function compareRoadmapProgress(
  previousScores: ScoreSummary,
  newScores: ScoreSummary,
  items: RoadmapItem[],
): ProgressSuggestion[] {
  const suggestions: ProgressSuggestion[] = [];

  for (const item of items) {
    if (item.status === 'achieved') continue;

    const scoreCategoryId = CATEGORY_MAP[item.category];
    if (!scoreCategoryId) continue;

    const oldScore = findCategoryScore(previousScores, scoreCategoryId);
    const newScore = findCategoryScore(newScores, scoreCategoryId);
    const delta = newScore - oldScore;

    if (newScore >= ACHIEVED_THRESHOLD && oldScore < ACHIEVED_THRESHOLD) {
      suggestions.push({
        itemId: item.id,
        itemTitle: item.title,
        currentStatus: item.status,
        suggestedStatus: 'achieved',
        reason: `Score improved from ${oldScore} to ${newScore} (above ${ACHIEVED_THRESHOLD} threshold)`,
        scoreDelta: delta,
      });
    } else if (delta >= PROGRESS_THRESHOLD && item.status === 'not_started') {
      suggestions.push({
        itemId: item.id,
        itemTitle: item.title,
        currentStatus: item.status,
        suggestedStatus: 'in_progress',
        reason: `Score improved by ${delta} points (${oldScore} → ${newScore})`,
        scoreDelta: delta,
      });
    } else if (delta < -PROGRESS_THRESHOLD) {
      suggestions.push({
        itemId: item.id,
        itemTitle: item.title,
        currentStatus: item.status,
        suggestedStatus: 'adjusted',
        reason: `Score decreased by ${Math.abs(delta)} points — may need adjustment`,
        scoreDelta: delta,
      });
    }
  }

  return suggestions;
}

export function applyProgressSuggestions(
  items: RoadmapItem[],
  accepted: Set<string>,
  suggestions: ProgressSuggestion[],
): RoadmapItem[] {
  const suggestionMap = new Map(suggestions.map((s) => [s.itemId, s]));

  return items.map((item) => {
    const suggestion = suggestionMap.get(item.id);
    if (!suggestion || !accepted.has(item.id)) return item;
    return { ...item, status: suggestion.suggestedStatus };
  });
}
