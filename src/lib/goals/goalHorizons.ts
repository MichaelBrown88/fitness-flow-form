/**
 * Short / medium / long horizons (≈1, 4, 12 months) — what is achievable without ambition pickers.
 */

import type { FormData } from '@/contexts/FormContext';
import type { ScoreSummary } from '@/lib/scoring/types';
import { buildClientProfile } from '@/lib/physiology/profile';
import { monthlyMuscleGainKg, weeklyWeightLossKg, vo2max8WeekGainPct } from '@/lib/physiology/rates';
import { safeParse } from '@/lib/utils/numbers';
import { calculateAge } from '@/lib/scoring';
import { calculateCardioAnalysis } from '@/lib/utils/cardioAnalysis';
import { mapFitnessGoalLevel } from '@/lib/utils/cardioAnalysis';
import {
  GOAL_BUILD_MUSCLE,
  GOAL_BUILD_STRENGTH,
  GOAL_BODY_RECOMP,
  GOAL_IMPROVE_FITNESS,
  GOAL_WEIGHT_LOSS,
  parseClientGoals,
  resolveCardioPillarRole,
  resolvePillarRole,
} from './goalContext';
import { mergeEffectiveGoalLevels } from './systemGoalTargets';
import { ASSESSMENT_OPTIONS } from '@/constants/assessment';
import { CLIENT_REPORT_COPY } from '@/constants/clientReport';

export type HorizonMonths = 1 | 4 | 12;

export interface GoalHorizonBlock {
  months: HorizonMonths;
  title: string;
  bullets: string[];
}

export interface GoalHorizonsOutlook {
  headline: string;
  horizons: GoalHorizonBlock[];
  /** Flat list for legacy UI (short → long). */
  bullets: string[];
  /** Medium-term anchor in weeks (≈4 months). */
  horizonWeeks: number;
}

function sessionsLabel(freq: number): string {
  if (freq <= 0) return 'when you start training consistently';
  if (freq === 1) return 'with about 1 session per week';
  if (freq >= 5) return 'with 5+ sessions per week';
  return `with about ${freq} sessions per week`;
}

function buildWeightLossHorizons(
  formData: FormData,
  profile: ReturnType<typeof buildClientProfile>,
  levels: ReturnType<typeof mergeEffectiveGoalLevels>['levels'],
): GoalHorizonBlock[] {
  const weightKg = profile.bodyWeightKg;
  const levelWL = levels.goalLevelWeightLoss;
  let targetKg = 0;
  if (levelWL.includes('kg')) {
    targetKg = safeParse(levelWL.replace('kg', '')) || 5;
  } else {
    targetKg = (weightKg * (safeParse(levelWL) || 10)) / 100;
  }
  const rate = weeklyWeightLossKg(profile, targetKg);
  // Cap by measured fat mass only when body fat is known — an unknown reading
  // must not clamp every projection to 0 kg.
  const fatKg =
    profile.bodyFatPct && profile.bodyFatPct > 0 ? (weightKg * profile.bodyFatPct) / 100 : null;
  const caps = [rate.rate * 52, weightKg * 0.28];
  if (fatKg !== null) caps.push(fatKg * 0.9);
  const maxPhysiological = Math.min(...caps);
  const kg1m = Math.min(rate.rate * 4, maxPhysiological);
  const kg4m = Math.min(rate.rate * 16, maxPhysiological);
  const kg12m = maxPhysiological;

  return [
    {
      months: 1,
      title: 'Next month',
      bullets: [
        `Roughly ${kg1m.toFixed(1)} kg fat loss is realistic if nutrition and steps stay consistent.`,
        'Strength work helps protect muscle while you lean out.',
      ],
    },
    {
      months: 4,
      title: 'Next 4 months',
      bullets: [
        `Around ${kg4m.toFixed(1)} kg total fat loss at a sustainable pace (${rate.rate.toFixed(2)} kg/week).`,
        'Habits around sleep, protein, and steps matter as much as sessions.',
      ],
    },
    {
      months: 12,
      title: 'Next 12 months',
      bullets: [
        `Your headline direction supports up to ~${kg12m.toFixed(1)} kg fat loss if consistency holds.`,
        'We adjust pace if life stress, travel, or plateaus show up — no crash dieting.',
      ],
    },
  ];
}

