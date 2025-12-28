import type { FormData } from '@/contexts/FormContext';
import { phaseDefinitions, type PhaseId } from './phaseConfig';

export const RULES_VERSION = '2.0.0';

export type PriorityTier = 'P1' | 'P2' | 'P3';

export interface AssessmentRule {
  id: string;
  phase: PhaseId;
  priority: PriorityTier;
  testName: string;
  negativeOutcome: string;
  coachAction: string;
  clientFocus: string;
  trigger: (form: FormData) => boolean;
}

export interface StrengthRule {
  id: string;
  check: (form: FormData) => boolean;
  message: string;
  weight: number;
}

export const PRIORITY_ORDER: PriorityTier[] = ['P1', 'P2', 'P3'];

export const PHASE_TITLES: Record<PhaseId, string> = phaseDefinitions.reduce(
  (acc, phase) => {
    acc[phase.id] = phase.title;
    return acc;
  },
  {} as Record<PhaseId, string>
);

export const PHASE_TIMELINE: Record<PhaseId, string> = {
  P1: 'Weeks 0 – 4',
  P2: 'Weeks 2 – 6',
  P3: 'Weeks 4 – 8',
  P4: 'Weeks 6 – 10',
  P5: 'Weeks 6 – 12',
};

const numberFrom = (value: string): number | null => {
  if (!value && value !== '0') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const differencePercent = (a: number, b: number) => {
  if (!Number.isFinite(a) || !Number.isFinite(b) || a === 0 || b === 0) return 0;
  const high = Math.max(Math.abs(a), Math.abs(b));
  const low = Math.min(Math.abs(a), Math.abs(b));
  return high === 0 ? 0 : (high - low) / high;
};

export const ASSESSMENT_RULES: AssessmentRule[] = [
  {
    id: 'parq-positive',
    phase: 'P1',
    priority: 'P1',
    testName: 'PAR-Q+ Screening',
    negativeOutcome: 'Positive response (pain, heart condition, dizziness, or chronic issue).',
    coachAction: 'Halt high-intensity testing. Advised: “Consult physician for medical clearance before starting Phase 4 & 5.”',
    clientFocus: 'Adjustment: Focus on mobility and low-intensity cardio for 6 weeks.',
    trigger: (form) => form.parqPositive === 'yes',
  },
  {
    id: 'visceral-fat-high',
    phase: 'P1',
    priority: 'P1',
    testName: 'InBody Analysis',
    negativeOutcome: 'Visceral Fat Level above 10 (high metabolic risk).',
    coachAction:
      'Lifestyle Factors: Prescribe sustained calorie deficit (~500 kcal/day) and low-impact Zone 2 cardio (>150 min/week).',
    clientFocus:
      'Adjustment: “Prioritize nutrition for fat loss and complete 3-4 low-impact cardio sessions per week.”',
    trigger: (form) => {
      const visceral = numberFrom(form.visceralFatLevel);
      return visceral !== null && visceral > 10;
    },
  },
  {
    id: 'segmental-imbalance',
    phase: 'P1',
    priority: 'P2',
    testName: 'InBody Analysis',
    negativeOutcome: 'Segmental muscle imbalance greater than 5% (C-shape profile).',
    coachAction:
      'Training: Emphasise full-body strength / hypertrophy with higher volume. Nutrition: Increase protein intake (1.6–2.2 g/kg).',
    clientFocus:
      'Adjustment: “Focus on building a muscular foundation through resistance training and optimised protein intake.”',
    trigger: (form) => {
      const diff = numberFrom(form.segmentalLeanImbalancePct);
      return diff !== null && diff > 5;
    },
  },
  {
    id: 'forward-head-rounded-shoulders',
    phase: 'P2',
    priority: 'P2',
    testName: 'Static Posture (Lateral View)',
    negativeOutcome: 'Forward head posture or rounded shoulders observed.',
    coachAction:
      'Corrective: Add face pulls, banded external rotations, wall slides, and cue chin tucks with “open chest” reminders.',
    clientFocus:
      'Adjustment: “Perform 3 daily shoulder/posture drills to correct upper body alignment.”',
    trigger: (form) => ['mild', 'yes'].includes(form.postureForwardHead) || ['mild', 'yes'].includes(form.postureRoundedShoulders),
  },
  {
    id: 'ohs-knee-valgus',
    phase: 'P2',
    priority: 'P2',
    testName: 'Overhead Squat Assessment',
    negativeOutcome: 'Knees cave inward during squat (valgus collapse).',
    coachAction:
      'Correctional: Banded glute bridges, banded abduction, goblet squat to box with focus on pushing knees out.',
    clientFocus:
      'Adjustment: “Integrate glute activation into every warm-up to stabilise knees during lower body work.”',
    trigger: (form) => form.ohsKneeAlignment === 'valgus',
  },
  {
    id: 'ohs-heels-rise',
    phase: 'P2',
    priority: 'P2',
    testName: 'Overhead Squat Assessment',
    negativeOutcome: 'Heels rise off the floor during squat descent.',
    coachAction:
      'Correctional: Ankle mobilisation drills (knee-to-wall) and temporary heel-elevated squats; advise against flat shoes.',
    clientFocus:
      'Adjustment: “Dedicate 5 minutes to ankle mobility before any session involving squats or lunges.”',
    trigger: (form) => form.ohsHeelBehavior === 'heels-rise',
  },
  {
    id: 'ohs-lumbar-arch',
    phase: 'P2',
    priority: 'P2',
    testName: 'Overhead Squat Assessment',
    negativeOutcome: 'Excessive lumbar arch / low-back compensation observed.',
    coachAction:
      'Correctional: Modified Thomas stretches, 90/90 hip flexor stretch, cue bracing before movement.',
    clientFocus:
      'Adjustment: “Release hip flexors daily and focus on core bracing during compound lifts.”',
    trigger: (form) => form.ohsLumbarControl === 'excessive-arch',
  },
  {
    id: 'modified-thomas-fail',
    phase: 'P2',
    priority: 'P2',
    testName: 'Modified Thomas Test',
    negativeOutcome: 'Thigh lifts off bench (tight hip flexor / psoas).',
    coachAction:
      'Correctional: Extended hip flexor stretch with posterior pelvic tilt; kneeling lunge stretch.',
    clientFocus:
      'Adjustment: “Integrate psoas and hip flexor stretches into the daily routine to relieve low-back strain.”',
    trigger: (form) => form.modifiedThomasResult === 'fail-thigh-lift',
  },
  {
    id: 'plank-low',
    phase: 'P3',
    priority: 'P2',
    testName: 'Plank Hold Assessment',
    negativeOutcome: 'Plank hold under 30 seconds or posture fails early.',
    coachAction:
      'Correctional: Dead bugs, bird-dogs, modified plank variations, and abdominal bracing practice.',
    clientFocus:
      'Adjustment: “Build a strong core before heavy lifting; practice three sets of 30-second planks daily.”',
    trigger: (form) => {
      const seconds = numberFrom(form.plankHoldSeconds);
      return seconds !== null && seconds < 30;
    },
  },
  {
    id: 'single-leg-balance-low',
    phase: 'P3',
    priority: 'P3',
    testName: 'Single-Leg Stance Test',
    negativeOutcome: 'Balance (eyes open) less than 10 seconds.',
    coachAction:
      'Correctional: Single-leg balance holds, low-weight single-leg RDLs, heel-toe walks.',
    clientFocus:
      'Adjustment: “Practice balancing on one foot (e.g. while brushing teeth) to reduce fall risk and improve functional balance.”',
    trigger: (form) => {
      const seconds = numberFrom(form.singleLegStanceSeconds);
      return seconds !== null && seconds < 10;
    },
  },
  {
    id: 'vo2max-poor',
    phase: 'P4',
    priority: 'P3',
    testName: 'Ebbeling Treadmill Test',
    negativeOutcome: 'Estimated VO₂max falls in poor / very poor range.',
    coachAction:
      'Cardio: Introduce 2–3 sessions of aerobic interval training (HIIT or Fartlek) each week to elevate VO₂max.',
    clientFocus:
      'Adjustment: “Your roadmap includes structured cardio intervals to improve heart and lung efficiency quickly.”',
    trigger: (form) => {
      const vo2 = numberFrom(form.cardioVo2MaxEstimate);
      return vo2 !== null && vo2 > 0 && vo2 < 32;
    },
  },
  {
    id: 'pushup-low',
    phase: 'P5',
    priority: 'P3',
    testName: 'Push-Up Max Reps',
    negativeOutcome: 'Max push-up repetitions under normative standards.',
    coachAction:
      'Strength: Programme incline push-ups, eccentric reps, and light bench press to build endurance.',
    clientFocus:
      'Adjustment: “Increase upper-body endurance with progressive bodyweight variations before heavy pressing.”',
    trigger: (form) => {
      const reps = numberFrom(form.pushupMaxReps);
      if (reps === null) return false;
      const gender = form.gender?.toLowerCase();
      if (gender === 'female') {
        return reps < 15;
      }
      return reps < 10;
    },
  },
  {
    id: 'grip-weak-or-asymmetry',
    phase: 'P5',
    priority: 'P3',
    testName: 'Grip Strength Test',
    negativeOutcome: 'Grip strength below age/gender norms or left/right asymmetry greater than 10%.',
    coachAction:
      'Strength: Add farmer’s carries, plate pinches, deadlifts; emphasise weaker side when asymmetry exists.',
    clientFocus:
      'Adjustment: “Include specific grip work to build functional strength, starting with carries and holds.”',
    trigger: (form) => {
      const left = numberFrom(form.gripLeftKg);
      const right = numberFrom(form.gripRightKg);
      if (left === null || right === null) return false;
      const gender = form.gender?.toLowerCase();
      const avg = (left + right) / 2;
      const weakThreshold = gender === 'female' ? 18 : 25;
      const asymmetry = differencePercent(left, right);
      return avg < weakThreshold || asymmetry > 0.1;
    },
  },
  {
    id: 'chair-stand-low',
    phase: 'P5',
    priority: 'P3',
    testName: '30-Second Chair Stand',
    negativeOutcome: 'Fewer than 10 repetitions within 30 seconds.',
    coachAction:
      'Strength: Program box squats to safe depth, leg press, and step-ups focusing on tempo and control.',
    clientFocus:
      'Adjustment: “Focus on foundational lower-body power with sit-to-stand drills to improve everyday function.”',
    trigger: (form) => {
      const reps = numberFrom(form.chairStandReps);
      return reps !== null && reps < 10;
    },
  },
];

export const STRENGTH_RULES: StrengthRule[] = [
  {
    id: 'stable-squat',
    check: (form) => form.ohsKneeAlignment === 'pass' && form.ohsHeelBehavior === 'grounded',
    message: 'Excellent squat mechanics — knees track well and heels stay grounded.',
    weight: 3,
  },
  {
    id: 'core-endurance-strong',
    check: (form) => {
      const plank = numberFrom(form.plankHoldSeconds);
      return plank !== null && plank >= 60;
    },
    message: 'Strong core endurance shown by a 60+ second plank hold.',
    weight: 4,
  },
  {
    id: 'balance-solid',
    check: (form) => {
      const stance = numberFrom(form.singleLegStanceSeconds);
      return stance !== null && stance >= 20;
    },
    message: 'Great balance control with a 20+ second single-leg stance.',
    weight: 3,
  },
  {
    id: 'cardio-strong',
    check: (form) => {
      const vo2 = numberFrom(form.cardioVo2MaxEstimate);
      return vo2 !== null && vo2 >= 38;
    },
    message: 'Cardiovascular capacity is above average for the chosen test.',
    weight: 2,
  },
  {
    id: 'pushup-strong',
    check: (form) => {
      const reps = numberFrom(form.pushupMaxReps);
      if (reps === null) return false;
      const gender = form.gender?.toLowerCase();
      if (gender === 'female') return reps >= 20;
      return reps >= 25;
    },
    message: 'Upper-body endurance is impressive based on the push-up result.',
    weight: 3,
  },
  {
    id: 'grip-strong',
    check: (form) => {
      const left = numberFrom(form.gripLeftKg);
      const right = numberFrom(form.gripRightKg);
      if (left === null || right === null) return false;
      const gender = form.gender?.toLowerCase();
      const avg = (left + right) / 2;
      const strongThreshold = gender === 'female' ? 28 : 35;
      return avg >= strongThreshold;
    },
    message: 'Grip strength is above average, supporting strong functional capacity.',
    weight: 2,
  },
];

export const rulesVersion = RULES_VERSION;


