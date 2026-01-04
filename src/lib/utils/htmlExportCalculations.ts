/**
 * Calculation utilities for HTML export generation
 * Extracted from htmlExport.ts to improve maintainability
 */

import type { FormData } from '@/contexts/FormContext';
import type { ScoreSummary } from '@/lib/scoring';

function getCategoryLabel(id: string): string {
  switch (id) {
    case 'bodyComp':
      return 'Body Composition';
    case 'strength':
      return 'Functional Strength';
    case 'cardio':
      return 'Metabolic Fitness';
    case 'movementQuality':
      return 'Movement Quality';
    case 'lifestyle':
      return 'Lifestyle Factors';
    default:
      return id;
  }
}

export function calculateFocusAreasAndStrengths(
  orderedCats: Array<{ id: string; weaknesses?: string[]; strengths?: string[] }>
) {
  const focusAreas = orderedCats.flatMap((cat) =>
    (cat?.weaknesses || []).map((w) => {
      const label = getCategoryLabel(cat.id);
      return `${label}: ${w}`;
    })
  );

  const strengths = orderedCats.flatMap((cat) =>
    (cat?.strengths || []).map((s) => {
      const label = getCategoryLabel(cat.id);
      return `${label}: ${s}`;
    })
  );

  return { focusAreas, strengths };
}

export function calculatePriorityFocus(formData: FormData): string[] {
  const priorityFocus: string[] = [];
  const gender = (formData?.gender || '').toLowerCase();
  const bf = parseFloat(formData?.inbodyBodyFatPct || '0');
  const visceral = parseFloat(formData?.visceralFatLevel || '0');
  const h = (parseFloat(formData?.heightCm || '0') || 0) / 100;
  const w = parseFloat(formData?.inbodyWeightKg || '0');
  const healthyMax = h > 0 ? 25 * h * h : 0;

  if (healthyMax > 0 && w > healthyMax + 3) {
    priorityFocus.push('Body composition (urgent): reduce health risk safely');
  }
  if ((gender === 'male' && bf > 25) || (gender === 'female' && bf > 32)) {
    priorityFocus.push('Elevated body fat %: prioritise fat-loss behaviours');
  }
  if (visceral >= 12) {
    priorityFocus.push('High visceral fat: cardiometabolic risk—lifestyle focus needed');
  }

  const armR = parseFloat(formData?.segmentalArmRightKg || '0');
  const armL = parseFloat(formData?.segmentalArmLeftKg || '0');
  const legR = parseFloat(formData?.segmentalLegRightKg || '0');
  const legL = parseFloat(formData?.segmentalLegLeftKg || '0');

  const pct = (a: number, b: number) => {
    const hi = Math.max(a, b);
    const lo = Math.min(a, b);
    if (hi <= 0) return 0;
    return Math.abs(hi - lo) / hi * 100;
  };

  const armImb = pct(armL, armR);
  const legImb = pct(legL, legR);
  if (armImb >= 6 || legImb >= 6) {
    priorityFocus.push('Limb imbalance identified: addressed with unilateral work to reduce injury risk.');
  }

  return priorityFocus;
}

export function calculateLifestyleRecommendations(formData: FormData): string[] {
  const lifestyleRecs: string[] = [];
  const sleepQ = (formData?.sleepQuality || '').toLowerCase();
  const sleepC = (formData?.sleepConsistency || '').toLowerCase();
  const stress = (formData?.stressLevel || '').toLowerCase();
  const hydration = (formData?.hydrationHabits || '').toLowerCase();
  const caffeine = String(formData?.lastCaffeineIntake || '');
  const steps = parseFloat(formData?.stepsPerDay || '0');
  const sedentary = parseFloat(formData?.sedentaryHours || '0');
  const nutrition = (formData?.nutritionHabits || '').toLowerCase();

  if (sleepQ && (sleepQ === 'poor' || sleepQ === 'fair' || sleepC === 'inconsistent' || sleepC === 'very-inconsistent')) {
    lifestyleRecs.push('Sleep: 7–9h target; set a consistent wind‑down and wake time; dark, cool room.');
  }
  if (caffeine) {
    lifestyleRecs.push('Caffeine: shift last intake earlier in the day to protect sleep.');
  }
  if (stress && (stress === 'high' || stress === 'very-high')) {
    lifestyleRecs.push('Stress: daily 5–10 min breathwork or quiet walk; micro‑breaks in long sittings.');
  }
  if (hydration && (hydration === 'poor' || hydration === 'fair')) {
    lifestyleRecs.push('Hydration: 2–3 L/day baseline, more with heat/training; consider electrolytes.');
  }
  if (!isNaN(steps) && steps > 0 && steps < 7000) {
    lifestyleRecs.push('Movement: build toward 6–10k steps/day with short walk breaks.');
  }
  if (!isNaN(sedentary) && sedentary >= 8) {
    lifestyleRecs.push('Sedentary time: stand and move 2–3 min every 30–45 min.');
  }
  if (nutrition && (nutrition === 'poor' || nutrition === 'fair')) {
    lifestyleRecs.push('Nutrition: protein at each meal, mostly whole foods, regular mealtimes.');
  }

  return lifestyleRecs;
}

