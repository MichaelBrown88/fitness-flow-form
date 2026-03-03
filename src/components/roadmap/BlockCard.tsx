import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, AlertTriangle, Info, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { Activity, Dumbbell, Heart, Move, Scale, Target } from 'lucide-react';
import type { RoadmapBlock, BlockUrgency, RoadmapItem } from '@/lib/roadmap/types';
import { URGENCY_META } from '@/lib/roadmap/types';
import { TrackableBar } from './TrackableBar';

const ICON_MAP: Record<string, React.ElementType> = {
  Activity, Dumbbell, Heart, Move, Scale, Target, AlertTriangle, Info,
};

function scoreColor(score: number): string {
  if (score >= 70) return 'text-emerald-600 bg-emerald-50';
  if (score >= 50) return 'text-amber-600 bg-amber-50';
  return 'text-red-600 bg-red-50';
}

type BlockData = RoadmapBlock | RoadmapItem;

interface BlockCardProps {
  block: BlockData;
  variant?: 'palette' | 'timeline';
  onDelete?: (id: string) => void;
  onEdit?: (id: string, updates: Partial<RoadmapItem>) => void;
}

export function BlockCard({ block, variant = 'palette', onDelete }: BlockCardProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });

  const style = { transform: CSS.Transform.toString(transform), transition };
  const urgency = (block as RoadmapBlock).urgency ?? (block as RoadmapItem).urgency ?? 'optional';
  const meta = URGENCY_META[urgency as BlockUrgency];
  const IconComp = ICON_MAP[block.icon ?? 'Target'] ?? Target;
  const finding = (block as RoadmapBlock).finding ?? (block as RoadmapItem).finding;
  const rationale = (block as RoadmapBlock).rationale ?? (block as RoadmapItem).rationale;
  const action = (block as RoadmapBlock).action ?? (block as RoadmapItem).action;
  const contraindications = (block as RoadmapBlock).contraindications ?? (block as RoadmapItem).contraindications ?? [];
  const score = (block as RoadmapBlock).score ?? (block as RoadmapItem).score ?? 0;
  const trackables = (block as RoadmapBlock).trackables ?? (block as RoadmapItem).trackables;
  const hasDetails = !!(finding || rationale || action || contraindications.length > 0);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group rounded-xl border p-3 transition-all ${meta.border} ${isDragging ? 'opacity-50 shadow-lg scale-[1.02]' : 'shadow-sm hover:shadow-md'}`}
    >
      <div className="flex items-start gap-2.5">
        <button
          type="button"
          className="mt-0.5 cursor-grab text-slate-300 hover:text-slate-500 active:cursor-grabbing shrink-0"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="flex-1 min-w-0 space-y-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <div className={`h-2 w-2 rounded-full shrink-0 ${meta.dot}`} />
            <IconComp className="h-4 w-4 text-slate-400 shrink-0" />
            <span className="text-sm font-semibold text-slate-900 truncate">{block.title}</span>
            {score > 0 && (
              <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${scoreColor(score)}`}>
                {score}/100
              </span>
            )}
            <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${meta.dot.replace('bg-', 'bg-opacity-15 text-').replace('bg-opacity-15 text-slate-400', 'bg-slate-100 text-slate-500')}`}>
              {meta.label}
            </span>
            <span className="shrink-0 text-[10px] text-slate-400">~{block.targetWeeks}w</span>
          </div>

          {variant === 'timeline' && trackables && trackables.length > 0 && (
            <div className="mt-1.5">
              <TrackableBar trackable={trackables[0]} compact />
            </div>
          )}

          {variant === 'timeline' && hasDetails && (
            <button
              type="button"
              onClick={() => setDetailsOpen(!detailsOpen)}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 transition"
            >
              {detailsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              {detailsOpen ? 'Hide details' : 'Show details'}
            </button>
          )}

          {variant === 'timeline' && detailsOpen && (
            <div className="space-y-2 border-t border-slate-100 pt-2">
              {finding && <p className="text-xs leading-relaxed text-slate-600">{finding}</p>}
              {rationale && <p className="text-[11px] leading-relaxed text-slate-500 italic">{rationale}</p>}
              {action && (
                <div className="text-[11px] leading-relaxed text-indigo-600 bg-indigo-50/50 rounded-lg px-2.5 py-1.5">
                  <span className="font-semibold">Action:</span> {action}
                </div>
              )}
              {contraindications.length > 0 && (
                <div className="flex items-center gap-1.5 text-[10px] text-red-600">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  <span>Avoid: {contraindications.join(', ')}</span>
                </div>
              )}
            </div>
          )}

          {variant === 'palette' && finding && (
            <p className="text-xs leading-relaxed text-slate-600">{finding}</p>
          )}
        </div>

        {variant === 'timeline' && onDelete && (
          <button
            type="button"
            onClick={() => onDelete(block.id)}
            className="text-slate-300 opacity-0 group-hover:opacity-100 transition hover:text-red-500 shrink-0 mt-0.5"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
