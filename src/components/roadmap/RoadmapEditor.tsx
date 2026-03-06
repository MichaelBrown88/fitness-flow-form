import React, { useState, useCallback, useMemo } from 'react';
import {
  DndContext, DragOverlay, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable';
import type { RoadmapItem, RoadmapPhase, RoadmapBlock } from '@/lib/roadmap/types';
import { PhaseDropZone } from './PhaseDropZone';
import { BlockCard } from './BlockCard';
import { BlockPalette } from './BlockPalette';

const PHASES: RoadmapPhase[] = ['foundation', 'development', 'performance'];

function blockToItem(block: RoadmapBlock, phase: RoadmapPhase): RoadmapItem {
  return {
    id: block.id,
    title: block.title,
    description: block.description,
    category: block.category,
    phase,
    targetWeeks: block.targetWeeks,
    status: 'not_started',
    priority: 0,
    source: 'coach',
    finding: block.finding,
    rationale: block.rationale,
    action: block.action,
    urgency: block.urgency,
    icon: block.icon,
    contraindications: block.contraindications,
    score: block.score,
    trackables: block.trackables,
    scoreDetailId: block.scoreDetailId,
    scoreCategoryId: block.scoreCategoryId,
  };
}

interface RoadmapEditorProps {
  summary: string;
  items: RoadmapItem[];
  onSummaryChange: (summary: string) => void;
  onItemsChange: (items: RoadmapItem[]) => void;
  saving?: boolean;
  generatedBlocks?: RoadmapBlock[];
  allPossibleBlocks?: RoadmapBlock[];
}

export const RoadmapEditor: React.FC<RoadmapEditorProps> = ({
  summary,
  items,
  onSummaryChange,
  onItemsChange,
  saving,
  generatedBlocks = [],
  allPossibleBlocks = [],
}) => {
  const [localSummary, setLocalSummary] = useState(summary);
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const itemIds = useMemo(() => new Set(items.map((i) => i.id)), [items]);
  const blocksForPalette = allPossibleBlocks.length > 0 ? allPossibleBlocks : generatedBlocks;
  const paletteBlocks = useMemo(
    () => blocksForPalette.filter((b) => !itemIds.has(b.id)),
    [blocksForPalette, itemIds],
  );

  const grouped = useMemo(() => {
    const map = new Map<RoadmapPhase, RoadmapItem[]>();
    for (const p of PHASES) map.set(p, []);
    for (const item of items) {
      const list = map.get(item.phase) ?? [];
      list.push(item);
      map.set(item.phase, list);
    }
    return map;
  }, [items]);

  const displayPhases = useMemo(() => {
    const active = PHASES.filter((p) => (grouped.get(p)?.length ?? 0) > 0);
    return active.length > 0 ? active : ['foundation' as RoadmapPhase];
  }, [grouped]);

  const findContainer = useCallback(
    (id: string): string | null => {
      if (paletteBlocks.some((b) => b.id === id)) return 'palette';
      for (const [phase, list] of grouped) {
        if (list.some((i) => i.id === id)) return `phase-${phase}`;
      }
      return null;
    },
    [grouped, paletteBlocks],
  );

  const findPhase = useCallback((id: string): RoadmapPhase | null => {
    for (const [phase, list] of grouped) {
      if (list.some((i) => i.id === id)) return phase;
    }
    return null;
  }, [grouped]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      if (!over) return;
      const src = findContainer(String(active.id));
      const overId = String(over.id);
      const target = PHASES.find((p) => overId === `phase-${p}`) ?? findPhase(overId);
      if (src === 'palette' && target) {
        const block = blocksForPalette.find((b) => b.id === active.id);
        if (!block) return;
        const newItem = blockToItem(block, target);
        const newItems = [...items, newItem].map((i, idx) => ({ ...i, priority: idx + 1 }));
        onItemsChange(newItems);
        return;
      }
      if (!src?.startsWith('phase-') || !target) return;
      const srcPhase = src.replace('phase-', '') as RoadmapPhase;
      if (srcPhase === target) {
        const list = [...(grouped.get(target) ?? [])];
        const a = list.findIndex((i) => i.id === active.id);
        const b = list.findIndex((i) => i.id === over.id);
        if (a !== -1 && b !== -1 && a !== b) {
          const reordered = arrayMove(list, a, b);
          const byPhase = new Map(PHASES.map((p) => [p, p === target ? reordered : (grouped.get(p) ?? [])]));
          const flat = PHASES.flatMap((p) => byPhase.get(p) ?? []);
          onItemsChange(flat.map((i, idx) => ({ ...i, priority: idx + 1 })));
        }
      } else {
        onItemsChange(
          items.map((i) => (i.id === active.id ? { ...i, phase: target } : i)).map((i, idx) => ({ ...i, priority: idx + 1 })),
        );
      }
    },
    [findContainer, findPhase, blocksForPalette, grouped, items, onItemsChange],
  );

  const handleDelete = useCallback((id: string) => onItemsChange(items.filter((i) => i.id !== id)), [items, onItemsChange]);
  const handleUpdate = useCallback((id: string, u: Partial<RoadmapItem>) => onItemsChange(items.map((i) => (i.id === id ? { ...i, ...u } : i))), [items, onItemsChange]);

  const activeBlock = useMemo(() => {
    if (!activeId) return null;
    return blocksForPalette.find((b) => b.id === activeId) ?? items.find((i) => i.id === activeId) ?? null;
  }, [activeId, blocksForPalette, items]);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={(e) => setActiveId(String(e.active.id))} onDragEnd={handleDragEnd}>
      <div className="space-y-6">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Journey Summary</label>
          <textarea
            value={localSummary}
            onChange={(e) => setLocalSummary(e.target.value)}
            onBlur={() => {
              if (localSummary !== summary) onSummaryChange(localSummary);
            }}
            placeholder="High-level overview of this client's journey..."
            className="w-full min-h-[72px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400 resize-y"
          />
          {saving && <p className="text-xs text-slate-400 font-medium animate-pulse">Saving...</p>}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {paletteBlocks.length > 0 && (
            <div className="lg:col-span-2 lg:max-h-[70vh] lg:overflow-y-auto lg:pr-2 lg:sticky lg:top-4">
              <BlockPalette blocks={paletteBlocks} />
            </div>
          )}
          <div className={paletteBlocks.length > 0 ? 'lg:col-span-3' : 'lg:col-span-full'}>
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800">Journey Timeline</h3>
              {displayPhases.map((phase, idx) => (
                <PhaseDropZone
                  key={phase}
                  phase={phase}
                  items={grouped.get(phase) ?? []}
                  phaseIndex={idx}
                  isLast={idx === displayPhases.length - 1}
                  onDelete={handleDelete}
                  onEdit={handleUpdate}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      <DragOverlay>
        {activeBlock ? (
          <BlockCard
            block={activeBlock}
            variant={items.some((i) => i.id === activeId) ? 'timeline' : 'palette'}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
