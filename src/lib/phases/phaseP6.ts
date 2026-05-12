/**
 * Phase P6: Goals & Targets
 */

import type { FormData } from '@/contexts/FormContext';
import type { PhaseDefinition, FieldType } from './types';
import {
  PHASE_TITLES,
  PHASE_SUMMARIES,
  PHASE_GATE_HINTS,
  ASSESSMENT_LABELS,
  ASSESSMENT_TOOLTIPS,
  ASSESSMENT_PLACEHOLDERS,
  ASSESSMENT_OPTIONS,
  SECTION_TITLES
} from '@/constants/assessment';

export const phaseP6: PhaseDefinition = {
  id: 'P6',
  title: PHASE_TITLES.P6,
  summary: PHASE_SUMMARIES.P6,
  gateHint: PHASE_GATE_HINTS.P6,
  sections: [
    {
      id: 'goals',
      title: SECTION_TITLES.P6.goals,
      fields: [
        {
          id: 'clientGoals' as keyof FormData,
          type: 'multiselect' as FieldType,
          label: ASSESSMENT_LABELS.P6.clientGoals,
          placeholder: ASSESSMENT_PLACEHOLDERS.P6.clientGoals,
          tooltip: ASSESSMENT_TOOLTIPS.P6.clientGoals,
          options: ASSESSMENT_OPTIONS.clientGoals,
        },
        {
          id: 'goalDeadline' as keyof FormData,
          type: 'date' as FieldType,
          label: ASSESSMENT_LABELS.P6.goalDeadline,
          tooltip: ASSESSMENT_TOOLTIPS.P6.goalDeadline,
        },
        {
          id: 'trainingFrequency' as keyof FormData,
          type: 'select' as FieldType,
          label: ASSESSMENT_LABELS.P6.trainingFrequency,
          tooltip: ASSESSMENT_TOOLTIPS.P6.trainingFrequency,
          options: ASSESSMENT_OPTIONS.trainingFrequency,
        },
        {
          id: 'trainingExperience' as keyof FormData,
          type: 'select' as FieldType,
          label: ASSESSMENT_LABELS.P6.trainingExperience,
          tooltip: ASSESSMENT_TOOLTIPS.P6.trainingExperience,
          options: ASSESSMENT_OPTIONS.trainingExperience,
        },
      ],
    },
  ],
};
