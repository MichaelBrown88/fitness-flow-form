import { useMemo } from 'react';
import type { RoadmapItem, RoadmapPhase } from '@/lib/roadmap/types';
import { ClientJourneyPhase } from './ClientJourneyPhase';

const PHASES: RoadmapPhase[] = ['foundation', 'development', 'performance'];

type PhaseState = 'active' | 'upcoming' | 'completed';

interface RoadmapClientViewProps {
  clientName: string;
  summary: string;
  items: RoadmapItem[];
  organizationName?: string;
  activePhase?: RoadmapPhase;
}

export default function RoadmapClientView({
  clientName, summary, items, organizationName, activePhase = 'foundation',
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
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500">Your Journey</p>
        <h1 className="text-3xl font-bold text-slate-900">
          Hi {clientName.split(' ')[0]}, here&apos;s your plan
        </h1>
        {organizationName && (
          <p className="text-sm text-slate-500">Prepared by {organizationName}</p>
        )}
      </header>

      {summary && (
        <div className="rounded-2xl bg-gradient-to-br from-indigo-50 via-violet-50 to-purple-50 p-6 border border-indigo-100/50">
          <p className="text-sm leading-relaxed text-slate-700">{summary}</p>
        </div>
      )}

      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between text-sm mb-3">
          <span className="font-semibold text-slate-800">Overall Progress</span>
          <span className="text-slate-500">
            {achievedCount} of {items.length} milestones completed
          </span>
        </div>
        <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-700"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <div className="space-y-0">
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

      <footer className="text-center pt-6 border-t border-slate-100 space-y-1">
        <p className="text-xs text-slate-400">
          This journey was created by your coach and is updated as you progress.
        </p>
        <p className="text-xs text-slate-400">
          Speak to your coach if you have any questions about your plan.
        </p>
      </footer>
    </div>
  );
}
