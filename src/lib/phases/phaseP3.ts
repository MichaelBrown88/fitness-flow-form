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

/**
 * One continuous fitness flow: resting HR is the first input of the same
 * section as the test itself (no section cliff between RHR and the test).
 * Rendered by the CardioRunSheet component (see SingleFieldFlow), which adds
 * the protocol card, 3:00 test countdown, and 1:00 recovery countdown.
 */
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
        {
          id: 'cardioRestingHr' as keyof FormData,
          type: 'number' as FieldType,
          label: ASSESSMENT_LABELS.P3.cardioRestingHr,
          tooltip: ASSESSMENT_TOOLTIPS.P3.cardioRestingHr,
          required: true,
        },
        {
          id: 'cardioTestSelected' as keyof FormData,
          type: 'select' as FieldType,
          label: ASSESSMENT_LABELS.P3.cardioTestSelected,
          tooltip: ASSESSMENT_TOOLTIPS.P3.cardioTestSelected,
          options: ASSESSMENT_OPTIONS.cardioTestSelected,
        },
        {
          id: 'cardioPeakHr' as keyof FormData,
          type: 'number' as FieldType,
          label: ASSESSMENT_LABELS.P3.cardioPeakHr,
          tooltip: ASSESSMENT_TOOLTIPS.P3.cardioPeakHr,
        },
        {
          id: 'cardioPost1MinHr' as keyof FormData,
          type: 'number' as FieldType,
          label: ASSESSMENT_LABELS.P3.cardioPost1MinHr,
          tooltip: ASSESSMENT_TOOLTIPS.P3.cardioPost1MinHr,
        },
      ],
    },
  ],
};
