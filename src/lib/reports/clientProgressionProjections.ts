/**
 * Client report progression columns (Now → 4 months → 1 year).
 * Uses the same physiology rates as goal horizons — not conservative gap-analysis targets.
 */

import type { FormData } from '@/contexts/FormContext';
import type { ScoreCategory, ScoreSummary } from '@/lib/scoring';
import type { GapAnalysisData } from '@/components/reports/useGapAnalysisData';
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
  resolvePillarRole,
  type ClientGoalContext,
} from '@/lib/goals/goalContext';
import { mergeEffectiveGoalLevels } from '@/lib/goals/systemGoalTargets';
import type { ClientReportProgressionRow } from '@/lib/reports/clientProgressionRows';
import { CLIENT_METRIC_LABELS } from '@/constants/clientReport';

const WEEKS_4MO = 16;
const WEEKS_12MO = 52;

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round0(n: number): number {
  return Math.round(n);
}

function metricLabel(key: keyof typeof CLIENT_METRIC_LABELS): string {
  return CLIENT_METRIC_LABELS[key]?.short ?? key;
}

function row(
  name: string,
  current: number,
  at4: number,
  at12: number,
  unit: string,
  decimals = 1,
): ClientReportProgressionRow | null {
  if (!Number.isFinite(current) || current <= 0) return null;
  return {
    name,
    unit,
    current: decimals === 0 ? String(round0(current)) : round1(current).toFixed(decimals),
    fourMonths: decimals === 0 ? String(round0(at4)) : round1(at4).toFixed(decimals),
    oneYear: decimals === 0 ? String(round0(at12)) : round1(at12).toFixed(decimals),
  };
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

function projectPctGain(current: number, pct4: number, pct12: number): { at4: number; at12: number } {
  return {
    at4: current * (1 + pct4 / 100),
    at12: current * (1 + pct12 / 100),
  };
}

export function buildBodyCompProgressionRows(
  formData: FormData | undefined,
  scores: ScoreSummary | undefined,
  goals: string[] | undefined,
  gap?: GapAnalysisData,
): ClientReportProgressionRow[] {
  if (!gap?.bodyCompGaps || !formData) return [];
  const g = gap.bodyCompGaps;
  const ctx = parseClientGoals(formData, goals);
  const profile = buildClientProfile(formData, scores);
  const { levels } = mergeEffectiveGoalLevels(formData, goals, scores);

  const weight = g.weight.current;
  const bf = g.fat.current;
  const muscle = g.muscle.current;

  if (ctx.primaryGoal === GOAL_WEIGHT_LOSS || ctx.hasWeightLoss) {
    const targetKg = weightLossTargetKg(profile, levels);
    const wlRate = weeklyWeightLossKg(profile, targetKg);
    const kgPerWeek = wlRate.rate;
    const loss4 = kgPerWeek * WEEKS_4MO;
    const loss12 = kgPerWeek * WEEKS_12MO;
    const fatKg = (weight * bf) / 100;
    const cappedLoss12 = Math.min(loss12, fatKg * 0.9, weight * 0.28);
    const cappedLoss4 = Math.min(loss4, cappedLoss12);

    const weight4 = weight - cappedLoss4;
    const weight12 = weight - cappedLoss12;

    const fatMassNow = (weight * bf) / 100;
    const fatLoss4 = cappedLoss4 * 0.88;
    const fatLoss12 = cappedLoss12 * 0.88;
    const fatMass4 = Math.max(fatMassNow - fatLoss4, fatMassNow * 0.35);
    const fatMass12 = Math.max(fatMassNow - fatLoss12, fatMassNow * 0.35);
    const bf4 = weight4 > 0 ? (fatMass4 / weight4) * 100 : bf;
    const bf12 = weight12 > 0 ? (fatMass12 / weight12) * 100 : bf;

    const muscleRate = monthlyMuscleGainKg(profile, { concurrentFatLoss: true });
    const muscle4 = muscle + muscleRate.rate * 4 * 0.4;
    const muscle12 = muscle + muscleRate.rate * 12 * 0.55;

    return [
      row(metricLabel('bodyWeight'), weight, weight4, weight12, 'kg', 1),
      row(metricLabel('bodyFat'), bf, bf4, bf12, '%', 1),
      row(metricLabel('muscleMass'), muscle, muscle4, muscle12, 'kg', 1),
    ].filter((r): r is ClientReportProgressionRow => r != null);
  }

  if (ctx.primaryGoal === GOAL_BUILD_MUSCLE || ctx.hasBuildMuscle) {
    const muscleRate = monthlyMuscleGainKg(profile, { concurrentFatLoss: ctx.hasWeightLoss });
    const muscle4 = muscle + muscleRate.rate * 4;
    const muscle12 = muscle + muscleRate.rate * 12;
    const targetBf = g.fat.target > 0 ? g.fat.target : bf;
    const weight4 = weight + (muscle4 - muscle) * 0.85;
    const weight12 = weight + (muscle12 - muscle) * 0.9;
    const bf4 = bf - (bf - targetBf) * 0.35;
    const bf12 = targetBf;

    return [
      row(metricLabel('muscleMass'), muscle, muscle4, muscle12, 'kg', 1),
      row(metricLabel('bodyWeight'), weight, weight4, weight12, 'kg', 1),
      row(metricLabel('bodyFat'), bf, bf4, bf12, '%', 1),
    ].filter((r): r is ClientReportProgressionRow => r != null);
  }

  const targetW = g.weight.target > 0 ? g.weight.target : weight;
  const targetBf = g.fat.target > 0 ? g.fat.target : bf;
  const targetM = g.muscle.target > 0 ? g.muscle.target : muscle;
  const frac4 = WEEKS_4MO / WEEKS_12MO;

  return [
    row(metricLabel('bodyFat'), bf, bf - (bf - targetBf) * frac4, targetBf, '%', 1),
    row(metricLabel('muscleMass'), muscle, muscle + (targetM - muscle) * frac4, targetM, 'kg', 1),
    row(metricLabel('bodyWeight'), weight, weight + (targetW - weight) * frac4, targetW, 'kg', 1),
  ].filter((r): r is ClientReportProgressionRow => r != null);
}

export function buildStrengthProgressionRows(
  formData: FormData | undefined,
  goals: string[] | undefined,
  gap?: GapAnalysisData,
): ClientReportProgressionRow[] {
  if (!gap?.functionalGaps) return [];
  const g = gap.functionalGaps;
  const ctx = parseClientGoals(formData, goals);
  const isPrimary = resolvePillarRole('strength', ctx) === 'primary';
  const isSecondary = resolvePillarRole('strength', ctx) === 'secondary';

  const pct4 = isPrimary ? 12 : isSecondary ? 8 : 5;
  const pct12 = isPrimary ? 28 : isSecondary ? 18 : 12;

  const rows: ClientReportProgressionRow[] = [];
  const end = projectPctGain(g.endurance.current, pct4, pct12);
  const core = projectPctGain(g.core.current, pct4 * 0.85, pct12 * 0.85);
  const endRow = row(metricLabel('endurance'), g.endurance.current, end.at4, end.at12, 'reps', 0);
  const coreRow = row(metricLabel('core'), g.core.current, core.at4, core.at12, 'sec', 0);
  if (endRow) rows.push(endRow);
  if (coreRow) rows.push(coreRow);

  if (g.strength) {
    const grip = projectPctGain(g.strength.current, pct4 * 0.9, pct12 * 0.9);
    const gripRow = row(metricLabel('grip'), g.strength.current, grip.at4, grip.at12, 'kg', 1);
    if (gripRow) rows.push(gripRow);
  }

  return rows;
}

export function buildCardioProgressionRows(
  formData: FormData | undefined,
  scores: ScoreSummary | undefined,
  goals: string[] | undefined,
  gap?: GapAnalysisData,
): ClientReportProgressionRow[] {
  if (!gap?.cardioGaps || !formData) return [];
  const g = gap.cardioGaps;
  const ctx = parseClientGoals(formData, goals);
  const profile = buildClientProfile(formData, scores);
  const { levels } = mergeEffectiveGoalLevels(formData, goals, scores);

  const vo2Current = g.vo2.current;
  const vo2Rate = vo2Current > 0 ? vo2max8WeekGainPct(profile, vo2Current) : null;
  const isFitnessPrimary = ctx.primaryGoal === GOAL_IMPROVE_FITNESS;
  const pct8 = vo2Rate?.rate ?? (isFitnessPrimary ? 12 : 6);
  const vo2Gain4 = pct8 * 2;
  const vo2Gain12 = Math.min(pct8 * 4.5, isFitnessPrimary ? 22 : 16);
  const vo2 = projectPctGain(vo2Current, vo2Gain4, vo2Gain12);

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
    { pillarRole: resolvePillarRole('cardio', ctx) },
  );

  const rhrCurrent = g.rhr.current;
  const rhrTarget = cardio.rhr.target > 0 ? cardio.rhr.target : Math.max(55, rhrCurrent - 8);
  const rhr4 = rhrCurrent - (rhrCurrent - rhrTarget) * (WEEKS_4MO / WEEKS_12MO);
  const rhr12 = rhrTarget;

  const recCurrent = g.recovery.current;
  const recTarget =
    cardio.recovery.target > recCurrent
      ? cardio.recovery.target
      : recCurrent + Math.max(4, Math.round(recCurrent * 0.15));
  const rec4 = recCurrent + (recTarget - recCurrent) * (WEEKS_4MO / WEEKS_12MO);
  const rec12 = recTarget;

  return [
    // No lab units client-side — "Fitness level" plain framing carries the number.
    row(metricLabel('vo2'), vo2Current, vo2.at4, vo2.at12, '', 1),
    row(metricLabel('rhr'), rhrCurrent, rhr4, rhr12, 'bpm', 0),
    row(metricLabel('hrr'), recCurrent, rec4, rec12, 'bpm', 0),
  ].filter((r): r is ClientReportProgressionRow => r != null);
}

export function buildMovementProgressionRows(category: ScoreCategory | undefined): ClientReportProgressionRow[] {
  if (!category?.assessed) return [];
  const score = Math.round(category.score ?? 0);
  if (score <= 0) return [];

  const headroom = 100 - score;
  const at4 = Math.min(100, score + headroom * 0.45);
  const at12 = Math.min(100, score + headroom * 0.85);

  return [
    {
      name: 'Movement quality',
      unit: '/ 100',
      current: String(score),
      fourMonths: String(round0(at4)),
      oneYear: String(round0(at12)),
    },
  ];
}
