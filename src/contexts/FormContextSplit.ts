/**
 * Split Form Context Architecture
 * 
 * Instead of one massive context that re-renders everything on every change,
 * we split into logical groups that only re-render when their specific data changes.
 * 
 * This is a less invasive alternative to full react-hook-form migration.
 */

import { createContext, useContext, useState, useCallback, ReactNode, useMemo } from 'react';
import type { FormData } from './FormContext';

// Split form data into logical groups
export interface ClientProfileData {
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  assignedCoach: string;
  clientGoals: string[];
  heightCm: string;
}

export interface GoalTargetsData {
  weightLossTargetKg: string;
  muscleGainTargetKg: string;
  strengthTargetLift: string;
  strengthTarget1RMKg: string;
  fitnessTargetVo2: string;
  goalLevelWeightLoss: string;
  goalLevelMuscle: string;
  goalLevelStrength: string;
  goalLevelFitness: string;
}

export interface LifestyleData {
  activityLevel: string;
  sleepDuration: string;
  sleepQuality: string;
  sleepConsistency: string;
  stressLevel: string;
  workHoursPerDay: string;
  nutritionHabits: string;
  hydrationHabits: string;
  stepsPerDay: string;
  sedentaryHours: string;
  caffeineCupsPerDay: string;
  alcoholFrequency: string;
  lastCaffeineIntake: string;
}

export interface BodyCompData {
  inbodyWeightKg: string;
  inbodyBodyFatPct: string;
  bodyFatMassKg: string;
  inbodyBmi: string;
  visceralFatLevel: string;
  skeletalMuscleMassKg: string;
  totalBodyWaterL: string;
  waistHipRatio: string;
  // Skinfold measurements
  skinfoldTricepMm: string;
  skinfoldChestMm: string;
  skinfoldSubscapularMm: string;
  skinfoldAxillaMm: string;
  skinfoldAbdomenMm: string;
  skinfoldSuprailiacMm: string;
  skinfoldThighMm: string;
  skinfoldBicepMm: string;
  // Body measurements
  waistCm: string;
  neckCm: string;
  hipCm: string;
  segmentalArmRightKg: string;
  segmentalArmLeftKg: string;
  segmentalLegRightKg: string;
  segmentalLegLeftKg: string;
  segmentalTrunkKg: string;
  bmrKcal: string;
  inbodyScore: string;
}

export interface PostureData {
  postureInputMode: 'manual' | 'ai';
  postureAiResults: FormData['postureAiResults'];
  postureImages: Record<string, string>;
  postureImagesStorage: Record<string, string>;
  postureSeverity: string;
  postureForwardHead: string;
  postureRoundedShoulders: string;
  postureHeadOverall: string[];
  postureShouldersOverall: string[];
  postureBackOverall: string[];
  postureHipsOverall: string[];
  postureKneesOverall: string[];
}

export interface MovementData {
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
  mobilityAnkle: string;
  movementNotes: string;
  pushupTest: string;
  squatTest: string;
}

export interface FitnessData {
  plankHoldSeconds: string;
  plankDurationSeconds: string;
  singleLegStanceLeftGrade: string;
  singleLegStanceRightGrade: string;
  cardioTestType: string;
  cardioTestSelected: string;
  cardioRestingHr: string;
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
}

export interface StrengthData {
  pushupMaxReps: string;
  squatsOneMinuteReps: string;
  pushupsOneMinuteReps: string;
  gripLeftKg: string;
  gripRightKg: string;
  gripDeadhangSeconds: string;
  gripFarmersWalkDistanceM: string;
  gripFarmersWalkTimeS: string;
  gripFarmersWalkLoadKg: string;
  gripPlatePinchKg: string;
  chairStandReps: string;
  dynamometerForce: string;
}

export interface ParQData {
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
  restingHeartRate: string;
  restingBPSystolic: string;
  restingBPDiastolic: string;
  medicationsFlag: string;
  medicationsNotes: string;
}

export interface ReportsData {
  coachReport: string;
  clientReport: string;
}

// Context types
interface ClientProfileContextType {
  data: ClientProfileData;
  update: (updates: Partial<ClientProfileData>) => void;
}

interface GoalTargetsContextType {
  data: GoalTargetsData;
  update: (updates: Partial<GoalTargetsData>) => void;
}

interface LifestyleContextType {
  data: LifestyleData;
  update: (updates: Partial<LifestyleData>) => void;
}

interface BodyCompContextType {
  data: BodyCompData;
  update: (updates: Partial<BodyCompData>) => void;
}

interface PostureContextType {
  data: PostureData;
  update: (updates: Partial<PostureData>) => void;
}

interface MovementContextType {
  data: MovementData;
  update: (updates: Partial<MovementData>) => void;
}

interface FitnessContextType {
  data: FitnessData;
  update: (updates: Partial<FitnessData>) => void;
}

interface StrengthContextType {
  data: StrengthData;
  update: (updates: Partial<StrengthData>) => void;
}

interface ParQContextType {
  data: ParQData;
  update: (updates: Partial<ParQData>) => void;
}

interface ReportsContextType {
  data: ReportsData;
  update: (updates: Partial<ReportsData>) => void;
}

// Create contexts
const ClientProfileContext = createContext<ClientProfileContextType | undefined>(undefined);
const GoalTargetsContext = createContext<GoalTargetsContextType | undefined>(undefined);
const LifestyleContext = createContext<LifestyleContextType | undefined>(undefined);
const BodyCompContext = createContext<BodyCompContextType | undefined>(undefined);
const PostureContext = createContext<PostureContextType | undefined>(undefined);
const MovementContext = createContext<MovementContextType | undefined>(undefined);
const FitnessContext = createContext<FitnessContextType | undefined>(undefined);
const StrengthContext = createContext<StrengthContextType | undefined>(undefined);
const ParQContext = createContext<ParQContextType | undefined>(undefined);
const ReportsContext = createContext<ReportsContextType | undefined>(undefined);

// Helper to create context provider
function createContextProvider<T>(
  Context: React.Context<T | undefined>,
  initialData: T,
  storageKey?: string
) {
  return ({ children }: { children: ReactNode }) => {
    const getInitialData = (): T => {
      if (storageKey) {
        try {
          const stored = sessionStorage.getItem(storageKey);
          if (stored) {
            const parsed = JSON.parse(stored);
            return { ...initialData, ...parsed };
          }
        } catch (e) {
          console.warn(`Failed to parse ${storageKey}:`, e);
        }
      }
      return initialData;
    };

    const [data, setData] = useState<T>(getInitialData);

    const update = useCallback((updates: Partial<T>) => {
      setData((prev) => {
        const newData = { ...prev, ...updates };
        if (storageKey) {
          try {
            sessionStorage.setItem(storageKey, JSON.stringify(newData));
          } catch (e) {
            console.warn(`Failed to save ${storageKey}:`, e);
          }
        }
        return newData;
      });
    }, [storageKey]);

    const value = useMemo(() => ({ data, update }), [data, update]);

    return <Context.Provider value={value}>{children}</Context.Provider>;
  };
}

// Export providers (to be implemented with actual initial data)
// This is a template - actual implementation would extract from FormContext

