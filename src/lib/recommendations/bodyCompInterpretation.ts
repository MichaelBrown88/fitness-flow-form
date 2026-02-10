/**
 * Body Composition Interpretation
 *
 * Generates health priorities, training focus, nutrition and lifestyle
 * recommendations based on body composition analysis.
 */

import type { FormData } from '@/contexts/FormContext';
import type { ScoreSummary } from '../scoring';
import type { BodyCompInterpretation } from './types';
import { safeParse } from '../utils/numbers';

export function generateBodyCompInterpretation(form: FormData, scores?: ScoreSummary): BodyCompInterpretation | null {
  const gender = (form.gender || '').toLowerCase();
  const weight = safeParse(form.inbodyWeightKg);
  const bf = safeParse(form.inbodyBodyFatPct);
  const smm = safeParse(form.skeletalMuscleMassKg);
  const bfm = safeParse(form.bodyFatMassKg || (weight > 0 && bf > 0 ? ((weight * bf) / 100).toFixed(1) : '0'));
  const visceral = safeParse(form.visceralFatLevel);
  const whr = safeParse(form.waistHipRatio);
  let bmr = safeParse(form.bmrKcal);
  const tbw = safeParse(form.totalBodyWaterL);

  // Check if we have any actual body composition data
  const hasBodyCompData = weight > 0 || bf > 0 || smm > 0 || visceral > 0 || whr > 0 || bmr > 0 || tbw > 0;

  if (!hasBodyCompData) {
    return null;
  }

  // Calculate weeks - simplified but aligned with buildRoadmap in scoring.ts
  const isHighBf = gender === 'male' ? bf > 22 : bf > 30;
  const fatLossTargetKg = isHighBf ? Math.max(0, bfm - (gender === 'male' ? weight * 0.18 : weight * 0.25)) : 0;
  const fatLossWeeks = Math.ceil(fatLossTargetKg / 0.5); // 0.5kg/week

  const targetSMM = gender === 'male' ? 33 : 24;
  const muscleGainKg = smm > 0 && smm < targetSMM ? targetSMM - smm : 0;
  const muscleWeeks = Math.ceil(muscleGainKg / 0.15); // 0.15kg/week

  // Posture/Movement weeks if scores are provided
  let movementWeeks = 0;
  if (form.postureAiResults) {
    movementWeeks = 8;
  } else if (scores) {
    const mScore = scores.categories.find(c => c.id === 'movementQuality')?.score || 0;
    if (mScore > 0 && mScore < 60) movementWeeks = 6;
  }

  const totalWeeks = Math.max(fatLossWeeks, muscleWeeks, movementWeeks, 8); // Minimum 8 week build
  const minWeeks = Math.max(4, totalWeeks - 2);
  const maxWeeks = totalWeeks + 4;

  // Segmental kg
  const armR = safeParse(form.segmentalArmRightKg);
  const armL = safeParse(form.segmentalArmLeftKg);
  const legR = safeParse(form.segmentalLegRightKg);
  const legL = safeParse(form.segmentalLegLeftKg);

  // Flags
  const lowSmm = gender === 'male' ? smm > 0 && smm < 33 : gender === 'female' ? smm > 0 && smm < 24 : smm > 0 && smm < 28.5;
  const highBf = gender === 'male' ? bf > 25 : gender === 'female' ? bf > 32 : bf > 28.5;
  const highVisceral = visceral >= 12;
  const borderlineVisceral = visceral >= 10 && visceral <= 11;
  const whrHigh = (gender === 'male' && whr >= 1.0) || (gender === 'female' && whr >= 0.9);

  // Imbalance %s (kg)
  // |(Left – Right) ÷ Higher value| × 100
  const armHigher = Math.max(armR, armL);
  const legHigher = Math.max(legR, legL);
  const armImbPct = armR > 0 && armL > 0 ? Math.abs(armL - armR) / (armHigher || 1) * 100 : 0;
  const legImbPct = legR > 0 && legL > 0 ? Math.abs(legL - legR) / (legHigher || 1) * 100 : 0;
  const limbImbalanceSerious = armImbPct >= 10 || legImbPct >= 10;
  const limbImbalanceModerate = (!limbImbalanceSerious) && (armImbPct >= 6 || legImbPct >= 6);

  // Fatigue markers (from lifestyle inputs) to pair with VFL for recovery priority
  const poorSleep = ['poor', 'fair'].includes((form.sleepQuality || '').toLowerCase());
  const highStress = ['high', 'very-high'].includes((form.stressLevel || '').toLowerCase());
  const lowHydration = ['poor', 'fair'].includes((form.hydrationHabits || '').toLowerCase());
  const sedentary = safeParse(form.sedentaryHours) >= 8;
  const recoveryFlags = (highVisceral || borderlineVisceral) && (poorSleep || highStress || lowHydration || sedentary);

  const healthPriority: string[] = [];
  if (highBf || whrHigh || highVisceral) healthPriority.push('Fat-loss priority');
  if (lowSmm) healthPriority.push('Muscle-building priority');
  if (limbImbalanceSerious || limbImbalanceModerate) healthPriority.push('Stability & posture priority');
  if (recoveryFlags) healthPriority.push('Lifestyle recovery priority');

  const trainingFocusPrimary =
    highBf ? 'Fat-loss block (aerobic base + resistance training)'
      : lowSmm ? 'Hypertrophy base (full-body strength)'
      : limbImbalanceSerious ? 'Unilateral strength & corrective control'
      : 'Performance maintenance';

  const trainingSecondary: string[] = [];
  if (limbImbalanceSerious || limbImbalanceModerate) trainingSecondary.push('Additional unilateral volume (weak side first)');

  const corrective: string[] = [];
  if (whrHigh || highVisceral) corrective.push('Zone 2 cardio, breathing drills for recovery');

  const unilateralVolume =
    limbImbalanceSerious ? 'Serious imbalance: +20–30% unilateral volume on weaker limb'
      : limbImbalanceModerate ? 'Moderate imbalance: +10–15% unilateral volume on weaker limb'
      : undefined;

  // Nutrition suggestions (high-level)
  // Use analyser BMR if it looks reasonable; otherwise estimate via Mifflin-St Jeor
  if (bmr < 800 || bmr > 3500) {
    bmr = 0;
  }
  if (!bmr && weight > 0) {
    const heightCm = safeParse(form.heightCm);
    // Estimate age from DOB if available
    let age = 0;
    if (form.dateOfBirth) {
      const dob = new Date(form.dateOfBirth);
      if (!Number.isNaN(dob.getTime())) {
        const today = new Date();
        age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
      }
    }
    if (!age) age = 30;
    const h = heightCm || (tbw ? (tbw / 0.6) : 0); // very rough fallback if no height
    if (h > 0) {
      const s = gender === 'female' ? -161 : 5;
      bmr = 10 * weight + 6.25 * h - 5 * age + s;
    } else {
      // Last-resort estimate
      bmr = 22 * weight;
    }
  }

  let calorieRange: string | undefined;
  if (bmr) {
    const maintLow = bmr * 1.4;
    const maintHigh = bmr * 1.6;
    if (highBf) {
      const deficitLow = bmr * 1.2;
      const deficitHigh = bmr * 1.35;
      calorieRange = `${Math.round(deficitLow)}–${Math.round(deficitHigh)} kcal/day (fat-loss focus; est. maintenance ${Math.round(maintLow)}–${Math.round(maintHigh)} kcal)`;
    } else {
      const perfLow = bmr * 1.5;
      const perfHigh = bmr * 1.8;
      calorieRange = `${Math.round(perfLow)}–${Math.round(perfHigh)} kcal/day (performance / lean-gain range; est. maintenance ${Math.round(maintLow)}–${Math.round(maintHigh)} kcal)`;
    }
  }
  // Protein from SMM focus: 2.0–2.4 g/kg SMM (client-friendly)
  const proteinTarget = smm ? `${Math.round(smm * 2.0)}–${Math.round(smm * 2.4)} g protein/day (from SMM)` : weight ? `${Math.round(weight * 1.6)}–${Math.round(weight * 2.2)} g protein/day` : undefined;
  const hydration = '2–3 L/day baseline; match sweat losses; add electrolytes if needed';
  const carbTiming = (trainingFocusPrimary.includes('Hypertrophy') || trainingFocusPrimary.includes('Fat-loss'))
    ? 'Prioritize carbs around training; focus protein evenly across meals'
    : undefined;

  // Lifestyle suggestions
  const sleep = 'Aim 7–9h, consistent sleep/wake times';
  const stress = (highVisceral || highStress) ? 'Daily breathwork 5–10 min; walking breaks; reduce late caffeine' : 'Maintain current routines';
  const dailyMovement = '6–10k steps/day target (break up long sitting)';
  const inflammationReduction = (highVisceral || lowHydration) ? 'Reduce alcohol/ultra-processed foods; add omega-3s; emphasize whole foods' : undefined;

  return {
    healthPriority,
    trainingFocus: {
      primary: trainingFocusPrimary,
      secondary: trainingSecondary.length ? trainingSecondary : undefined,
      corrective: corrective.length ? corrective : undefined,
      unilateralVolume,
    },
    nutrition: { calorieRange, proteinTarget, hydration, carbTiming },
    lifestyle: { sleep, stress, dailyMovement, inflammationReduction },
    timeframeWeeks: `${minWeeks}–${maxWeeks} weeks`,
  };
}
