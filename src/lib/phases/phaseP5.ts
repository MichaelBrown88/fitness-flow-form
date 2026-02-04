/**
 * Phase P5: Strength Assessment
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

export const phaseP5: PhaseDefinition = {
  id: 'P5',
  title: PHASE_TITLES.P5,
  summary: PHASE_SUMMARIES.P5,
  gateHint: PHASE_GATE_HINTS.P5,
  sections: [
    {
      id: 'strength-endurance',
      title: SECTION_TITLES.P5['strength-endurance'],
      fields: [
        { id: 'squatsOneMinuteReps' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P5.squatsOneMinuteReps, placeholder: ASSESSMENT_PLACEHOLDERS.P5.squatsOneMinuteReps, tooltip: ASSESSMENT_TOOLTIPS.P5.squatsOneMinuteReps },
        { id: 'pushupsOneMinuteReps' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P5.pushupsOneMinuteReps, placeholder: ASSESSMENT_PLACEHOLDERS.P5.pushupsOneMinuteReps, tooltip: ASSESSMENT_TOOLTIPS.P5.pushupsOneMinuteReps },
        { id: 'plankDurationSeconds' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P5.plankDurationSeconds, placeholder: ASSESSMENT_PLACEHOLDERS.P5.plankDurationSeconds, tooltip: ASSESSMENT_TOOLTIPS.P5.plankDurationSeconds },
        // Grip Strength - Test Method Selection
        { id: 'gripTestMethod' as keyof FormData, type: 'select' as FieldType, label: ASSESSMENT_LABELS.P5.gripTestMethod, pattern: 'Grip Strength', tooltip: ASSESSMENT_TOOLTIPS.P5.gripTestMethod, options: ASSESSMENT_OPTIONS.gripTestMethod },
        // Grip Strength - Dynamometer
        { id: 'gripLeftKg' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P5.gripLeftKg, pattern: 'Grip Strength', side: 'left', pairId: 'grip-strength', placeholder: ASSESSMENT_PLACEHOLDERS.P5.gripLeftKg, tooltip: ASSESSMENT_TOOLTIPS.P5.gripLeftKg },
        { id: 'gripRightKg' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P5.gripRightKg, pattern: 'Grip Strength', side: 'right', pairId: 'grip-strength', placeholder: ASSESSMENT_PLACEHOLDERS.P5.gripRightKg, tooltip: ASSESSMENT_TOOLTIPS.P5.gripRightKg },
        // Grip Strength - Dead Hang
        { id: 'gripDeadhangSeconds' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P5.gripDeadhangSeconds, pattern: 'Grip Strength', placeholder: ASSESSMENT_PLACEHOLDERS.P5.gripDeadhangSeconds, tooltip: ASSESSMENT_TOOLTIPS.P5.gripDeadhangSeconds },
        // Grip Strength - Plate Pinch
        { id: 'gripPlatePinchSeconds' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P5.gripPlatePinchSeconds, pattern: 'Grip Strength', placeholder: ASSESSMENT_PLACEHOLDERS.P5.gripPlatePinchSeconds, tooltip: ASSESSMENT_TOOLTIPS.P5.gripPlatePinchSeconds },
      ]
    },
  ],
};
