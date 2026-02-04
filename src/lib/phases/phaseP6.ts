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
          id: 'goalLevelWeightLoss' as keyof FormData,
          type: 'select' as FieldType,
          label: ASSESSMENT_LABELS.P6.goalLevelWeightLoss,
          tooltip: ASSESSMENT_TOOLTIPS.P6.goalLevelWeightLoss,
          options: ASSESSMENT_OPTIONS.goalLevelWeightLoss,
          conditional: { showWhen: { field: 'clientGoals', includes: 'weight-loss' } },
        },
        {
          id: 'goalLevelMuscle' as keyof FormData,
          type: 'select' as FieldType,
          label: ASSESSMENT_LABELS.P6.goalLevelMuscle,
          tooltip: ASSESSMENT_TOOLTIPS.P6.goalLevelMuscle,
          options: ASSESSMENT_OPTIONS.goalLevelMuscle,
          conditional: { showWhen: { field: 'clientGoals', includes: 'build-muscle' } },
        },
        {
          id: 'goalLevelStrength' as keyof FormData,
          type: 'select' as FieldType,
          label: ASSESSMENT_LABELS.P6.goalLevelStrength,
          tooltip: ASSESSMENT_TOOLTIPS.P6.goalLevelStrength,
          options: ASSESSMENT_OPTIONS.goalLevelStrength,
          conditional: { showWhen: { field: 'clientGoals', includes: 'build-strength' } },
        },
        {
          id: 'goalLevelFitness' as keyof FormData,
          type: 'select' as FieldType,
          label: ASSESSMENT_LABELS.P6.goalLevelFitness,
          tooltip: ASSESSMENT_TOOLTIPS.P6.goalLevelFitness,
          options: ASSESSMENT_OPTIONS.goalLevelFitness,
          conditional: { showWhen: { field: 'clientGoals', includes: 'improve-fitness' } },
        },
        {
          id: 'goalLevelBodyRecomp' as keyof FormData,
          type: 'select' as FieldType,
          label: ASSESSMENT_LABELS.P6.goalLevelBodyRecomp,
          tooltip: ASSESSMENT_TOOLTIPS.P6.goalLevelBodyRecomp,
          options: ASSESSMENT_OPTIONS.goalLevelBodyRecomp,
          conditional: { showWhen: { field: 'clientGoals', includes: 'body-recomposition' } },
        },
      ],
    },
  ],
};
