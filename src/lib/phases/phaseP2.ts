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
        { id: 'heightCm' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P2.heightCm, required: true, placeholder: ASSESSMENT_PLACEHOLDERS.P2.heightCm, tooltip: ASSESSMENT_TOOLTIPS.P2.heightCm },
        { id: 'inbodyWeightKg' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P2.inbodyWeightKg, required: true, placeholder: ASSESSMENT_PLACEHOLDERS.P2.inbodyWeightKg, tooltip: ASSESSMENT_TOOLTIPS.P2.inbodyWeightKg },

        // Body Composition - Body Measurements (STANDARD for all users)
        { id: 'shouldersCm' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P2.shouldersCm, placeholder: ASSESSMENT_PLACEHOLDERS.P2.shouldersCm, tooltip: ASSESSMENT_TOOLTIPS.P2.shouldersCm },
        { id: 'chestCm' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P2.chestCm, placeholder: ASSESSMENT_PLACEHOLDERS.P2.chestCm, tooltip: ASSESSMENT_TOOLTIPS.P2.chestCm },
        { id: 'armLeftCm' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P2.armLeftCm, side: 'left', pairId: 'arm-circumference', placeholder: ASSESSMENT_PLACEHOLDERS.P2.armLeftCm, tooltip: ASSESSMENT_TOOLTIPS.P2.armLeftCm },
        { id: 'armRightCm' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P2.armRightCm, side: 'right', pairId: 'arm-circumference', placeholder: ASSESSMENT_PLACEHOLDERS.P2.armRightCm, tooltip: ASSESSMENT_TOOLTIPS.P2.armRightCm },
        { id: 'waistCm' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P2.waistCm, placeholder: ASSESSMENT_PLACEHOLDERS.P2.waistCm, tooltip: ASSESSMENT_TOOLTIPS.P2.waistCm },
        { id: 'neckCm' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P2.neckCm, placeholder: ASSESSMENT_PLACEHOLDERS.P2.neckCm, tooltip: ASSESSMENT_TOOLTIPS.P2.neckCm },
        { id: 'hipsCm' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P2.hipsCm, placeholder: ASSESSMENT_PLACEHOLDERS.P2.hipsCm, tooltip: ASSESSMENT_TOOLTIPS.P2.hipsCm },
        { id: 'thighLeftCm' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P2.thighLeftCm, side: 'left', pairId: 'thigh-circumference', placeholder: ASSESSMENT_PLACEHOLDERS.P2.thighLeftCm, tooltip: ASSESSMENT_TOOLTIPS.P2.thighLeftCm },
        { id: 'thighRightCm' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P2.thighRightCm, side: 'right', pairId: 'thigh-circumference', placeholder: ASSESSMENT_PLACEHOLDERS.P2.thighRightCm, tooltip: ASSESSMENT_TOOLTIPS.P2.thighRightCm },
        { id: 'calfLeftCm' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P2.calfLeftCm, side: 'left', pairId: 'calf-circumference', placeholder: ASSESSMENT_PLACEHOLDERS.P2.calfLeftCm, tooltip: ASSESSMENT_TOOLTIPS.P2.calfLeftCm },
        { id: 'calfRightCm' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P2.calfRightCm, side: 'right', pairId: 'calf-circumference', placeholder: ASSESSMENT_PLACEHOLDERS.P2.calfRightCm, tooltip: ASSESSMENT_TOOLTIPS.P2.calfRightCm },

        // Body Composition - Analyzer Fields (InBody/DEXA)
        {
          id: 'inbodyScore' as keyof FormData,
          type: 'number' as FieldType,
          label: ASSESSMENT_LABELS.P2.inbodyScore,
          placeholder: ASSESSMENT_PLACEHOLDERS.P2.inbodyScore,
          tooltip: ASSESSMENT_TOOLTIPS.P2.inbodyScore,
          conditional: { showWhen: { field: 'showAnalyzerFields', value: 'yes' } }
        },
        {
          id: 'skeletalMuscleMassKg' as keyof FormData,
          type: 'number' as FieldType,
          label: ASSESSMENT_LABELS.P2.skeletalMuscleMassKg,
          placeholder: ASSESSMENT_PLACEHOLDERS.P2.skeletalMuscleMassKg,
          tooltip: ASSESSMENT_TOOLTIPS.P2.skeletalMuscleMassKg,
          conditional: { showWhen: { field: 'showAnalyzerFields', value: 'yes' } }
        },
        {
          id: 'bodyFatMassKg' as keyof FormData,
          type: 'number' as FieldType,
          label: ASSESSMENT_LABELS.P2.bodyFatMassKg,
          placeholder: ASSESSMENT_PLACEHOLDERS.P2.bodyFatMassKg,
          tooltip: ASSESSMENT_TOOLTIPS.P2.bodyFatMassKg,
          conditional: { showWhen: { field: 'showAnalyzerFields', value: 'yes' } }
        },
        {
          id: 'inbodyBodyFatPct' as keyof FormData,
          type: 'number' as FieldType,
          label: ASSESSMENT_LABELS.P2.inbodyBodyFatPct,
          placeholder: ASSESSMENT_PLACEHOLDERS.P2.inbodyBodyFatPct,
          tooltip: ASSESSMENT_TOOLTIPS.P2.inbodyBodyFatPct,
          conditional: { showWhen: { field: 'showAnalyzerFields', value: 'yes' } }
        },
        {
          id: 'inbodyBmi' as keyof FormData,
          type: 'number' as FieldType,
          label: ASSESSMENT_LABELS.P2.inbodyBmi,
          placeholder: ASSESSMENT_PLACEHOLDERS.P2.inbodyBmi,
          tooltip: ASSESSMENT_TOOLTIPS.P2.inbodyBmi,
          conditional: { showWhen: { field: 'showAnalyzerFields', value: 'yes' } }
        },
        {
          id: 'totalBodyWaterL' as keyof FormData,
          type: 'number' as FieldType,
          label: ASSESSMENT_LABELS.P2.totalBodyWaterL,
          placeholder: ASSESSMENT_PLACEHOLDERS.P2.totalBodyWaterL,
          tooltip: ASSESSMENT_TOOLTIPS.P2.totalBodyWaterL,
          conditional: { showWhen: { field: 'showAnalyzerFields', value: 'yes' } }
        },
        {
          id: 'waistHipRatio' as keyof FormData,
          type: 'number' as FieldType,
          label: ASSESSMENT_LABELS.P2.waistHipRatio,
          placeholder: ASSESSMENT_PLACEHOLDERS.P2.waistHipRatio,
          tooltip: ASSESSMENT_TOOLTIPS.P2.waistHipRatio,
          conditional: { showWhen: { field: 'showAnalyzerFields', value: 'yes' } }
        },
        {
          id: 'visceralFatLevel' as keyof FormData,
          type: 'number' as FieldType,
          label: ASSESSMENT_LABELS.P2.visceralFatLevel,
          placeholder: ASSESSMENT_PLACEHOLDERS.P2.visceralFatLevel,
          tooltip: ASSESSMENT_TOOLTIPS.P2.visceralFatLevel,
          conditional: { showWhen: { field: 'showAnalyzerFields', value: 'yes' } }
        },
        {
          id: 'segmentalTrunkKg' as keyof FormData,
          type: 'number' as FieldType,
          label: ASSESSMENT_LABELS.P2.segmentalTrunkKg,
          placeholder: ASSESSMENT_PLACEHOLDERS.P2.segmentalTrunkKg,
          tooltip: ASSESSMENT_TOOLTIPS.P2.segmentalTrunkKg,
          conditional: { showWhen: { field: 'showAnalyzerFields', value: 'yes' } }
        },
        {
          id: 'segmentalArmLeftKg' as keyof FormData,
          type: 'number' as FieldType,
          label: ASSESSMENT_LABELS.P2.segmentalArmLeftKg,
          side: 'left',
          pairId: 'arm-lean',
          placeholder: ASSESSMENT_PLACEHOLDERS.P2.segmentalArmLeftKg,
          tooltip: ASSESSMENT_TOOLTIPS.P2.segmentalArmLeftKg,
          conditional: { showWhen: { field: 'showAnalyzerFields', value: 'yes' } }
        },
        {
          id: 'segmentalArmRightKg' as keyof FormData,
          type: 'number' as FieldType,
          label: ASSESSMENT_LABELS.P2.segmentalArmRightKg,
          side: 'right',
          pairId: 'arm-lean',
          placeholder: ASSESSMENT_PLACEHOLDERS.P2.segmentalArmRightKg,
          tooltip: ASSESSMENT_TOOLTIPS.P2.segmentalArmRightKg,
          conditional: { showWhen: { field: 'showAnalyzerFields', value: 'yes' } }
        },
        {
          id: 'segmentalLegLeftKg' as keyof FormData,
          type: 'number' as FieldType,
          label: ASSESSMENT_LABELS.P2.segmentalLegLeftKg,
          side: 'left',
          pairId: 'leg-lean',
          placeholder: ASSESSMENT_PLACEHOLDERS.P2.segmentalLegLeftKg,
          tooltip: ASSESSMENT_TOOLTIPS.P2.segmentalLegLeftKg,
          conditional: { showWhen: { field: 'showAnalyzerFields', value: 'yes' } }
        },
        {
          id: 'segmentalLegRightKg' as keyof FormData,
          type: 'number' as FieldType,
          label: ASSESSMENT_LABELS.P2.segmentalLegRightKg,
          side: 'right',
          pairId: 'leg-lean',
          placeholder: ASSESSMENT_PLACEHOLDERS.P2.segmentalLegRightKg,
          tooltip: ASSESSMENT_TOOLTIPS.P2.segmentalLegRightKg,
          conditional: { showWhen: { field: 'showAnalyzerFields', value: 'yes' } }
        },
        {
          id: 'bmrKcal' as keyof FormData,
          type: 'number' as FieldType,
          label: ASSESSMENT_LABELS.P2.bmrKcal,
          placeholder: ASSESSMENT_PLACEHOLDERS.P2.bmrKcal,
          tooltip: ASSESSMENT_TOOLTIPS.P2.bmrKcal,
          conditional: { showWhen: { field: 'showAnalyzerFields', value: 'yes' } }
        },
      ]
    }
  ],
};
