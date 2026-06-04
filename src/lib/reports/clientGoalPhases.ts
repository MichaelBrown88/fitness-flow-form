import type { FormData } from '@/contexts/FormContext';
import type { ScoreSummary } from '@/lib/scoring';
import { buildClientProfile } from '@/lib/physiology/profile';
import { weeklyWeightLossKg } from '@/lib/physiology/rates';
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

function buildMusclePhases(ctx: ClientGoalContext): ClientReportPlanStep[] {
  return [
    {
      title: 'Phase 1 — Foundation',
      body: 'Master technique on main lifts, dial protein and sleep, and establish a repeatable weekly split.',
    },
    {
      title: 'Phase 2 — Build volume',
      body: 'Progressive overload on key patterns; expect early strength jumps, then visible muscle changes by month three.',
    },
    {
      title: 'Phase 3 — Refine & peak',
      body: 'Periodise harder blocks with deloads; tie gym progress to how you look, move, and recover day to day.',
    },
  ];
}

function buildFitnessPhases(): ClientReportPlanStep[] {
  return [
    {
      title: 'Phase 1 — Aerobic base',
      body: 'Easy conditioning and rhythm — improve resting heart rate and how you feel on stairs or brisk walks.',
    },
    {
      title: 'Phase 2 — Build capacity',
      body: 'Add structured intervals and longer efforts; VO₂ and recovery scores should move meaningfully over four months.',
    },
    {
      title: 'Phase 3 — Refine performance',
      body: 'Blend hard and easy weeks, retest fitness, and lock in habits so gains stick for the full year.',
    },
  ];
}

function buildStrengthPhases(): ClientReportPlanStep[] {
  return [
    {
      title: 'Phase 1 — Foundation',
      body: 'Groove squat, hinge, push, and pull patterns; build work capacity without grinding into fatigue.',
    },
    {
      title: 'Phase 2 — Load & progress',
      body: 'Chase measurable PRs on endurance, core, and grip — expect the biggest jumps in months two to four.',
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
      return buildMusclePhases(ctx);
    case GOAL_IMPROVE_FITNESS:
      return buildFitnessPhases();
    case GOAL_BUILD_STRENGTH:
      return buildStrengthPhases();
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
