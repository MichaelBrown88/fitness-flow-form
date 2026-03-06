import type { FormData } from '@/contexts/FormContext';
import { safeParse } from '../utils/numbers';
import type { ScoreCategory, ScoreDetail } from './types';
import { clamp, lookupNormativeScore } from './scoringUtils';

export function scoreCardio(form: FormData, age: number, gender: string): ScoreCategory {
  const test = (form.cardioTestSelected || '').toLowerCase();
  const rhr = safeParse(form.cardioRestingHr);
  const peakHr = safeParse(form.cardioPeakHr);
  const hr60 = safeParse(form.cardioPost1MinHr);

  const hasTest = !!(form.cardioTestSelected && form.cardioTestSelected.trim() !== '');
  const hasHr60 = !!(form.cardioPost1MinHr && form.cardioPost1MinHr.trim() !== '');
  const hasPeakHr = !!(form.cardioPeakHr && form.cardioPeakHr.trim() !== '');
  const hasRhr = !!(form.cardioRestingHr && form.cardioRestingHr.trim() !== '');

  // Calculate Heart Rate Recovery (HRR)
  const hrr = hasPeakHr && hasHr60 && peakHr > 0 && hr60 > 0 ? peakHr - hr60 : 0;
  const hasHrr = hrr > 0;

  const hrrScore = hasHrr ? clamp((hrr - 5) * 2.8) : 0;

  const recoveryScore = hasHr60 && !hasHrr
    ? lookupNormativeScore('Recovery HR', gender, age, hr60)
    : hasHrr ? hrrScore : 0;

  // VO2max estimate
  const mhr = age > 0 ? 208 - 0.7 * age : 0;
  const vo2max = hasHr60 && hr60 > 0 && mhr > 0 ? 15.3 * (mhr / hr60) : 0;

  // Resting HR score
  const rhrScore = hasRhr
    ? (rhr > 0 && rhr < 55 ? 100
      : rhr <= 64 ? 85
      : rhr <= 74 ? 70
      : rhr <= 84 ? 50
      : rhr >= 85 ? 30
      : 0)
    : 0;

  const cardioSubScores = [
    hasRhr ? rhrScore : 0,
    hasHrr ? hrrScore : hasHr60 ? recoveryScore : 0,
  ].filter(s => s > 0);
  const fitnessScore = cardioSubScores.length > 0
    ? clamp(cardioSubScores.reduce((a, b) => a + b, 0) / cardioSubScores.length)
    : 0;

  const cardioClass =
    fitnessScore >= 90 ? 'Excellent'
      : fitnessScore >= 75 ? 'Very Good'
      : fitnessScore >= 60 ? 'Good'
      : fitnessScore >= 45 ? 'Average'
      : fitnessScore >= 30 ? 'Below Average'
      : 'Poor';

  const details: ScoreDetail[] = [
    { id: 'rhr', label: 'Resting HR', value: rhr || '-', unit: 'bpm', score: Math.round(rhrScore) },
  ];

  if (hasHrr) {
    details.push({ id: 'hrr', label: 'HR Recovery (HRR)', value: Math.round(hrr) || '-', unit: 'bpm', score: Math.round(hrrScore) });
  } else if (hasHr60) {
    details.push({ id: 'hr60', label: 'Recovery', value: hr60 || '-', unit: 'bpm', score: Math.round(recoveryScore) });
  }

  details.push(
    { id: 'vo2', label: 'VO₂max Est.', value: vo2max ? vo2max.toFixed(1) : '-', unit: 'ml/kg/min', score: Math.round(hasHrr ? hrrScore : recoveryScore) },
    { id: 'cardioClass', label: 'Fitness Level', value: cardioClass, score: Math.round(fitnessScore) }
  );

  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (hasTest && fitnessScore >= 85) strengths.push('Elite cardiovascular efficiency');
  else if (hasTest && fitnessScore >= 70) strengths.push('Solid aerobic base foundation');

  if (hasRhr && rhrScore >= 80) strengths.push('Excellent resting heart rate (indicates low systemic stress)');

  if (hasHrr && hrr > 30) strengths.push('Excellent heart rate recovery (>30bpm drop)');

  const items = [
    { label: 'Resting Heart Rate', score: rhrScore },
    { label: hasHrr ? 'Heart Rate Recovery (HRR)' : 'Heart Rate Recovery', score: hasHrr ? hrrScore : recoveryScore }
  ].sort((a, b) => a.score - b.score);

  items.forEach(item => {
    if (item.score < 60) {
      weaknesses.push(`${item.label} identified as a limiting factor`);
    } else {
      weaknesses.push(`Further refinement of ${item.label} for better recovery`);
    }
  });

  if (hasHrr && hrr < 12) {
    weaknesses.push('Abnormal Heart Rate Recovery (<12bpm drop) - Consult physician if recovery consistently remains below 12bpm');
  }

  return { id: 'cardio', title: 'Metabolic Fitness', score: Math.round(fitnessScore), details, strengths, weaknesses };
}
