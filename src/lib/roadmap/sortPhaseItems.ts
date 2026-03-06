import type { RoadmapItem, BlockUrgency, RoadmapCategory, RoadmapPhase } from './types';
import { getClientUrgency } from './types';

const CLIENT_URGENCY_ORDER: Record<ReturnType<typeof getClientUrgency>, number> = {
  foundation: 0,
  growth: 1,
  optimisation: 2,
};

const PHASE_ORDER: Record<RoadmapPhase, number> = {
  foundation: 0,
  development: 1,
  performance: 2,
};

export const CATEGORY_ORDER: Record<RoadmapCategory, number> = {
  bodyComp: 0,
  cardio: 1,
  strength: 2,
  movementQuality: 3,
  lifestyle: 4,
  general: 5,
};

/**
 * Sorts items within a phase by priority (coach's custom order).
 * Lower priority number = higher in list. Use priority from drag-and-drop.
 */
export function sortPhaseItems(items: RoadmapItem[]): RoadmapItem[] {
  return [...items].sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));
}

/**
 * Suggested order: phase → urgency (foundation/growth/optimisation) → category.
 * Use when coach wants the system to suggest ordering (no custom prioritisation).
 */
export function suggestedOrderComparator(a: RoadmapItem, b: RoadmapItem): number {
  const pA = PHASE_ORDER[a.phase];
  const pB = PHASE_ORDER[b.phase];
  if (pA !== pB) return pA - pB;
  const uA = CLIENT_URGENCY_ORDER[getClientUrgency((a.urgency ?? 'optional') as BlockUrgency)];
  const uB = CLIENT_URGENCY_ORDER[getClientUrgency((b.urgency ?? 'optional') as BlockUrgency)];
  if (uA !== uB) return uA - uB;
  const cA = CATEGORY_ORDER[a.category];
  const cB = CATEGORY_ORDER[b.category];
  if (cA !== cB) return cA - cB;
  return 0;
}

/**
 * Applies suggested order (urgency-based) and reassigns priority 1..n.
 * Call when coach clicks "Order by urgency" to reset custom ordering.
 */
export function applySuggestedOrder(items: RoadmapItem[]): RoadmapItem[] {
  const sorted = [...items].sort(suggestedOrderComparator);
  return sorted.map((item, idx) => ({ ...item, priority: idx + 1 }));
}

/** Groups phase items by pillar (category) in CATEGORY_ORDER. Items within each group stay sorted. */
export function groupPhaseItemsByPillar(items: RoadmapItem[]): Map<RoadmapCategory, RoadmapItem[]> {
  const sorted = sortPhaseItems(items);
  const map = new Map<RoadmapCategory, RoadmapItem[]>();
  for (const item of sorted) {
    const list = map.get(item.category) ?? [];
    list.push(item);
    map.set(item.category, list);
  }
  return map;
}
