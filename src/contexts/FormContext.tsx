import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { PostureAnalysisResult } from '@/lib/ai/postureAnalysis';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { getInitialFormDataFromSession } from '@/contexts/form/initialFormFromSession';
import type { AssessmentPlan } from '@/lib/types/assessmentPlan';

export interface FormData {
  /** Client Profile */
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  assignedCoach: string;
  clientGoals: string[];
  heightCm: string;
  // Goal target details
  weightLossTargetKg: string;
  muscleGainTargetKg: string;
  strengthTargetLift: string;
  strengthTarget1RMKg: string;
  fitnessTargetVo2: string;
  // Goal level intents
  goalLevelWeightLoss: string;
  goalLevelMuscle: string;
  goalLevelBodyRecomp: string;
  goalLevelStrength: string;
  goalLevelFitness: string;
  activityLevel: string;
  sleepArchetype: string;
  sleepDuration: string; // Legacy field
  sleepQuality: string; // Legacy field
  sleepConsistency: string; // Legacy field
  stressLevel: string;
  nutritionHabits: string;
  hydrationHabits: string;
  stepsPerDay: string;
  sedentaryHours: string;
  caffeineCupsPerDay: string;
  alcoholFrequency: string;
  lastCaffeineIntake: string;
  trainingHistory: string;
  recentActivity: string;
  primaryTrainingStyle: string; // Legacy field - kept for backward compatibility
  primaryTrainingStyles: string[];
  primaryTrainingStyleOther: string;

  /** Phase 1 — Foundational Health & Body Comp */
  parqQuestionnaire: string;
  /** Phase 2 — Health Screening Vitals/Medications */
  /** @deprecated Use `cardioRestingHr` (P3 Metabolic Fitness). Kept for legacy Firestore rows. */
  restingHeartRate: string;
  restingBPSystolic: string;
  restingBPDiastolic: string;
  medicationsFlag: string;
  medicationsNotes: string;
  parq1: string;
  parq2: string;
  parq3: string;
  parq4: string;
  parq5: string;
  parq6: string;
  parq7: string;
  parq8: string;
  parq9: string;
  parq10: string;
  parq11: string;
  parq12: string;
  parq13: string;
  parqNotes: string;
  inbodyWeightKg: string;
  inbodyBodyFatPct: string;
  bodyFatMassKg: string;
  inbodyBmi: string;
  visceralFatLevel: string;
  skeletalMuscleMassKg: string;
  totalBodyWaterL: string;
  waistHipRatio: string;
  // Alternative body composition methods
  // Skinfold measurements (mm)
  skinfoldTricepMm: string;
  skinfoldChestMm: string;
  skinfoldSubscapularMm: string;
  skinfoldAxillaMm: string;
  skinfoldAbdomenMm: string;
  skinfoldSuprailiacMm: string;
  skinfoldThighMm: string;
  skinfoldBicepMm: string;
  // Body measurements (cm) - simplified method for body composition
  shouldersCm: string;
  chestCm: string;
  armLeftCm: string;
  armRightCm: string;
  waistCm: string;
  hipsCm: string;
  thighLeftCm: string;
  thighRightCm: string;
  calfLeftCm: string;
  calfRightCm: string;
  // Legacy fields (kept for backward compatibility)
  neckCm: string;
  hipCm: string;
  segmentalArmRightKg: string;
  segmentalArmLeftKg: string;
  segmentalLegRightKg: string;
  segmentalLegLeftKg: string;
  segmentalTrunkKg: string;
  bmrKcal: string;
  inbodyScore: string;
  // Body composition method selection
  bodyCompMethod: string; // 'analyzer' (default) | 'measurements' (legacy)
  // Optional toggles for body comp field visibility
  showAnalyzerFields: string; // 'yes' | 'no' - toggles visibility of analyzer fields when equipment is disabled
  showBodyMeasurements: string; // 'yes' | 'no' - additive tape measurement fields

