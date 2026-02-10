/**
 * Default Cadence Settings Component
 *
 * Allows org admins to set default retest intervals for new clients.
 * When enabled, these override clinical baselines for cadence generation.
 */

import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Scan, UserCheck, Heart, Dumbbell, Activity } from 'lucide-react';
import { updateOrgSettings, type OrgSettings, type DefaultCadenceConfig } from '@/services/organizations';
import type { PartialAssessmentCategory } from '@/types/client';

interface DefaultCadenceSettingsProps {
  orgSettings: OrgSettings | null;
  organizationId: string;
  onSave?: () => void;
}

/** Pillar display configuration - matches RetestScheduleCard */
const PILLAR_CONFIG: Record<PartialAssessmentCategory, {
  label: string;
  icon: typeof Scan;
  description: string;
  defaultDays: number;
}> = {
  inbody: {
    label: 'InBody',
    icon: Scan,
    description: 'Body composition scan',
    defaultDays: 30,
  },
  posture: {
    label: 'Movement',
    icon: UserCheck,
    description: 'Posture & movement quality',
    defaultDays: 45,
  },
  fitness: {
    label: 'Fitness',
    icon: Heart,
    description: 'Cardiovascular assessment',
    defaultDays: 45,
  },
  strength: {
    label: 'Strength',
    icon: Dumbbell,
    description: 'Functional strength tests',
    defaultDays: 60,
  },
  lifestyle: {
    label: 'Lifestyle',
    icon: Activity,
    description: 'Nutrition, sleep & stress',
    defaultDays: 45,
  },
};

const PILLARS: PartialAssessmentCategory[] = ['inbody', 'posture', 'fitness', 'strength', 'lifestyle'];

export function DefaultCadenceSettings({
  orgSettings,
  organizationId,
  onSave,
}: DefaultCadenceSettingsProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [intervals, setIntervals] = useState({
    inbody: 30,
    posture: 45,
    fitness: 45,
    strength: 60,
    lifestyle: 45,
  });

  // Sync local state with org settings
  useEffect(() => {
    if (orgSettings?.defaultCadence) {
      setEnabled(orgSettings.defaultCadence.enabled);
      setIntervals(orgSettings.defaultCadence.intervals);
    }
  }, [orgSettings]);

  const handleToggle = async (newEnabled: boolean) => {
    setIsSaving(true);
    try {
      const newConfig: DefaultCadenceConfig = {
        enabled: newEnabled,
        intervals,
      };
      await updateOrgSettings(organizationId, { defaultCadence: newConfig });
      setEnabled(newEnabled);
      toast({
        title: newEnabled ? 'Custom defaults enabled' : 'Using clinical baselines',
        description: newEnabled
          ? 'New client assessments will use your organization defaults.'
          : 'New client assessments will use ACSM/NASM clinical baselines.',
      });
      onSave?.();
    } catch (err) {
      toast({
        title: 'Failed to update',
        description: 'Could not save cadence settings.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleIntervalChange = (pillar: PartialAssessmentCategory, value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue)) {
      setIntervals(prev => ({ ...prev, [pillar]: numValue }));
    }
  };

  const validateInterval = (value: number): boolean => {
    return value >= 7 && value <= 180;
  };

  const handleSaveIntervals = async () => {
    // Validate all intervals
    for (const pillar of PILLARS) {
      if (!validateInterval(intervals[pillar])) {
        toast({
          title: 'Invalid interval',
          description: `${PILLAR_CONFIG[pillar].label} must be between 7 and 180 days.`,
          variant: 'destructive',
        });
        return;
      }
    }

    setIsSaving(true);
    try {
      const newConfig: DefaultCadenceConfig = {
        enabled,
        intervals,
      };
      await updateOrgSettings(organizationId, { defaultCadence: newConfig });
      toast({
        title: 'Intervals saved',
        description: 'Default retest intervals have been updated.',
      });
      onSave?.();
    } catch (err) {
      toast({
        title: 'Failed to save',
        description: 'Could not update intervals.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-6 shadow-sm">
      <p className="text-xs text-slate-500 leading-relaxed">
        Set default retest intervals for new clients. When enabled, these override the clinical baselines
        (ACSM/NASM standards). Individual client schedules can still be customized.
      </p>

      {/* Enable/Disable Toggle */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex-1">
          <Label className="text-sm font-bold text-slate-800">Use Organization Defaults</Label>
          <p className="text-xs text-slate-500 mt-1">
            {enabled
              ? 'New assessments will use your custom intervals below.'
              : 'New assessments will use clinical baseline intervals.'}
          </p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={handleToggle}
          disabled={isSaving}
        />
      </div>

      {/* Interval Inputs */}
      <div className={`space-y-4 ${!enabled ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="grid gap-4 sm:grid-cols-2">
          {PILLARS.map((pillar) => {
            const config = PILLAR_CONFIG[pillar];
            const Icon = config.icon;
            const value = intervals[pillar];
            const isValid = validateInterval(value);

            return (
              <div
                key={pillar}
                className={`p-4 rounded-xl border ${
                  isValid ? 'border-slate-100 bg-slate-50/50' : 'border-score-red-muted bg-score-red-light/50'
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">{config.label}</div>
                    <div className="text-[10px] text-slate-500">{config.description}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={value}
                    onChange={(e) => handleIntervalChange(pillar, e.target.value)}
                    min={7}
                    max={180}
                    className={`h-10 w-24 text-center ${!isValid ? 'border-score-red' : ''}`}
                    disabled={!enabled}
                  />
                  <span className="text-xs text-slate-500">days</span>
                  <span className="text-[10px] text-slate-400 ml-auto">
                    (default: {config.defaultDays})
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSaveIntervals}
          disabled={isSaving || !enabled}
          className="w-full rounded-xl bg-slate-900 text-white font-bold h-11 shadow-lg shadow-slate-200 hover:bg-black transition-all"
        >
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Intervals
        </Button>
      </div>

      {/* Info Note */}
      <p className="text-[10px] text-slate-400 pt-2 border-t border-slate-100">
        These defaults apply to new full assessments only. Partial assessments and existing client
        schedules are not affected. Valid range: 7-180 days.
      </p>
    </div>
  );
}
