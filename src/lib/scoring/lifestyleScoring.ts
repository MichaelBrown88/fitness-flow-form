import type { FormData } from '@/contexts/FormContext';
import { LIFESTYLE_FEEDBACK_DB } from '../clinical-data';
import { safeParse } from '../utils/numbers';
import type { ScoreCategory, ScoreDetail } from './types';

export function scoreLifestyle(form: FormData, age: number, gender: string): ScoreCategory {
  // Support both new archetype and legacy fields
  const sleepArchetype = (form.sleepArchetype || '').toLowerCase();
  const sleepQ = (form.sleepQuality || '').toLowerCase();
  const sleepC = (form.sleepConsistency || '').toLowerCase();
  const stress = (form.stressLevel || '').toLowerCase();
  const hydration = (form.hydrationHabits || '').toLowerCase();
  const nutrition = (form.nutritionHabits || '').toLowerCase();
  const steps = safeParse(form.stepsPerDay);
  const sedentary = safeParse(form.sedentaryHours);

  const hasLifestyleData = !!(sleepArchetype || sleepQ || sleepC || stress || hydration || nutrition || steps > 0 || sedentary > 0);

  if (!hasLifestyleData) {
    return {
      id: 'lifestyle',
      title: 'Lifestyle Factors',
      score: 0,
      details: [],
      strengths: [],
      weaknesses: []
    };
  }

  // Sleep score - prefer new archetype, fall back to legacy fields
  let sleepScore = 0;
  if (sleepArchetype) {
    // New archetype-based scoring
    if (sleepArchetype === 'excellent') sleepScore = 100;
    else if (sleepArchetype === 'good') sleepScore = 75;
    else if (sleepArchetype === 'fair') sleepScore = 50;
    else if (sleepArchetype === 'poor') sleepScore = 30;
  } else if (sleepQ || sleepC) {
    // Legacy field-based scoring
    if (sleepQ === 'excellent') sleepScore = 100;
    else if (sleepQ === 'good') sleepScore = 85;
    else if (sleepQ === 'fair') sleepScore = 60;
    else if (sleepQ === 'poor') sleepScore = 40;
    if (sleepC === 'very-consistent') sleepScore = Math.min(100, sleepScore + 10);
    else if (sleepC === 'consistent') sleepScore = Math.min(100, sleepScore + 5);
    else if (sleepC === 'inconsistent') sleepScore = Math.max(0, sleepScore - 10);
    else if (sleepC === 'very-inconsistent') sleepScore = Math.max(0, sleepScore - 20);
  }

  // Stress score (archetype-based: very-low=balanced, low=coping, moderate=affected, high=overwhelmed)
  let stressScore = 0;
  if (stress === 'very-low') stressScore = 100;
  else if (stress === 'low') stressScore = 75;
  else if (stress === 'moderate') stressScore = 50;
  else if (stress === 'high') stressScore = 30;
  else if (stress === 'very-high') stressScore = 30; // Legacy value

  // Hydration score
  let hydrationScore = 0;
  if (hydration === 'excellent') hydrationScore = 100;
  else if (hydration === 'good') hydrationScore = 85;
  else if (hydration === 'fair') hydrationScore = 60;
  else if (hydration === 'poor') hydrationScore = 40;

  // Nutrition score
  let nutritionScore = 0;
  if (nutrition === 'excellent') nutritionScore = 100;
  else if (nutrition === 'good') nutritionScore = 85;
  else if (nutrition === 'fair') nutritionScore = 60;
  else if (nutrition === 'poor') nutritionScore = 40;

  // Activity score
  let activityScore = 0;
  if (steps > 0 || sedentary > 0) {
    if (steps >= 10000) activityScore = 100;
    else if (steps >= 8000) activityScore = 85;
    else if (steps >= 6000) activityScore = 70;
    else if (steps >= 4000) activityScore = 55;
    else activityScore = 40;
  }
  if (sedentary >= 10) activityScore = Math.max(30, activityScore - 20);
  else if (sedentary >= 8) activityScore = Math.max(40, activityScore - 15);

  // Fetch Advice Blocks
  const lifestyleAdvice: string[] = [];

  if (sleepScore < 70) {
    lifestyleAdvice.push(LIFESTYLE_FEEDBACK_DB.find(a => a.category === 'Sleep' && a.riskLevel === 'High Risk')?.adviceBlock || '');
  } else if (sleepScore >= 85) {
    lifestyleAdvice.push(LIFESTYLE_FEEDBACK_DB.find(a => a.category === 'Sleep' && a.riskLevel === 'Optimal')?.adviceBlock || '');
  }

  if (stressScore < 50) {
    lifestyleAdvice.push(LIFESTYLE_FEEDBACK_DB.find(a => a.category === 'Stress' && a.riskLevel === 'High Risk')?.adviceBlock || '');
  } else if (stressScore < 75) {
    lifestyleAdvice.push(LIFESTYLE_FEEDBACK_DB.find(a => a.category === 'Stress' && a.riskLevel === 'Moderate Risk')?.adviceBlock || '');
  } else {
    lifestyleAdvice.push(LIFESTYLE_FEEDBACK_DB.find(a => a.category === 'Stress' && a.riskLevel === 'Low Risk')?.adviceBlock || '');
  }

  if (steps < 5000) {
    lifestyleAdvice.push(LIFESTYLE_FEEDBACK_DB.find(a => a.category === 'Steps' && a.riskLevel === 'Sedentary')?.adviceBlock || '');
  } else if (steps < 10000) {
    lifestyleAdvice.push(LIFESTYLE_FEEDBACK_DB.find(a => a.category === 'Steps' && a.riskLevel === 'Active')?.adviceBlock || '');
  } else {
    lifestyleAdvice.push(LIFESTYLE_FEEDBACK_DB.find(a => a.category === 'Steps' && a.riskLevel === 'Highly Active')?.adviceBlock || '');
  }

  const details: ScoreDetail[] = [
    { id: 'sleep', label: 'Sleep Quality', value: sleepQ || '-', score: Math.round(sleepScore) },
    { id: 'stress', label: 'Stress Management', value: stress || '-', score: Math.round(stressScore) },
    { id: 'hydration', label: 'Hydration', value: hydration || '-', score: Math.round(hydrationScore) },
    { id: 'nutrition', label: 'Nutrition', value: nutrition || '-', score: Math.round(nutritionScore) },
    { id: 'activity', label: 'Daily Activity', value: steps > 0 ? `${Math.round(steps)} steps` : '-', score: Math.round(activityScore) },
  ];

  const scoresWithData = [sleepScore, stressScore, hydrationScore, nutritionScore, activityScore].filter(s => s > 0);
  const overallScore = scoresWithData.length > 0
    ? Math.round(scoresWithData.reduce((a, b) => a + b, 0) / scoresWithData.length)
    : 0;

  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (sleepScore >= 75) strengths.push('Good sleep habits');
  else weaknesses.push('Sleep quality needs improvement');
  if (stressScore >= 75) strengths.push('Well-managed stress');
  else weaknesses.push('Stress management needed');
  if (hydrationScore >= 75) strengths.push('Good hydration');
  else weaknesses.push('Hydration needs attention');
  if (nutritionScore >= 75) strengths.push('Good nutrition habits');
  else weaknesses.push('Nutrition needs improvement');
  if (activityScore >= 75) strengths.push('Active lifestyle');
  else weaknesses.push('Daily activity needs increase');

  return {
    id: 'lifestyle',
    title: 'Lifestyle Factors',
    score: overallScore,
    details,
    strengths,
    weaknesses,
    lifestyleAdvice: lifestyleAdvice.filter(Boolean)
  };
}
