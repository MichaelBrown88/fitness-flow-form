import { useState, useEffect } from 'react';
import type { FormData } from '@/contexts/FormContext';
import type { ScoreSummary } from '@/lib/scoring/types';
import { generateCoachPlan } from '@/lib/recommendations';
import { EMPTY_COACH_PLAN } from '@/lib/recommendations/emptyCoachPlan';
import type { CoachPlan } from '@/lib/recommendations/types';
import { logger } from '@/lib/utils/logger';

/**
 * Async coach plan for the results phase; resets to EMPTY_COACH_PLAN on failure.
 */
export function useCoachPlanForResults(formData: FormData, scores: ScoreSummary): CoachPlan {
  const [plan, setPlan] = useState<CoachPlan>(EMPTY_COACH_PLAN);

  useEffect(() => {
    let cancelled = false;
    void generateCoachPlan(formData, scores)
      .then((result) => {
        if (!cancelled) setPlan(result);
      })
      .catch((e) => {
        logger.error('Error generating coach plan:', e);
        if (!cancelled) setPlan(EMPTY_COACH_PLAN);
      });
    return () => {
      cancelled = true;
    };
  }, [formData, scores]);

  return plan;
}
