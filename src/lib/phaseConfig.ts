import type { FormData } from '@/contexts/FormContext';
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

export type PhaseId = 'P0' | 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6' | 'P7';

export type FieldType = 'text' | 'number' | 'select' | 'textarea' | 'choice' | 'multiselect' | 'parq' | 'email' | 'tel' | 'date' | 'time';

export interface PhaseField {
  id: keyof FormData;
  type: FieldType;
  label: string;
  description?: string;
  placeholder?: string;
  tooltip?: string;
  options?: { 
    value: string; 
    label: string; 
    subtitle?: string;
    isRecommended?: boolean;
    tag?: string;
  }[];
  required?: boolean;
  readOnly?: boolean;
  pattern?: string; // Movement pattern (e.g., 'Hip Hinge', 'Lunge')
  side?: 'left' | 'right'; // For side-by-side comparison
  pairId?: string; // To group fields together on one screen
  conditional?: {
    showWhen: {
      field: string;
      value?: string;
      notValue?: string;
      exists?: boolean;
      includes?: string;
    };
  };
}

export interface PhaseSection {
  id: string;
  title: string;
  description?: string;
  instructions?: {
    clientInstructions: string;
    coachNotes: string;
  };
  fields: PhaseField[];
}

export interface PhaseDefinition {
  id: PhaseId;
  title: string;
  summary: string;
  gateHint?: string;
  fields?: PhaseField[];
  sections?: PhaseSection[];
  gatedWarning?: (formData: FormData) => string | null;
}

export interface IntakeField extends PhaseField {
  id: keyof FormData;
  type: FieldType;
  label: string;
  placeholder?: string;
  required?: boolean;
}

// intakeFields moved to P1 Lifestyle Assessment section

