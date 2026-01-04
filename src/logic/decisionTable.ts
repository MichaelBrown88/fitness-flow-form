import type { FormData } from '@/contexts/FormContext';

export type ComputedAssessment = {
  sessionsPerWeek: number;
  projectedImprovementPercent: number;
  recommendedFocus: string[];
  summary: string;
};

function inferFocusFromGoals(clientGoals: string[]): string[] {
  const mapping: Record<string, string> = {
    'weight-loss': 'Cardio & Nutrition Consistency',
    'muscle-gain': 'Progressive Overload & Protein Intake',
    'improve-mobility': 'Mobility & Movement Quality',
    'general-fitness': 'Balanced Strength & Conditioning',
  };
  const focuses = clientGoals.map((g) => mapping[g]).filter(Boolean);
  return focuses.length > 0 ? focuses : ['Balanced Strength & Conditioning'];
}

export function computeAssessmentResult(formData: FormData): ComputedAssessment {
  const sessions = parseInt(formData.sessionsPerWeek || '0', 10);

  let projectedImprovementPercent = 0;
  switch (sessions) {
    case 3:
      projectedImprovementPercent = 10;
      break;
    case 4:
      projectedImprovementPercent = 15;
      break;
    case 5:
      projectedImprovementPercent = 20;
      break;
    default:
      projectedImprovementPercent = 0;
  }

  const recommendedFocus = inferFocusFromGoals(formData.clientGoals || []);

  const summary =
    sessions > 0
      ? `With ${sessions} sessions/week, expect ~${projectedImprovementPercent}% improvement in 12 weeks. Focus on ${recommendedFocus.join(
          ', '
        )}.`
      : 'Select sessions per week to estimate progress.';

  return {
    sessionsPerWeek: Number.isFinite(sessions) ? sessions : 0,
    projectedImprovementPercent,
    recommendedFocus,
    summary,
  };
}


