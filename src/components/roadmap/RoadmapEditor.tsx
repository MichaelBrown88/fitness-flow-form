import React, { useState, useCallback, useMemo } from 'react';
import {
  DndContext, DragOverlay, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import type { RoadmapItem, RoadmapPhase, RoadmapBlock } from '@/lib/roadmap/types';
import { PhaseDropZone } from './PhaseDropZone';
import { BlockCard } from './BlockCard';

const PHASES: RoadmapPhase[] = ['foundation', 'development', 'performance'];

interface RoadmapEditorProps {
  summary: string;
  items: RoadmapItem[];
  onSummaryChange: (summary: string) => void;
  onItemsChange: (items: RoadmapItem[]) => void;
  saving?: boolean;
  generatedBlocks?: RoadmapBlock[];
}

export const RoadmapEditor: React.FC<RoadmapEditorProps> = ({ summary, items, onSummaryChange, onItemsChange, saving }) => {
  const [localSummary, setLocalSummary] = useState(summary);
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const grouped = useMemo(() => {
    const map = new Map<RoadmapPhase, RoadmapItem[]>();
    for (const p of PHASES) map.set(p, []);
    for (const item of items) { const l = map.get(item.phase) ?? []; l.push(item); map.set(item.phase, l); }
    return map;
  }, [items]);

  const displayPhases = useMemo(() => {
    const active = PHASES.filter((p) => (grouped.get(p)?.length ?? 0) > 0);
    return active.length > 0 ? active : ['foundation' as RoadmapPhase];
  }, [grouped]);

  const findPhase = useCallback((id: string): RoadmapPhase | null => {
    for (const [phase, list] of grouped) { if (list.some((i) => i.id === id)) return phase; }
    return null;
  }, [grouped]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;
    const src = findPhase(String(active.id));
    const tgt = PHASES.find((p) => String(over.id) === `phase-${p}`) ?? findPhase(String(over.id));
    if (!src || !tgt) return;
    if (src === tgt) {
      const list = [...(grouped.get(src) ?? [])];
      const a = list.findIndex((i) => i.id === active.id), b = list.findIndex((i) => i.id === over.id);
      if (a !== -1 && b !== -1 && a !== b) onItemsChange(items.map((i) => arrayMove(list, a, b).find((r) => r.id === i.id) ?? i).map((i, idx) => ({ ...i, priority: idx + 1 })));
    } else {
      onItemsChange(items.map((i) => (i.id === active.id ? { ...i, phase: tgt } : i)).map((i, idx) => ({ ...i, priority: idx + 1 })));
    }
  }, [findPhase, grouped, items, onItemsChange]);

  const handleDelete = useCallback((id: string) => onItemsChange(items.filter((i) => i.id !== id)), [items, onItemsChange]);
  const handleUpdate = useCallback((id: string, u: Partial<RoadmapItem>) => onItemsChange(items.map((i) => (i.id === id ? { ...i, ...u } : i))), [items, onItemsChange]);

  const handleAdd = useCallback((phase: RoadmapPhase) => {
    onItemsChange([...items, {
      id: crypto.randomUUID(), title: '', description: '', category: 'general', phase,
      targetWeeks: phase === 'foundation' ? 6 : phase === 'development' ? 10 : 8,
      status: 'not_started', priority: items.length + 1, source: 'coach',
    }]);
  }, [items, onItemsChange]);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={(e) => setActiveId(String(e.active.id))} onDragEnd={handleDragEnd}>
      <div className="space-y-6">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Journey Summary</label>
          <textarea
            value={localSummary} onChange={(e) => setLocalSummary(e.target.value)}
            onBlur={() => { if (localSummary !== summary) onSummaryChange(localSummary); }}
            placeholder="High-level overview of this client's journey..."
            className="w-full min-h-[72px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400 resize-y"
          />
          {saving && <p className="text-xs text-slate-400 font-medium animate-pulse">Saving...</p>}
        </div>
        {displayPhases.map((phase, idx) => (
          <div key={phase}>
            <PhaseDropZone phase={phase} items={grouped.get(phase) ?? []} phaseIndex={idx} isLast={idx === displayPhases.length - 1} onDelete={handleDelete} onEdit={handleUpdate} />
            <button type="button" onClick={() => handleAdd(phase)} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition py-1 mb-4">
              <Plus className="h-3.5 w-3.5" /> Add custom milestone
            </button>
          </div>
        ))}
      </div>
      <DragOverlay>{activeId ? <BlockCard block={items.find((i) => i.id === activeId)!} variant="timeline" /> : null}</DragOverlay>
    </DndContext>
  );
};
