import type { FormData } from '@/contexts/FormContext';
import type { ScoreSummary } from '@/lib/scoring';
import { calculateAge } from '@/lib/scoring';
import { buildClientProfile } from '@/lib/physiology/profile';
import {
  monthlyMuscleGainKg,
  vo2max8WeekGainPct,
  weeklyWeightLossKg,
} from '@/lib/physiology/rates';
import { calculateCardioAnalysis, mapFitnessGoalLevel } from '@/lib/utils/cardioAnalysis';
import { safeParse } from '@/lib/utils/numbers';
import {
  GOAL_BUILD_MUSCLE,
  GOAL_BUILD_STRENGTH,
  GOAL_IMPROVE_FITNESS,
  GOAL_WEIGHT_LOSS,
  parseClientGoals,
  type ClientGoalContext,
} from '@/lib/goals/goalContext';
import { buildGoalHorizons } from '@/lib/goals/goalHorizons';
import { mergeEffectiveGoalLevels } from '@/lib/goals/systemGoalTargets';
import { ASSESSMENT_OPTIONS } from '@/constants/assessment';
import type { ClientReportPlanStep } from '@/lib/reports/buildClientReportModel';

function goalLabel(goalId: string): string {
  return ASSESSMENT_OPTIONS.clientGoals.find((g) => g.value === goalId)?.label ?? goalId;
}

function weightLossTargetKg(
  profile: ReturnType<typeof buildClientProfile>,
  levels: ReturnType<typeof mergeEffectiveGoalLevels>['levels'],
): number {
  const weightKg = profile.bodyWeightKg;
  const levelWL = levels.goalLevelWeightLoss;
  if (levelWL.includes('kg')) {
    return safeParse(levelWL.replace('kg', '')) || 5;
  }
  return (weightKg * (safeParse(levelWL) || 10)) / 100;
}

function buildWeightLossPhases(
  formData: FormData,
  scores: ScoreSummary,
  goals: string[] | undefined,
): ClientReportPlanStep[] {
  const profile = buildClientProfile(formData, scores);
  const { levels } = mergeEffectiveGoalLevels(formData, goals, scores);
  const targetKg = weightLossTargetKg(profile, levels);
  const rate = weeklyWeightLossKg(profile, targetKg);
  const kg4 = (rate.rate * 16).toFixed(1);
  const kg12 = (rate.rate * 52).toFixed(1);
  const label = goalLabel(GOAL_WEIGHT_LOSS).toLowerCase();

  return [
    {
      title: 'Phase 1 — Foundation',
      body: `Lock in nutrition, protein, and steps; train strength 2–3×/week to protect muscle while we set up ${label}. Expect the first visible scale shift within a few weeks.`,
    },
    {
      title: 'Phase 2 — Build momentum',
      body: `Turn up training consistency and conditioning. Target roughly ${kg4} kg fat loss over the next four months at about ${rate.rate.toFixed(2)} kg/week — sustainable, not crash dieting.`,
    },
    {
      title: 'Phase 3 — Refine & arrive',
      body: `Fine-tune calories, deload when needed, and keep strength high so metabolism stays on your side. At this pace, up to ~${kg12} kg over a full year is realistic if habits hold.`,
    },
  ];
}

function buildMusclePhases(
  formData: FormData,
  scores: ScoreSummary,
  goals: string[] | undefined,
  ctx: ClientGoalContext,
): ClientReportPlanStep[] {
  const profile = buildClientProfile(formData, scores);
  const { levels } = mergeEffectiveGoalLevels(formData, goals, scores);
  const targetKg = safeParse(levels.goalLevelMuscle) || 4;
  const rate = monthlyMuscleGainKg(profile, { concurrentFatLoss: ctx.hasWeightLoss });
  const kg4 = Math.min(targetKg * 0.45, rate.rate * 4).toFixed(1);
  const kg12 = targetKg.toFixed(1);

  return [
    {
      title: 'Phase 1 — Foundation',
      body: 'Master technique on main lifts, dial protein and sleep, and establish a repeatable weekly split.',
    },
    {
      title: 'Phase 2 — Build volume',
      body: `Progressive overload on key patterns — about ${kg4} kg of lean muscle over four months is realistic at your training level.`,
    },
    {
      title: 'Phase 3 — Refine & peak',
      body: `Periodise harder blocks with deloads, working toward ~${kg12} kg lean gain over the year if recovery and protein stay on track.`,
    },
  ];
}

function buildFitnessPhases(
  formData: FormData,
  scores: ScoreSummary,
  goals: string[] | undefined,
): ClientReportPlanStep[] {
  const { levels } = mergeEffectiveGoalLevels(formData, goals, scores);
  const age = formData.dateOfBirth ? calculateAge(formData.dateOfBirth) : 35;
  const gender = (formData.gender || 'male').toLowerCase() === 'female' ? 'female' : 'male';
  const cardio = calculateCardioAnalysis(
    age,
    gender,
    mapFitnessGoalLevel(levels.goalLevelFitness),
    safeParse(formData.cardioRestingHr),
    safeParse(formData.cardioPeakHr),
    safeParse(formData.cardioPost1MinHr),
    formData.recentActivity,
    { pillarRole: 'primary' },
  );
  const vo2 = cardio.vo2.current;
  const profile = buildClientProfile(formData, scores);
  const vo2Rate = vo2 > 0 ? vo2max8WeekGainPct(profile, vo2) : null;
  const pct4 = Math.round(vo2Rate ? vo2Rate.rate * 0.5 : 8);
  const pct12 = Math.round(vo2Rate ? Math.min(vo2Rate.rate * 1.5, 20) : 15);

  return [
    {
      title: 'Phase 1 — Aerobic base',
      body: 'Easy conditioning and rhythm — improve resting heart rate and how you feel on stairs or brisk walks.',
    },
    {
      title: 'Phase 2 — Build capacity',
      body: `Add structured intervals and longer efforts — roughly ${pct4}% improvement in your fitness level over four months is realistic.`,
    },
    {
      title: 'Phase 3 — Refine performance',
      body: `Blend hard and easy weeks and retest along the way — the long arc points to ~${pct12}% fitness gain over the year if training stays consistent.`,
    },
  ];
}

