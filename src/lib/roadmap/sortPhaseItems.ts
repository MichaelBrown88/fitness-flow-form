import type { RoadmapItem, RoadmapPhase, BlockUrgency, RoadmapCategory } from './types';

const URGENCY_ORDER: Record<BlockUrgency, number> = {
  critical: 0,
  prerequisite: 1,
  parallel: 2,
  optional: 3,
};

const CATEGORY_ORDER: Record<RoadmapCategory, number> = {
  bodyComp: 0,
  cardio: 1,
  strength: 2,
  movementQuality: 3,
  lifestyle: 4,
  general: 5,
};

/**
 * Sorts items within a phase so critical/prerequisite come first, then by category,
 * then by existing order. Use after adding or moving items into a phase.
 */
export function sortPhaseItems(items: RoadmapItem[]): RoadmapItem[] {
  return [...items].sort((a, b) => {
    const uA = URGENCY_ORDER[a.urgency ?? 'optional'];
    const uB = URGENCY_ORDER[b.urgency ?? 'optional'];
    if (uA !== uB) return uA - uB;
    const cA = CATEGORY_ORDER[a.category];
    const cB = CATEGORY_ORDER[b.category];
    if (cA !== cB) return cA - cB;
    return 0;
  });
}
