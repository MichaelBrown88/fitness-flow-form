import { useMemo } from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Target } from 'lucide-react';
import type { RoadmapBlock, RoadmapCategory } from '@/lib/roadmap/types';
import { bucketBlocksByGoalRelevance, getGoalLabel } from '@/lib/roadmap/goalRelevance';
import { BlockCard } from './BlockCard';

const CATEGORY_ORDER: RoadmapCategory[] = ['bodyComp', 'cardio', 'strength', 'movementQuality', 'lifestyle', 'general'];
const CATEGORY_LABELS: Record<RoadmapCategory, string> = {
  bodyComp: 'Body composition',
  cardio: 'Cardio',
  strength: 'Strength',
  movementQuality: 'Movement',
  lifestyle: 'Lifestyle',
  general: 'General',
};

interface BlockPaletteProps {
  blocks: RoadmapBlock[];
  /** Client's stated goals — when present, palette splits into a
   *  goal-specific top section and a supporting "other metrics" section.
   *  Without goals, falls back to a single pillar-grouped list. */
  clientGoals?: string[];
}

export function BlockPalette({ blocks, clientGoals = [] }: BlockPaletteProps) {
  const { goalSpecific, supporting } = useMemo(
    () => bucketBlocksByGoalRelevance(blocks, clientGoals),
    [blocks, clientGoals],
  );

  const groupedSupporting = useMemo(() => {
    const map = new Map<RoadmapCategory, RoadmapBlock[]>();
    for (const c of CATEGORY_ORDER) map.set(c, []);
    for (const b of supporting) {
      const list = map.get(b.category) ?? [];
      list.push(b);
      map.set(b.category, list);
    }
    return map;
  }, [supporting]);

  const groupedGoalSpecific = useMemo(() => {
    const map = new Map<RoadmapCategory, RoadmapBlock[]>();
    for (const c of CATEGORY_ORDER) map.set(c, []);
    for (const b of goalSpecific) {
      const list = map.get(b.category) ?? [];
      list.push(b);
      map.set(b.category, list);
    }
    return map;
  }, [goalSpecific]);

  const supportingActiveCategories = CATEGORY_ORDER.filter(
    (c) => (groupedSupporting.get(c)?.length ?? 0) > 0,
  );
  const goalActiveCategories = CATEGORY_ORDER.filter(
    (c) => (groupedGoalSpecific.get(c)?.length ?? 0) > 0,
  );

  const allIds = blocks.map((b) => b.id);
  const goalsLabel = clientGoals.map(getGoalLabel).join(', ');
  const showGoalSection = clientGoals.length > 0 && goalSpecific.length > 0;

  return (
    <div className="space-y-4">
      <div className="space-y-0.5">
        <h3 className="text-sm font-bold text-foreground">Available metrics</h3>
        <p className="text-[11px] text-muted-foreground">
          Drag items into the journey timeline to build the roadmap
        </p>
      </div>

      <SortableContext items={allIds} strategy={verticalListSortingStrategy}>
        {showGoalSection && (
          <section className="space-y-3 rounded-xl border border-foreground/10 bg-foreground/[0.02] p-3">
            <header className="flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5 text-foreground" aria-hidden />
              <span className="text-[10px] font-bold uppercase tracking-[0.10em] text-foreground">
                For {goalsLabel}
              </span>
              <span className="text-[10px] text-muted-foreground">({goalSpecific.length})</span>
            </header>
            {goalActiveCategories.map((category) => {
              const items = groupedGoalSpecific.get(category) ?? [];
              const label = CATEGORY_LABELS[category];
              return (
                <div key={`goal-${category}`}>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {label}
                  </p>
                  <div className="space-y-1.5">
                    {items.map((block) => (
                      <BlockCard key={block.id} block={block} variant="palette" />
                    ))}
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {supportingActiveCategories.length > 0 && (
          <section className="space-y-3">
            {showGoalSection && (
              <header className="flex items-center gap-1.5 pt-1">
                <span className="text-[10px] font-bold uppercase tracking-[0.10em] text-muted-foreground">
                  Other metrics
                </span>
                <span className="text-[10px] text-muted-foreground">({supporting.length})</span>
              </header>
            )}
            {supportingActiveCategories.map((category) => {
              const items = groupedSupporting.get(category) ?? [];
              const label = CATEGORY_LABELS[category];
              return (
                <div key={`other-${category}`}>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      {label}
                    </span>
                    <span className="text-[10px] text-muted-foreground">({items.length})</span>
                  </div>
                  <div className="mb-3 space-y-1.5">
                    {items.map((block) => (
                      <BlockCard key={block.id} block={block} variant="palette" />
                    ))}
                  </div>
                </div>
              );
            })}
          </section>
        )}
      </SortableContext>

      {blocks.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-6">
          No metrics to add. Complete an assessment first.
        </p>
      )}
    </div>
  );
}