export const phaseDefinitions: PhaseDefinition[] = [
  {
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
          { id: 'assignedCoach' as keyof FormData, type: 'select' as FieldType, label: ASSESSMENT_LABELS.P0.assignedCoach, required: true, tooltip: ASSESSMENT_TOOLTIPS.P0.assignedCoach },
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
            id: 'primaryTrainingStyle' as keyof FormData, 
            type: 'select' as FieldType, 
            label: ASSESSMENT_LABELS.P0.primaryTrainingStyle, 
            tooltip: ASSESSMENT_TOOLTIPS.P0.primaryTrainingStyle,
            options: ASSESSMENT_OPTIONS.primaryTrainingStyle,
            conditional: { 
              showWhen: { 
                field: 'recentActivity', 
                notValue: 'stopped-6-months' 
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
  },
  {
    id: 'P1',
    title: PHASE_TITLES.P1,
    summary: PHASE_SUMMARIES.P1,
    gateHint: PHASE_GATE_HINTS.P1,
    sections: [
      {
        id: 'lifestyle-overview',
        title: SECTION_TITLES.P1['lifestyle-overview'],
        fields: [
          { id: 'activityLevel' as keyof FormData, type: 'select' as FieldType, label: ASSESSMENT_LABELS.P1.activityLevel, required: true, tooltip: ASSESSMENT_TOOLTIPS.P1.activityLevel, options: ASSESSMENT_OPTIONS.activityLevel },
          { id: 'stepsPerDay' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P1.stepsPerDay, placeholder: ASSESSMENT_PLACEHOLDERS.P1.stepsPerDay, tooltip: ASSESSMENT_TOOLTIPS.P1.stepsPerDay },
          { id: 'sedentaryHours' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P1.sedentaryHours, placeholder: ASSESSMENT_PLACEHOLDERS.P1.sedentaryHours, tooltip: ASSESSMENT_TOOLTIPS.P1.sedentaryHours },
          { id: 'workHoursPerDay' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P1.workHoursPerDay, placeholder: ASSESSMENT_PLACEHOLDERS.P1.workHoursPerDay, tooltip: ASSESSMENT_TOOLTIPS.P1.workHoursPerDay },
          { id: 'sleepQuality' as keyof FormData, type: 'select' as FieldType, label: ASSESSMENT_LABELS.P1.sleepQuality, tooltip: ASSESSMENT_TOOLTIPS.P1.sleepQuality, options: ASSESSMENT_OPTIONS.sleepQuality },
          { id: 'sleepDuration' as keyof FormData, type: 'select' as FieldType, label: ASSESSMENT_LABELS.P1.sleepDuration, tooltip: ASSESSMENT_TOOLTIPS.P1.sleepDuration, options: ASSESSMENT_OPTIONS.sleepDuration },
          { id: 'sleepConsistency' as keyof FormData, type: 'select' as FieldType, label: ASSESSMENT_LABELS.P1.sleepConsistency, tooltip: ASSESSMENT_TOOLTIPS.P1.sleepConsistency, options: ASSESSMENT_OPTIONS.sleepConsistency },
          { id: 'stressLevel' as keyof FormData, type: 'select' as FieldType, label: ASSESSMENT_LABELS.P1.stressLevel, tooltip: ASSESSMENT_TOOLTIPS.P1.stressLevel, options: ASSESSMENT_OPTIONS.stressLevel },
          { id: 'nutritionHabits' as keyof FormData, type: 'select' as FieldType, label: ASSESSMENT_LABELS.P1.nutritionHabits, tooltip: ASSESSMENT_TOOLTIPS.P1.nutritionHabits, options: ASSESSMENT_OPTIONS.nutritionHabits },
          { id: 'hydrationHabits' as keyof FormData, type: 'select' as FieldType, label: ASSESSMENT_LABELS.P1.hydrationHabits, tooltip: ASSESSMENT_TOOLTIPS.P1.hydrationHabits, options: ASSESSMENT_OPTIONS.hydrationHabits },
          { id: 'caffeineCupsPerDay' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P1.caffeineCupsPerDay, placeholder: ASSESSMENT_PLACEHOLDERS.P1.caffeineCupsPerDay, tooltip: ASSESSMENT_TOOLTIPS.P1.caffeineCupsPerDay },
          { id: 'lastCaffeineIntake' as keyof FormData, type: 'time' as FieldType, label: ASSESSMENT_LABELS.P1.lastCaffeineIntake, tooltip: ASSESSMENT_TOOLTIPS.P1.lastCaffeineIntake, conditional: { showWhen: { field: 'caffeineCupsPerDay', exists: true, notValue: '0' } } },
        ],
      }
    ],
  },
  {
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
          // When analyzer data is not used, these measurements are used to calculate body composition scores
          // Measurements taken separately for left/right limbs to detect imbalances
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
          
          // Body Composition - Analyzer Fields (InBody/DEXA - shown when equipment enabled OR when client brings report)
          // Note: The "Scan InBody Report" button is shown below these fields in SingleFieldFlow component
          // These fields are hidden when equipment is disabled UNLESS analyzer data has been entered
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
  },
  {
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
  },
  {
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
          {
            id: 'ohsShoulderMobility' as keyof FormData, type: 'select' as FieldType, label: ASSESSMENT_LABELS.P4.ohsShoulderMobility, pattern: 'Overhead Squat', tooltip: ASSESSMENT_TOOLTIPS.P4.ohsShoulderMobility, options: ASSESSMENT_OPTIONS.ohsShoulderMobility
          },
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
          { id: 'lungeLeftBalance' as keyof FormData, type: 'select' as FieldType, label: ASSESSMENT_LABELS.P4.lungeLeftBalance, pattern: 'Lunge', side: 'left', pairId: 'lunge-balance', tooltip: ASSESSMENT_TOOLTIPS.P4.lungeLeftBalance, options: ASSESSMENT_OPTIONS.lungeBalance },
          { id: 'lungeRightBalance' as keyof FormData, type: 'select' as FieldType, label: ASSESSMENT_LABELS.P4.lungeRightBalance, pattern: 'Lunge', side: 'right', pairId: 'lunge-balance', tooltip: ASSESSMENT_TOOLTIPS.P4.lungeRightBalance, options: ASSESSMENT_OPTIONS.lungeBalance },
          { id: 'lungeLeftKneeAlignment' as keyof FormData, type: 'select' as FieldType, label: ASSESSMENT_LABELS.P4.lungeLeftKneeAlignment, pattern: 'Lunge', side: 'left', pairId: 'lunge-knee', tooltip: ASSESSMENT_TOOLTIPS.P4.lungeLeftKneeAlignment, options: ASSESSMENT_OPTIONS.lungeKneeAlignment },
          { id: 'lungeRightKneeAlignment' as keyof FormData, type: 'select' as FieldType, label: ASSESSMENT_LABELS.P4.lungeRightKneeAlignment, pattern: 'Lunge', side: 'right', pairId: 'lunge-knee', tooltip: ASSESSMENT_TOOLTIPS.P4.lungeRightKneeAlignment, options: ASSESSMENT_OPTIONS.lungeKneeAlignment },
          { id: 'lungeLeftTorso' as keyof FormData, type: 'select' as FieldType, label: ASSESSMENT_LABELS.P4.lungeLeftTorso, pattern: 'Lunge', side: 'left', pairId: 'lunge-hips', tooltip: ASSESSMENT_TOOLTIPS.P4.lungeLeftTorso, options: ASSESSMENT_OPTIONS.lungeHipShift },
          { id: 'lungeRightTorso' as keyof FormData, type: 'select' as FieldType, label: ASSESSMENT_LABELS.P4.lungeRightTorso, pattern: 'Lunge', side: 'right', pairId: 'lunge-hips', tooltip: ASSESSMENT_TOOLTIPS.P4.lungeRightTorso, options: ASSESSMENT_OPTIONS.lungeHipShift },
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
          { id: 'mobilityAnkle' as keyof FormData, type: 'select' as FieldType, label: ASSESSMENT_LABELS.P4.mobilityAnkle, pattern: 'Ankle Mobility', tooltip: ASSESSMENT_TOOLTIPS.P4.mobilityAnkle, options: ASSESSMENT_OPTIONS.mobilityQuality },
        ]
      },
    ],
  },
  {
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
          // Grip Strength - Test Method Selection (shown when equipment is disabled)
          { id: 'gripTestMethod' as keyof FormData, type: 'select' as FieldType, label: ASSESSMENT_LABELS.P5.gripTestMethod, pattern: 'Grip Strength', tooltip: ASSESSMENT_TOOLTIPS.P5.gripTestMethod, options: ASSESSMENT_OPTIONS.gripTestMethod },
          // Grip Strength - Dynamometer (default when equipment enabled)
          { id: 'gripLeftKg' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P5.gripLeftKg, pattern: 'Grip Strength', side: 'left', pairId: 'grip-strength', placeholder: ASSESSMENT_PLACEHOLDERS.P5.gripLeftKg, tooltip: ASSESSMENT_TOOLTIPS.P5.gripLeftKg },
          { id: 'gripRightKg' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P5.gripRightKg, pattern: 'Grip Strength', side: 'right', pairId: 'grip-strength', placeholder: ASSESSMENT_PLACEHOLDERS.P5.gripRightKg, tooltip: ASSESSMENT_TOOLTIPS.P5.gripRightKg },
          // Grip Strength - Dead Hang (alternative when equipment disabled)
          { id: 'gripDeadhangSeconds' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P5.gripDeadhangSeconds, pattern: 'Grip Strength', placeholder: ASSESSMENT_PLACEHOLDERS.P5.gripDeadhangSeconds, tooltip: ASSESSMENT_TOOLTIPS.P5.gripDeadhangSeconds },
          // Grip Strength - Plate Pinch (alternative when equipment disabled)
          { id: 'gripPlatePinchSeconds' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P5.gripPlatePinchSeconds, pattern: 'Grip Strength', placeholder: ASSESSMENT_PLACEHOLDERS.P5.gripPlatePinchSeconds, tooltip: ASSESSMENT_TOOLTIPS.P5.gripPlatePinchSeconds },
        ]
      },
    ],
  },
  {
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
            // Note: goalLevelStrength options are dynamically filtered elsewhere based on gender/experience
            // Using flat array here as fallback - actual options computed in component
            options: [
              // Male
              { value: '2x-bw-deadlift', label: '2.0x BW Deadlift' },
              { value: '1.75x-bw-squat', label: '1.75x BW Squat' },
              { value: '1.5x-bw-bench', label: '1.5x BW Bench Press' },
              { value: 'powerlifting-total', label: 'Maximize Total' },
              // Female
              { value: '1.5x-bw-deadlift', label: '1.75x/1.5x BW Deadlift' },
              { value: '1.5x-bw-squat', label: '1.5x BW Squat' },
              { value: '1x-bw-bench', label: '1.0x BW Bench' },
              { value: 'chinup-mastery', label: '3 Strict Pull-ups' },
              // Intermediate
              { value: '0.75x-bw-bench', label: '0.75x BW Bench' },
              { value: '1x-bw-squat', label: '1.0x BW Squat' },
              { value: '1.25x-bw-deadlift', label: '1.25x BW Deadlift' },
              { value: 'pullup-mastery', label: '10 Pull-ups' },
              { value: 'pushup-mastery', label: '10 Pushups' },
              // Beginner
              { value: 'technique-mastery', label: 'Master Technique' },
              { value: 'linear-progression', label: 'Linear Progression' },
              { value: 'bodyweight-basics', label: 'Bodyweight Basics' },
              { value: 'core-foundation', label: 'Core Foundation' },
            ],
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
  },
  {
    id: 'P7',
    title: PHASE_TITLES.P7,
    summary: PHASE_SUMMARIES.P7,
    gateHint: PHASE_GATE_HINTS.P7,
    sections: [],
  },
];
