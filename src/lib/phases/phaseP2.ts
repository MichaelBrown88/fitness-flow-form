/**
 * Phase P2: Body Composition
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
  SECTION_TITLES
} from '@/constants/assessment';

export const phaseP2: PhaseDefinition = {
  id: 'P2',
  title: PHASE_TITLES.P2,
  summary: PHASE_SUMMARIES.P2,
  gateHint: PHASE_GATE_HINTS.P2,
  sections: [
    {
      id: 'body-comp',
      title: SECTION_TITLES.P2['body-comp'],
      fields: [
        // Tape measurements first: taken right after the posture photos while
        // the client is still changed, before walking out to the analyzer.
        { id: 'shouldersCm' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P2.shouldersCm, required: true, pairId: 'tape-measurements', placeholder: ASSESSMENT_PLACEHOLDERS.P2.shouldersCm, tooltip: ASSESSMENT_TOOLTIPS.P2.shouldersCm },
        { id: 'chestCm' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P2.chestCm, required: true, pairId: 'tape-measurements', placeholder: ASSESSMENT_PLACEHOLDERS.P2.chestCm, tooltip: ASSESSMENT_TOOLTIPS.P2.chestCm },
        { id: 'armLeftCm' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P2.armLeftCm, required: true, side: 'left', pairId: 'tape-measurements', placeholder: ASSESSMENT_PLACEHOLDERS.P2.armLeftCm, tooltip: ASSESSMENT_TOOLTIPS.P2.armLeftCm },
        { id: 'armRightCm' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P2.armRightCm, required: true, side: 'right', pairId: 'tape-measurements', placeholder: ASSESSMENT_PLACEHOLDERS.P2.armRightCm, tooltip: ASSESSMENT_TOOLTIPS.P2.armRightCm },
        { id: 'waistCm' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P2.waistCm, required: true, pairId: 'tape-measurements', placeholder: ASSESSMENT_PLACEHOLDERS.P2.waistCm, tooltip: ASSESSMENT_TOOLTIPS.P2.waistCm },
        { id: 'neckCm' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P2.neckCm, required: true, pairId: 'tape-measurements', placeholder: ASSESSMENT_PLACEHOLDERS.P2.neckCm, tooltip: ASSESSMENT_TOOLTIPS.P2.neckCm },
        { id: 'hipsCm' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P2.hipsCm, required: true, pairId: 'tape-measurements', placeholder: ASSESSMENT_PLACEHOLDERS.P2.hipsCm, tooltip: ASSESSMENT_TOOLTIPS.P2.hipsCm },
        { id: 'thighLeftCm' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P2.thighLeftCm, required: true, side: 'left', pairId: 'tape-measurements', placeholder: ASSESSMENT_PLACEHOLDERS.P2.thighLeftCm, tooltip: ASSESSMENT_TOOLTIPS.P2.thighLeftCm },
        { id: 'thighRightCm' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P2.thighRightCm, required: true, side: 'right', pairId: 'tape-measurements', placeholder: ASSESSMENT_PLACEHOLDERS.P2.thighRightCm, tooltip: ASSESSMENT_TOOLTIPS.P2.thighRightCm },
        { id: 'calfLeftCm' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P2.calfLeftCm, required: true, side: 'left', pairId: 'tape-measurements', placeholder: ASSESSMENT_PLACEHOLDERS.P2.calfLeftCm, tooltip: ASSESSMENT_TOOLTIPS.P2.calfLeftCm },
        { id: 'calfRightCm' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P2.calfRightCm, required: true, side: 'right', pairId: 'tape-measurements', placeholder: ASSESSMENT_PLACEHOLDERS.P2.calfRightCm, tooltip: ASSESSMENT_TOOLTIPS.P2.calfRightCm },

        { id: 'heightCm' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P2.heightCm, required: true, placeholder: ASSESSMENT_PLACEHOLDERS.P2.heightCm, tooltip: ASSESSMENT_TOOLTIPS.P2.heightCm },
        { id: 'inbodyWeightKg' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P2.inbodyWeightKg, required: true, placeholder: ASSESSMENT_PLACEHOLDERS.P2.inbodyWeightKg, tooltip: ASSESSMENT_TOOLTIPS.P2.inbodyWeightKg },

        // Body Composition - Analyzer Fields: one grouped confirm screen (shown
        // after an OCR apply or when the coach opts in to manual analyzer entry).
        // Analyzer score / BMI / total body water are OCR-only: BMI is derived
        // from height + weight and the other two drive no score or feedback.
        { id: 'skeletalMuscleMassKg' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P2.skeletalMuscleMassKg, pairId: 'analyzer-confirm', placeholder: ASSESSMENT_PLACEHOLDERS.P2.skeletalMuscleMassKg, tooltip: ASSESSMENT_TOOLTIPS.P2.skeletalMuscleMassKg, conditional: { showWhen: { field: 'showAnalyzerFields', value: 'yes' } } },
        { id: 'bodyFatMassKg' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P2.bodyFatMassKg, pairId: 'analyzer-confirm', placeholder: ASSESSMENT_PLACEHOLDERS.P2.bodyFatMassKg, tooltip: ASSESSMENT_TOOLTIPS.P2.bodyFatMassKg, conditional: { showWhen: { field: 'showAnalyzerFields', value: 'yes' } } },
        { id: 'inbodyBodyFatPct' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P2.inbodyBodyFatPct, pairId: 'analyzer-confirm', placeholder: ASSESSMENT_PLACEHOLDERS.P2.inbodyBodyFatPct, tooltip: ASSESSMENT_TOOLTIPS.P2.inbodyBodyFatPct, conditional: { showWhen: { field: 'showAnalyzerFields', value: 'yes' } } },
        { id: 'waistHipRatio' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P2.waistHipRatio, pairId: 'analyzer-confirm', placeholder: ASSESSMENT_PLACEHOLDERS.P2.waistHipRatio, tooltip: ASSESSMENT_TOOLTIPS.P2.waistHipRatio, conditional: { showWhen: { field: 'showAnalyzerFields', value: 'yes' } } },
        { id: 'visceralFatLevel' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P2.visceralFatLevel, pairId: 'analyzer-confirm', placeholder: ASSESSMENT_PLACEHOLDERS.P2.visceralFatLevel, tooltip: ASSESSMENT_TOOLTIPS.P2.visceralFatLevel, conditional: { showWhen: { field: 'showAnalyzerFields', value: 'yes' } } },
        { id: 'segmentalTrunkKg' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P2.segmentalTrunkKg, pairId: 'analyzer-confirm', placeholder: ASSESSMENT_PLACEHOLDERS.P2.segmentalTrunkKg, tooltip: ASSESSMENT_TOOLTIPS.P2.segmentalTrunkKg, conditional: { showWhen: { field: 'showAnalyzerFields', value: 'yes' } } },
        { id: 'segmentalArmLeftKg' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P2.segmentalArmLeftKg, side: 'left', pairId: 'analyzer-confirm', placeholder: ASSESSMENT_PLACEHOLDERS.P2.segmentalArmLeftKg, tooltip: ASSESSMENT_TOOLTIPS.P2.segmentalArmLeftKg, conditional: { showWhen: { field: 'showAnalyzerFields', value: 'yes' } } },
        { id: 'segmentalArmRightKg' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P2.segmentalArmRightKg, side: 'right', pairId: 'analyzer-confirm', placeholder: ASSESSMENT_PLACEHOLDERS.P2.segmentalArmRightKg, tooltip: ASSESSMENT_TOOLTIPS.P2.segmentalArmRightKg, conditional: { showWhen: { field: 'showAnalyzerFields', value: 'yes' } } },
        { id: 'segmentalLegLeftKg' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P2.segmentalLegLeftKg, side: 'left', pairId: 'analyzer-confirm', placeholder: ASSESSMENT_PLACEHOLDERS.P2.segmentalLegLeftKg, tooltip: ASSESSMENT_TOOLTIPS.P2.segmentalLegLeftKg, conditional: { showWhen: { field: 'showAnalyzerFields', value: 'yes' } } },
        { id: 'segmentalLegRightKg' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P2.segmentalLegRightKg, side: 'right', pairId: 'analyzer-confirm', placeholder: ASSESSMENT_PLACEHOLDERS.P2.segmentalLegRightKg, tooltip: ASSESSMENT_TOOLTIPS.P2.segmentalLegRightKg, conditional: { showWhen: { field: 'showAnalyzerFields', value: 'yes' } } },
        { id: 'bmrKcal' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P2.bmrKcal, pairId: 'analyzer-confirm', placeholder: ASSESSMENT_PLACEHOLDERS.P2.bmrKcal, tooltip: ASSESSMENT_TOOLTIPS.P2.bmrKcal, conditional: { showWhen: { field: 'showAnalyzerFields', value: 'yes' } } },
      ]
    }
  ],
};
