import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Scan, Camera, Activity, Dumbbell, Heart, CalendarPlus } from 'lucide-react';
import type { ReassessmentItem } from '@/hooks/useReassessmentQueue';
import { formatClientDisplayName } from '@/lib/utils/clientDisplayName';
import { cn } from '@/lib/utils';

const PILLAR_ICONS = {
  bodycomp: Scan,
  posture: Camera,
  fitness: Heart,
  strength: Dumbbell,
  lifestyle: Activity,
} as const;

/** Semantic colors per pillar — consistent across queue, calendar, and legends */
export const PILLAR_COLORS: Record<string, string> = {
  bodycomp: 'text-blue-500',
  posture: 'text-violet-500',
  fitness: 'text-rose-500',
  strength: 'text-amber-500',
  lifestyle: 'text-emerald-500',
} as const;

interface ClientPillarStatusRowProps {
  item: ReassessmentItem;
  onScheduleClient: (item: ReassessmentItem) => void;
}

export function ClientPillarStatusRow({ item, onScheduleClient }: ClientPillarStatusRowProps) {
  const displayName = formatClientDisplayName(item.clientName);
  const clientPath = `/client/${encodeURIComponent(item.clientName)}`;

  // Only show icons for pillars that need attention
  const duePillars = item.pillarSchedules.filter(
    ps => ps.status === 'overdue' || ps.status === 'due-soon',
  );

  return (
    <li className="flex items-center gap-3 py-4 min-w-0">
      {/* Client name */}
      <Link
        to={clientPath}
        className="text-sm font-semibold text-foreground hover:text-primary transition-colors truncate flex-1 min-w-0"
      >
        {displayName}
      </Link>

      {/* Due pillar icons — only what needs doing */}
      <div className="flex items-center gap-1.5 shrink-0">
        {duePillars.map((ps) => {
          const Icon = PILLAR_ICONS[ps.pillar as keyof typeof PILLAR_ICONS];
          if (!Icon) return null;
          return (
            <Icon
              key={ps.pillar}
              className={cn("h-4 w-4", PILLAR_COLORS[ps.pillar] ?? 'text-muted-foreground')}
              title={ps.pillar}
            />
          );
        })}
      </div>

      {/* Schedule button */}
      <Button
        size="sm"
        variant="outline"
        onClick={() => onScheduleClient(item)}
        className="h-8 px-3 text-xs font-semibold shrink-0 rounded-lg gap-1.5"
      >
        <CalendarPlus className="h-3.5 w-3.5" />
        Schedule
      </Button>
    </li>
  );
}
