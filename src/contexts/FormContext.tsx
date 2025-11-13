import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface FormData {
  /** Client Profile */
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  heightCm: string;
  assignedCoach: string;
  activityLevel: string;
  sleepDuration: string;
  sleepQuality: string;
  sleepConsistency: string;

  /** Phase 1 — Foundational Health & Body Comp */
  parqQuestionnaire: string;
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
  visceralFatLevel: string;
  skeletalMuscleMassKg: string;
  segmentalLeanImbalancePct: string;

  /** Phase 2 — Posture & Movement Quality */
  postureSeverity: string;
  postureForwardHead: string;
  postureRoundedShoulders: string;
  postureHeadOverall: string;
  postureShouldersOverall: string;
  postureBackOverall: string;
  postureHipsOverall: string;
  postureKneesOverall: string;
  ohsKneeAlignment: string;
  ohsHeelBehavior: string;
  ohsLumbarControl: string;
  ohsShoulderMobility: string;
  ohsTorsoLean: string;
  ohsSquatDepth: string;
  ohsHipShift: string;
  ohsFeetPosition: string;
  ohsNotes: string;
  modifiedThomasResult: string;
  hingeQuality: string;
  hingeBalance: string;
  hingeNotes: string;
  lungeLeftKneeAlignment: string;
  lungeLeftBalance: string;
  lungeLeftTorso: string;
  lungeRightKneeAlignment: string;
  lungeRightBalance: string;
  lungeRightTorso: string;
  lungeTestNotes: string;
  shoulderMobilityReach: string;
  movementNotes: string;
  pushupTest: string;
  squatTest: string;

  /** Phase 3 — Core Stability & Endurance */
  plankHoldSeconds: string;
  sidePlankLeftSeconds: string;
  sidePlankRightSeconds: string;
  singleLegStanceLeftGrade: string;
  singleLegStanceRightGrade: string;

  /** Phase 4 — Cardiovascular Fitness */
  cardioTestType: string;
  cardioMedicationFlag: string;
  cardioFinalHeartRate: string;
  cardioVo2MaxEstimate: string;
  cardioTestInstructions: string;
  cardioNotes: string;

  /** Phase 5 — Strength & Power */
  pushupMaxReps: string;
  gripLeftKg: string;
  gripRightKg: string;
  chairStandReps: string;
  dynamometerForce: string;

  /** Phase 6 — Assessment Complete */
  assessmentComplete: string;
}

interface FormContextType {
  formData: FormData;
  updateFormData: (data: Partial<FormData>) => void;
  currentStep: number;
  setCurrentStep: (step: number) => void;
  totalSteps: number;
}

const FormContext = createContext<FormContextType | undefined>(undefined);

const initialFormData: FormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  gender: '',
  heightCm: '',
  assignedCoach: '',
  activityLevel: '',
  sleepDuration: '',
  sleepQuality: '',
  sleepConsistency: '',
  parqQuestionnaire: '',
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
  visceralFatLevel: '',
  skeletalMuscleMassKg: '',
  segmentalLeanImbalancePct: '',
  postureSeverity: '',
  postureForwardHead: '',
  postureRoundedShoulders: '',
  postureHeadOverall: '',
  postureShouldersOverall: '',
  postureBackOverall: '',
  postureHipsOverall: '',
  postureKneesOverall: '',
  ohsKneeAlignment: '',
  ohsHeelBehavior: '',
  ohsLumbarControl: '',
  ohsShoulderMobility: '',
  ohsTorsoLean: '',
  ohsSquatDepth: '',
  ohsHipShift: '',
  ohsFeetPosition: '',
  ohsNotes: '',
  modifiedThomasResult: '',
  hingeQuality: '',
  hingeBalance: '',
  hingeNotes: '',
  lungeLeftKneeAlignment: '',
  lungeLeftBalance: '',
  lungeLeftTorso: '',
  lungeRightKneeAlignment: '',
  lungeRightBalance: '',
  lungeRightTorso: '',
  lungeTestNotes: '',
  shoulderMobilityReach: '',
  movementNotes: '',
  pushupTest: '',
  squatTest: '',
  plankHoldSeconds: '',
  sidePlankLeftSeconds: '',
  sidePlankRightSeconds: '',
  singleLegStanceLeftGrade: '',
  singleLegStanceRightGrade: '',
  cardioTestType: 'treadmill',
  cardioMedicationFlag: '',
  cardioFinalHeartRate: '',
  cardioVo2MaxEstimate: '',
  cardioTestInstructions: '',
  cardioNotes: '',
  pushupMaxReps: '',
  gripLeftKg: '',
  gripRightKg: '',
  chairStandReps: '',
  dynamometerForce: '',
  assessmentComplete: '',
};

export const FormProvider = ({ children }: { children: ReactNode }) => {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;

  const updateFormData = (data: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

  return (
    <FormContext.Provider
      value={{ formData, updateFormData, currentStep, setCurrentStep, totalSteps }}
    >
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