function buildMuscleHorizons(
  profile: ReturnType<typeof buildClientProfile>,
  levels: ReturnType<typeof mergeEffectiveGoalLevels>['levels'],
): GoalHorizonBlock[] {
  const targetKg = safeParse(levels.goalLevelMuscle) || 4;
  const rate = monthlyMuscleGainKg(profile, { concurrentFatLoss: true });
  const kg1 = Math.max(0.3, Math.min(targetKg * 0.15, rate.rate * 1));
  const kg4 = Math.min(targetKg * 0.45, rate.rate * 4);
  const kg12 = targetKg;

  return [
    {
      months: 1,
      title: 'Next month',
      bullets: [
        `Early scale and performance shifts; ~${kg1.toFixed(1)} kg lean mass gain is plausible.`,
        'Technique and progressive overload beat chasing extreme volume.',
      ],
    },
    {
      months: 4,
      title: 'Next 4 months',
      bullets: [
        `Visible muscle and strength changes — about ${kg4.toFixed(1)} kg lean gain at your training level.`,
        `${sessionsLabel(profile.trainingFrequency)} and recovery drive the curve.`,
      ],
    },
    {
      months: 12,
      title: 'Next 12 months',
      bullets: [
        `Working toward ~${kg12.toFixed(1)} kg lean mass gain over the year if recovery and protein stay on track.`,
        'Cardio stays supportive — not competing with hypertrophy.',
      ],
    },
  ];
}

function buildFitnessHorizons(formData: FormData, levels: ReturnType<typeof mergeEffectiveGoalLevels>['levels']): GoalHorizonBlock[] {
  const age = formData.dateOfBirth ? calculateAge(formData.dateOfBirth) : 35;
  const gender = (formData.gender || 'male').toLowerCase() === 'female' ? 'female' : 'male';
  const rhr = safeParse(formData.cardioRestingHr);
  const peak = safeParse(formData.cardioPeakHr);
  const rec = safeParse(formData.cardioPost1MinHr);
  const cardio = calculateCardioAnalysis(
    age,
    gender,
    mapFitnessGoalLevel(levels.goalLevelFitness),
    rhr,
    peak,
    rec,
    formData.recentActivity,
    { pillarRole: 'primary' },
  );
  const vo2 = cardio.vo2.current;
  const profile = buildClientProfile(formData);
  const vo2Rate = vo2 > 0 ? vo2max8WeekGainPct(profile, vo2) : null;
  const pct4 = vo2Rate ? vo2Rate.rate * 0.5 : 8;
  const pct12 = vo2Rate ? Math.min(vo2Rate.rate * 1.5, 20) : 15;

  return [
    {
      months: 1,
      title: 'Next month',
      bullets: [
        'Resting heart rate and how you feel on stairs or brisk walks should start to improve.',
        vo2 > 0 ? `VO₂ may move ~${(pct4 * 0.25).toFixed(0)}% with regular conditioning.` : 'Establish a baseline test rhythm with your coach.',
      ],
    },
    {
      months: 4,
      title: 'Next 4 months',
      bullets: [
        `Meaningful cardio capacity gains — roughly ${pct4.toFixed(0)}% VO₂ improvement is realistic.`,
        `Recovery and resting HR targets: ${cardio.recovery.target} bpm drop, RHR toward ${cardio.rhr.target} bpm.`,
      ],
    },
    {
      months: 12,
      title: 'Next 12 months',
      bullets: [
        `Long arc toward ~${pct12.toFixed(0)}% VO₂ improvement if training stays consistent.`,
        'Periodise hard intervals with easy base work to avoid burnout.',
      ],
    },
  ];
}

function buildStrengthHorizons(levels: ReturnType<typeof mergeEffectiveGoalLevels>['levels']): GoalHorizonBlock[] {
  const pct = levels.goalLevelStrength.includes('modest')
    ? 12
    : levels.goalLevelStrength.includes('ambitious')
      ? 30
      : 20;

  return [
    {
      months: 1,
      title: 'Next month',
      bullets: ['Groove technique on main lifts; expect neural strength jumps before size changes.'],
    },
    {
      months: 4,
      title: 'Next 4 months',
      bullets: [`Meaningful strength PRs — ~${pct}% on key patterns is realistic for your experience.`],
    },
    {
      months: 12,
      title: 'Next 12 months',
      bullets: ['Consolidate strength blocks with deloads; connect gym numbers to daily movement quality.'],
    },
  ];
}

