/**
 * Re-Test Schedule Card
 *
 * Per-client scheduling UI on the Client Detail page.
 * Coaches toggle pillars on/off, see countdowns in weeks,
 * and use "Push 1 Week" for the most common scheduling action.
 */

import { useState, useCallback, useMemo } from 'react';
import {
  Calendar,
  Scan,
  UserCheck,
  Heart,
  Dumbbell,
  Activity,
  Settings2,
  ChevronDown,
  ChevronUp,
  Check,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { ClientProfile } from '@/services/clientProfiles';
import {
  updateCustomCadence,
  setDueDateOverride,
  updateClientActivePillars,
} from '@/services/clientProfiles';
import type { PillarCadence, CadenceConfig, PartialAssessmentCategory } from '@/types/client';
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

function getNextDueInfo(
  intervalDays: number,
  lastDate?: Date,
): { daysRemaining: number; isOverdue: boolean } {
  const base = lastDate || new Date();
  const nextDate = new Date(base.getTime() + intervalDays * 24 * 60 * 60 * 1000);
  const daysRemaining = Math.ceil((nextDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return { daysRemaining, isOverdue: daysRemaining < 0 };
}

function formatDueLabel(daysRemaining: number): { text: string; color: string } {
  if (daysRemaining < 0) {
    const weeksOverdue = Math.ceil(Math.abs(daysRemaining) / 7);
    return {
      text: weeksOverdue === 1 ? 'Overdue by 1 week' : `Overdue by ${weeksOverdue} weeks`,
      color: 'text-score-red-fg',
    };
  }
  if (daysRemaining <= 7) return { text: 'Do this next session', color: 'text-score-amber-fg' };
  if (daysRemaining <= 13) return { text: 'Next week', color: 'text-foreground-secondary' };
  const weeks = Math.ceil(daysRemaining / 7);
  return { text: `In ${weeks} weeks`, color: 'text-muted-foreground' };
}

function daysToWeeks(days: number): number {
  return Math.round(days / 7);
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
  const [editingPillar, setEditingPillar] = useState<PartialAssessmentCategory | null>(null);
  const [editValue, setEditValue] = useState('');

  const clientActivePillars = profile?.activePillars
    ?? orgDefaultActivePillars
    ?? ALL_PILLARS;
  const activePillarSet = useMemo(
    () => new Set(clientActivePillars),
    [clientActivePillars],
  );

  const lastAssessmentDate = profile?.lastAssessmentDate?.toDate();
  const trainingStart = profile?.trainingStartDate ? new Date(profile.trainingStartDate) : undefined;

  // If training starts after assessment, use training start as the scheduling anchor
  const effectiveBaseDate = lastAssessmentDate
    ? (trainingStart && trainingStart > lastAssessmentDate ? trainingStart : lastAssessmentDate)
    : undefined;

  const pillarDateMap = useMemo(
    (): Record<string, Date | undefined> => ({
      bodycomp: profile?.lastInBodyDate?.toDate(),
      posture: profile?.lastPostureDate?.toDate(),
      fitness: profile?.lastFitnessDate?.toDate(),
      strength: profile?.lastStrengthDate?.toDate(),
      lifestyle: profile?.lastLifestyleDate?.toDate(),
    }),
    [
      profile?.lastInBodyDate,
      profile?.lastPostureDate,
      profile?.lastFitnessDate,
      profile?.lastStrengthDate,
      profile?.lastLifestyleDate,
    ],
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

  const handleSaveCustomInterval = useCallback(async (pillar: PartialAssessmentCategory) => {
    const weeks = parseInt(editValue, 10);
    if (isNaN(weeks) || weeks < 1 || weeks > 26) {
      toast({ title: 'Enter a value between 1 and 26 weeks', variant: 'destructive' });
      return;
    }

    setSaving(pillar);
    try {
      const customConfig: Partial<PillarCadence> = {
        [pillar]: { intervalDays: weeks * 7, priority: 'medium' as const, reason: 'Coach custom' } satisfies CadenceConfig,
      };
      await updateCustomCadence(clientName, organizationId, customConfig);
      toast({ title: `${PILLAR_CONFIG[pillar].label} set to every ${weeks} weeks` });
      setEditingPillar(null);
      setEditValue('');
      onScheduleUpdated?.();
    } catch {
      toast({ title: 'Failed to update', variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  }, [editValue, clientName, organizationId, onScheduleUpdated, toast]);

  const hasScheduleData = !!profile?.retestSchedule || !!effectiveBaseDate;

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
          <div className="space-y-2 pb-2">
            {ALL_PILLARS.map((pillar) => {
              const config = PILLAR_CONFIG[pillar];
              const Icon = config.icon;
              const isActive = activePillarSet.has(pillar);
              const isEditing = editingPillar === pillar;
              const isBusy = saving === pillar;
              const interval = getEffectiveInterval(pillar, profile, orgDefaultIntervals);
              const baseDate = pillarDateMap[pillar] || effectiveBaseDate;
              const due = hasScheduleData ? getNextDueInfo(interval, baseDate) : null;
              const dueLabel = due ? formatDueLabel(due.daysRemaining) : null;
              const isCustom = !!profile?.retestSchedule?.custom?.[pillar];

              return (
                <div
                  key={pillar}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                    isActive ? 'hover:bg-muted/50' : 'opacity-50'
                  }`}
                >
                  <Switch
                    checked={isActive}
                    onCheckedChange={() => handleTogglePillar(pillar)}
                    disabled={!!saving}
                    className="shrink-0"
                  />
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-foreground">{config.label}</span>
                      {isCustom && (
                        <span className="text-[10px] text-primary font-bold">Custom</span>
                      )}
                    </div>
                    {isActive && !isEditing && (
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">
                          Every {daysToWeeks(interval)} wk
                        </span>
                        {dueLabel && (
                          <>
                            <span className="text-muted-foreground/60">·</span>
                            <span className={`text-xs font-semibold ${dueLabel.color}`}>
                              {dueLabel.text}
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {isActive && !isEditing && (
                    <div className="flex items-center gap-1 shrink-0">
                      {due && due.daysRemaining <= 14 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePushOneWeek(pillar)}
                          disabled={!!saving}
                          className="h-8 px-2 text-xs text-muted-foreground"
                        >
                          {isBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Push 1 wk'}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingPillar(pillar);
                          setEditValue(daysToWeeks(interval).toString());
                        }}
                        className="h-8 w-8 p-0 text-muted-foreground"
                      >
                        <Settings2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}

                  {isActive && isEditing && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        min={1}
                        max={26}
                        className="h-8 w-14 text-center text-sm"
                        autoFocus
                      />
                      <span className="text-xs text-muted-foreground">wk</span>
                      <Button
                        size="sm"
                        onClick={() => handleSaveCustomInterval(pillar)}
                        disabled={!!saving}
                        className="h-8 w-8 p-0"
                      >
                        {isBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { setEditingPillar(null); setEditValue(''); }}
                        className="h-8 px-2 text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  )}

                  {!isActive && (
                    <ChevronRight className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                  )}
                </div>
              );
            })}

            {!hasScheduleData && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                <Calendar className="h-10 w-10 mx-auto text-muted-foreground/60 mb-3" />
                <p className="font-medium">No assessments yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Complete an assessment to start scheduling
                </p>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