function buildStrengthPhases(
  formData: FormData,
  scores: ScoreSummary,
  goals: string[] | undefined,
): ClientReportPlanStep[] {
  const { levels } = mergeEffectiveGoalLevels(formData, goals, scores);
  const pct = levels.goalLevelStrength.includes('modest')
    ? 12
    : levels.goalLevelStrength.includes('ambitious')
      ? 30
      : 20;

  return [
    {
      title: 'Phase 1 — Foundation',
      body: 'Groove squat, hinge, push, and pull patterns; build work capacity without grinding into fatigue.',
    },
    {
      title: 'Phase 2 — Load & progress',
      body: `Chase measurable PRs on endurance, core, and grip — around ${pct}% on key patterns is realistic for your experience over four months.`,
    },
    {
      title: 'Phase 3 — Consolidate',
      body: 'Wave loading with planned deloads; connect gym numbers to posture, movement quality, and daily life.',
    },
  ];
}

function buildGeneralPhases(label: string): ClientReportPlanStep[] {
  return [
    {
      title: 'Phase 1 — Foundation',
      body: `Build sleep, steps, and training habits that support ${label.toLowerCase()}.`,
    },
    {
      title: 'Phase 2 — Momentum',
      body: 'Increase training quality and track the metrics in your report — adjust when life stress spikes.',
    },
    {
      title: 'Phase 3 — Refine',
      body: 'Sustain progress with deloads and check-ins; your coach dials the plan as your body responds.',
    },
  ];
}

/**
 * Compact self-guided takeaway — three habit bullets a client can act on alone.
 * Rendered under the coached plan so someone who doesn't sign up still leaves
 * with a starting point (the "reassess in 12 weeks" line lives in copy).
 */
export function buildClientSelfGuidedHabits(
  formData: FormData | undefined,
  goals: string[] | undefined,
): string[] {
  const ctx = formData ? parseClientGoals(formData, goals) : null;

  switch (ctx?.primaryGoal) {
    case GOAL_WEIGHT_LOSS:
      return [
        'Protein at every meal and a daily step target — the two levers that move the scale most reliably.',
        'Strength train 2–3×/week so the weight you lose is fat, not muscle.',
        'Weigh in weekly, same day and time — trend over weeks, not days.',
      ];
    case GOAL_BUILD_MUSCLE:
      return [
        'Train each major muscle group twice a week and add a little weight or a rep when you can.',
        'Eat enough protein (roughly palm-sized portion each meal) and don\u2019t skip sleep — that\u2019s where muscle is built.',
        'Track your main lifts so progress is visible week to week.',
      ];
    case GOAL_IMPROVE_FITNESS:
      return [
        'Two to three easy cardio sessions a week where you can still hold a conversation.',
        'Add one harder interval session once the easy sessions feel routine.',
        'Check your resting heart rate monthly — it dropping is the clearest sign this is working.',
      ];
    case GOAL_BUILD_STRENGTH:
      return [
        'Practise squat, hinge, push, and pull movements 2–3×/week — technique first, load second.',
        'Add small amounts of weight when all sets feel solid, and rest fully between heavy sets.',
        'Keep a simple log of your working weights so every session builds on the last.',
      ];
    default:
      return [
        'Aim for consistent sleep and a daily walk — recovery and movement drive everything else.',
        'Train 2–3×/week, even short sessions; consistency beats intensity.',
        'Pick one number from this report to improve and check it monthly.',
      ];
  }
}

export function buildClientGoalPhases(
  formData: FormData | undefined,
  scores: ScoreSummary | undefined,
  goals: string[] | undefined,
): ClientReportPlanStep[] {
  if (!formData || !scores) {
    return buildGeneralPhases('your goals');
  }

  const ctx = parseClientGoals(formData, goals);
  const horizons = buildGoalHorizons(formData, scores, goals);

  switch (ctx.primaryGoal) {
    case GOAL_WEIGHT_LOSS:
      return buildWeightLossPhases(formData, scores, goals);
    case GOAL_BUILD_MUSCLE:
      return buildMusclePhases(formData, scores, goals, ctx);
    case GOAL_IMPROVE_FITNESS:
      return buildFitnessPhases(formData, scores, goals);
    case GOAL_BUILD_STRENGTH:
      return buildStrengthPhases(formData, scores, goals);
    default:
      if (horizons?.horizons?.[1]?.bullets[0]) {
        return [
          {
            title: 'Phase 1 — Foundation',
            body: 'Establish nutrition, training, and recovery basics your coach can build on.',
          },
          {
            title: 'Phase 2 — Build momentum',
            body: horizons.horizons.find((h) => h.months === 4)?.bullets[0] ?? 'Stack consistent sessions and track the wins in this report.',
          },
          {
            title: 'Phase 3 — Refine',
            body: horizons.horizons.find((h) => h.months === 12)?.bullets[0] ?? 'Sustain the habits that got you here and adjust when plateaus show up.',
          },
        ];
      }
      return buildGeneralPhases(goalLabel(ctx.primaryGoal));
  }
}
