import type { FormData } from '@/contexts/FormContext';
import type { ScoreSummary } from '@/lib/scoring';
import { buildRoadmap } from '@/lib/scoring';
import { safeParse } from '@/lib/utils/numbers';
import { getEffectiveGoalAmbition } from '@/lib/goals/achievableLandmarks';
import { COACH_PLAN } from './coachPlanConstants';

function postureArray(value: FormData['postureHeadOverall']): string[] {
  return Array.isArray(value) ? value : value ? [value] : [];
}

function computeLevelText(primaryGoalRaw: string, goalAmbition: string): string {
  let levelText = 'foundational';
  if (primaryGoalRaw === 'weight-loss') {
    const pct = safeParse(goalAmbition) || 15;
    if (pct >= COACH_PLAN.GOAL_WEIGHT_LOSS_ELITE_PCT) levelText = 'elite-level';
    else if (pct >= COACH_PLAN.GOAL_WEIGHT_LOSS_ABOVE_AVG_PCT) levelText = 'above-average';
    else if (pct >= COACH_PLAN.GOAL_WEIGHT_LOSS_MODERATE_PCT) levelText = 'moderate';
    else levelText = 'foundational';
  } else if (primaryGoalRaw === 'body-recomposition') {
    const recompLevel = goalAmbition || 'athletic';
    if (recompLevel === 'shredded') levelText = 'elite-level';
    else if (recompLevel === 'athletic') levelText = 'above-average';
    else if (recompLevel === 'fit') levelText = 'moderate';
    else levelText = 'foundational';
  } else if (primaryGoalRaw === 'build-muscle') {
    const kg = safeParse(goalAmbition) || 6;
    if (kg >= COACH_PLAN.GOAL_MUSCLE_ELITE_KG) levelText = 'elite-level';
    else if (kg >= COACH_PLAN.GOAL_MUSCLE_ABOVE_AVG_KG) levelText = 'above-average';
    else if (kg >= COACH_PLAN.GOAL_MUSCLE_MODERATE_KG) levelText = 'moderate';
    else levelText = 'foundational';
  } else if (primaryGoalRaw === 'build-strength') {
    const pct = safeParse(goalAmbition) || 30;
    if (pct >= COACH_PLAN.GOAL_STRENGTH_ELITE_PCT) levelText = 'elite-level';
    else if (pct >= COACH_PLAN.GOAL_STRENGTH_ABOVE_AVG_PCT) levelText = 'above-average';
    else if (pct >= COACH_PLAN.GOAL_STRENGTH_MODERATE_PCT) levelText = 'moderate';
    else levelText = 'foundational';
  } else if (primaryGoalRaw === 'improve-fitness') {
    const ambitionLevel = goalAmbition || 'active';
    if (ambitionLevel === 'elite') levelText = 'elite-level';
    else if (ambitionLevel === 'athletic') levelText = 'above-average';
    else if (ambitionLevel === 'active') levelText = 'moderate';
    else levelText = 'foundational';
  }
  return levelText;
}

export interface CoachPlanNarrativeContext {
  form: FormData;
  scores: ScoreSummary;
  hasAnyData: boolean;
  goals: string[];
  primaryGoalRaw: string;
  goalAmbition: string;
  levelText: string;
  gender: string;
  bf: number;
  visceral: number;
  smm: number;
  armDiff: number;
  legDiff: number;
  headPos: string[];
  shoulderPos: string[];
  backPos: string[];
  hipPos: string[];
  kneePos: string[];
  goalInSentence: string;
  bodyCompScore: number;
  cardioScore: number;
  strengthScore: number;
  movementScore: number;
  lifestyleScore: number;
  w: number;
  healthyMax: number;
  totalWeeks: number;
  hasBodyCompData: boolean;
  hasMovementData: boolean;
  hasStrengthData: boolean;
  hasCardioData: boolean;
}

export function buildCoachPlanNarrativeContext(
  form: FormData,
  scores: ScoreSummary,
  hasAnyData: boolean,
): CoachPlanNarrativeContext {
  const goals = Array.isArray(form.clientGoals) ? form.clientGoals : [];
  const primaryGoalRaw = goals[0] || 'general-health';
  const goalAmbition = getEffectiveGoalAmbition(primaryGoalRaw, form);
  const levelText = computeLevelText(primaryGoalRaw, goalAmbition);

  const gender = (form.gender || '').toLowerCase();
  const bf = safeParse(form.inbodyBodyFatPct);
  const visceral = safeParse(form.visceralFatLevel);
  const smm = safeParse(form.skeletalMuscleMassKg);
  const ra = safeParse(form.segmentalArmRightKg);
  const la = safeParse(form.segmentalArmLeftKg);
  const rl = safeParse(form.segmentalLegRightKg);
  const ll = safeParse(form.segmentalLegLeftKg);

  const armDiff = ra > 0 && la > 0 ? Math.abs(ra - la) / Math.max(ra, la) : 0;
  const legDiff = rl > 0 && ll > 0 ? Math.abs(rl - ll) / Math.max(rl, ll) : 0;

  const headPos = postureArray(form.postureHeadOverall);
  const shoulderPos = postureArray(form.postureShouldersOverall);
  const backPos = postureArray(form.postureBackOverall);
  const hipPos = postureArray(form.postureHipsOverall);
  const kneePos = postureArray(form.postureKneesOverall);

  const goalInSentence =
    goals.length > 0 ? goals.map((g) => g.replace('-', ' ')).join(' and ') : 'health and longevity';

  const bodyCompScore = scores.categories.find((c) => c.id === 'bodyComp')?.score || 0;
  const cardioScore = scores.categories.find((c) => c.id === 'cardio')?.score || 0;
  const strengthScore = scores.categories.find((c) => c.id === 'strength')?.score || 0;
  const movementScore = scores.categories.find((c) => c.id === 'movementQuality')?.score || 0;
  const lifestyleScore = scores.categories.find((c) => c.id === 'lifestyle')?.score || 0;

  const w = safeParse(form.inbodyWeightKg);
  const h = safeParse(form.heightCm) / 100;
  const healthyMax = h > 0 ? 25 * h * h : 0;

  const roadmap = buildRoadmap(scores, form);
  const totalWeeks = roadmap.reduce((acc, p) => acc + p.weeks, 0);

  const hasBodyCompData = bf > 0 || visceral > 0 || w > 0;
  const hasMovementData = movementScore > 0 || !!form.postureAiResults || !!form.postureBackOverall;
  const hasStrengthData = strengthScore > 0;
  const hasCardioData = cardioScore > 0;

  return {
    form,
    scores,
    hasAnyData,
    goals,
    primaryGoalRaw,
    goalAmbition,
    levelText,
    gender,
    bf,
    visceral,
    smm,
    armDiff,
    legDiff,
    headPos,
    shoulderPos,
    backPos,
    hipPos,
    kneePos,
    goalInSentence,
    bodyCompScore,
    cardioScore,
    strengthScore,
    movementScore,
    lifestyleScore,
    w,
    healthyMax,
    totalWeeks,
    hasBodyCompData,
    hasMovementData,
    hasStrengthData,
    hasCardioData,
  };
}
