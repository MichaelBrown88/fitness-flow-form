/**
 * Phase P4: Movement & Posture Assessment
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

export const phaseP4: PhaseDefinition = {
  id: 'P4',
  title: PHASE_TITLES.P4,
  summary: PHASE_SUMMARIES.P4,
  gateHint: PHASE_GATE_HINTS.P4,
  sections: [
    {
      id: 'posture',
      title: SECTION_TITLES.P4.posture,
      fields: [
        {
          id: 'postureInputMode' as keyof FormData,
          type: 'select' as FieldType,
          label: ASSESSMENT_LABELS.P4.postureInputMode,
          required: true,
          tooltip: ASSESSMENT_TOOLTIPS.P4.postureInputMode,
          options: ASSESSMENT_OPTIONS.postureInputMode,
        },
        {
          id: 'postureHeadOverall' as keyof FormData,
          type: 'multiselect' as FieldType,
          label: ASSESSMENT_LABELS.P4.postureHeadOverall,
          tooltip: ASSESSMENT_TOOLTIPS.P4.postureHeadOverall,
          conditional: { showWhen: { field: 'postureInputMode', value: 'manual' } },
          options: ASSESSMENT_OPTIONS.postureHeadOverall,
        },
        {
          id: 'postureShouldersOverall' as keyof FormData,
          type: 'multiselect' as FieldType,
          label: ASSESSMENT_LABELS.P4.postureShouldersOverall,
          tooltip: ASSESSMENT_TOOLTIPS.P4.postureShouldersOverall,
          conditional: { showWhen: { field: 'postureInputMode', value: 'manual' } },
          options: ASSESSMENT_OPTIONS.postureShouldersOverall,
        },
        {
          id: 'postureBackOverall' as keyof FormData,
          type: 'multiselect' as FieldType,
          label: ASSESSMENT_LABELS.P4.postureBackOverall,
          tooltip: ASSESSMENT_TOOLTIPS.P4.postureBackOverall,
          conditional: { showWhen: { field: 'postureInputMode', value: 'manual' } },
          options: ASSESSMENT_OPTIONS.postureBackOverall,
        },
        {
          id: 'postureHipsOverall' as keyof FormData,
          type: 'multiselect' as FieldType,
          label: ASSESSMENT_LABELS.P4.postureHipsOverall,
          tooltip: ASSESSMENT_TOOLTIPS.P4.postureHipsOverall,
          conditional: { showWhen: { field: 'postureInputMode', value: 'manual' } },
          options: ASSESSMENT_OPTIONS.postureHipsOverall,
        },
        {
          id: 'postureKneesOverall' as keyof FormData,
          type: 'multiselect' as FieldType,
          label: ASSESSMENT_LABELS.P4.postureKneesOverall,
          tooltip: ASSESSMENT_TOOLTIPS.P4.postureKneesOverall,
          conditional: { showWhen: { field: 'postureInputMode', value: 'manual' } },
          options: ASSESSMENT_OPTIONS.postureKneesOverall,
        },
      ],
    },
    {
      id: 'overhead-squat',
      title: SECTION_TITLES.P4['overhead-squat'],
      fields: [
        { id: 'ohsShoulderMobility' as keyof FormData, type: 'select' as FieldType, label: ASSESSMENT_LABELS.P4.ohsShoulderMobility, pattern: 'Overhead Squat', tooltip: ASSESSMENT_TOOLTIPS.P4.ohsShoulderMobility, options: ASSESSMENT_OPTIONS.ohsShoulderMobility },
        { id: 'ohsTorsoLean' as keyof FormData, type: 'select' as FieldType, label: ASSESSMENT_LABELS.P4.ohsTorsoLean, pattern: 'Overhead Squat', tooltip: ASSESSMENT_TOOLTIPS.P4.ohsTorsoLean, options: ASSESSMENT_OPTIONS.ohsTorsoLean },
        { id: 'ohsSquatDepth' as keyof FormData, type: 'select' as FieldType, label: ASSESSMENT_LABELS.P4.ohsSquatDepth, pattern: 'Overhead Squat', tooltip: ASSESSMENT_TOOLTIPS.P4.ohsSquatDepth, options: ASSESSMENT_OPTIONS.ohsSquatDepth },
        { id: 'ohsHipShift' as keyof FormData, type: 'select' as FieldType, label: ASSESSMENT_LABELS.P4.ohsHipShift, pattern: 'Overhead Squat', tooltip: ASSESSMENT_TOOLTIPS.P4.ohsHipShift, options: ASSESSMENT_OPTIONS.ohsHipShift },
        { id: 'ohsKneeAlignment' as keyof FormData, type: 'select' as FieldType, label: ASSESSMENT_LABELS.P4.ohsKneeAlignment, pattern: 'Overhead Squat', tooltip: ASSESSMENT_TOOLTIPS.P4.ohsKneeAlignment, options: ASSESSMENT_OPTIONS.ohsKneeAlignment },
        { id: 'ohsFeetPosition' as keyof FormData, type: 'select' as FieldType, label: ASSESSMENT_LABELS.P4.ohsFeetPosition, pattern: 'Overhead Squat', tooltip: ASSESSMENT_TOOLTIPS.P4.ohsFeetPosition, options: ASSESSMENT_OPTIONS.ohsFeetPosition },
        { id: 'ohsHasPain' as keyof FormData, type: 'select' as FieldType, label: ASSESSMENT_LABELS.P4.ohsHasPain, tooltip: ASSESSMENT_TOOLTIPS.P4.ohsHasPain, options: ASSESSMENT_OPTIONS.ohsHasPain },
        { id: 'ohsPainLevel' as keyof FormData, type: 'select' as FieldType, label: ASSESSMENT_LABELS.P4.ohsPainLevel, tooltip: ASSESSMENT_TOOLTIPS.P4.ohsPainLevel, conditional: { showWhen: { field: 'ohsHasPain', value: 'yes' } }, options: ASSESSMENT_OPTIONS.ohsPainLevel },
      ],
    },
    {
      id: 'hinge-assessment',
      title: SECTION_TITLES.P4['hinge-assessment'],
      fields: [
        { id: 'hingeDepth' as keyof FormData, type: 'select' as FieldType, label: ASSESSMENT_LABELS.P4.hingeDepth, pattern: 'Hip Hinge', tooltip: ASSESSMENT_TOOLTIPS.P4.hingeDepth, options: ASSESSMENT_OPTIONS.hingeDepth },
        { id: 'hingeBackRounding' as keyof FormData, type: 'select' as FieldType, label: ASSESSMENT_LABELS.P4.hingeBackRounding, pattern: 'Hip Hinge', tooltip: ASSESSMENT_TOOLTIPS.P4.hingeBackRounding, options: ASSESSMENT_OPTIONS.hingeBackRounding },
        { id: 'hingeHasPain' as keyof FormData, type: 'select' as FieldType, label: ASSESSMENT_LABELS.P4.hingeHasPain, tooltip: ASSESSMENT_TOOLTIPS.P4.hingeHasPain, options: ASSESSMENT_OPTIONS.hingeHasPain },
        { id: 'hingePainLevel' as keyof FormData, type: 'select' as FieldType, label: ASSESSMENT_LABELS.P4.hingePainLevel, tooltip: ASSESSMENT_TOOLTIPS.P4.hingePainLevel, conditional: { showWhen: { field: 'hingeHasPain', value: 'yes' } }, options: ASSESSMENT_OPTIONS.hingePainLevel },
      ]
    },
    {
      id: 'lunge-assessment',
      title: SECTION_TITLES.P4['lunge-assessment'],
      fields: [
        // Left side — all checks grouped together
        { id: 'lungeLeftBalance' as keyof FormData, type: 'select' as FieldType, label: ASSESSMENT_LABELS.P4.lungeLeftBalance, pattern: 'Lunge', side: 'left', tooltip: ASSESSMENT_TOOLTIPS.P4.lungeLeftBalance, options: ASSESSMENT_OPTIONS.lungeBalance },
        { id: 'lungeLeftKneeAlignment' as keyof FormData, type: 'select' as FieldType, label: ASSESSMENT_LABELS.P4.lungeLeftKneeAlignment, pattern: 'Lunge', side: 'left', tooltip: ASSESSMENT_TOOLTIPS.P4.lungeLeftKneeAlignment, options: ASSESSMENT_OPTIONS.lungeKneeAlignment },
        { id: 'lungeLeftTorso' as keyof FormData, type: 'select' as FieldType, label: ASSESSMENT_LABELS.P4.lungeLeftTorso, pattern: 'Lunge', side: 'left', tooltip: ASSESSMENT_TOOLTIPS.P4.lungeLeftTorso, options: ASSESSMENT_OPTIONS.lungeHipShift },
        // Right side — all checks grouped together
        { id: 'lungeRightBalance' as keyof FormData, type: 'select' as FieldType, label: ASSESSMENT_LABELS.P4.lungeRightBalance, pattern: 'Lunge', side: 'right', tooltip: ASSESSMENT_TOOLTIPS.P4.lungeRightBalance, options: ASSESSMENT_OPTIONS.lungeBalance },
        { id: 'lungeRightKneeAlignment' as keyof FormData, type: 'select' as FieldType, label: ASSESSMENT_LABELS.P4.lungeRightKneeAlignment, pattern: 'Lunge', side: 'right', tooltip: ASSESSMENT_TOOLTIPS.P4.lungeRightKneeAlignment, options: ASSESSMENT_OPTIONS.lungeKneeAlignment },
        { id: 'lungeRightTorso' as keyof FormData, type: 'select' as FieldType, label: ASSESSMENT_LABELS.P4.lungeRightTorso, pattern: 'Lunge', side: 'right', tooltip: ASSESSMENT_TOOLTIPS.P4.lungeRightTorso, options: ASSESSMENT_OPTIONS.lungeHipShift },
        // Pain — shared
        { id: 'lungeHasPain' as keyof FormData, type: 'select' as FieldType, label: ASSESSMENT_LABELS.P4.lungeHasPain, tooltip: ASSESSMENT_TOOLTIPS.P4.lungeHasPain, options: ASSESSMENT_OPTIONS.lungeHasPain },
        { id: 'lungePainLevel' as keyof FormData, type: 'select' as FieldType, label: ASSESSMENT_LABELS.P4.lungePainLevel, tooltip: ASSESSMENT_TOOLTIPS.P4.lungePainLevel, conditional: { showWhen: { field: 'lungeHasPain', value: 'yes' } }, options: ASSESSMENT_OPTIONS.lungePainLevel },
      ]
    },
    {
      id: 'mobility',
      title: SECTION_TITLES.P4.mobility,
      fields: [
        { id: 'mobilityHip' as keyof FormData, type: 'select' as FieldType, label: ASSESSMENT_LABELS.P4.mobilityHip, pattern: 'Hip Mobility', tooltip: ASSESSMENT_TOOLTIPS.P4.mobilityHip, options: ASSESSMENT_OPTIONS.mobilityQuality },
        { id: 'mobilityShoulder' as keyof FormData, type: 'select' as FieldType, label: ASSESSMENT_LABELS.P4.mobilityShoulder, pattern: 'Shoulder Mobility', tooltip: ASSESSMENT_TOOLTIPS.P4.mobilityShoulder, options: ASSESSMENT_OPTIONS.mobilityQuality },
        { id: 'mobilityAnkleLeft' as keyof FormData, type: 'select' as FieldType, label: ASSESSMENT_LABELS.P4.mobilityAnkleLeft, pattern: 'Ankle Mobility', side: 'left', pairId: 'ankle-mobility', tooltip: ASSESSMENT_TOOLTIPS.P4.mobilityAnkleLeft, options: ASSESSMENT_OPTIONS.mobilityQuality },
        { id: 'mobilityAnkleRight' as keyof FormData, type: 'select' as FieldType, label: ASSESSMENT_LABELS.P4.mobilityAnkleRight, pattern: 'Ankle Mobility', side: 'right', pairId: 'ankle-mobility', tooltip: ASSESSMENT_TOOLTIPS.P4.mobilityAnkleRight, options: ASSESSMENT_OPTIONS.mobilityQuality },
      ]
    },
  ],
};
