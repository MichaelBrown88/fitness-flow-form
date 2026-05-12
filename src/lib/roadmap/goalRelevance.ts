/**
 * Bucket roadmap blocks by goal relevance — separates the metrics
 * directly tied to the client's stated goals from the broader supporting
 * pool (posture, mobility, lifestyle hygiene, etc.).
 *
 * Used by the ARC editor's BlockPalette so coaches see what matters for
 * the client's goals first, then everything else.
 */

import type { RoadmapBlock, RoadmapCategory } from './types';
import { GOAL_CATEGORY_MAP } from './generateBlocks';

const GOAL_LABEL: Record<string, string> = {
  'weight-loss': 'Weight loss',
  'build-muscle': 'Build muscle',
  'build-strength': 'Build strength',
  'body-recomposition': 'Body recomposition',
  'improve-fitness': 'Improve fitness',
  'improve-mobility': 'Improve mobility',
  'improve-posture': 'Improve posture',
  'reduce-stress': 'Reduce stress',
  'general-health': 'General health',
  'sport-performance': 'Sport performance',
  rehabilitation: 'Rehabilitation',
};

export function getGoalLabel(goal: string): string {
  return GOAL_LABEL[goal] ?? goal
    .replace(/[-_]/g, ' ')
    .split(' ')
    .map((w) => (w.length > 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
}

export function getRelevantCategoriesForGoals(goals: string[]): Set<RoadmapCategory> {
  const set = new Set<RoadmapCategory>();
  for (const g of goals) {
    const cats = GOAL_CATEGORY_MAP[g];
    if (cats) cats.forEach((c) => set.add(c));
  }
  return set;
}

export function bucketBlocksByGoalRelevance(
  blocks: RoadmapBlock[],
  goals: string[],
): { goalSpecific: RoadmapBlock[]; supporting: RoadmapBlock[] } {
  if (!goals || goals.length === 0) {
    return { goalSpecific: [], supporting: blocks };
  }
  const relevantCats = getRelevantCategoriesForGoals(goals);
  const goalSpecific: RoadmapBlock[] = [];
  const supporting: RoadmapBlock[] = [];
  for (const b of blocks) {
    if (relevantCats.has(b.category)) {
      goalSpecific.push(b);
    } else {
      supporting.push(b);
    }
  }
  return { goalSpecific, supporting };
}
