import type { FormData } from '@/contexts/FormContext';
import { convertGripStrength } from '../utils/measurementConverters';
import { safeParse } from '../utils/numbers';
import type { ScoreCategory, ScoreDetail } from './types';
import { clamp, lookupNormativeScore } from './scoringUtils';

export function scoreStrength(form: FormData, age: number, gender: string): ScoreCategory {
  const pushups = safeParse(form.pushupsOneMinuteReps);
  const squats = safeParse(form.squatsOneMinuteReps);
  const plank = safeParse(form.plankDurationSeconds);

  const hasPushups = !!(form.pushupsOneMinuteReps && form.pushupsOneMinuteReps.trim() !== '');
  const hasSquats = !!(form.squatsOneMinuteReps && form.squatsOneMinuteReps.trim() !== '');
  const hasPlank = !!(form.plankDurationSeconds && form.plankDurationSeconds.trim() !== '');

  // Check grip strength methods
  const hasGripDynamometer = !!(form.gripLeftKg && form.gripLeftKg.trim() !== '' && safeParse(form.gripLeftKg) > 0) ||
                              !!(form.gripRightKg && form.gripRightKg.trim() !== '' && safeParse(form.gripRightKg) > 0);
  const hasGripDeadhang = !!(form.gripDeadhangSeconds && form.gripDeadhangSeconds.trim() !== '' && safeParse(form.gripDeadhangSeconds) > 0);
  const hasGripFarmersWalk = !!(form.gripFarmersWalkDistanceM && form.gripFarmersWalkDistanceM.trim() !== '') ||
                              !!(form.gripFarmersWalkTimeS && form.gripFarmersWalkTimeS.trim() !== '') ||
                              !!(form.gripFarmersWalkLoadKg && form.gripFarmersWalkLoadKg.trim() !== '');
  const hasGripPlatePinch = !!(form.gripPlatePinchSeconds && form.gripPlatePinchSeconds.trim() !== '' && safeParse(form.gripPlatePinchSeconds) > 0);
  const hasGrip = hasGripDynamometer || hasGripDeadhang || hasGripFarmersWalk || hasGripPlatePinch;

  // Calculate standardized grip strength
  let gripAvg = 0;
  if (hasGrip) {
    const bodyweightKg = safeParse(form.inbodyWeightKg);
    const genderTyped = (gender || 'male').toLowerCase() as 'male' | 'female';

    if (hasGripDynamometer) {
      const gripLeft = safeParse(form.gripLeftKg);
      const gripRight = safeParse(form.gripRightKg);
      gripAvg = (gripLeft + gripRight) / 2;
    } else if (hasGripDeadhang) {
      const hangTime = safeParse(form.gripDeadhangSeconds);
      gripAvg = convertGripStrength(hangTime, 'deadhang', bodyweightKg, genderTyped);
    } else if (hasGripFarmersWalk) {
      const distance = safeParse(form.gripFarmersWalkDistanceM);
      const time = safeParse(form.gripFarmersWalkTimeS);
      const load = safeParse(form.gripFarmersWalkLoadKg);
      gripAvg = convertGripStrength(distance, 'farmerswalk', bodyweightKg, genderTyped, {
        loadPerHandKg: load,
        distanceMeters: distance,
        timeSeconds: time
      });
    } else if (hasGripPlatePinch) {
      const pinchTime = safeParse(form.gripPlatePinchSeconds);
      const standardizedWeight = genderTyped === 'male' ? 15 : 10;
      const timeFactor = Math.min(1.0, pinchTime / 60);
      const estimatedKg = standardizedWeight * (1 + timeFactor * 0.5);
      gripAvg = Math.max(20, Math.min(80, estimatedKg));
    }
  }

  // Lookup normative scores
  const pushScore = hasPushups ? lookupNormativeScore('Push-up', gender, age, pushups) : 0;
  const plankScore = hasPlank ? lookupNormativeScore('Plank Hold', gender, age, plank) : 0;
  const squatScore = hasSquats ? clamp(squats * 2.5) : 0;
  const gripScore = hasGrip ? clamp(gripAvg * 3) : 0;

  const details: ScoreDetail[] = [
    { id: 'pushups', label: 'Pushups (1-min)', value: pushups || '-', score: Math.round(pushScore) },
    { id: 'squats', label: 'Squats (1-min)', value: squats || '-', score: Math.round(squatScore) },
    { id: 'plank', label: 'Plank hold', value: plank || '-', unit: 's', score: Math.round(plankScore) },
  ];

  if (hasGrip) {
    details.push({ id: 'grip', label: 'Grip (avg)', value: Math.round(gripAvg) || '-', unit: 'kg', score: Math.round(gripScore) });
  }

  const subScores = [
    hasPushups ? pushScore : 0,
    hasSquats ? squatScore : 0,
    hasPlank ? plankScore : 0,
    hasGrip ? gripScore : 0,
  ].filter(s => s > 0);
  const score = subScores.length > 0
    ? Math.round(subScores.reduce((a, b) => a + b, 0) / subScores.length)
    : 0;

  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (score >= 85) strengths.push('Exceptional foundational strength and power');
  else if (score >= 70) strengths.push('Strong muscular endurance baseline');

  const items = [
    { label: 'Upper Body Endurance', score: pushScore, hasData: hasPushups },
    { label: 'Lower Body Endurance', score: squatScore, hasData: hasSquats },
    { label: 'Core Stability', score: plankScore, hasData: hasPlank },
    { label: 'Grip Strength', score: gripScore, hasData: hasGrip }
  ].filter(i => i.hasData)
   .sort((a, b) => a.score - b.score);

  items.slice(0, 2).forEach(item => {
    if (item.score < 60) {
      weaknesses.push(`${item.label} identified as a structural priority`);
    } else {
      weaknesses.push(`Optimization of ${item.label} for peak performance`);
    }
  });

  if (score >= 75 && subScores.length >= 2) strengths.push('Balanced muscular development across tests');

  return { id: 'strength', title: 'Functional Strength', score, details, strengths, weaknesses };
}
