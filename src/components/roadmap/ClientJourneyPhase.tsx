import { CheckCircle2, Circle, Clock, ArrowRight } from 'lucide-react';
import type { RoadmapItem, RoadmapItemStatus, RoadmapPhase, RoadmapCategory } from '@/lib/roadmap/types';
import { PHASE_NARRATIVES, URGENCY_CLIENT_LABELS } from '@/lib/roadmap/types';
import { groupPhaseItemsByPillar, CATEGORY_ORDER } from '@/lib/roadmap/sortPhaseItems';
import { getPillarLabel } from '@/constants/pillars';
import { TrackableBar } from './TrackableBar';

const STATUS_CONFIG: Record<RoadmapItemStatus, { icon: typeof Circle; color: string; bg: string }> = {
  not_started: { icon: Circle, color: 'text-foreground-secondary', bg: 'border-border' },
  in_progress: { icon: Clock, color: 'text-score-amber-fg', bg: 'border-score-amber-muted bg-score-amber-light' },
  achieved: { icon: CheckCircle2, color: 'text-score-green-fg', bg: 'border-score-green-muted bg-score-green-light' },
  adjusted: { icon: ArrowRight, color: 'text-primary', bg: 'border-border bg-brand-light' },
};

const PHASE_DOT: Record<RoadmapPhase, string> = {
  foundation: 'bg-score-green',
  development: 'bg-primary',
  performance: 'bg-primary',
};

type PhaseState = 'active' | 'upcoming' | 'completed';

interface Props {
  phase: RoadmapPhase;
  items: RoadmapItem[];
  phaseIndex: number;
  isLastPhase: boolean;
  phaseState?: PhaseState;
}

function MilestoneCard({ item, isLast }: { item: RoadmapItem; isLast: boolean }) {
  const { icon: StatusIcon, color, bg } = STATUS_CONFIG[item.status];
  const isAchieved = item.status === 'achieved';
  const trackables = item.trackables;

  return (
    <div className="relative">
      <div className={`rounded-xl border p-4 transition-colors ${
        isAchieved ? 'bg-score-green-light/50 border-score-green-muted' : 'bg-card border-border'
      }`}>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${bg}`}>
              <StatusIcon className={`h-3.5 w-3.5 ${color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-sm font-semibold ${isAchieved ? 'text-score-green-bold line-through' : 'text-foreground'}`}>
                    {item.title}
                  </span>
                  {isAchieved && (
                    <span className="rounded-full bg-score-green-muted px-2 py-0.5 text-[10px] font-semibold text-score-green-fg">Completed</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-foreground-secondary">
                  <span>{URGENCY_CLIENT_LABELS[item.urgency ?? 'optional']}</span>
                  <span className="text-border">·</span>
                  <span>{getPillarLabel(item.category, 'short')}</span>
                </div>
              </div>
            </div>
          </div>

          {trackables && trackables.length > 0 && (
            <div className="ml-9 mt-2">
              <TrackableBar trackable={trackables[0]} compact />
            </div>
          )}
        </div>
      </div>
      {!isLast && <div className="h-3" />}
    </div>
  );
}

export function ClientJourneyPhase({ phase, items, phaseIndex, isLastPhase, phaseState = 'active' }: Props) {
  const { title } = PHASE_NARRATIVES[phase];
  const isUpcoming = phaseState === 'upcoming';

  return (
    <div className={isUpcoming ? 'opacity-60' : ''}>
      <div className="flex items-center gap-2 mb-4">
        <div className="h-px flex-1 bg-border" />
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted border border-border">
          <div className={`h-2 w-2 rounded-full ${PHASE_DOT[phase]}`} />
          <span className="text-[10px] font-semibold text-foreground-secondary uppercase tracking-wide">
            Phase {phaseIndex + 1}: {title}
          </span>
          {phaseState === 'completed' && (
            <CheckCircle2 className="h-3 w-3 text-score-green-fg" />
          )}
        </div>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="space-y-6">
        {(() => {
          const byPillar = groupPhaseItemsByPillar(items);
          const orderedCategories = (Object.entries(CATEGORY_ORDER) as [RoadmapCategory, number][])
            .sort(([, a], [, b]) => a - b)
            .map(([cat]) => cat);
          let globalIndex = 0;
          const totalItems = items.length;
          return orderedCategories.map((category) => {
            const pillarItems = byPillar.get(category);
            if (!pillarItems || pillarItems.length === 0) return null;
            return (
              <div key={category} className="space-y-3">
                <p className="text-[10px] uppercase tracking-wide text-foreground-secondary">
                  {getPillarLabel(category, 'short')}
                </p>
                <div className="space-y-0">
                  {pillarItems.map((item, j) => {
                    globalIndex++;
                    const isLast = globalIndex === totalItems && isLastPhase;
                    return <MilestoneCard key={item.id} item={item} isLast={isLast} />;
                  })}
                </div>
              </div>
            );
          });
        })()}
      </div>

      {isUpcoming && items.length > 3 && (
        <p className="text-[10px] text-foreground-secondary text-center py-2">{items.length} milestones ready for this phase</p>
      )}

      {!isLastPhase && <div className="h-6" />}
    </div>
  );
}
