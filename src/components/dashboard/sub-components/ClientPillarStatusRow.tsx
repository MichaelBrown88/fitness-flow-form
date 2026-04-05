import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Scan, Camera, Activity, Dumbbell, Heart } from 'lucide-react';
import type { ReassessmentItem, ScheduleStatus } from '@/hooks/useReassessmentQueue';
import { formatClientDisplayName } from '@/lib/utils/clientDisplayName';

const PILLAR_ICONS = {
  bodycomp: Scan,
  posture: Camera,
  fitness: Heart,
  strength: Dumbbell,
  lifestyle: Activity,
} as const;

const PILLAR_ORDER = ['bodycomp', 'posture', 'fitness', 'strength', 'lifestyle'] as const;

function statusDotClass(status: ScheduleStatus | 'never'): string {
  switch (status) {
    case 'overdue': return 'bg-score-red';
    case 'due-soon': return 'bg-score-amber';
    case 'up-to-date': return 'bg-score-green';
    case 'never': return 'bg-border';
  }
}

function urgencyLabel(item: ReassessmentItem): string {
  const { mostUrgentPillar, pillarSchedules } = item;
  if (!mostUrgentPillar || mostUrgentPillar === 'full') return '';
  const ps = pillarSchedules.find(s => s.pillar === mostUrgentPillar);
  if (!ps) return '';
  if (ps.daysFromDue > 0) return `${ps.daysFromDue}d overdue`;
  const daysLeft = Math.abs(ps.daysFromDue);
  if (daysLeft === 0) return 'due today';
  return `due in ${daysLeft}d`;
}

interface ClientPillarStatusRowProps {
  item: ReassessmentItem;
  onStartAssessment: (clientName: string, pillar: string) => void;
}

export function ClientPillarStatusRow({ item, onStartAssessment }: ClientPillarStatusRowProps) {
  const displayName = formatClientDisplayName(item.clientName);
  const clientPath = `/client/${encodeURIComponent(item.clientName)}`;
  const urgency = urgencyLabel(item);

  return (
    <li className="flex items-center gap-3 py-3 min-w-0">
      {/* Client name */}
      <Link
        to={clientPath}
        className="text-sm font-semibold text-foreground hover:text-primary transition-colors truncate flex-1 min-w-0"
      >
        {displayName}
      </Link>

      {/* Pillar dots */}
      <div className="flex items-center gap-1.5 shrink-0">
        {PILLAR_ORDER.map((pillar) => {
          const ps = item.pillarSchedules.find(s => s.pillar === pillar);
          const status: ScheduleStatus | 'never' = ps?.status ?? 'never';
          const Icon = PILLAR_ICONS[pillar];
          return (
            <div
              key={pillar}
              className="relative flex items-center justify-center"
              title={`${pillar}: ${status}`}
            >
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-background ${statusDotClass(status)}`} />
            </div>
          );
        })}
      </div>

      {/* Urgency label */}
      {urgency && (
        <span className={`text-[10px] font-bold shrink-0 ${item.status === 'overdue' ? 'text-score-red-fg' : 'text-score-amber-fg'}`}>
          {urgency}
        </span>
      )}

      {/* Start button */}
      {item.mostUrgentPillar && item.mostUrgentPillar !== 'full' && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => onStartAssessment(item.clientName, item.mostUrgentPillar!)}
          className="h-7 px-3 text-[11px] font-bold shrink-0 rounded-lg border-border hover:border-primary/30 hover:bg-primary/5"
        >
          Start
        </Button>
      )}
      {(!item.mostUrgentPillar || item.mostUrgentPillar === 'full') && item.status !== 'up-to-date' && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => onStartAssessment(item.clientName, 'bodycomp')}
          className="h-7 px-3 text-[11px] font-bold shrink-0 rounded-lg border-border hover:border-primary/30 hover:bg-primary/5"
        >
          Start
        </Button>
      )}
    </li>
  );
}
