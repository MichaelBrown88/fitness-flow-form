/**
 * Default Cadence Settings
 *
 * Org-level defaults for assessment scheduling.
 * Coaches set which pillars are tracked, the lifestyle check-in frequency,
 * and which optional lifestyle questions to show.
 */

import { useState, useEffect, useCallback } from 'react';
import { Switch } from '@/components/ui/switch';
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
  baselineDays: number;
  baselineLabel: string;
}> = {
  bodycomp: { label: 'Body Comp', icon: Scan, baselineDays: 30, baselineLabel: 'every 30 days' },
  posture: { label: 'Posture', icon: UserCheck, baselineDays: 45, baselineLabel: 'every 45 days' },
  fitness: { label: 'Metabolic Fitness', icon: Heart, baselineDays: 45, baselineLabel: 'every 45 days' },
  strength: { label: 'Strength', icon: Dumbbell, baselineDays: 60, baselineLabel: 'every 60 days' },
  lifestyle: { label: 'Lifestyle', icon: Activity, baselineDays: 14, baselineLabel: 'configurable' },
};

const PILLARS: PartialAssessmentCategory[] = ['bodycomp', 'posture', 'fitness', 'strength', 'lifestyle'];
const DEFAULT_ACTIVE: PartialAssessmentCategory[] = ['bodycomp', 'strength', 'fitness', 'lifestyle'];

const LIFESTYLE_PRESET_OPTIONS: { value: 7 | 14 | 30; label: string; sub: string }[] = [
  { value: 7, label: 'Weekly', sub: 'Every 7 days' },
  { value: 14, label: 'Every 2 weeks', sub: 'Every 14 days' },
  { value: 30, label: 'Monthly', sub: 'Every 30 days' },
];

const OPTIONAL_FIELD_CONFIG: { key: keyof NonNullable<OrgSettings['lifestyleOptionalFields']>; label: string; description: string }[] = [
  { key: 'stepsPerDay', label: 'Daily steps', description: 'Average steps per day' },
  { key: 'sedentaryHours', label: 'Sedentary hours', description: 'Hours sitting or inactive' },
  { key: 'caffeine', label: 'Caffeine intake', description: 'Cups per day and last intake time' },
  { key: 'alcoholFrequency', label: 'Alcohol frequency', description: 'How often they drink' },
  { key: 'medications', label: 'Medications', description: 'Medications flag and notes' },
];

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
  const [lifestylePreset, setLifestylePreset] = useState<7 | 14 | 30>(14);
  const [optionalFields, setOptionalFields] = useState<NonNullable<OrgSettings['lifestyleOptionalFields']>>({
    stepsPerDay: true,
    sedentaryHours: true,
    caffeine: true,
    alcoholFrequency: true,
    medications: true,
  });

  useEffect(() => {
    const dc = orgSettings?.defaultCadence;
    if (dc?.activePillars) {
      setActivePillars(new Set(dc.activePillars));
    }
    if (orgSettings?.lifestyleCadencePreset) {
      setLifestylePreset(orgSettings.lifestyleCadencePreset);
    }
    if (orgSettings?.lifestyleOptionalFields) {
      setOptionalFields({
        stepsPerDay: orgSettings.lifestyleOptionalFields.stepsPerDay !== false,
        sedentaryHours: orgSettings.lifestyleOptionalFields.sedentaryHours !== false,
        caffeine: orgSettings.lifestyleOptionalFields.caffeine !== false,
        alcoholFrequency: orgSettings.lifestyleOptionalFields.alcoholFrequency !== false,
        medications: orgSettings.lifestyleOptionalFields.medications !== false,
      });
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

  const toggleOptionalField = useCallback((key: keyof NonNullable<OrgSettings['lifestyleOptionalFields']>) => {
    setOptionalFields(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const existing = orgSettings?.defaultCadence?.intervals ?? {
        bodycomp: 30, posture: 45, fitness: 45, strength: 60, lifestyle: 14,
      };
      const newConfig: DefaultCadenceConfig = {
        intervals: { ...existing, lifestyle: lifestylePreset },
        activePillars: Array.from(activePillars),
      };
      await updateOrgSettings(organizationId, {
        defaultCadence: newConfig,
        lifestyleCadencePreset: lifestylePreset,
        lifestyleOptionalFields: optionalFields,
      });
      toast({ title: 'Settings saved' });
      onSave?.();
    } catch {
      toast({
        title: 'Failed to save',
        description: 'Could not update settings.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Pillar tracking */}
      <div className="space-y-3">
        <h3 className="text-[11px] font-black uppercase tracking-[0.12em] text-muted-foreground">
          Tracked Pillars
        </h3>
        <p className="text-xs text-muted-foreground">
          Active pillars are tracked for new clients. Existing client schedules are not affected.
        </p>
        <div className="space-y-2">
          {PILLARS.map((pillar) => {
            const config = PILLAR_CONFIG[pillar];
            const Icon = config.icon;
            const isActive = activePillars.has(pillar);
            return (
              <div
                key={pillar}
                className={`flex items-center gap-3 py-3 transition-opacity ${!isActive ? 'opacity-40' : ''}`}
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
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-foreground">{config.label}</span>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {pillar === 'lifestyle' ? `${lifestylePreset}d` : config.baselineLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lifestyle assessment frequency */}
      <div className="space-y-3">
        <h3 className="text-[11px] font-black uppercase tracking-[0.12em] text-muted-foreground">
          Lifestyle Frequency
        </h3>
        <p className="text-xs text-muted-foreground">
          How often clients should complete the lifestyle questionnaire.
        </p>
        <div className="grid grid-cols-3 gap-2">
          {LIFESTYLE_PRESET_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setLifestylePreset(opt.value)}
              disabled={isSaving}
              className={`rounded-xl border p-3 text-left transition-colors ${
                lifestylePreset === opt.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-border/80 hover:bg-muted/50'
              }`}
            >
              <div className="text-sm font-semibold text-foreground">{opt.label}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{opt.sub}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Optional lifestyle fields */}
      <div className="space-y-3">
        <h3 className="text-[11px] font-black uppercase tracking-[0.12em] text-muted-foreground">
          Lifestyle Questions
        </h3>
        <p className="text-xs text-muted-foreground">
          The 5 core questions (activity, sleep, stress, nutrition, hydration) always appear.
          Toggle optional questions on or off for your organisation.
        </p>
        <div className="space-y-2">
          {OPTIONAL_FIELD_CONFIG.map((field) => (
            <div key={field.key} className="flex items-center gap-3 py-2.5">
              <Switch
                checked={optionalFields[field.key] !== false}
                onCheckedChange={() => toggleOptionalField(field.key)}
                disabled={isSaving}
                className="shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground">{field.label}</div>
                <div className="text-[11px] text-muted-foreground">{field.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full rounded-xl bg-foreground text-white font-bold h-11 hover:bg-foreground/90 transition-colors"
      >
        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save
      </Button>
    </div>
  );
}
