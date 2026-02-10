import type { FormData } from '@/contexts/FormContext';
import type { PhaseId } from '@/lib/phaseConfig';

/** Safely access a FormData field that may exist at runtime but not in the type definition */
const field = (form: FormData, key: string): string | undefined =>
  (form as unknown as Record<string, string>)[key];

export type PriorityBand = 'P1' | 'P2' | 'P3';

export interface NegativeOutcomeRule {
  id: string;
  phase: PhaseId;
  testName: string;
  negativeFinding: string;
  priority: PriorityBand;
  coachAction: string;
  clientFocus: string;
  trigger: (form: FormData) => boolean;
  strengthCopy?: string;
}

export interface NegativeOutcomeFinding {
  id: string;
  phase: PhaseId;
  testName: string;
  negativeFinding: string;
  priority: PriorityBand;
  coachAction: string;
  clientFocus: string;
}

export interface StrengthHighlight {
  id: string;
  description: string;
  phase: PhaseId;
}

const asNumber = (value: string | undefined): number | null => {
  if (!value && value !== '0') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const VO2_POOR_THRESHOLDS: Record<string, number> = {
  female: 28,
  male: 33,
  default: 30,
};

const GRIP_THRESHOLDS: Record<string, number> = {
  female: 22,
  male: 30,
  default: 26,
};

export const NEGATIVE_OUTCOME_RULES: NegativeOutcomeRule[] = [
  {
    id: 'parq-positive',
    phase: 'P1',
    testName: 'PAR-Q+ Screening',
    negativeFinding: 'Positive response indicating potential health risk.',
    priority: 'P1',
    coachAction:
      'Halt high-intensity testing. Advise: “Consult physician for medical clearance before starting Phase 4/5.”',
    clientFocus: 'Adjustment: Focus on mobility and low-intensity cardio for 6 weeks.',
    trigger: (form) => field(form, 'parqPositive') === 'yes',
    strengthCopy: 'Cleared PAR-Q+ screening for progressive testing.',
  },
  {
    id: 'visceral-fat-high',
    phase: 'P1',
    testName: 'InBody Analysis',
    negativeFinding: 'Visceral fat rating above recommended threshold (>10).',
    priority: 'P1',
    coachAction:
      'Lifestyle Factors: Recommend a sustained calorie deficit (500 kcal/day). Exercise: Prioritize low-impact Zone 2 cardio (150+ minutes/week).',
    clientFocus:
      'Adjustment: Prioritize nutrition for fat loss and 3-4 low-impact cardio sessions per week.',
    trigger: (form) => {
      const visceral = asNumber(form.visceralFatLevel);
      return visceral !== null && visceral > 10;
    },
    strengthCopy: 'Visceral fat rating within healthy range.',
  },
  {
    id: 'segmental-imbalance',
    phase: 'P1',
    testName: 'InBody Analysis',
    negativeFinding: 'Segmental lean imbalance greater than 5%.',
    priority: 'P2',
    coachAction:
      'Training: General strength/hypertrophy programming (full-body, higher volume). Nutrition: Increase protein intake (1.6–2.2 g/kg).',
    clientFocus:
      'Adjustment: Focus on building a muscular foundation through resistance training and optimized protein intake.',
    trigger: (form) => {
      const imbalance = asNumber(field(form, 'segmentalLeanImbalancePct'));
      return imbalance !== null && imbalance > 5;
    },
    strengthCopy: 'Balanced segmental lean mass across left/right regions.',
  },
  {
    id: 'posture-forward-head',
    phase: 'P2',
    testName: 'Static Posture (Lateral View)',
    negativeFinding: 'Forward head posture / rounded shoulders observed.',
    priority: 'P2',
    coachAction:
      'Corrective Exercise: Face pulls (high reps), banded external rotations, wall slides. Cue chin tucks and “open chest”.',
    clientFocus:
      'Adjustment: Perform 3 daily shoulder/posture drills to correct upper body alignment.',
    trigger: (form) => {
      if (['mild', 'yes'].includes(form.postureForwardHead)) return true;
      if (['mild', 'yes'].includes(form.postureRoundedShoulders)) return true;
      const severity = asNumber(form.postureSeverity);
      return severity !== null && severity >= 3;
    },
    strengthCopy: 'Neutral upright posture without noticeable head or shoulder drift.',
  },
  {
    id: 'ohs-knee-valgus',
    phase: 'P2',
    testName: 'Overhead Squat',
    negativeFinding: 'Knees cave in (valgus) during squat.',
    priority: 'P2',
    coachAction:
      'Banded glute bridges, banded abduction, goblet squat to box emphasising knees tracking out.',
    clientFocus:
      'Adjustment: Integrate glute activation into every warm-up to stabilise knees during lower body work.',
    trigger: (form) => form.ohsKneeAlignment === 'valgus',
    strengthCopy: 'Consistent knee tracking over toes in squat pattern.',
  },
  {
    id: 'ohs-heels-rise',
    phase: 'P2',
    testName: 'Overhead Squat',
    negativeFinding: 'Heels lift off the floor.',
    priority: 'P2',
    coachAction:
      'Ankle mobilisations (knee-to-wall), temporary heel-elevated squats, avoid flat shoes until mobility improves.',
    clientFocus:
      'Adjustment: Dedicate 5 minutes to ankle mobility before sessions involving squats or lunges.',
    trigger: (form) => form.ohsHeelBehavior === 'heels-rise',
    strengthCopy: 'Solid ankle mobility keeps heels grounded under load.',
  },
  {
    id: 'ohs-lumbar-arch',
    phase: 'P2',
    testName: 'Overhead Squat',
    negativeFinding: 'Excessive lumbar arch (low back arches forward).',
    priority: 'P2',
    coachAction:
      'Modified Thomas stretch, 90/90 hip flexor stretch, cue bracing before movement.',
    clientFocus:
      'Adjustment: Release hip flexors daily and focus on core bracing during all compound movements.',
    trigger: (form) => form.ohsLumbarControl === 'excessive-arch',
    strengthCopy: 'Maintains neutral spine and rib position during squat.',
  },
  {
    id: 'modified-thomas-fail',
    phase: 'P2',
    testName: 'Modified Thomas Test',
    negativeFinding: 'Thigh lifts off bench indicating tight hip flexor/psoas.',
    priority: 'P2',
    coachAction:
      'Extended hip flexor stretch with posterior pelvic tilt, kneeling lunge stretch.',
    clientFocus:
      'Adjustment: Integrate psoas and hip flexor stretches into daily routine to relieve low back strain.',
    trigger: (form) => form.modifiedThomasResult === 'fail-thigh-lift',
    strengthCopy: 'Hip flexors display adequate length and control.',
  },
  {
    id: 'plank-under-30',
    phase: 'P3',
    testName: 'Plank Hold Assessment',
    negativeFinding: 'Unable to hold plank ≥ 30 seconds or loss of spinal alignment.',
    priority: 'P2',
    coachAction:
      'Dead bugs, bird-dogs, modified plank variations, abdominal bracing practice.',
    clientFocus:
      'Adjustment: Practice 3 sets of 30-second planks daily to build a resilient core before heavy lifting.',
    trigger: (form) => {
      const plank = asNumber(form.plankHoldSeconds);
      return plank === null ? false : plank < 30;
    },
    strengthCopy: 'Core endurance supports plank holds beyond 30 seconds.',
  },
  {
    id: 'single-leg-balance-low',
    phase: 'P3',
    testName: 'Single-Leg Stance Test',
    negativeFinding: 'Eyes open hold under 10 seconds.',
    priority: 'P3',
    coachAction:
      'Single-leg balance holds, single-leg RDLs (light), heel-toe walks.',
    clientFocus:
      'Adjustment: Practice single-leg balance (e.g., while brushing teeth) to improve stability and reduce fall risk.',
    trigger: (form) => {
      const sl = asNumber(field(form, 'singleLegStanceSeconds'));
      return sl === null ? false : sl < 10;
    },
    strengthCopy: 'Stable single-leg stance exceeding 10 seconds.',
  },
  {
    id: 'vo2-poor',
    phase: 'P4',
    testName: 'Ebbeling Treadmill Test',
    negativeFinding: 'Estimated VO₂max classified as “Poor” or “Very Poor”.',
    priority: 'P3',
    coachAction:
      'Introduce 2-3 sessions of aerobic interval training (HIIT or Fartlek) per week to boost VO₂max.',
    clientFocus:
      'Adjustment: Your roadmap includes structured cardio intervals to improve heart and lung efficiency quickly.',
    trigger: (form) => {
      const vo2 = asNumber(form.cardioVo2MaxEstimate);
      if (vo2 === null) return false;
      const genderKey = form.gender === 'female' || form.gender === 'male' ? form.gender : 'default';
      return vo2 < VO2_POOR_THRESHOLDS[genderKey];
    },
    strengthCopy: 'Cardiorespiratory score falls within healthy range.',
  },
  {
    id: 'pushup-low',
    phase: 'P5',
    testName: 'Push-Up Max Reps Test',
    negativeFinding: 'Push-up capacity below minimum standards.',
    priority: 'P3',
    coachAction:
      'Incline push-ups, eccentric push-ups, light bench press to build foundational strength.',
    clientFocus:
      'Adjustment: Increase upper body endurance with progressive bodyweight pressing before heavy loads.',
    trigger: (form) => {
      const reps = asNumber(form.pushupMaxReps);
      if (reps === null) return false;
      if (form.gender === 'male') return reps < 10;
      if (form.gender === 'female') return reps < 15;
      return reps < 12;
    },
    strengthCopy: 'Upper body endurance meets or exceeds benchmark standards.',
  },
  {
    id: 'grip-weakness',
    phase: 'P5',
    testName: 'Grip Strength Test',
    negativeFinding: 'Below-average grip strength or >10% asymmetry.',
    priority: 'P3',
    coachAction:
      'Farmer’s carries, plate pinches, deadlifts. Address asymmetry with additional work on weaker side.',
    clientFocus:
      'Adjustment: Include targeted grip work to elevate functional strength, focusing on the weaker hand if needed.',
    trigger: (form) => {
      const left = asNumber(form.gripLeftKg);
      const right = asNumber(form.gripRightKg);
      if (left === null || right === null) return false;
      const avg = (left + right) / 2;
      const diff = Math.abs(left - right);
      const asymmetry = avg > 0 ? (diff / avg) * 100 : 0;
      const threshold =
        GRIP_THRESHOLDS[form.gender as keyof typeof GRIP_THRESHOLDS] ?? GRIP_THRESHOLDS.default;
      return avg < threshold || asymmetry > 10;
    },
    strengthCopy: 'Grip strength meets normative averages with minimal asymmetry.',
  },
  {
    id: 'chair-stand-low',
    phase: 'P5',
    testName: '30-Second Chair Stand',
    negativeFinding: 'Fewer than 10 repetitions completed.',
    priority: 'P3',
    coachAction:
      'Box squats to safe depth, leg press, step-ups to build foundational lower-body power.',
    clientFocus:
      'Adjustment: Build foundational lower body power starting with sit-to-stand drills to improve daily function.',
    trigger: (form) => {
      const reps = asNumber(form.chairStandReps);
      return reps === null ? false : reps < 10;
    },
    strengthCopy: 'Lower-body endurance supports daily sit-to-stand demands.',
  },
  {
    id: 'hinge-quality-poor',
    phase: 'P2',
    testName: 'Hinge Movement Quality',
    negativeFinding: 'Poor hinge mechanics with rounding or stiffness.',
    priority: 'P2',
    coachAction:
      'Romanian deadlift progressions, good morning variations, hip hinge mobility drills.',
    clientFocus:
      'Adjustment: Practice hip hinge movements daily to improve posterior chain mobility.',
    trigger: (form) => form.hingeQuality === 'fair' || form.hingeQuality === 'poor',
    strengthCopy: 'Demonstrates proper hip hinge mechanics with good control.',
  },
  {
    id: 'hinge-balance-poor',
    phase: 'P2',
    testName: 'Hinge Balance & Stability',
    negativeFinding: 'Significant balance issues during hinge movement.',
    priority: 'P2',
    coachAction:
      'Single-leg deadlifts, balance board work, core stability exercises.',
    clientFocus:
      'Adjustment: Focus on balance during hinge movements with support as needed.',
    trigger: (form) => form.hingeBalance === 'unstable',
    strengthCopy: 'Maintains balance and stability during hinge movements.',
  },
  {
    id: 'lunge-left-knee-valgus',
    phase: 'P2',
    testName: 'Left Lunge Knee Tracking',
    negativeFinding: 'Left knee caves inward during lunge.',
    priority: 'P2',
    coachAction:
      'Left-side banded walks, single-leg glute bridges, split squat variations.',
    clientFocus:
      'Adjustment: Strengthen left glute muscles and practice knee tracking in lunges.',
    trigger: (form) => form.lungeLeftKneeAlignment === 'caves-inward',
    strengthCopy: 'Left knee tracks properly over toes during lunge.',
  },
  {
    id: 'lunge-right-knee-valgus',
    phase: 'P2',
    testName: 'Right Lunge Knee Tracking',
    negativeFinding: 'Right knee caves inward during lunge.',
    priority: 'P2',
    coachAction:
      'Right-side banded walks, single-leg glute bridges, split squat variations.',
    clientFocus:
      'Adjustment: Strengthen right glute muscles and practice knee tracking in lunges.',
    trigger: (form) => form.lungeRightKneeAlignment === 'caves-inward',
    strengthCopy: 'Right knee tracks properly over toes during lunge.',
  },
  {
    id: 'lunge-left-balance-poor',
    phase: 'P2',
    testName: 'Left Lunge Balance',
    negativeFinding: 'Poor balance on left leg during lunge.',
    priority: 'P3',
    coachAction:
      'Single-leg balance holds, assisted lunges, step-up progressions.',
    clientFocus:
      'Adjustment: Build left leg stability with balance exercises.',
    trigger: (form) => form.lungeLeftBalance === 'unstable',
    strengthCopy: 'Good balance and stability on left leg during lunge.',
  },
  {
    id: 'lunge-right-balance-poor',
    phase: 'P2',
    testName: 'Right Lunge Balance',
    negativeFinding: 'Poor balance on right leg during lunge.',
    priority: 'P3',
    coachAction:
      'Single-leg balance holds, assisted lunges, step-up progressions.',
    clientFocus:
      'Adjustment: Build right leg stability with balance exercises.',
    trigger: (form) => form.lungeRightBalance === 'unstable',
    strengthCopy: 'Good balance and stability on right leg during lunge.',
  },
  {
    id: 'lunge-left-torso-lean',
    phase: 'P2',
    testName: 'Left Lunge Torso Position',
    negativeFinding: 'Excessive forward lean during left lunge.',
    priority: 'P2',
    coachAction:
      'Hip flexor stretches, thoracic mobility work, dowel-assisted lunges.',
    clientFocus:
      'Adjustment: Keep torso upright during lunges; stretch hip flexors regularly.',
    trigger: (form) => form.lungeLeftTorso === 'excessive-lean',
    strengthCopy: 'Maintains upright torso position during left lunge.',
  },
  {
    id: 'lunge-right-torso-lean',
    phase: 'P2',
    testName: 'Right Lunge Torso Position',
    negativeFinding: 'Excessive forward lean during right lunge.',
    priority: 'P2',
    coachAction:
      'Hip flexor stretches, thoracic mobility work, dowel-assisted lunges.',
    clientFocus:
      'Adjustment: Keep torso upright during lunges; stretch hip flexors regularly.',
    trigger: (form) => form.lungeRightTorso === 'excessive-lean',
    strengthCopy: 'Maintains upright torso position during right lunge.',
  },
  {
    id: 'shoulder-mobility-limited',
    phase: 'P2',
    testName: 'Shoulder Mobility Reach',
    negativeFinding: 'Limited shoulder mobility with compensations during overhead reach.',
    priority: 'P2',
    coachAction:
      'Shoulder mobility drills, thoracic spine stretches, overhead reach progressions.',
    clientFocus:
      'Adjustment: Improve shoulder mobility with daily stretching and mobility work.',
    trigger: (form) => form.shoulderMobilityReach === 'partial-reach' || form.shoulderMobilityReach === 'no-reach',
    strengthCopy: 'Demonstrates good shoulder mobility with full overhead reach.',
  },
  {
    id: 'pushup-capacity-low',
    phase: 'P2',
    testName: 'Push-up Test',
    negativeFinding: 'Poor upper body strength endurance (fewer than 10 push-ups in 1 minute).',
    priority: 'P3',
    coachAction:
      'Push-up progressions, upper body strength training, core stability work.',
    clientFocus:
      'Adjustment: Build upper body strength with progressive push-up variations.',
    trigger: (form) => {
      const capacity = form.pushupTest;
      return capacity === 'poor' || capacity === 'very-poor';
    },
    strengthCopy: 'Good upper body strength and endurance demonstrated.',
  },
  {
    id: 'squat-capacity-low',
    phase: 'P2',
    testName: 'Squat Test',
    negativeFinding: 'Poor lower body strength endurance (fewer than 20 squats in 1 minute).',
    priority: 'P3',
    coachAction:
      'Squat progressions, lower body strength training, mobility work.',
    clientFocus:
      'Adjustment: Build lower body strength with progressive squat variations.',
    trigger: (form) => {
      const capacity = form.squatTest;
      return capacity === 'poor' || capacity === 'very-poor';
    },
    strengthCopy: 'Good lower body strength and endurance demonstrated.',
  },
  {
    id: 'plank-weak-core',
    phase: 'P3',
    testName: 'Forearm Plank',
    negativeFinding: 'Poor core endurance (plank hold <30 seconds).',
    priority: 'P2',
    coachAction:
      'Progressive plank variations, dead bug exercises, bird-dog holds.',
    clientFocus:
      'Adjustment: Build core stability foundation with daily plank practice and anti-rotation exercises.',
    trigger: (form) => {
      const seconds = asNumber(form.plankHoldSeconds);
      return seconds === null ? false : seconds < 30;
    },
    strengthCopy: 'Strong core endurance demonstrated in plank hold.',
  },
  {
    id: 'balance-left-poor',
    phase: 'P3',
    testName: 'Left Single-Leg Stance',
    negativeFinding: 'Poor balance on left leg during single-leg stance test.',
    priority: 'P2',
    coachAction:
      'Balance board work, single-leg deadlifts, ankle stability exercises.',
    clientFocus:
      'Adjustment: Improve left leg balance with single-leg exercises and ankle strengthening.',
    trigger: (form) => form.singleLegStanceLeftGrade === 'poor' || form.singleLegStanceLeftGrade === 'fair',
    strengthCopy: 'Excellent balance and stability on left leg.',
  },
  {
    id: 'balance-right-poor',
    phase: 'P3',
    testName: 'Right Single-Leg Stance',
    negativeFinding: 'Poor balance on right leg during single-leg stance test.',
    priority: 'P2',
    coachAction:
      'Balance board work, single-leg deadlifts, ankle stability exercises.',
    clientFocus:
      'Adjustment: Improve right leg balance with single-leg exercises and ankle strengthening.',
    trigger: (form) => form.singleLegStanceRightGrade === 'poor' || form.singleLegStanceRightGrade === 'fair',
    strengthCopy: 'Excellent balance and stability on right leg.',
  },
];

export const evaluateNegativeOutcomes = (
  form: FormData
): { findings: NegativeOutcomeFinding[]; strengths: StrengthHighlight[] } => {
  const findings: NegativeOutcomeFinding[] = [];
  const strengths: StrengthHighlight[] = [];

  for (const rule of NEGATIVE_OUTCOME_RULES) {
    const triggered = rule.trigger(form);
    if (triggered) {
      findings.push({
        id: rule.id,
        phase: rule.phase,
        testName: rule.testName,
        negativeFinding: rule.negativeFinding,
        priority: rule.priority,
        coachAction: rule.coachAction,
        clientFocus: rule.clientFocus,
      });
    } else if (rule.strengthCopy) {
      strengths.push({
        id: `${rule.id}-strength`,
        description: rule.strengthCopy,
        phase: rule.phase,
      });
    }
  }

  return { findings, strengths };
};

