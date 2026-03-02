import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { RoadmapItem, RoadmapPhase } from '@/lib/roadmap/types';
import { PHASE_NARRATIVES } from '@/lib/roadmap/types';
import { BlockCard } from './BlockCard';

const PHASE_DOT: Record<RoadmapPhase, string> = {
  foundation: 'bg-emerald-500',
  development: 'bg-blue-500',
  performance: 'bg-violet-500',
};

interface PhaseDropZoneProps {
  phase: RoadmapPhase;
  items: RoadmapItem[];
  phaseIndex: number;
  isLast: boolean;
  onDelete: (id: string) => void;
  onEdit: (id: string, updates: Partial<RoadmapItem>) => void;
}

export function PhaseDropZone({ phase, items, phaseIndex, isLast, onDelete, onEdit }: PhaseDropZoneProps) {
  const droppableId = `phase-${phase}`;
  const { isOver, setNodeRef } = useDroppable({ id: droppableId });
  const { title } = PHASE_NARRATIVES[phase];
  const itemIds = items.map((i) => i.id);

  return (
    <div className="relative">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-px flex-1 bg-slate-200" />
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200">
          <div className={`h-2 w-2 rounded-full ${PHASE_DOT[phase]}`} />
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
            Phase {phaseIndex + 1}: {title}
          </span>
        </div>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <div
        ref={setNodeRef}
        className={`rounded-xl border-2 border-dashed transition-colors min-h-[60px] p-2 space-y-2 mb-4 ${
          isOver ? 'border-indigo-400 bg-indigo-50/30' : 'border-slate-200 bg-slate-50/30'
        }`}
      >
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          {items.map((item) => (
            <BlockCard key={item.id} block={item} variant="timeline" onDelete={onDelete} onEdit={onEdit} />
          ))}
        </SortableContext>

        {items.length === 0 && (
          <p className="text-[11px] text-slate-400 text-center py-4">
            Drop blocks here for the {title.toLowerCase()} phase
          </p>
        )}
      </div>
    </div>
  );
}