  /** Phase 2 — Posture & Movement Quality */
  postureInputMode: 'manual' | 'ai';
  postureAiResults: Record<string, PostureAnalysisResult> | null; // Detailed AI analysis results
  postureImages: Record<string, string>; // Base64 images
  postureImagesStorage: Record<string, string>; // Firebase Storage URLs
  postureSeverity: string;
  postureForwardHead: string;
  postureRoundedShoulders: string;
  postureHeadOverall: string[];
  postureShouldersOverall: string[];
  postureBackOverall: string[];
  postureHipsOverall: string[];
  postureKneesOverall: string[];
  ohsKneeAlignment: string;
  ohsHeelBehavior: string;
  ohsLumbarControl: string;
  ohsShoulderMobility: string;
  ohsTorsoLean: string;
  ohsSquatDepth: string;
  ohsHipShift: string;
  ohsFeetPosition: string;
  ohsFootKneeBehavior: string;
  ohsHasPain: string;
  ohsPainLevel: string;
  ohsNotes: string;
  modifiedThomasResult: string;
  hingeQuality: string;
  hingeBalance: string;
  hingeDepth: string;
  hingeBackRounding: string;
  hingeHasPain: string;
  hingePainLevel: string;
  hingeNotes: string;
  lungeLeftKneeAlignment: string;
  lungeLeftBalance: string;
  lungeLeftTorso: string;
  lungeRightKneeAlignment: string;
  lungeRightBalance: string;
  lungeRightTorso: string;
  lungeHasPain: string;
  lungePainLevel: string;
  lungeTestNotes: string;
  shoulderMobilityReach: string;
  mobilityHip: string;
  mobilityShoulder: string;
  mobilityAnkle: string; // Legacy field - kept for backward compatibility
  mobilityAnkleLeft: string;
  mobilityAnkleRight: string;
  movementNotes: string;
  pushupTest: string;
  squatTest: string;

  /** Phase 3 — Core Stability & Endurance */
  plankHoldSeconds: string;
  plankDurationSeconds: string;
  singleLegStanceLeftGrade: string;
  singleLegStanceRightGrade: string;

  /** Phase 4 — Cardiovascular Fitness */
  cardioTestType: string;
  cardioTestSelected: string;
  cardioRestingHr: string;
  cardioPeakHr: string;
  cardioPost1MinHr: string;
  cardioMedicationFlag: string;
  cardioFinalHeartRate: string;
  cardioVo2MaxEstimate: string;
  cardioTestInstructions: string;
  cardioNotes: string;
  ymcaStepHeight: string;
  ymcaMetronomeBpm: string;
  ymcaPreTestHeartRate: string;
  ymcaPost1MinHeartRate: string;
  ymcaRecoveryHeartRate1: string;
  ymcaRpe: string;
  ymcaNotes: string;
  treadmillProtocol: string;
  treadmillIncline: string;
  treadmillSpeed: string;
  treadmillDurationMin: string;
  treadmillFinalHeartRate: string;
  treadmillRpe: string;
  treadmillTerminationReason: string;
  treadmillNotes: string;

  /** Phase 5 — Strength & Power */
  pushupMaxReps: string;
  squatsOneMinuteReps: string;
  pushupsOneMinuteReps: string;
  gripTestMethod: string; // 'deadhang' | 'pinch' - selection when equipment is disabled
  gripLeftKg: string;
  gripRightKg: string;
  // Alternative grip strength methods
  gripDeadhangSeconds: string;
  gripFarmersWalkDistanceM: string;
  gripFarmersWalkTimeS: string;
  gripFarmersWalkLoadKg: string;
  gripPlatePinchSeconds: string; // Time in seconds holding standardized weight (10kg female, 15kg male)
  chairStandReps: string;
  dynamometerForce: string;

  /** Phase 6 — Assessment Complete */
  coachReport: string;
  clientReport: string;

  /**
   * Scoped phases for this run. When absent/undefined, navigation uses full legacy plan (all phases).
   */
  assessmentPlan?: AssessmentPlan | null;
  /**
   * How the coach intends to run the session (remote MVP uses this for copy + dashboard hints).
   */
  assessmentIntakeMode?: 'studio' | 'send_link_first' | null;
  /** When true, show extra on-screen guidance during onboarding self-assessment */
  coachGuidanceEnabled?: boolean;
}

