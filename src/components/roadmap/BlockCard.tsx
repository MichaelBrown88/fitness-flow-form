import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Activity, AlertTriangle, Dumbbell, GripVertical, Heart, Info, Move, Scale, Target, Trash2 } from 'lucide-react';
import { getPillarLabel } from '@/constants/pillars';
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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });

  const style = { transform: CSS.Transform.toString(transform), transition };
  const urgency = (block as RoadmapBlock).urgency ?? (block as RoadmapItem).urgency ?? 'optional';
  const meta = URGENCY_META[urgency as BlockUrgency];
  const IconComp = ICON_MAP[block.icon ?? 'Target'] ?? Target;
  const finding = (block as RoadmapBlock).finding ?? (block as RoadmapItem).finding;
  const score = (block as RoadmapBlock).score ?? (block as RoadmapItem).score ?? 0;
  const trackables = (block as RoadmapBlock).trackables ?? (block as RoadmapItem).trackables;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group rounded-xl border p-4 transition-all ${variant === 'timeline' ? 'bg-card border-border' : meta.border} ${isDragging ? 'opacity-50 shadow-lg scale-[1.02]' : 'shadow-sm hover:shadow-md'}`}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          className="mt-0.5 cursor-grab text-foreground-secondary hover:text-foreground active:cursor-grabbing shrink-0"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <div className={`h-2 w-2 rounded-full shrink-0 ${meta.dot}`} />
              <IconComp className="h-4 w-4 text-foreground-secondary shrink-0" />
              <span className="text-sm font-semibold text-foreground truncate">{block.title}</span>
              {score > 0 && variant === 'palette' && (
                <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${scoreColor(score)}`}>
                  {score}/100
                </span>
              )}
              <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${meta.dot.replace('bg-', 'bg-opacity-15 text-').replace('bg-opacity-15 text-slate-400', 'bg-muted text-foreground-secondary')}`}>
                {meta.label}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-foreground-secondary">
              <span>{getPillarLabel(block.category, 'short')}</span>
            </div>
          </div>

          {variant === 'timeline' && trackables && trackables.length > 0 && (
            <div>
              <TrackableBar trackable={trackables[0]} compact />
            </div>
          )}

          {variant === 'palette' && finding && (
            <p className="text-xs leading-relaxed text-foreground-secondary">{finding}</p>
          )}
        </div>

        {variant === 'timeline' && onDelete && (
          <button
            type="button"
            onClick={() => onDelete(block.id)}
            className="text-foreground-secondary opacity-0 group-hover:opacity-100 transition hover:text-destructive shrink-0 mt-0.5"
            aria-label="Remove"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
