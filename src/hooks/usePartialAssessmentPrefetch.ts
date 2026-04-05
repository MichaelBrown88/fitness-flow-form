import { useEffect } from 'react';
import type { User } from 'firebase/auth';
import type { FormData } from '@/contexts/FormContext';
import { logger } from '@/lib/utils/logger';
import { isBodyCompositionPhaseFieldId } from '@/lib/utils/partialAssessmentBodyCompFieldKeys';

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

        let fieldsToSkip: string[] = [];
        if (partialCategory) {
          fieldsToSkip =
            partialCategory === 'bodycomp' ? [] : PARTIAL_CATEGORY_FIELD_PREFIXES[partialCategory] || [];
        }

        const updates: Partial<FormData> = {};
        Object.keys(current.formData).forEach((key) => {
          const formKey = key as keyof FormData;
          const value = current.formData[formKey];
          if (value !== undefined && value !== null) {
            const shouldSkip =
              partialCategory === 'bodycomp' && isBodyCompositionPhaseFieldId(key)
                ? true
                : fieldsToSkip.some((prefix) => key.toLowerCase().includes(prefix.toLowerCase()));
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
