/**
 * Phase P1: Lifestyle Assessment
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

export const phaseP1: PhaseDefinition = {
  id: 'P1',
  title: PHASE_TITLES.P1,
  summary: PHASE_SUMMARIES.P1,
  gateHint: PHASE_GATE_HINTS.P1,
  sections: [
    {
      id: 'lifestyle-overview',
      title: SECTION_TITLES.P1['lifestyle-overview'],
      fields: [
        // Required fields — always shown, feed the lifestyle score
        { id: 'activityLevel' as keyof FormData, type: 'select' as FieldType, label: ASSESSMENT_LABELS.P1.activityLevel, required: true, tooltip: ASSESSMENT_TOOLTIPS.P1.activityLevel, options: ASSESSMENT_OPTIONS.activityLevel },
        { id: 'sleepArchetype' as keyof FormData, type: 'select' as FieldType, label: ASSESSMENT_LABELS.P1.sleepArchetype, tooltip: ASSESSMENT_TOOLTIPS.P1.sleepArchetype, options: ASSESSMENT_OPTIONS.sleepArchetype },
        { id: 'stressLevel' as keyof FormData, type: 'select' as FieldType, label: ASSESSMENT_LABELS.P1.stressLevel, tooltip: ASSESSMENT_TOOLTIPS.P1.stressLevel, options: ASSESSMENT_OPTIONS.stressLevel },
        { id: 'nutritionHabits' as keyof FormData, type: 'select' as FieldType, label: ASSESSMENT_LABELS.P1.nutritionHabits, tooltip: ASSESSMENT_TOOLTIPS.P1.nutritionHabits, options: ASSESSMENT_OPTIONS.nutritionHabits },
        { id: 'hydrationHabits' as keyof FormData, type: 'select' as FieldType, label: ASSESSMENT_LABELS.P1.hydrationHabits, tooltip: ASSESSMENT_TOOLTIPS.P1.hydrationHabits, options: ASSESSMENT_OPTIONS.hydrationHabits },
        // Optional fields — shown by default, coach can disable per org
        { id: 'stepsPerDay' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P1.stepsPerDay, placeholder: ASSESSMENT_PLACEHOLDERS.P1.stepsPerDay, tooltip: ASSESSMENT_TOOLTIPS.P1.stepsPerDay, orgConfigKey: 'stepsPerDay' },
        { id: 'sedentaryHours' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P1.sedentaryHours, placeholder: ASSESSMENT_PLACEHOLDERS.P1.sedentaryHours, tooltip: ASSESSMENT_TOOLTIPS.P1.sedentaryHours, orgConfigKey: 'sedentaryHours' },
        { id: 'caffeineCupsPerDay' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P1.caffeineCupsPerDay, placeholder: ASSESSMENT_PLACEHOLDERS.P1.caffeineCupsPerDay, tooltip: ASSESSMENT_TOOLTIPS.P1.caffeineCupsPerDay, orgConfigKey: 'caffeine' },
        { id: 'lastCaffeineIntake' as keyof FormData, type: 'time' as FieldType, label: ASSESSMENT_LABELS.P1.lastCaffeineIntake, tooltip: ASSESSMENT_TOOLTIPS.P1.lastCaffeineIntake, orgConfigKey: 'caffeine', conditional: { showWhen: { field: 'caffeineCupsPerDay', exists: true, notValue: '0' } } },
        {
          id: 'alcoholFrequency' as keyof FormData,
          type: 'select' as FieldType,
          label: ASSESSMENT_LABELS.P1.alcoholFrequency,
          tooltip: ASSESSMENT_TOOLTIPS.P1.alcoholFrequency,
          options: ASSESSMENT_OPTIONS.alcoholFrequency,
          orgConfigKey: 'alcoholFrequency',
        },
        {
          id: 'medicationsFlag' as keyof FormData,
          type: 'select' as FieldType,
          label: ASSESSMENT_LABELS.P1.medicationsFlag,
          tooltip: ASSESSMENT_TOOLTIPS.P1.medicationsFlag,
          options: ASSESSMENT_OPTIONS.medicationsFlag,
          orgConfigKey: 'medications',
        },
        {
          id: 'medicationsNotes' as keyof FormData,
          type: 'textarea' as FieldType,
          label: ASSESSMENT_LABELS.P1.medicationsNotes,
          tooltip: ASSESSMENT_TOOLTIPS.P1.medicationsNotes,
          orgConfigKey: 'medications',
          conditional: { showWhen: { field: 'medicationsFlag', value: 'yes' } },
        },
      ],
    }
  ],
};
