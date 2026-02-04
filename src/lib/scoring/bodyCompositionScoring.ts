import type { FormData } from '@/contexts/FormContext';
import { CONFIG } from '@/config';
import { calculateBodyFatFromMeasurements } from '../utils/measurementConverters';
import { safeParse } from '../utils/numbers';
import type { ScoreCategory, ScoreDetail } from './types';
import { clamp } from './scoringUtils';

/**
 * Score body composition based on analyzer data OR body measurements
 * Priority: Analyzer data (if available) > Body measurements (US Navy method)
 */
export function scoreBodyComp(form: FormData, age: number, gender: string): ScoreCategory {
  const weight = safeParse(form.inbodyWeightKg);
  const height = safeParse(form.heightCm);
  const genderLower = (gender || 'male').toLowerCase() as 'male' | 'female';

  // Check if analyzer data exists
  const hasAnalyzerData = !!(form.inbodyBodyFatPct || form.skeletalMuscleMassKg || form.inbodyScore);

  let bodyFat = safeParse(form.inbodyBodyFatPct);
  let smm = safeParse(form.skeletalMuscleMassKg);
  let whr = safeParse(form.waistHipRatio);
  let visceral = safeParse(form.visceralFatLevel);

  // If no analyzer data, calculate from body measurements
  if (!hasAnalyzerData) {
    const waistCm = safeParse(form.waistCm);
    const neckCm = safeParse(form.neckCm);
    const hipsCm = safeParse(form.hipsCm || form.hipCm);

    // Calculate body fat % from measurements (US Navy method)
    if (waistCm > 0 && neckCm > 0 && height > 0) {
      bodyFat = calculateBodyFatFromMeasurements(waistCm, neckCm, height, genderLower, hipsCm > 0 ? hipsCm : undefined);
    }

    // Calculate WHR from measurements
    if (waistCm > 0 && hipsCm > 0) {
      whr = waistCm / hipsCm;
    }

    // Estimate visceral fat from waist measurement
    if (waistCm > 0 && visceral === 0) {
      if (genderLower === 'male') {
        if (waistCm < 80) visceral = 5;
        else if (waistCm < 90) visceral = 7;
        else if (waistCm < 100) visceral = 10;
        else visceral = 12;
      } else {
        if (waistCm < 70) visceral = 4;
        else if (waistCm < 80) visceral = 6;
        else if (waistCm < 90) visceral = 9;
        else visceral = 11;
      }
    }

    // Estimate skeletal muscle mass from measurements and body fat %
    if (smm === 0 && weight > 0 && bodyFat > 0) {
      const armLeft = safeParse(form.armLeftCm);
      const armRight = safeParse(form.armRightCm);
      const chest = safeParse(form.chestCm);
      const thighLeft = safeParse(form.thighLeftCm);
      const thighRight = safeParse(form.thighRightCm);

      const avgArm = (armLeft + armRight) / 2;
      const avgThigh = (thighLeft + thighRight) / 2;

      if (avgArm > 0 && avgThigh > 0 && chest > 0) {
        const leanBodyMass = weight * (1 - bodyFat / 100);
        const baseMuscleFactor = 0.45;
        const limbFactor = Math.min(1.2, 1 + ((avgArm - 30) / 100) + ((avgThigh - 50) / 200));
        smm = leanBodyMass * baseMuscleFactor * limbFactor;
      } else if (weight > 0 && bodyFat > 0) {
        const leanBodyMass = weight * (1 - bodyFat / 100);
        smm = leanBodyMass * 0.45;
      }
    }
  }

  const bfm = safeParse(form.bodyFatMassKg || (weight > 0 && bodyFat > 0 ? ((weight * bodyFat) / 100).toFixed(1) : '0'));
  const bmr = safeParse(form.bmrKcal);
  const inbodyScore = safeParse(form.inbodyScore);
  const bmi = safeParse(form.inbodyBmi || (weight > 0 && height > 0 ? (weight / ((height / 100) ** 2)).toFixed(1) : '0'));
  const tbw = safeParse(form.totalBodyWaterL);

  // Standardized scoring
  const bfScore = bodyFat > 0 ? clamp(100 - (bodyFat - CONFIG.SCORING.THRESHOLDS.BF_HEALTHY_MIN) * 3) : 0;
  const smmScore = smm > 0 ? clamp((smm / (weight || 1)) * CONFIG.SCORING.THRESHOLDS.SMM_RATIO_SCALE) : 0;
  const visceralScore = visceral > 0 ? clamp(100 - (visceral - CONFIG.SCORING.THRESHOLDS.VISCERAL_RISK_START) * 10) : 0;
  const whrScore = whr > 0 ? clamp(100 - Math.max(0, (whr - CONFIG.SCORING.THRESHOLDS.WHR_RISK_START) * 150)) : 0;

  // Format values for display
  const bodyFatDisplay = hasAnalyzerData ? (form.inbodyBodyFatPct || '-') : (bodyFat > 0 ? bodyFat.toFixed(1) : '-');
  const smmDisplay = hasAnalyzerData ? (form.skeletalMuscleMassKg || '-') : (smm > 0 ? smm.toFixed(1) : '-');
  const visceralDisplay = hasAnalyzerData ? (form.visceralFatLevel || '-') : (visceral > 0 ? visceral.toFixed(0) : '-');
  const whrDisplay = hasAnalyzerData ? (form.waistHipRatio || '-') : (whr > 0 ? whr.toFixed(2) : '-');

  const details: ScoreDetail[] = [
    { id: 'bf', label: 'Body Fat %', value: bodyFatDisplay, unit: '%', score: Math.round(bfScore) },
    { id: 'smm', label: 'Skeletal Muscle Mass', value: smmDisplay, unit: 'kg', score: Math.round(smmScore) },
    { id: 'visceral', label: 'Visceral Fat Level', value: visceralDisplay, score: Math.round(visceralScore) },
    { id: 'bfm', label: 'Body Fat Mass', value: isNaN(bfm) ? '-' : bfm.toFixed(1), unit: 'kg', score: Math.round(bfScore) },
    { id: 'whr', label: 'Waist-to-Hip Ratio', value: whrDisplay, score: Math.round(whrScore) },
    ...(bmi ? [{ id: 'bmi', label: 'BMI', value: bmi, score: 100 }] as ScoreDetail[] : []),
    ...(tbw ? [{ id: 'tbw', label: 'Total Body Water', value: tbw, unit: 'L', score: 100 }] as ScoreDetail[] : []),
    ...(bmr ? [{ id: 'bmr', label: 'BMR', value: bmr, unit: 'kcal', score: 100 }] as ScoreDetail[] : []),
    ...(inbodyScore ? [{ id: 'inbodyScore', label: 'InBody Score', value: inbodyScore, score: clamp(inbodyScore) }] as ScoreDetail[] : []),
  ];

  const score = Math.round((
    bfScore * CONFIG.SCORING.WEIGHTS.BODY_FAT +
    smmScore * CONFIG.SCORING.WEIGHTS.SMM +
    visceralScore * CONFIG.SCORING.WEIGHTS.VISCERAL +
    whrScore * CONFIG.SCORING.WEIGHTS.WHR
  ));

  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (bfScore >= 75) strengths.push('Excellent body fat management');
  else if (bfScore >= 60) strengths.push('Body fat within a healthy functional range');

  if (smmScore >= 70) strengths.push('Strong skeletal muscle foundation');
  else if (smmScore >= 55) strengths.push('Functional muscle mass for your frame');

  const items = [
    { label: 'Body Fat %', score: bfScore },
    { label: 'Muscle Mass', score: smmScore },
    { label: 'Visceral Fat', score: visceralScore },
    { label: 'Waist-to-Hip Ratio', score: whrScore }
  ].sort((a, b) => a.score - b.score);

  items.slice(0, 2).forEach(item => {
    if (item.score < 60) {
      weaknesses.push(`${item.label} identified as a priority area`);
    } else {
      weaknesses.push(`Optimization of ${item.label} for better performance`);
    }
  });

  return { id: 'bodyComp', title: 'Body Composition', score, details, strengths, weaknesses };
}
