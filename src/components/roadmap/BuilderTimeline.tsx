import type { RoadmapItem, RoadmapPhase } from '@/lib/roadmap/types';
import { PhaseDropZone } from './PhaseDropZone';

const PHASES: RoadmapPhase[] = ['foundation', 'development', 'performance'];

interface BuilderTimelineProps {
  timelineItems: Map<RoadmapPhase, RoadmapItem[]>;
  onDelete: (id: string) => void;
}

export function BuilderTimeline({ timelineItems, onDelete }: BuilderTimelineProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-bold text-slate-800 mb-2">Journey Timeline</h3>
      {PHASES.map((phase, idx) => (
        <PhaseDropZone
          key={phase}
          phase={phase}
          items={timelineItems.get(phase) ?? []}
          phaseIndex={idx}
          isLast={idx === PHASES.length - 1}
          onDelete={onDelete}
          onEdit={() => {}}
        />
      ))}
    </div>
  );
}
