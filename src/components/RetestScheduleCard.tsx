/**
 * Re-Test Schedule Card
 *
 * Per-client scheduling UI on the Client Detail page.
 * Shows last assessed recency and due status per pillar.
 * Coaches toggle pillars on/off and use "Push 1 week" for one-time overrides.
 */

import { useState, useCallback, useMemo } from 'react';
import {
  Calendar,
  Scan,
  UserCheck,
  Heart,
  Dumbbell,
  Activity,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { safeFirestoreTimestampToDate } from '@/lib/utils/formatFirestoreTimestampDisplay';
import { readLastBodyCompTimestamp } from '@/lib/utils/clientProfileBodyCompDate';
import type { ClientProfile } from '@/services/clientProfiles';
import {
  setDueDateOverride,
  updateClientActivePillars,
} from '@/services/clientProfiles';
import type { PartialAssessmentCategory } from '@/types/client';
import { BASE_CADENCE_INTERVALS } from '@/types/client';

interface RetestScheduleCardProps {
  profile: ClientProfile | null;
  clientName: string;
  organizationId: string;
  orgDefaultIntervals?: Record<string, number>;
  orgDefaultActivePillars?: PartialAssessmentCategory[];
  onScheduleUpdated?: () => void;
}

import { getPillarLabel } from '@/constants/pillars';

const PILLAR_CONFIG: Record<PartialAssessmentCategory, {
  label: string;
  icon: typeof Scan;
}> = {
  bodycomp: { label: getPillarLabel('bodycomp'), icon: Scan },
  posture: { label: getPillarLabel('posture'), icon: UserCheck },
  fitness: { label: getPillarLabel('fitness'), icon: Heart },
  strength: { label: getPillarLabel('strength'), icon: Dumbbell },
  lifestyle: { label: getPillarLabel('lifestyle'), icon: Activity },
};

const ALL_PILLARS: PartialAssessmentCategory[] = ['bodycomp', 'posture', 'fitness', 'strength', 'lifestyle'];

function getEffectiveInterval(
  pillar: PartialAssessmentCategory,
  profile: ClientProfile | null,
  orgDefaultIntervals?: Record<string, number>,
): number {
  const custom = profile?.retestSchedule?.custom?.[pillar]?.intervalDays;
  if (custom && custom > 0) return custom;
  const orgDefault = orgDefaultIntervals?.[pillar];
  if (orgDefault && orgDefault > 0) return orgDefault;
  return BASE_CADENCE_INTERVALS[pillar];
}

function getDaysAgo(date: Date | undefined): number | null {
  if (!date) return null;
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

function getDaysUntilDue(intervalDays: number, lastDate: Date | undefined): number | null {
  if (!lastDate) return null;
  const dueDate = new Date(lastDate.getTime() + intervalDays * 24 * 60 * 60 * 1000);
  return Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function formatRecencyLabel(daysAgo: number | null): string {
  if (daysAgo === null) return 'Never';
  if (daysAgo === 0) return 'Today';
  if (daysAgo === 1) return '1 day ago';
  return `${daysAgo}d ago`;
}

function formatDueStatus(daysUntil: number | null): { text: string; color: string } {
  if (daysUntil === null) return { text: '—', color: 'text-muted-foreground' };
  if (daysUntil < 0) {
    return { text: `${Math.abs(daysUntil)}d overdue`, color: 'text-score-red-fg' };
  }
  if (daysUntil <= 7) return { text: `Due in ${daysUntil}d`, color: 'text-score-amber-fg' };
  return { text: `Due in ${daysUntil}d`, color: 'text-muted-foreground' };
}

export function RetestScheduleCard({
  profile,
  clientName,
  organizationId,
  orgDefaultIntervals,
  orgDefaultActivePillars,
  onScheduleUpdated,
}: RetestScheduleCardProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  const clientActivePillars = profile?.activePillars
    ?? orgDefaultActivePillars
    ?? ALL_PILLARS;
  const activePillarSet = useMemo(
    () => new Set(clientActivePillars),
    [clientActivePillars],
  );

  const lastAssessmentDate =
    safeFirestoreTimestampToDate(profile?.lastAssessmentDate) ?? undefined;
  const trainingStart = profile?.trainingStartDate ? new Date(profile.trainingStartDate) : undefined;

  const effectiveBaseDate = lastAssessmentDate
    ? (trainingStart && trainingStart > lastAssessmentDate ? trainingStart : lastAssessmentDate)
    : undefined;

  const pillarDateMap = useMemo(
    (): Record<string, Date | undefined> => ({
      bodycomp:
        safeFirestoreTimestampToDate(
          readLastBodyCompTimestamp({
            lastBodyCompDate: profile?.lastBodyCompDate,
            lastInBodyDate: profile?.lastInBodyDate,
          }),
        ) ?? undefined,
      posture: safeFirestoreTimestampToDate(profile?.lastPostureDate) ?? undefined,
      fitness: safeFirestoreTimestampToDate(profile?.lastFitnessDate) ?? undefined,
      strength: safeFirestoreTimestampToDate(profile?.lastStrengthDate) ?? undefined,
      lifestyle: safeFirestoreTimestampToDate(profile?.lastLifestyleDate) ?? undefined,
    }),
    [profile],
  );

  const handleTogglePillar = useCallback(async (pillar: PartialAssessmentCategory) => {
    const newSet = new Set(activePillarSet);
    if (newSet.has(pillar)) newSet.delete(pillar);
    else newSet.add(pillar);

    setSaving(pillar);
    try {
      await updateClientActivePillars(clientName, organizationId, Array.from(newSet));
      onScheduleUpdated?.();
    } catch {
      toast({ title: 'Failed to update', variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  }, [activePillarSet, clientName, organizationId, onScheduleUpdated, toast]);

  const handlePushOneWeek = useCallback(async (pillar: PartialAssessmentCategory) => {
    const interval = getEffectiveInterval(pillar, profile, orgDefaultIntervals);
    const baseDate = pillarDateMap[pillar] || effectiveBaseDate || new Date();
    const currentDue = new Date(baseDate.getTime() + interval * 24 * 60 * 60 * 1000);
    const newDue = new Date(Math.max(currentDue.getTime(), Date.now()) + 7 * 24 * 60 * 60 * 1000);

    setSaving(pillar);
    try {
      await setDueDateOverride(clientName, organizationId, pillar, newDue);
      toast({ title: `${PILLAR_CONFIG[pillar].label} pushed 1 week` });
      onScheduleUpdated?.();
    } catch {
      toast({ title: 'Failed to push', variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  }, [profile, orgDefaultIntervals, pillarDateMap, effectiveBaseDate, clientName, organizationId, onScheduleUpdated, toast]);

  return (
    <div className="overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <div className="py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-muted/50 transition-colors rounded-lg">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Calendar className="h-4 w-4 text-primary shrink-0" />
              <span className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
                Assessment Schedule
              </span>
              <span className="text-[10px] text-muted-foreground">
                {activePillarSet.size}/{ALL_PILLARS.length} active
              </span>
            </div>
            {isOpen
              ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
              : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
            }
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="space-y-1 pb-2">
            {ALL_PILLARS.map((pillar) => {
              const config = PILLAR_CONFIG[pillar];
              const Icon = config.icon;
              const isActive = activePillarSet.has(pillar);
              const isBusy = saving === pillar;
              const interval = getEffectiveInterval(pillar, profile, orgDefaultIntervals);
              const lastDate = pillarDateMap[pillar] ?? effectiveBaseDate;
              const daysAgo = getDaysAgo(lastDate);
              const daysUntil = getDaysUntilDue(interval, lastDate);
              const dueStatus = formatDueStatus(daysUntil);

              return (
                <div
                  key={pillar}
                  className={`flex items-center gap-3 py-2.5 transition-opacity ${!isActive ? 'opacity-40' : ''}`}
                >
                  <Switch
                    checked={isActive}
                    onCheckedChange={() => void handleTogglePillar(pillar)}
                    disabled={!!saving}
                    className="shrink-0"
                  />
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-foreground">{config.label}</span>
                    {isActive && (
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">
                          {formatRecencyLabel(daysAgo)}
                        </span>
                        <span className="text-muted-foreground/40">·</span>
                        <span className={`text-xs font-semibold ${dueStatus.color}`}>
                          {dueStatus.text}
                        </span>
                      </div>
                    )}
                  </div>

                  {isActive && daysUntil !== null && daysUntil <= 14 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void handlePushOneWeek(pillar)}
                      disabled={!!saving}
                      className="h-8 px-2 text-xs text-muted-foreground shrink-0"
                    >
                      {isBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Push 1 wk'}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
