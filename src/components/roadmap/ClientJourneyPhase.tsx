import { useState } from 'react';
import { CheckCircle2, Circle, Clock, ArrowRight, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import type { RoadmapItem, RoadmapItemStatus, RoadmapPhase } from '@/lib/roadmap/types';
import { PHASE_NARRATIVES } from '@/lib/roadmap/types';
import { TrackableList } from './TrackableBar';

const STATUS_CONFIG: Record<RoadmapItemStatus, { icon: typeof Circle; color: string; bg: string }> = {
  not_started: { icon: Circle, color: 'text-slate-300', bg: 'border-slate-200' },
  in_progress: { icon: Clock, color: 'text-amber-500', bg: 'border-amber-200 bg-amber-50' },
  achieved: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'border-emerald-200 bg-emerald-50' },
  adjusted: { icon: ArrowRight, color: 'text-violet-500', bg: 'border-violet-200 bg-violet-50' },
};

const PHASE_DOT: Record<RoadmapPhase, string> = {
  foundation: 'bg-emerald-500', development: 'bg-blue-500', performance: 'bg-violet-500',
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
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { icon: StatusIcon, color, bg } = STATUS_CONFIG[item.status];
  const isAchieved = item.status === 'achieved';
  const hasDetails = !!(item.finding || item.action || item.rationale);
  const trackables = item.trackables;

  return (
    <div className="relative">
      <div className={`rounded-xl border p-4 transition-colors ${
        isAchieved ? 'bg-emerald-50/50 border-emerald-100' : 'bg-white border-slate-100'
      }`}>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${bg}`}>
              <StatusIcon className={`h-3.5 w-3.5 ${color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-sm font-semibold ${isAchieved ? 'text-emerald-700 line-through' : 'text-slate-900'}`}>
                  {item.title}
                </span>
                {isAchieved && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Completed</span>
                )}
                <span className="text-[10px] text-slate-400">~{item.targetWeeks} weeks</span>
              </div>
            </div>
          </div>

          {trackables && trackables.length > 0 && (
            <div className="ml-9 bg-slate-50/80 rounded-lg p-3">
              <TrackableList trackables={trackables} />
            </div>
          )}

          {hasDetails && (
            <div className="ml-9">
              <button
                type="button"
                onClick={() => setDetailsOpen(!detailsOpen)}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 transition"
              >
                {detailsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                {detailsOpen ? 'Hide details' : 'View details'}
              </button>

              {detailsOpen && (
                <div className="space-y-2 mt-2 border-t border-slate-100 pt-2">
                  {item.finding && (
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">What we found</p>
                      <p className="text-xs leading-relaxed text-slate-600">{item.finding}</p>
                    </div>
                  )}
                  {item.action && (
                    <div className="rounded-lg bg-indigo-50/60 px-3 py-2 space-y-0.5">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-500">What we are doing</p>
                      <p className="text-xs leading-relaxed text-indigo-700">{item.action}</p>
                    </div>
                  )}
                  {(item.contraindications?.length ?? 0) > 0 && (
                    <div className="flex items-start gap-1.5 text-[10px] text-red-600 bg-red-50/50 rounded-lg px-2.5 py-1.5">
                      <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                      <span><span className="font-semibold">Avoid:</span> {item.contraindications!.join(', ')}</span>
                    </div>
                  )}
                </div>
              )}
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
        <div className="h-px flex-1 bg-slate-200" />
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200">
          <div className={`h-2 w-2 rounded-full ${PHASE_DOT[phase]}`} />
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
            Phase {phaseIndex + 1}: {title}
          </span>
          {phaseState === 'completed' && (
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
          )}
        </div>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <div className="space-y-0">
        {items.map((item, i) => (
          <MilestoneCard key={item.id} item={item} isLast={i === items.length - 1 && isLastPhase} />
        ))}
      </div>

      {isUpcoming && items.length > 3 && (
        <p className="text-xs text-slate-400 text-center py-2">{items.length} milestones ready for this phase</p>
      )}

      {!isLastPhase && <div className="h-6" />}
    </div>
  );
}
