/**
 * Re-Test Schedule Card
 * 
 * Displays and allows editing of a client's retest cadence schedule.
 * Shows recommended intervals from the assessment engine and allows
 * coaches to override with custom values.
 */

import { useState, useCallback } from 'react';
import { 
  Calendar, 
  RefreshCcw, 
  AlertTriangle, 
  Scan, 
  UserCheck, 
  Heart, 
  Dumbbell,
  Activity,
  Settings2,
  ChevronDown,
  ChevronUp,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import type { ClientProfile, StoredRetestSchedule } from '@/services/clientProfiles';
import { updateCustomCadence, resetCustomCadence } from '@/services/clientProfiles';
import type { PillarCadence, CadenceConfig, PartialAssessmentCategory } from '@/types/client';
import { BASE_CADENCE_INTERVALS, BODY_COMP_HYDRATION_WARNING_THRESHOLD } from '@/types/client';

interface RetestScheduleCardProps {
  profile: ClientProfile | null;
  clientName: string;
  organizationId: string;
  onScheduleUpdated?: () => void;
}

import { getPillarLabel } from '@/constants/pillars';
import { SCORE_COLORS } from '@/lib/scoring/scoreColor';

/** Pillar display configuration */
const PILLAR_CONFIG: Record<PartialAssessmentCategory, {
  label: string;
  icon: typeof Scan;
  description: string;
}> = {
  bodycomp: {
    label: getPillarLabel('bodycomp'),
    icon: Scan,
    description: 'Body composition scan',
  },
  posture: {
    label: getPillarLabel('posture'),
    icon: UserCheck,
    description: 'Posture & movement quality',
  },
  fitness: {
    label: getPillarLabel('fitness'),
    icon: Heart,
    description: 'Cardiovascular assessment',
  },
  strength: {
    label: getPillarLabel('strength'),
    icon: Dumbbell,
    description: 'Functional strength tests',
  },
  lifestyle: {
    label: getPillarLabel('lifestyle'),
    icon: Activity,
    description: 'Nutrition, sleep & stress',
  },
};

const PILLARS: PartialAssessmentCategory[] = ['bodycomp', 'posture', 'fitness', 'strength', 'lifestyle'];

/**
 * Get effective cadence for a pillar (custom > recommended > fallback)
 */
function getEffectiveCadence(
  pillar: PartialAssessmentCategory,
  schedule?: StoredRetestSchedule
): CadenceConfig {
  const fallback: CadenceConfig = {
    intervalDays: BASE_CADENCE_INTERVALS[pillar],
    priority: 'medium',
    reason: 'Default schedule',
  };

  if (!schedule) return fallback;

  // Custom takes precedence
  if (schedule.custom?.[pillar]) {
    return schedule.custom[pillar]!;
  }

  // Then recommended
  if (schedule.recommended?.[pillar]) {
    return schedule.recommended[pillar];
  }

  return fallback;
}

/**
 * Calculate next due date based on interval and last assessment
 */
function getNextDueDate(
  intervalDays: number,
  lastAssessmentDate?: Date
): { date: Date; isOverdue: boolean; daysRemaining: number } {
  const baseDate = lastAssessmentDate || new Date();
  const nextDate = new Date(baseDate);
  nextDate.setDate(nextDate.getDate() + intervalDays);
  
  const now = new Date();
  const daysRemaining = Math.ceil((nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  return {
    date: nextDate,
    isOverdue: daysRemaining < 0,
    daysRemaining,
  };
}

export function RetestScheduleCard({ 
  profile, 
  clientName, 
  organizationId,
  onScheduleUpdated,
}: RetestScheduleCardProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingPillar, setEditingPillar] = useState<PartialAssessmentCategory | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const schedule = profile?.retestSchedule;
  const lastAssessmentDate = profile?.lastAssessmentDate?.toDate();

  // Handle saving custom override
  const handleSaveCustom = useCallback(async (pillar: PartialAssessmentCategory) => {
    const days = parseInt(editValue, 10);
    if (isNaN(days) || days < 7 || days > 180) {
      toast({
        title: 'Invalid interval',
        description: 'Please enter a value between 7 and 180 days.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const customConfig: Partial<PillarCadence> = {
        [pillar]: {
          intervalDays: days,
          priority: 'medium',
          reason: 'Coach custom schedule',
        },
      };
      await updateCustomCadence(clientName, organizationId, customConfig);
      toast({
        title: 'Schedule updated',
        description: `${PILLAR_CONFIG[pillar].label} interval set to ${days} days.`,
      });
      setEditingPillar(null);
      setEditValue('');
      onScheduleUpdated?.();
    } catch (error) {
      toast({
        title: 'Failed to update',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }, [editValue, clientName, organizationId, onScheduleUpdated, toast]);

  // Handle reset to clinical defaults
  const handleReset = useCallback(async () => {
    setSaving(true);
    try {
      await resetCustomCadence(clientName, organizationId);
      toast({
        title: 'Reset complete',
        description: 'Schedule restored to clinical recommendations.',
      });
      onScheduleUpdated?.();
    } catch (error) {
      toast({
        title: 'Failed to reset',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }, [clientName, organizationId, onScheduleUpdated, toast]);

  // Check if any pillar has custom override
  const hasCustomOverrides = schedule?.custom && Object.keys(schedule.custom).length > 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <div className="p-6 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  Re-Test Schedule
                  {hasCustomOverrides && (
                    <Badge variant="secondary" className="text-[9px] font-bold uppercase">
                      <Settings2 className="h-2.5 w-2.5 mr-1" />
                      Custom
                    </Badge>
                  )}
                </h3>
                <p className="text-xs text-slate-500">
                  {schedule ? 'Personalized cadence based on assessment findings' : 'Complete a full assessment to generate schedule'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {schedule && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReset();
                  }}
                  disabled={saving || !hasCustomOverrides}
                  className="text-xs font-medium text-slate-500 hover:text-primary"
                >
                  <RefreshCcw className="h-3.5 w-3.5 mr-1.5" />
                  Reset to Clinical Defaults
                </Button>
              )}
              {isOpen ? (
                <ChevronUp className="h-5 w-5 text-slate-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-slate-400" />
              )}
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-6 pb-6 space-y-4">
            {/* Hydration Warning - checks effective interval (custom > recommended > fallback) */}
            {schedule && 
             getEffectiveCadence('bodycomp', schedule).intervalDays < BODY_COMP_HYDRATION_WARNING_THRESHOLD && (
              <div className={`p-3 rounded-xl flex items-start gap-3 ${SCORE_COLORS.amber.pill}`}>
                <AlertTriangle className={`h-4 w-4 mt-0.5 flex-shrink-0 ${SCORE_COLORS.amber.icon}`} />
                <div className={`text-xs ${SCORE_COLORS.amber.text}`}>
                  <span className="font-bold">Hydration Notice:</span> Frequent body composition scanning 
                  may reflect hydration changes rather than true body composition shifts. 
                  Look for 4-week trends rather than individual scan results.
                </div>
              </div>
            )}

            {/* Pillar Schedule Grid */}
            <div className="grid gap-3 sm:grid-cols-2">
              {PILLARS.map((pillar) => {
                const config = PILLAR_CONFIG[pillar];
                const cadence = getEffectiveCadence(pillar, schedule);
                const nextDue = getNextDueDate(cadence.intervalDays, lastAssessmentDate);
                const isCustom = !!schedule?.custom?.[pillar];
                const isEditing = editingPillar === pillar;
                const Icon = config.icon;

                return (
                  <div 
                    key={pillar}
                    className={`p-4 rounded-xl border transition-all ${
                      isEditing 
                        ? 'border-primary bg-primary/5' 
                        : nextDue.isOverdue 
                          ? 'border-score-red-muted bg-score-red-light/50' 
                          : 'border-slate-100 bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                          nextDue.isOverdue ? 'bg-score-red-muted' : 'bg-primary/10'
                        }`}>
                          <Icon className={`h-4 w-4 ${
                            nextDue.isOverdue ? 'text-score-red-fg' : 'text-primary'
                          }`} />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                            {config.label}
                            {isCustom && (
                              <Badge variant="outline" className="text-[8px] px-1 py-0 border-primary/30 text-primary">
                                Custom
                              </Badge>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500">{config.description}</div>
                        </div>
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            placeholder="Days"
                            min={7}
                            max={180}
                            className="h-9 w-24 text-center"
                            autoFocus
                          />
                          <span className="text-xs text-slate-500">days</span>
                          <div className="flex-1" />
                          <Button
                            size="sm"
                            onClick={() => handleSaveCustom(pillar)}
                            disabled={saving}
                            className="h-8"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingPillar(null);
                              setEditValue('');
                            }}
                            className="h-8"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-2xl font-black text-slate-900">
                              {cadence.intervalDays}
                              <span className="text-sm font-medium text-slate-400 ml-1">days</span>
                            </div>
                            {cadence.reason && (
                              <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                                {cadence.reason}
                              </div>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingPillar(pillar);
                              setEditValue(cadence.intervalDays.toString());
                            }}
                            className="h-8 text-xs text-slate-500 hover:text-primary"
                          >
                            <Settings2 className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                        </div>

                        {/* Next Due Status */}
                        <div className={`mt-3 pt-3 border-t text-xs ${
                          nextDue.isOverdue 
                            ? 'border-score-red-muted text-score-red-fg' 
                            : nextDue.daysRemaining <= 7 
                              ? 'border-score-amber-muted text-score-amber-fg' 
                              : 'border-slate-100 text-slate-500'
                        }`}>
                          {nextDue.isOverdue ? (
                            <span className="font-bold">Overdue by {Math.abs(nextDue.daysRemaining)} days</span>
                          ) : nextDue.daysRemaining <= 7 ? (
                            <span className="font-bold">Due in {nextDue.daysRemaining} days</span>
                          ) : (
                            <span>Next: {nextDue.date.toLocaleDateString()}</span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Schedule generation date */}
            {schedule && (
              <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-400">
                Generated: {schedule.generatedAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}
              </div>
            )}

            {/* No Schedule Yet */}
            {!schedule && (
              <div className="py-8 text-center text-sm text-slate-500">
                <Calendar className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                <p className="font-medium">No schedule generated yet</p>
                <p className="text-xs text-slate-400 mt-1">
                  Complete a full assessment to generate personalized retest recommendations
                </p>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
