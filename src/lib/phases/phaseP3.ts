/**
 * Phase P3: Cardio Assessment
 */

import type { FormData } from '@/contexts/FormContext';
import type { PhaseDefinition, FieldType } from './types';
import {
  PHASE_TITLES,
  PHASE_SUMMARIES,
  PHASE_GATE_HINTS,
  ASSESSMENT_LABELS,
  ASSESSMENT_TOOLTIPS,
  ASSESSMENT_OPTIONS,
  SECTION_TITLES
} from '@/constants/assessment';

export const phaseP3: PhaseDefinition = {
  id: 'P3',
  title: PHASE_TITLES.P3,
  summary: PHASE_SUMMARIES.P3,
  gateHint: PHASE_GATE_HINTS.P3,
  sections: [
    {
      id: 'fitness-assessment',
      title: SECTION_TITLES.P3['fitness-assessment'],
      fields: [
        { id: 'cardioTestSelected' as keyof FormData, type: 'select' as FieldType, label: ASSESSMENT_LABELS.P3.cardioTestSelected, tooltip: ASSESSMENT_TOOLTIPS.P3.cardioTestSelected, options: ASSESSMENT_OPTIONS.cardioTestSelected },
        // Standardized fields for both tests (same 3 readings for both treadmill and step test)
        { id: 'cardioRestingHr' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P3.cardioRestingHr, tooltip: ASSESSMENT_TOOLTIPS.P3.cardioRestingHr },
        { id: 'cardioPeakHr' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P3.cardioPeakHr, tooltip: ASSESSMENT_TOOLTIPS.P3.cardioPeakHr },
        { id: 'cardioPost1MinHr' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P3.cardioPost1MinHr, tooltip: ASSESSMENT_TOOLTIPS.P3.cardioPost1MinHr },
      ],
    },
  ],
};