interface FormContextType {
  formData: FormData;
  updateFormData: (data: Partial<FormData>) => void;
  resetForm: () => void;
  currentStep: number;
  setCurrentStep: (step: number) => void;
  totalSteps: number;
}

const FormContext = createContext<FormContextType | undefined>(undefined);

const initialFormData: FormData = {
  fullName: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  gender: '',
  assignedCoach: '',
  clientGoals: [],
  heightCm: '',
  // Goal target details
  weightLossTargetKg: '',
  muscleGainTargetKg: '',
  strengthTargetLift: '',
  strengthTarget1RMKg: '',
  fitnessTargetVo2: '',
  goalLevelWeightLoss: '',
  goalLevelMuscle: '',
  goalLevelBodyRecomp: '',
  goalLevelStrength: '',
  goalLevelFitness: '',
  activityLevel: '',
  sleepArchetype: '',
  sleepDuration: '', // Legacy
  sleepQuality: '', // Legacy
  sleepConsistency: '', // Legacy
  stressLevel: '',
  nutritionHabits: '',
  hydrationHabits: '',
  stepsPerDay: '',
  sedentaryHours: '',
  caffeineCupsPerDay: '',
  alcoholFrequency: '',
  lastCaffeineIntake: '',
  trainingHistory: '',
  recentActivity: '',
  primaryTrainingStyle: '', // Legacy field
  primaryTrainingStyles: [],
  primaryTrainingStyleOther: '',
  parqQuestionnaire: '',
  restingHeartRate: '',
  restingBPSystolic: '',
  restingBPDiastolic: '',
  medicationsFlag: '',
  medicationsNotes: '',
  parq1: '',
  parq2: '',
  parq3: '',
  parq4: '',
  parq5: '',
  parq6: '',
  parq7: '',
  parq8: '',
  parq9: '',
  parq10: '',
  parq11: '',
  parq12: '',
  parq13: '',
  parqNotes: '',
  inbodyWeightKg: '',
  inbodyBodyFatPct: '',
  bodyFatMassKg: '',
  inbodyBmi: '',
  visceralFatLevel: '',
  skeletalMuscleMassKg: '',
  totalBodyWaterL: '',
  waistHipRatio: '',
  skinfoldTricepMm: '',
  skinfoldChestMm: '',
  skinfoldSubscapularMm: '',
  skinfoldAxillaMm: '',
  skinfoldAbdomenMm: '',
  skinfoldSuprailiacMm: '',
  skinfoldThighMm: '',
  skinfoldBicepMm: '',
  waistCm: '',
  shouldersCm: '',
  chestCm: '',
  armLeftCm: '',
  armRightCm: '',
  neckCm: '',
  hipsCm: '',
  thighLeftCm: '',
  thighRightCm: '',
  calfLeftCm: '',
  calfRightCm: '',
  hipCm: '', // Legacy field - kept for backward compatibility
  segmentalArmRightKg: '',
  segmentalArmLeftKg: '',
  segmentalLegRightKg: '',
  segmentalLegLeftKg: '',
  segmentalTrunkKg: '',
  bmrKcal: '',
  inbodyScore: '',
  postureInputMode: 'manual',
  postureAiResults: null,
  postureImages: {},
  postureImagesStorage: {},
  postureSeverity: '',
  postureForwardHead: '',
  postureRoundedShoulders: '',
  postureHeadOverall: [],
  postureShouldersOverall: [],
  postureBackOverall: [],
  postureHipsOverall: [],
  postureKneesOverall: [],
  ohsKneeAlignment: '',
  ohsHeelBehavior: '',
  ohsLumbarControl: '',
  ohsShoulderMobility: '',
  ohsTorsoLean: '',
  ohsSquatDepth: '',
  ohsHipShift: '',
  ohsFeetPosition: '',
  ohsFootKneeBehavior: '',
  ohsHasPain: 'no',
  ohsPainLevel: '0',
  ohsNotes: '',
  modifiedThomasResult: '',
  hingeQuality: '',
  hingeBalance: '',
  hingeDepth: '',
  hingeBackRounding: '',
  hingeHasPain: 'no',
  hingePainLevel: '0',
  hingeNotes: '',
  lungeLeftKneeAlignment: '',
  lungeLeftBalance: '',
  lungeLeftTorso: '',
  lungeRightKneeAlignment: '',
  lungeRightBalance: '',
  lungeRightTorso: '',
  lungeHasPain: 'no',
  lungePainLevel: '0',
  lungeTestNotes: '',
  shoulderMobilityReach: '',
  mobilityHip: '',
  mobilityShoulder: '',
  mobilityAnkle: '', // Legacy field
  mobilityAnkleLeft: '',
  mobilityAnkleRight: '',
  movementNotes: '',
  pushupTest: '',
  squatTest: '',
  plankHoldSeconds: '',
  plankDurationSeconds: '',
  singleLegStanceLeftGrade: '',
  singleLegStanceRightGrade: '',
  cardioTestType: '',
  cardioTestSelected: '',
  cardioRestingHr: '',
  cardioPeakHr: '',
  cardioPost1MinHr: '',
  cardioMedicationFlag: '',
  cardioFinalHeartRate: '',
  cardioVo2MaxEstimate: '',
  cardioTestInstructions: '',
  cardioNotes: '',
  ymcaStepHeight: '',
  ymcaMetronomeBpm: '',
  ymcaPreTestHeartRate: '',
  ymcaPost1MinHeartRate: '',
  ymcaRecoveryHeartRate1: '',
  ymcaRpe: '',
  ymcaNotes: '',
  treadmillProtocol: '',
  treadmillIncline: '',
  treadmillSpeed: '',
  treadmillDurationMin: '',
  treadmillFinalHeartRate: '',
  treadmillRpe: '',
  treadmillTerminationReason: '',
  treadmillNotes: '',
  pushupMaxReps: '',
  squatsOneMinuteReps: '',
  pushupsOneMinuteReps: '',
  gripTestMethod: '',
  gripLeftKg: '',
  gripRightKg: '',
  gripDeadhangSeconds: '',
  gripFarmersWalkDistanceM: '',
  gripFarmersWalkTimeS: '',
  gripFarmersWalkLoadKg: '',
  gripPlatePinchSeconds: '',
  chairStandReps: '',
  dynamometerForce: '',
  coachReport: '',
  clientReport: '',
  assessmentPlan: undefined,
  assessmentIntakeMode: null,
  coachGuidanceEnabled: true,
  bodyCompMethod: 'analyzer',
  showAnalyzerFields: 'yes',
  showBodyMeasurements: 'no',
};

export const FormProvider = ({ children }: { children: ReactNode }) => {
  const [formData, setFormData] = useState<FormData>(() =>
    getInitialFormDataFromSession<FormData>(initialFormData),
  );
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;

  const updateFormData = useCallback((data: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  }, []);

  const resetForm = useCallback(() => {
    setFormData(initialFormData);
    setCurrentStep(1);
    try {
      sessionStorage.removeItem(STORAGE_KEYS.PARTIAL_ASSESSMENT);
      sessionStorage.removeItem(STORAGE_KEYS.PREFILL_CLIENT);
      sessionStorage.removeItem(STORAGE_KEYS.EDIT_ASSESSMENT);
      sessionStorage.removeItem(STORAGE_KEYS.DRAFT_ASSESSMENT);
    } catch {
      // noop
    }
  }, []);

  const contextValue = React.useMemo(() => ({
    formData,
    updateFormData,
    resetForm,
    currentStep,
    setCurrentStep,
    totalSteps
  }), [formData, updateFormData, resetForm, currentStep, totalSteps]);

  return (
    <FormContext.Provider value={contextValue}>
      {children}
    </FormContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useFormContext = () => {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error('useFormContext must be used within FormProvider');
  }
  return context;
};
