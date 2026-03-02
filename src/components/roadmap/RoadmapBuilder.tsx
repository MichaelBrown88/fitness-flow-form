import { useState, useCallback, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable';
import { Sparkles, Loader2, Send, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { RoadmapBlock, RoadmapItem, RoadmapPhase } from '@/lib/roadmap/types';
import { PHASE_NARRATIVES } from '@/lib/roadmap/types';
import { BlockPalette } from './BlockPalette';
import { BuilderTimeline } from './BuilderTimeline';
import { BlockCard } from './BlockCard';

const PHASES: RoadmapPhase[] = ['foundation', 'development', 'performance'];

function blockToItem(block: RoadmapBlock, phase: RoadmapPhase): RoadmapItem {
  return {
    id: block.id, title: block.title, description: block.description, category: block.category,
    phase, targetWeeks: block.targetWeeks, status: 'not_started', priority: 0, source: 'auto',
    finding: block.finding, rationale: block.rationale, action: block.action,
    urgency: block.urgency, icon: block.icon, contraindications: block.contraindications, score: block.score,
    trackables: block.trackables,
  };
}

export function generateRoadmapSummary(clientName: string, goals: string[], items: RoadmapItem[], totalWeeks: number): string {
  const phaseCount = new Set(items.map((i) => i.phase)).size;
  const goalLabels: Record<string, string> = {
    'weight-loss': 'weight loss', 'build-muscle': 'muscle building', 'build-strength': 'strength',
    'body-recomposition': 'body recomposition', 'improve-fitness': 'fitness', 'improve-mobility': 'mobility',
    'improve-posture': 'posture improvement', 'reduce-stress': 'stress reduction',
    'general-health': 'general health', 'sport-performance': 'sport performance', 'rehabilitation': 'rehabilitation',
  };
  const goalText = goals.slice(0, 2).map((g) => goalLabels[g] || g).join(' and ');
  const foundationItems = items.filter((i) => i.phase === 'foundation');
  const hasFoundation = foundationItems.length > 0;
  const focusText = hasFoundation
    ? `Starting with ${PHASE_NARRATIVES.foundation.title.toLowerCase()} work before progressing to full training.`
    : 'No major restrictions — progressing across all areas from day one.';
  return `${clientName}'s personalised ${totalWeeks}-week journey across ${phaseCount} phase${phaseCount > 1 ? 's' : ''} with ${items.length} milestones${goalText ? `, focused on ${goalText}` : ''}. ${focusText}`;
}

interface Props {
  clientName: string;
  blocks: RoadmapBlock[];
  clientGoals: string[];
  onCreate: (items: RoadmapItem[], summary: string) => Promise<void>;
  onAcceptAndSend?: (items: RoadmapItem[], summary: string) => Promise<void>;
  saving?: boolean;
}

export function RoadmapBuilder({ clientName, blocks, clientGoals, onCreate, onAcceptAndSend, saving }: Props) {
  const [customising, setCustomising] = useState(false);
  const [paletteBlocks, setPaletteBlocks] = useState<RoadmapBlock[]>([]);
  const [timeline, setTimeline] = useState(() => {
    const m = new Map<RoadmapPhase, RoadmapItem[]>(PHASES.map((p) => [p, []]));
    for (const block of blocks) m.get(block.phase)!.push(blockToItem(block, block.phase));
    return m;
  });
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const allItems = useMemo(() => PHASES.flatMap((p) => timeline.get(p) ?? []), [timeline]);
  const totalWeeks = useMemo(() => (allItems.length > 0 ? Math.max(...allItems.map((i) => i.targetWeeks)) : 0), [allItems]);
  const summaryText = useMemo(() => generateRoadmapSummary(clientName, clientGoals, allItems, totalWeeks), [clientName, clientGoals, allItems, totalWeeks]);

  const findContainer = useCallback((id: string): string | null => {
    if (paletteBlocks.some((b) => b.id === id)) return 'palette';
    for (const [phase, items] of timeline) { if (items.some((i) => i.id === id)) return `phase-${phase}`; }
    return null;
  }, [paletteBlocks, timeline]);

  const activeBlock = useMemo(() => {
    if (!activeId) return null;
    return paletteBlocks.find((b) => b.id === activeId) ?? allItems.find((i) => i.id === activeId) ?? null;
  }, [activeId, paletteBlocks, allItems]);

  const handleDragStart = useCallback((e: DragStartEvent) => setActiveId(String(e.active.id)), []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;
    const src = findContainer(String(active.id));
    const overId = String(over.id);
    const target = PHASES.find((p) => overId === `phase-${p}` || findContainer(overId) === `phase-${p}`);
    if (src === 'palette' && target) {
      const block = paletteBlocks.find((b) => b.id === active.id);
      if (!block) return;
      setPaletteBlocks((prev) => prev.filter((b) => b.id !== active.id));
      setTimeline((prev) => { const n = new Map(prev); n.set(target, [...(n.get(target) ?? []), blockToItem(block, target)]); return n; });
    } else if (src?.startsWith('phase-') && target) {
      const srcPhase = src.replace('phase-', '') as RoadmapPhase;
      setTimeline((prev) => {
        const n = new Map(prev);
        if (srcPhase === target) {
          const list = [...(n.get(target) ?? [])];
          const a = list.findIndex((i) => i.id === active.id), b = list.findIndex((i) => i.id === over.id);
          if (a !== -1 && b !== -1) n.set(target, arrayMove(list, a, b));
        } else {
          const srcList = [...(n.get(srcPhase) ?? [])]; const idx = srcList.findIndex((i) => i.id === active.id);
          if (idx !== -1) { const [moved] = srcList.splice(idx, 1); moved.phase = target; n.set(srcPhase, srcList); n.set(target, [...(n.get(target) ?? []), moved]); }
        }
        return n;
      });
    }
  }, [findContainer, paletteBlocks]);

  const handleDelete = useCallback((id: string) => {
    for (const phase of PHASES) {
      const items = timeline.get(phase) ?? [];
      if (items.some((i) => i.id === id)) {
        setTimeline((prev) => { const n = new Map(prev); n.set(phase, items.filter((i) => i.id !== id)); return n; });
        const original = blocks.find((b) => b.id === id);
        if (original) setPaletteBlocks((prev) => [...prev, original]);
        return;
      }
    }
  }, [timeline, blocks]);

  const buildPayload = useCallback(() => {
    const items = allItems.map((item, i) => ({ ...item, priority: i + 1 }));
    return { items, summary: summaryText };
  }, [allItems, summaryText]);

  const handleAcceptAndSend = useCallback(async () => {
    const { items, summary } = buildPayload();
    if (items.length === 0) return;
    if (onAcceptAndSend) await onAcceptAndSend(items, summary);
    else await onCreate(items, summary);
  }, [buildPayload, onAcceptAndSend, onCreate]);

  const handleConfirmCreate = useCallback(async () => {
    const { items, summary } = buildPayload();
    if (items.length === 0) return;
    await onCreate(items, summary);
  }, [buildPayload, onCreate]);

  if (!customising) {
    return (
      <div className="space-y-6">
        <div className="text-center py-4">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 mb-3">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{clientName}&apos;s Suggested Roadmap</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">{summaryText}</p>
        </div>
        <div className="max-w-3xl mx-auto">
          <BuilderTimeline timelineItems={timeline} onDelete={handleDelete} />
        </div>
        <div className="sticky bottom-4 z-10 max-w-3xl mx-auto">
          <div className="rounded-2xl bg-white/90 backdrop-blur-sm border border-slate-200 shadow-lg p-4 flex items-center justify-between gap-3">
            <div className="text-sm text-slate-600">
              <span className="font-semibold text-slate-900">{allItems.length}</span> milestones
              {totalWeeks > 0 && <span className="text-xs text-slate-400 ml-2">~{totalWeeks}w</span>}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setCustomising(true)} className="gap-1.5">
                <Pencil className="h-3.5 w-3.5" /> Customise
              </Button>
              <Button onClick={handleAcceptAndSend} disabled={allItems.length === 0 || saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Accept & Send
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-6">
        <div className="text-center py-4">
          <h1 className="text-2xl font-bold text-slate-900">Customise {clientName}&apos;s Roadmap</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">Drag items between phases or remove items you don&apos;t want to include.</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 lg:max-h-[80vh] lg:overflow-y-auto lg:pr-2 lg:sticky lg:top-4">
            <BlockPalette blocks={paletteBlocks} />
          </div>
          <div className="lg:col-span-3">
            <BuilderTimeline timelineItems={timeline} onDelete={handleDelete} />
          </div>
        </div>
        <div className="sticky bottom-4 z-10">
          <div className="rounded-2xl bg-white/90 backdrop-blur-sm border border-slate-200 shadow-lg p-4 flex items-center justify-between">
            <div className="text-sm text-slate-600">
              <span className="font-semibold text-slate-900">{allItems.length}</span> milestones
              {totalWeeks > 0 && <span className="text-xs text-slate-400 ml-2">~{totalWeeks}w</span>}
            </div>
            <Button onClick={handleConfirmCreate} disabled={allItems.length === 0 || saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Confirm & Create
            </Button>
          </div>
        </div>
      </div>
      <DragOverlay>{activeBlock ? <BlockCard block={activeBlock} variant="palette" /> : null}</DragOverlay>
    </DndContext>
  );
}
