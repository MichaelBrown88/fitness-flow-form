import { useEffect } from 'react';
import type { User } from 'firebase/auth';
import type { FormData } from '@/contexts/FormContext';
import { logger } from '@/lib/utils/logger';
import { isBodyCompositionPhaseFieldId } from '@/lib/utils/partialAssessmentBodyCompFieldKeys';
import { readPartialAssessmentCategories } from '@/lib/assessment/assessmentSessionStorage';

const PARTIAL_CATEGORY_FIELD_PREFIXES: Record<string, string[]> = {
  posture: ['posture', 'ohs', 'hinge', 'lunge', 'mobility'],
  fitness: ['cardio', 'ymca', 'treadmill'],
  strength: ['pushup', 'squat', 'plank', 'grip', 'chairStand', 'dynamometer'],
  lifestyle: [
    'activityLevel',
    'stepsPerDay',
    'sedentaryHours',
    'workHours',
    'sleep',
    'stress',
    'nutrition',
    'hydration',
    'caffeine',
  ],
};

function buildSkipPrefixes(categories: string[]): string[] {
  // Union of all per-pillar prefixes. bodycomp has its own dedicated
  // field-id detector (handled inline below), so we exclude it here.
  const set = new Set<string>();
  for (const cat of categories) {
    if (cat === 'bodycomp') continue;
    const prefixes = PARTIAL_CATEGORY_FIELD_PREFIXES[cat];
    if (prefixes) prefixes.forEach((p) => set.add(p));
  }
  return Array.from(set);
}

/**
 * When starting a partial assessment, pre-fill from the client's latest saved assessment
 * (excluding fields in the partial category, except body-comp handling).
 */
export function usePartialAssessmentPrefetch(params: {
  user: User | null;
  organizationId: string | undefined;
  activeClientName: string;
  isPartialAssessment: boolean;
  partialCategory: string | null;
  updateFormData: (data: Partial<FormData>) => void;
}): void {
  const { user, organizationId, activeClientName, isPartialAssessment, partialCategory, updateFormData } =
    params;

  useEffect(() => {
    const loadCurrentAssessment = async () => {
      if (!user || !activeClientName) return;
      if (!isPartialAssessment) return;

      try {
        const { getCurrentAssessment } = await import('@/services/assessmentHistory');
        const current = await getCurrentAssessment(user.uid, activeClientName, organizationId);
        if (!current?.formData) return;

        // Multi-pillar mode: skip pre-fill for fields belonging to ANY
        // pillar in the active session set, so the coach has to enter
        // fresh values for each reassessment. Falls back to the
        // single-category prop for legacy callers.
        const sessionCategories = readPartialAssessmentCategories();
        const activeCategories: string[] =
          sessionCategories.length > 0
            ? sessionCategories
            : partialCategory
              ? [partialCategory]
              : [];

        const fieldsToSkip = buildSkipPrefixes(activeCategories);
        const skipBodyComp = activeCategories.includes('bodycomp');

        const updates: Partial<FormData> = {};
        Object.keys(current.formData).forEach((key) => {
          const formKey = key as keyof FormData;
          const value = current.formData[formKey];
          if (value !== undefined && value !== null) {
            const shouldSkip =
              (skipBodyComp && isBodyCompositionPhaseFieldId(key)) ||
              fieldsToSkip.some((prefix) => key.toLowerCase().includes(prefix.toLowerCase()));
            if (!shouldSkip) {
              (updates as Record<string, unknown>)[formKey] = value;
            }
          }
        });
        updateFormData(updates);
      } catch (e) {
        logger.error('Failed to load current assessment:', e);
      }
    };
    void loadCurrentAssessment();
  }, [user, activeClientName, isPartialAssessment, partialCategory, organizationId, updateFormData]);
}