export function calculateNutritionAdvice(formData: FormData, goals: string[]): string[] {
  const nutritionAdvice: string[] = [];
  const g = new Set(goals);
  const gender = (formData?.gender || '').toLowerCase();
  const bf = parseFloat(formData?.inbodyBodyFatPct || '0');
  const weight = parseFloat(formData?.inbodyWeightKg || '0');
  const highBf = (gender === 'male' && bf > 25) || (gender === 'female' && bf > 32) || (!gender && bf > 28.5);
  const wantsWeightLoss = g.has('weight-loss') || highBf;
  const wantsMuscle = g.has('build-muscle');

  if (wantsWeightLoss) {
    nutritionAdvice.push(
      'Create a gentle calorie deficit with portion control: mostly whole foods, half the plate veg/salad, the rest lean protein and smart carbs.',
      'Prioritise protein at each meal (palm-sized serving) to stay full while losing fat and protecting muscle.',
      'Keep most carbs (rice, bread, sweets) around training or earlier in the day; evenings bias more toward protein, fibre, and fluids.',
      'Use simple food swaps most days (soft drinks → water/zero-cal, fried foods → grilled/baked, sweets → fruit or yoghurt).'
    );
  }
  if (wantsMuscle && !highBf) {
    nutritionAdvice.push(
      'Aim for a small calorie surplus, not "bulking": roughly one extra snack or ~150–300 kcal/day on training days.',
      'Distribute protein evenly across the day (3–4 meals) and include carbs before and after workouts to support performance and recovery.',
      'Keep most extra calories coming from quality carbs and lean protein rather than heavy fats or desserts.'
    );
  } else if (wantsMuscle && highBf) {
    nutritionAdvice.push(
      'Because body fat is already elevated, focus first on lean recomposition: high protein, mostly whole foods, and a slight deficit/maintenance instead of a big surplus.'
    );
  }
  if (!wantsWeightLoss && !wantsMuscle) {
    nutritionAdvice.push(
      'Base most meals on whole foods: lean proteins, colourful veg/fruit, whole grains, and healthy fats.',
      'Keep a simple structure: 2–3 main meals and 1–2 planned snacks rather than constant grazing.'
    );
  }
  if (nutritionAdvice.length === 0 && weight > 0) {
    nutritionAdvice.push(
      'Focus on consistency: mostly whole foods, protein at each meal, and avoid large swings in daily intake.'
    );
  }

  return nutritionAdvice;
}

export interface HtmlExportCalculations {
  goals: string[];
  orderedCats: Array<{ id: string; weaknesses?: string[]; strengths?: string[] }>;
  focusAreas: string[];
  strengths: string[];
  priorityFocus: string[];
  lifestyleRecs: string[];
  nutritionAdvice: string[];
}

export function calculateAllHtmlExportData(
  formData: FormData,
  scores: ScoreSummary
): HtmlExportCalculations {
  const goals = Array.isArray(formData.clientGoals) ? formData.clientGoals : [];
  const orderedCats = ['bodyComp', 'strength', 'cardio', 'movementQuality', 'lifestyle']
    .map((id) => scores.categories.find((c) => c.id === id))
    .filter(Boolean) as Array<{ id: string; weaknesses?: string[]; strengths?: string[] }>;

  const { focusAreas, strengths } = calculateFocusAreasAndStrengths(orderedCats);
  const priorityFocus = calculatePriorityFocus(formData);
  const lifestyleRecs = calculateLifestyleRecommendations(formData);
  const nutritionAdvice = calculateNutritionAdvice(formData, goals);

  return {
    goals,
    orderedCats,
    focusAreas,
    strengths,
    priorityFocus,
    lifestyleRecs,
    nutritionAdvice,
  };
}