function buildRecompHorizons(): GoalHorizonBlock[] {
  return [
    {
      months: 1,
      title: 'Next month',
      bullets: ['Dial protein and steps; expect subtle shape changes before scale moves dramatically.'],
    },
    {
      months: 4,
      title: 'Next 4 months',
      bullets: ['Visible recomposition — fat down slightly, muscle up slightly, if nutrition stays tight.'],
    },
    {
      months: 12,
      title: 'Next 12 months',
      bullets: ['Sustain a recomposition arc without aggressive cuts that cost training performance.'],
    },
  ];
}

function buildGeneralHorizons(): GoalHorizonBlock[] {
  return [
    {
      months: 1,
      title: 'Next month',
      bullets: ['Build repeatable habits: sleep, steps, protein, and 2–3 training sessions.'],
    },
    {
      months: 4,
      title: 'Next 4 months',
      bullets: ['Noticeable energy, strength, and body-comp shifts when basics stay consistent.'],
    },
    {
      months: 12,
      title: 'Next 12 months',
      bullets: ['A healthier baseline across pillars — progress is steady, not extreme.'],
    },
  ];
}

export function buildGoalHorizons(
  formData: FormData | undefined,
  scores: ScoreSummary | undefined,
  goals: string[] | undefined,
): GoalHorizonsOutlook | null {
  if (!formData || !scores) return null;

  const { levels, context } = mergeEffectiveGoalLevels(formData, goals, scores);
  const profile = buildClientProfile(formData, scores);
  const primary = context.primaryGoal;

  let horizons: GoalHorizonBlock[];
  switch (primary) {
    case GOAL_WEIGHT_LOSS:
      horizons = buildWeightLossHorizons(formData, profile, levels);
      break;
    case GOAL_BUILD_MUSCLE:
      horizons = buildMuscleHorizons(profile, levels);
      break;
    case GOAL_IMPROVE_FITNESS:
      horizons = buildFitnessHorizons(formData, levels);
      break;
    case GOAL_BUILD_STRENGTH:
      horizons = buildStrengthHorizons(levels);
      break;
    case GOAL_BODY_RECOMP:
      horizons = buildRecompHorizons();
      break;
    default:
      horizons = buildGeneralHorizons();
  }

  const cardioRole = resolveCardioPillarRole(context);
  if (cardioRole !== 'primary' && primary === GOAL_BUILD_MUSCLE) {
    horizons[1].bullets.push(
      'Heart and lungs look supportive for muscle gain — cardio stays in the background.',
    );
  }
  if (resolvePillarRole('strength', context) === 'secondary' && primary === GOAL_WEIGHT_LOSS) {
    horizons[1].bullets.push('Strength training protects muscle while you lose fat.');
  }

  const bullets = horizons.flatMap((h) => h.bullets.map((b) => `${h.title}: ${b}`));

  return {
    headline: buildOutlookHeadline(formData, context.primaryGoal),
    horizons,
    bullets,
    horizonWeeks: 16,
  };
}

function goalLabel(goalId: string): string {
  const match = ASSESSMENT_OPTIONS.clientGoals.find((g) => g.value === goalId);
  return match?.label ?? goalId.replace(/-/g, ' ');
}

/** Client-facing outlook title from goals + training frequency (not ambition pickers). */
export function buildOutlookHeadline(
  formData: FormData,
  primaryGoalId: string,
): string {
  const freqRaw = formData.trainingFrequency ?? '';
  const freqNum = safeParse(freqRaw);
  const primaryLabel = goalLabel(primaryGoalId);

  if (freqNum >= 1) {
    const freqOption = ASSESSMENT_OPTIONS.trainingFrequency.find(
      (f) => f.value === String(freqRaw) || f.value === String(freqNum),
    );
    const freqText = freqOption?.label ?? `${freqNum} sessions per week`;
    return `What's realistic on your plan (${freqText.toLowerCase()})`;
  }

  const goals = formData.clientGoals ?? [];
  if (goals.length > 0) {
    return `What's realistic for ${primaryLabel.toLowerCase()}`;
  }

  return CLIENT_REPORT_COPY.outlookHeading;
}
