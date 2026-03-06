import { useMemo } from 'react';
import type { RoadmapItem, RoadmapPhase } from '@/lib/roadmap/types';
import { buildJourneySummaryContent } from '@/lib/roadmap/journeySummary';
import { ClientJourneyPhase } from './ClientJourneyPhase';

const PHASES: RoadmapPhase[] = ['foundation', 'development', 'performance'];

type PhaseState = 'active' | 'upcoming' | 'completed';

interface RoadmapClientViewProps {
  clientName: string;
  summary?: string;
  items: RoadmapItem[];
  organizationName?: string;
  activePhase?: RoadmapPhase;
  clientGoals?: string[];
  mode?: 'client' | 'coach';
  showEditButton?: boolean;
}

export default function RoadmapClientView({
  clientName,
  items,
  organizationName,
  activePhase = 'foundation',
  clientGoals,
  mode = 'client',
}: RoadmapClientViewProps) {
  const achievedCount = items.filter((i) => i.status === 'achieved').length;
  const progressPct = items.length > 0 ? Math.round((achievedCount / items.length) * 100) : 0;

  const groupedItems = useMemo(() => {
    const map = new Map<RoadmapPhase, RoadmapItem[]>();
    for (const phase of PHASES) map.set(phase, []);
    for (const item of items) {
      const list = map.get(item.phase) ?? [];
      list.push(item);
      map.set(item.phase, list);
    }
    return map;
  }, [items]);

  const activePhases = PHASES.filter((p) => (groupedItems.get(p)?.length ?? 0) > 0);
  const activeIdx = PHASES.indexOf(activePhase);
  const getPhaseState = (p: RoadmapPhase): PhaseState => {
    const idx = PHASES.indexOf(p);
    if (idx < activeIdx) return 'completed';
    if (idx === activeIdx) return 'active';
    return 'upcoming';
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <header className="text-center space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">Your Journey</p>
        <h1 className="text-3xl font-bold text-foreground">
          Hi {clientName.split(' ')[0]}, here&apos;s your plan
        </h1>
        {organizationName && (
          <p className="text-xs text-foreground-secondary">Prepared by {organizationName}</p>
        )}
      </header>

      {(() => {
        const activePhasesForSummary = PHASES.filter((p) => (groupedItems.get(p)?.length ?? 0) > 0);
        const content = buildJourneySummaryContent({
          clientName,
          clientGoals: clientGoals ?? [],
          itemCount: items.length,
          phaseCount: activePhasesForSummary.length,
          mode,
        });
        return (
          <div className="rounded-xl bg-brand-light p-6 border border-border space-y-4">
            <p className="text-sm leading-relaxed text-foreground">{content.intro}</p>
            <div className="space-y-2">
              {content.phaseBlurbs.map(({ phase, title, blurb }) => (
                <div key={phase} className="text-xs">
                  <span className="font-semibold text-foreground">{title}:</span>{' '}
                  <span className="text-foreground-secondary">{blurb}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-foreground-secondary border-t border-border pt-3 mt-2">
              {content.allMetricsActive}
            </p>
          </div>
        );
      })()}

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between text-xs mb-3">
          <span className="font-semibold text-foreground">Overall Progress</span>
          <span className="text-foreground-secondary">
            {achievedCount} of {items.length} milestones completed
          </span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-score-green transition-all duration-700"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <div className="space-y-6">
        {activePhases.map((phase, idx) => (
          <ClientJourneyPhase
            key={phase}
            phase={phase}
            items={groupedItems.get(phase) ?? []}
            phaseIndex={idx}
            isLastPhase={idx === activePhases.length - 1}
            phaseState={getPhaseState(phase)}
          />
        ))}
      </div>

      <footer className="text-center pt-6 border-t border-border space-y-1">
        <p className="text-[10px] text-foreground-secondary">
          This journey was created by your coach and is updated as you progress.
        </p>
        <p className="text-[10px] text-foreground-secondary">
          Speak to your coach if you have any questions about your plan.
        </p>
      </footer>
    </div>
  );
}
