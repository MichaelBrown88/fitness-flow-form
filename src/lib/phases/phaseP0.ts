/**
 * Phase P0: Client Information
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

export const phaseP0: PhaseDefinition = {
  id: 'P0',
  title: PHASE_TITLES.P0,
  summary: PHASE_SUMMARIES.P0,
  gateHint: PHASE_GATE_HINTS.P0,
  sections: [
    {
      id: 'basic-client-info',
      title: SECTION_TITLES.P0['basic-client-info'],
      fields: [
        { id: 'fullName' as keyof FormData, type: 'text' as FieldType, label: ASSESSMENT_LABELS.P0.fullName, required: true, placeholder: ASSESSMENT_PLACEHOLDERS.P0.fullName, tooltip: ASSESSMENT_TOOLTIPS.P0.fullName },
        { id: 'email' as keyof FormData, type: 'email' as FieldType, label: ASSESSMENT_LABELS.P0.email, required: true, placeholder: ASSESSMENT_PLACEHOLDERS.P0.email, tooltip: ASSESSMENT_TOOLTIPS.P0.email },
        { id: 'phone' as keyof FormData, type: 'tel' as FieldType, label: ASSESSMENT_LABELS.P0.phone, required: true, placeholder: ASSESSMENT_PLACEHOLDERS.P0.phone, tooltip: ASSESSMENT_TOOLTIPS.P0.phone },
        { id: 'dateOfBirth' as keyof FormData, type: 'date' as FieldType, label: ASSESSMENT_LABELS.P0.dateOfBirth, required: true, tooltip: ASSESSMENT_TOOLTIPS.P0.dateOfBirth },
        { id: 'gender' as keyof FormData, type: 'select' as FieldType, label: ASSESSMENT_LABELS.P0.gender, required: true, options: ASSESSMENT_OPTIONS.gender, tooltip: ASSESSMENT_TOOLTIPS.P0.gender },
        {
          id: 'trainingHistory' as keyof FormData,
          type: 'select' as FieldType,
          label: ASSESSMENT_LABELS.P0.trainingHistory,
          required: true,
          tooltip: ASSESSMENT_TOOLTIPS.P0.trainingHistory,
          options: ASSESSMENT_OPTIONS.trainingHistory
        },
        {
          id: 'recentActivity' as keyof FormData,
          type: 'select' as FieldType,
          label: ASSESSMENT_LABELS.P0.recentActivity,
          required: true,
          tooltip: ASSESSMENT_TOOLTIPS.P0.recentActivity,
          options: ASSESSMENT_OPTIONS.recentActivity
        },
        {
          id: 'primaryTrainingStyles' as keyof FormData,
          type: 'multiselect' as FieldType,
          label: ASSESSMENT_LABELS.P0.primaryTrainingStyles,
          tooltip: ASSESSMENT_TOOLTIPS.P0.primaryTrainingStyles,
          options: ASSESSMENT_OPTIONS.primaryTrainingStyles,
          conditional: {
            showWhen: {
              field: 'recentActivity',
              notValue: 'stopped-6-months'
            }
          }
        },
        {
          id: 'primaryTrainingStyleOther' as keyof FormData,
          type: 'text' as FieldType,
          label: ASSESSMENT_LABELS.P0.primaryTrainingStyleOther,
          placeholder: 'e.g., Swimming, Martial Arts, Dance',
          tooltip: ASSESSMENT_TOOLTIPS.P0.primaryTrainingStyleOther,
          conditional: {
            showWhen: {
              field: 'primaryTrainingStyles',
              includes: 'other'
            }
          }
        },
      ],
    },
    {
      id: 'parq',
      title: SECTION_TITLES.P0.parq,
      fields: [
        {
          id: 'parqQuestionnaire' as keyof FormData,
          type: 'parq' as FieldType,
          label: ASSESSMENT_LABELS.P0.parqQuestionnaire,
          required: true,
          tooltip: ASSESSMENT_TOOLTIPS.P0.parqQuestionnaire,
        },
      ],
    },
  ],
};
