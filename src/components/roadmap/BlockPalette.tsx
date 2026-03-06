import { useMemo } from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { RoadmapBlock, RoadmapCategory } from '@/lib/roadmap/types';
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
}

export function BlockPalette({ blocks }: BlockPaletteProps) {
  const grouped = useMemo(() => {
    const map = new Map<RoadmapCategory, RoadmapBlock[]>();
    for (const c of CATEGORY_ORDER) map.set(c, []);
    for (const b of blocks) {
      const list = map.get(b.category) ?? [];
      list.push(b);
      map.set(b.category, list);
    }
    return map;
  }, [blocks]);

  const activeCategories = CATEGORY_ORDER.filter((c) => (grouped.get(c)?.length ?? 0) > 0);
  const allIds = blocks.map((b) => b.id);

  return (
    <div className="space-y-4">
      <div className="space-y-0.5">
        <h3 className="text-sm font-bold text-slate-800">Available metrics</h3>
        <p className="text-[11px] text-slate-500">Drag items into the journey timeline to build the roadmap</p>
      </div>

      <SortableContext items={allIds} strategy={verticalListSortingStrategy}>
        {activeCategories.map((category) => {
          const items = grouped.get(category) ?? [];
          const label = CATEGORY_LABELS[category];
          return (
            <div key={category}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  {label}
                </span>
                <span className="text-[10px] text-slate-400">({items.length})</span>
              </div>
              <div className="space-y-1.5 mb-4">
                {items.map((block) => (
                  <BlockCard key={block.id} block={block} variant="palette" />
                ))}
              </div>
            </div>
          );
        })}
      </SortableContext>

      {blocks.length === 0 && (
        <p className="text-xs text-slate-400 text-center py-6">
          No metrics to add. Complete an assessment first.
        </p>
      )}
    </div>
  );
}
