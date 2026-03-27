/**
 * Default Cadence Settings
 *
 * Org-level defaults for assessment scheduling.
 * Coaches set which pillars are tracked and how often (in weeks).
 * These apply to all new clients unless overridden per-client.
 */

import { useState, useEffect, useCallback } from 'react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Scan, UserCheck, Heart, Dumbbell, Activity } from 'lucide-react';
import { updateOrgSettings, type OrgSettings, type DefaultCadenceConfig } from '@/services/organizations';
import type { PartialAssessmentCategory } from '@/types/client';

interface DefaultCadenceSettingsProps {
  orgSettings: OrgSettings | null;
  organizationId: string;
  onSave?: () => void;
}

const PILLAR_CONFIG: Record<PartialAssessmentCategory, {
  label: string;
  icon: typeof Scan;
  defaultWeeks: number;
}> = {
  bodycomp: { label: 'Body Comp', icon: Scan, defaultWeeks: 4 },
  posture: { label: 'Posture', icon: UserCheck, defaultWeeks: 6 },
  fitness: { label: 'Fitness', icon: Heart, defaultWeeks: 6 },
  strength: { label: 'Strength', icon: Dumbbell, defaultWeeks: 6 },
  lifestyle: { label: 'Lifestyle', icon: Activity, defaultWeeks: 2 },
};

const PILLARS: PartialAssessmentCategory[] = ['bodycomp', 'posture', 'fitness', 'strength', 'lifestyle'];
const DEFAULT_ACTIVE: PartialAssessmentCategory[] = ['bodycomp', 'strength', 'fitness', 'lifestyle'];

function daysToWeeks(days: number): number {
  return Math.round(days / 7);
}

function weeksToDays(weeks: number): number {
  return weeks * 7;
}

export function DefaultCadenceSettings({
  orgSettings,
  organizationId,
  onSave,
}: DefaultCadenceSettingsProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [activePillars, setActivePillars] = useState<Set<PartialAssessmentCategory>>(
    new Set(DEFAULT_ACTIVE),
  );
  const [weeks, setWeeks] = useState<Record<PartialAssessmentCategory, number>>({
    bodycomp: 4,
    posture: 6,
    fitness: 6,
    strength: 6,
    lifestyle: 2,
  });

  useEffect(() => {
    const dc = orgSettings?.defaultCadence;
    if (dc) {
      setWeeks({
        bodycomp: daysToWeeks(dc.intervals.bodycomp),
        posture: daysToWeeks(dc.intervals.posture),
        fitness: daysToWeeks(dc.intervals.fitness),
        strength: daysToWeeks(dc.intervals.strength),
        lifestyle: daysToWeeks(dc.intervals.lifestyle),
      });
      if (dc.activePillars) {
        setActivePillars(new Set(dc.activePillars));
      }
    }
  }, [orgSettings]);

  const togglePillar = useCallback((pillar: PartialAssessmentCategory) => {
    setActivePillars(prev => {
      const next = new Set(prev);
      if (next.has(pillar)) next.delete(pillar);
      else next.add(pillar);
      return next;
    });
  }, []);

  const handleWeekChange = useCallback((pillar: PartialAssessmentCategory, value: string) => {
    const num = parseInt(value, 10);
    if (!isNaN(num)) {
      setWeeks(prev => ({ ...prev, [pillar]: num }));
    }
  }, []);

  const isValidWeeks = (value: number): boolean => value >= 1 && value <= 26;

  const handleSave = async () => {
    for (const pillar of PILLARS) {
      if (activePillars.has(pillar) && !isValidWeeks(weeks[pillar])) {
        toast({
          title: 'Invalid interval',
          description: `${PILLAR_CONFIG[pillar].label} must be between 1 and 26 weeks.`,
          variant: 'destructive',
        });
        return;
      }
    }

    setIsSaving(true);
    try {
      const newConfig: DefaultCadenceConfig = {
        intervals: {
          bodycomp: weeksToDays(weeks.bodycomp),
          posture: weeksToDays(weeks.posture),
          fitness: weeksToDays(weeks.fitness),
          strength: weeksToDays(weeks.strength),
          lifestyle: weeksToDays(weeks.lifestyle),
        },
        activePillars: Array.from(activePillars),
      };
      await updateOrgSettings(organizationId, { defaultCadence: newConfig });
      toast({ title: 'Schedule defaults saved' });
      onSave?.();
    } catch {
      toast({
        title: 'Failed to save',
        description: 'Could not update schedule defaults.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-background p-4 sm:p-6 space-y-5 shadow-sm">
      <p className="text-xs text-muted-foreground leading-relaxed">
        Set which assessments to track and how often. These apply to all new clients
        unless overridden individually.
      </p>

      <div className="space-y-3">
        {PILLARS.map((pillar) => {
          const config = PILLAR_CONFIG[pillar];
          const Icon = config.icon;
          const isActive = activePillars.has(pillar);
          const value = weeks[pillar];
          const isValid = !isActive || isValidWeeks(value);

          return (
            <div
              key={pillar}
              className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                isActive ? 'bg-muted/50' : 'opacity-50'
              } ${!isValid ? 'bg-score-red-light/50' : ''}`}
            >
              <Switch
                checked={isActive}
                onCheckedChange={() => togglePillar(pillar)}
                disabled={isSaving}
                className="shrink-0"
              />
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-bold text-foreground flex-1 min-w-0">
                {config.label}
              </span>
              {isActive && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <Input
                    type="number"
                    value={value}
                    onChange={(e) => handleWeekChange(pillar, e.target.value)}
                    min={1}
                    max={26}
                    className={`h-9 w-16 text-center text-sm ${!isValid ? 'border-score-red' : ''}`}
                    disabled={isSaving}
                  />
                  <span className="text-xs text-muted-foreground">wk</span>
                </div>
              )}
              {!isActive && (
                <span className="text-xs text-muted-foreground">Off</span>
              )}
            </div>
          );
        })}
      </div>

      <Button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full rounded-xl bg-foreground text-white font-bold h-11 hover:bg-foreground/90 transition-colors"
      >
        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save Defaults
      </Button>

      <p className="text-[10px] text-muted-foreground pt-2 border-t border-border">
        Active pillars and intervals apply to new clients. Existing client schedules
        are not affected. Valid range: 1-26 weeks.
      </p>
    </div>
  );
}
