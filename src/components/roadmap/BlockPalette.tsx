import { useMemo } from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { RoadmapBlock, BlockUrgency } from '@/lib/roadmap/types';
import { URGENCY_META } from '@/lib/roadmap/types';
import { BlockCard } from './BlockCard';

const URGENCY_ORDER: BlockUrgency[] = ['critical', 'prerequisite', 'parallel', 'optional'];

interface BlockPaletteProps {
  blocks: RoadmapBlock[];
}

export function BlockPalette({ blocks }: BlockPaletteProps) {
  const grouped = useMemo(() => {
    const map = new Map<BlockUrgency, RoadmapBlock[]>();
    for (const u of URGENCY_ORDER) map.set(u, []);
    for (const b of blocks) {
      const list = map.get(b.urgency) ?? [];
      list.push(b);
      map.set(b.urgency, list);
    }
    return map;
  }, [blocks]);

  const activeGroups = URGENCY_ORDER.filter((u) => (grouped.get(u)?.length ?? 0) > 0);
  const allIds = blocks.map((b) => b.id);

  return (
    <div className="space-y-4">
      <div className="space-y-0.5">
        <h3 className="text-sm font-bold text-slate-800">Assessment Findings</h3>
        <p className="text-[11px] text-slate-500">Drag items into the journey timeline to build the roadmap</p>
      </div>

      <SortableContext items={allIds} strategy={verticalListSortingStrategy}>
        {activeGroups.map((urgency) => {
          const items = grouped.get(urgency) ?? [];
          const meta = URGENCY_META[urgency];
          return (
            <div key={urgency}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`h-2 w-2 rounded-full ${meta.dot}`} />
                <span className={`text-[10px] font-black uppercase tracking-[0.15em] ${meta.color}`}>
                  {meta.label}
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
          No findings to display. Complete an assessment first.
        </p>
      )}
    </div>
  );
}
