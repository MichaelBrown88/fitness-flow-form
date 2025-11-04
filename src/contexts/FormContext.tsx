import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface FormData {
  // Step 1 - Client Information
  fullName: string;
  age: string;
  gender: string;
  assignedCoach: string;
  contactEmail: string;
  clientGoals: string[];

  // Step 2 - Body Composition
  height: string;
  weight: string;
  bodyFat: string;
  skeletalMuscleMass: string;
  visceralFat: string;
  segmentalDistribution: string;

  // Step 3 - Posture Analysis
  forwardHeadPosture: boolean;
  roundedShoulders: boolean;
  anteriorPelvicTilt: boolean;
  kyphosisLordosis: boolean;
  kneeAlignment: string;
  footPosition: string;

  // Step 4 - Movement & Mobility
  // Overhead Squat
  overheadSquatKneeAlignment: string;
  overheadSquatTorsoLean: string;
  overheadSquatHipShift: string;
  overheadSquatDepth: string;
  overheadSquatFootHeel: string;
  overheadSquatNotes: string;
  
  // Lunge Test
  lungeLeftKneeAlignment: string;
  lungeLeftBalance: string;
  lungeLeftTorso: string;
  lungeRightKneeAlignment: string;
  lungeRightBalance: string;
  lungeRightTorso: string;
  lungeTestNotes: string;
  
  // Overhead Reach
  overheadReachResult: string;
  shoulderMobilityRating: string;
  overheadReachNotes: string;
  
  // Ankle Mobility
  ankleMobilityRating: string;
  ankleMobilityNotes: string;

  // Step 5 - Strength & Endurance
  pushupReps: string;
  plankHold: string;
  wallSit: string;
  strengthNotes: string;

  // Step 6 - Cardio Fitness
  cardioTestType: string;
  testResult: string;
  heartRateRecovery: string;
  cardioNotes: string;
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
  fullName: '',
  age: '',
  gender: '',
  assignedCoach: '',
  contactEmail: '',
  clientGoals: [],
  height: '',
  weight: '',
  bodyFat: '',
  skeletalMuscleMass: '',
  visceralFat: '',
  segmentalDistribution: '',
  forwardHeadPosture: false,
  roundedShoulders: false,
  anteriorPelvicTilt: false,
  kyphosisLordosis: false,
  kneeAlignment: '',
  footPosition: '',
  overheadSquatKneeAlignment: '',
  overheadSquatTorsoLean: '',
  overheadSquatHipShift: '',
  overheadSquatDepth: '',
  overheadSquatFootHeel: '',
  overheadSquatNotes: '',
  lungeLeftKneeAlignment: '',
  lungeLeftBalance: '',
  lungeLeftTorso: '',
  lungeRightKneeAlignment: '',
  lungeRightBalance: '',
  lungeRightTorso: '',
  lungeTestNotes: '',
  overheadReachResult: '',
  shoulderMobilityRating: '',
  overheadReachNotes: '',
  ankleMobilityRating: '',
  ankleMobilityNotes: '',
  pushupReps: '',
  plankHold: '',
  wallSit: '',
  strengthNotes: '',
  cardioTestType: '',
  testResult: '',
  heartRateRecovery: '',
  cardioNotes: '',
};

export const FormProvider = ({ children }: { children: ReactNode }) => {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 7;

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

export const useFormContext = () => {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error('useFormContext must be used within FormProvider');
  }
  return context;
};
