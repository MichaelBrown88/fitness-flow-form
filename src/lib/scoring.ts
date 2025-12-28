import type { FormData } from '@/contexts/FormContext';
import { CONFIG } from '@/config';
import { NORMATIVE_SCORING_DB, type NormativeBenchmark, MOVEMENT_LOGIC_DB, LIFESTYLE_FEEDBACK_DB, GOAL_TIMELINE_DB } from './clinical-data';

export type ScoreDetail = {
  id: string;
  label: string;
  value: string | number;
  unit?: string;
  score: number; // 0-100
  notes?: string;
};

export type ScoreCategory = {
  id: 'bodyComp' | 'cardio' | 'strength' | 'movementQuality' | 'lifestyle';
  title: string;
  score: number; // 0-100
  details: ScoreDetail[];
  strengths: string[];
  weaknesses: string[];
  stretches?: string[];
  activations?: string[];
  contraindications?: string[];
  lifestyleAdvice?: string[];
};

export type ScoreSummary = {
  overall: number; // 0-100
  categories: ScoreCategory[];
  synthesis: {
    title: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
  }[];
};

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));

/**
 * Helper to lookup normative scores based on age and gender.
 */
function lookupNormativeScore(testName: string, gender: string, age: number, value: number): number {
  const genderKey = (gender || 'any').toLowerCase() as 'male' | 'female' | 'any';
  
  // Find benchmarks for this test and gender
  const benchmarks = NORMATIVE_SCORING_DB.filter(b => 
    b.testName.toLowerCase() === testName.toLowerCase() && 
    (b.gender === 'any' || b.gender === genderKey)
  );

  if (benchmarks.length === 0) return 0;

  // Find the correct age bracket
  const benchmark = benchmarks.find(b => {
    if (b.ageBracket.includes('+')) {
      const minAge = parseInt(b.ageBracket.replace('+', ''));
      return age >= minAge;
    }
    const [min, max] = b.ageBracket.split('-').map(Number);
    return age >= min && age <= max;
  }) || benchmarks[0]; // Fallback to first if no exact match

  // Calculate score (0-100) based on thresholds
  // We'll use a simple linear interpolation between poor (10), average (50), and excellent (90)
  const { poor, average, excellent } = benchmark.thresholds;
  
  // For HR, lower is better. For others, higher is better.
  const lowerIsBetter = testName.toLowerCase().includes('hr');

  if (lowerIsBetter) {
    if (value <= excellent) return 100;
    if (value >= poor) return 10;
    if (value <= average) {
      // Interpolate between excellent (100) and average (50)
      return 100 - ((value - excellent) / (average - excellent)) * 50;
    } else {
      // Interpolate between average (50) and poor (10)
      return 50 - ((value - average) / (poor - average)) * 40;
    }
  } else {
    if (value >= excellent) return 100;
    if (value <= poor) return 10;
    if (value >= average) {
      // Interpolate between average (50) and excellent (100)
      return 50 + ((value - average) / (excellent - average)) * 50;
    } else {
      // Interpolate between poor (10) and average (50)
      return 10 + ((value - poor) / (average - poor)) * 40;
    }
  }
}

/**
 * Calculates age from YYYY-MM-DD string
 */
export function calculateAge(dob: string): number {
  if (!dob) return 0;
  const dobDate = new Date(dob);
  if (isNaN(dobDate.getTime())) return 0;
  const today = new Date();
  let age = today.getFullYear() - dobDate.getFullYear();
  const m = today.getMonth() - dobDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) {
    age--;
  }
  return age;
}

function scoreBodyComp(form: FormData, age: number, gender: string): ScoreCategory {
  const weight = parseFloat(form.inbodyWeightKg || '0');
  // ... rest of logic uses gender/age as needed ...

  const bodyFat = parseFloat(form.inbodyBodyFatPct || '0');
  const smm = parseFloat(form.skeletalMuscleMassKg || '0');
  const bfm = parseFloat(form.bodyFatMassKg || (weight > 0 && bodyFat > 0 ? ((weight * bodyFat) / 100).toFixed(1) : '0'));
  const whr = parseFloat(form.waistHipRatio || '0');
  const bmr = parseFloat(form.bmrKcal || '0');
  const inbodyScore = parseFloat(form.inbodyScore || '0');
  const bmi = parseFloat(form.inbodyBmi || '0');
  const tbw = parseFloat(form.totalBodyWaterL || '0');

  // Heuristic scoring
  const bfScore = bodyFat > 0 ? clamp(100 - (bodyFat - CONFIG.SCORING.THRESHOLDS.BF_HEALTHY_MIN) * 3) : 0;
  const smmScore = smm > 0 ? clamp((smm / (weight || 1)) * CONFIG.SCORING.THRESHOLDS.SMM_RATIO_SCALE) : 0; // rough ratio scaled
  const visceral = parseFloat(form.visceralFatLevel || '0');
  const visceralScore = visceral > 0 ? clamp(100 - (visceral - CONFIG.SCORING.THRESHOLDS.VISCERAL_RISK_START) * 10) : 0;
  const whrScore = whr > 0 ? clamp(100 - Math.max(0, (whr - CONFIG.SCORING.THRESHOLDS.WHR_RISK_START) * 150)) : 0; // rough, gender-agnostic heuristic

  const details: ScoreDetail[] = [
    { id: 'bf', label: 'Body Fat %', value: form.inbodyBodyFatPct || '-', unit: '%', score: Math.round(bfScore) },
    { id: 'smm', label: 'Skeletal Muscle Mass', value: form.skeletalMuscleMassKg || '-', unit: 'kg', score: Math.round(smmScore) },
    { id: 'visceral', label: 'Visceral Fat Level', value: form.visceralFatLevel || '-', score: Math.round(visceralScore) },
    { id: 'bfm', label: 'Body Fat Mass', value: isNaN(bfm) ? '-' : bfm, unit: 'kg', score: Math.round(bfScore) },
    { id: 'whr', label: 'Waist-to-Hip Ratio', value: form.waistHipRatio || '-', score: Math.round(whrScore) },
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

  const strengths = [];
  const weaknesses = [];
  if (bfScore >= 70) strengths.push('Healthy body fat range');
  else weaknesses.push('Elevated body fat');
  if (smmScore >= 65) strengths.push('Good muscle mass');
  else weaknesses.push('Low muscle-to-weight ratio');
  if (visceralScore < 60) weaknesses.push('Visceral fat risk');
  if (whrScore < 60) weaknesses.push('Central adiposity risk (WHR)');

  return { id: 'bodyComp', title: 'Body Composition', score, details, strengths, weaknesses };
}

function scoreCardio(form: FormData, age: number, gender: string): ScoreCategory {
  const test = (form.cardioTestSelected || '').toLowerCase();
  const rhr = parseFloat(form.cardioRestingHr || '0');
  const hr60 = parseFloat(form.cardioPost1MinHr || '0');
  
  // Check if cardio test was actually performed
  const hasTest = !!(form.cardioTestSelected && form.cardioTestSelected.trim() !== '');
  const hasHr60 = !!(form.cardioPost1MinHr && form.cardioPost1MinHr.trim() !== '');
  const hasRhr = !!(form.cardioRestingHr && form.cardioRestingHr.trim() !== '');
  
  // Recovery Score using normative database
  const recoveryScore = hasHr60 
    ? lookupNormativeScore('Recovery HR', gender, age, hr60)
    : 0;

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

  // Weighted average for metabolic fitness
  const fitnessScore = hasTest 
    ? clamp(recoveryScore * 0.7 + rhrScore * 0.3)
    : rhrScore;

  const cardioClass =
    fitnessScore >= 90 ? 'Excellent'
      : fitnessScore >= 75 ? 'Very Good'
      : fitnessScore >= 60 ? 'Good'
      : fitnessScore >= 45 ? 'Average'
      : fitnessScore >= 30 ? 'Below Average'
      : 'Poor';

  // Recommendation by FitnessScore and VO2 class
  let recommendation = '';
  if (!hasTest) {
    recommendation = 'Metabolic fitness assessment not performed.';
  } else if (cardioClass === 'Poor') {
    recommendation = 'Low aerobic base – prioritise 3–4 sessions/week of 20–40 minutes Zone 2 walking.';
  } else if (cardioClass === 'Average' || cardioClass === 'Below Average') {
    recommendation = 'Moderate aerobic base – 2–3 Zone 2 sessions plus 1 slightly harder conditioning session per week.';
  } else {
    recommendation = 'Solid aerobic base – maintain 2–3 cardio sessions/week; consider adding intervals/tempo for performance.';
  }

  const details: ScoreDetail[] = [
    { id: 'rhr', label: 'Resting HR', value: rhr || '-', unit: 'bpm', score: Math.round(rhrScore) },
    { id: 'hr60', label: 'Recovery', value: hr60 || '-', unit: 'bpm', score: Math.round(recoveryScore) },
    { id: 'vo2', label: 'VO₂max Est.', value: vo2max ? vo2max.toFixed(1) : '-', unit: 'ml/kg/min', score: Math.round(recoveryScore) }, // tied to recovery for now
    { id: 'cardioClass', label: 'Fitness Level', value: cardioClass, score: Math.round(fitnessScore) },
  ];

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  if (hasTest && fitnessScore >= 75) strengths.push('Strong aerobic base');
  if (hasTest && hasHr60 && recoveryScore < 50) weaknesses.push('HR recovery needs improvement');
  if (hasRhr && rhrScore < 60) weaknesses.push('Elevated resting HR');

  return { id: 'cardio', title: 'Metabolic Fitness', score: Math.round(fitnessScore), details, strengths, weaknesses };
}

function scoreStrength(form: FormData, age: number, gender: string): ScoreCategory {
  const pushups = parseFloat(form.pushupsOneMinuteReps || '0');
  const squats = parseFloat(form.squatsOneMinuteReps || '0');
  const plank = parseFloat(form.plankDurationSeconds || '0');
  const gripLeft = parseFloat(form.gripLeftKg || '0');
  const gripRight = parseFloat(form.gripRightKg || '0');
  const gripAvg = (gripLeft + gripRight) / 2;
  
  // Check if fields were actually filled (not skipped)
  const hasPushups = !!(form.pushupsOneMinuteReps && form.pushupsOneMinuteReps.trim() !== '');
  const hasSquats = !!(form.squatsOneMinuteReps && form.squatsOneMinuteReps.trim() !== '');
  const hasPlank = !!(form.plankDurationSeconds && form.plankDurationSeconds.trim() !== '');
  const hasGrip = !!(form.gripLeftKg && form.gripLeftKg.trim() !== '') || !!(form.gripRightKg && form.gripRightKg.trim() !== '');

  // Lookup normative scores
  const pushScore = hasPushups ? lookupNormativeScore('Push-up', gender, age, pushups) : 0;
  const plankScore = hasPlank ? lookupNormativeScore('Plank Hold', gender, age, plank) : 0;
  
  // Squat and Grip still using heuristics as they aren't in the provided clinical DB yet
  const squatScore = hasSquats ? clamp(squats * 2.5) : 0; // 40 reps ~ 100
  const gripScore = hasGrip ? clamp(gripAvg * 3) : 0; // heuristic

  const details: ScoreDetail[] = [
    { id: 'pushups', label: 'Pushups (1-min)', value: pushups || '-', score: Math.round(pushScore) },
    { id: 'squats', label: 'Squats (1-min)', value: squats || '-', score: Math.round(squatScore) },
    { id: 'plank', label: 'Plank hold', value: plank || '-', unit: 's', score: Math.round(plankScore) },
    { id: 'grip', label: 'Grip (avg)', value: Math.round(gripAvg) || '-', unit: 'kg', score: Math.round(gripScore) },
  ];

  // Only count filled tests in the overall score
  const filledTests = [hasPushups, hasSquats, hasPlank, hasGrip].filter(Boolean).length;
  const score = filledTests > 0
    ? Math.round((pushScore * 0.3 + squatScore * 0.25 + plankScore * 0.25 + gripScore * 0.2) * (4 / filledTests))
    : 0;

  const strengths = [];
  const weaknesses = [];
  if (hasPlank && plankScore < 50) weaknesses.push('Core endurance below average');
  if (hasPushups && pushScore < 50) weaknesses.push('Upper body endurance below average');
  if (hasSquats && squatScore < 50) weaknesses.push('Lower body endurance below average');
  if (hasGrip && gripScore < 50) weaknesses.push('Grip strength below average');
  if (score >= 75 && filledTests >= 2) strengths.push('Overall strength & endurance');

  return { id: 'strength', title: 'Muscular Strength', score, details, strengths, weaknesses };
}

function scoreMovementQuality(form: FormData, age: number, gender: string): ScoreCategory {
  // 1. MOBILITY SCORING
  const mapMobility = (v: string) => (v === 'good' ? 100 : v === 'fair' ? 60 : v === 'poor' ? 30 : 0);
  
  const hasHip = !!(form.mobilityHip && form.mobilityHip.trim() !== '');
  const hasShoulder = !!(form.mobilityShoulder && form.mobilityShoulder.trim() !== '');
  const hasAnkle = !!(form.mobilityAnkle && form.mobilityAnkle.trim() !== '');
  
  const hipMob = hasHip ? mapMobility(form.mobilityHip) : 0;
  const shoulderMob = hasShoulder ? mapMobility(form.mobilityShoulder) : 0;
  const ankleMob = hasAnkle ? mapMobility(form.mobilityAnkle) : 0;
  
  const mobilityScores = [hipMob, shoulderMob, ankleMob].filter(s => s > 0);
  const mobilityScore = mobilityScores.length > 0 
    ? Math.round(mobilityScores.reduce((a, b) => a + b, 0) / mobilityScores.length) 
    : 0;

  // 2. POSTURE SCORING
  const neutralScore = (v: string) => (v === 'neutral' ? 100 : 60);
  const backMap: Record<string, number> = {
    neutral: 100,
    'increased-kyphosis': 50,
    'increased-lordosis': 50,
    scoliosis: 40,
    'flat-back': 60,
  };
  const kneesMap: Record<string, number> = {
    neutral: 100,
    'valgus-knee': 40,
    'varus-knee': 40,
  };
  
  let head = 0;
  let shoulders = 0;
  let back = 0;
  let hips = 0;
  let knees = 0;

  if (form.postureAiResults) {
    const ai = form.postureAiResults;
    
    // Head Posture
    const headData = ai['side-right']?.forward_head || ai['side-left']?.forward_head;
    const tiltData = ai.front?.head_alignment || ai.back?.head_alignment;
    let fhpScore = 100;
    if (headData && headData.status !== 'Neutral') {
      if (headData.status === 'Mild') fhpScore = 75;
      else if (headData.status === 'Moderate') fhpScore = 50;
      else if (headData.status === 'Severe') fhpScore = 25;
    }
    let tiltScore = 100;
    if (tiltData && tiltData.status !== 'Neutral') {
      const tilt = Math.abs(tiltData.tilt_degrees || 0);
      if (tilt < 3) tiltScore = 100;
      else if (tilt < 6) tiltScore = 75;
      else if (tilt < 10) tiltScore = 50;
      else tiltScore = 25;
    }
    head = Math.round((fhpScore + tiltScore) / 2);

    // Shoulders
    const shoulderData = ai.front?.shoulder_alignment;
    if (shoulderData) {
      const diff = Math.abs(shoulderData.height_difference_cm ?? 0);
      if (shoulderData.status === 'Neutral' && diff < 0.5) shoulders = 100;
      else if (diff < 1.0) shoulders = 75;
      else if (diff < 2.0) shoulders = 50;
      else shoulders = 25;
    }

    // Back
    const kyphosisData = ai['side-right']?.kyphosis || ai['side-left']?.kyphosis;
    const lordosisData = ai['side-right']?.lordosis || ai['side-left']?.lordosis;
    const spineData = ai.back?.spinal_curvature;
    let kyphosisScore = 100;
    if (kyphosisData && kyphosisData.status !== 'Normal') {
      if (kyphosisData.status === 'Mild') kyphosisScore = 75;
      else if (kyphosisData.status === 'Moderate') kyphosisScore = 50;
      else if (kyphosisData.status === 'Severe') kyphosisScore = 25;
    }
    let lordosisScore = 100;
    if (lordosisData && lordosisData.status !== 'Normal') {
      if (lordosisData.status === 'Mild') lordosisScore = 75;
      else if (lordosisData.status === 'Moderate') lordosisScore = 50;
      else if (lordosisData.status === 'Severe') lordosisScore = 25;
    }
    let scoliosisScore = 100;
    if (spineData && spineData.status !== 'Normal') {
      const deg = Math.abs(spineData.curve_degrees || 0);
      if (deg < 10) scoliosisScore = 75;
      else if (deg < 20) scoliosisScore = 50;
      else scoliosisScore = 25;
    }
    back = Math.round((kyphosisScore + lordosisScore + scoliosisScore) / 3);

    // Hips/Pelvis
    const pelvicSideData = ai['side-right']?.pelvic_tilt || ai['side-left']?.pelvic_tilt;
    const pelvicFrontData = ai.front?.pelvic_tilt || ai.back?.pelvic_tilt;
    let pelvicScore = 100;
    if (pelvicSideData && pelvicSideData.status !== 'Neutral') {
      const tilt = Math.abs(pelvicSideData.anterior_tilt_degrees ?? 0);
      if (tilt < 5) pelvicScore = 100;
      else if (tilt < 10) pelvicScore = 75;
      else if (tilt < 15) pelvicScore = 50;
      else pelvicScore = 25;
    }
    if (pelvicFrontData && pelvicFrontData.status !== 'Neutral') {
      const lateralTilt = Math.abs(pelvicFrontData.lateral_tilt_degrees ?? 0);
      if (lateralTilt < 2) pelvicScore = Math.min(pelvicScore, 100);
      else if (lateralTilt < 5) pelvicScore = Math.min(pelvicScore, 75);
      else if (lateralTilt < 8) pelvicScore = Math.min(pelvicScore, 50);
      else pelvicScore = Math.min(pelvicScore, 25);
    }
    hips = pelvicScore;

    // Knees
    const kneeSideData = ai['side-right']?.knee_position || ai['side-left']?.knee_position;
    const kneeFrontData = ai.front?.knee_alignment || ai.back?.knee_alignment;
    let kneeSideScore = 100;
    if (kneeSideData && kneeSideData.status !== 'Neutral') {
      const dev = Math.abs(kneeSideData.deviation_degrees ?? 0);
      if (dev < 5) kneeSideScore = 75;
      else if (dev < 10) kneeSideScore = 50;
      else kneeSideScore = 25;
    }
    let kneeFrontScore = 100;
    if (kneeFrontData && kneeFrontData.status !== 'Neutral') {
      const dev = Math.abs(kneeFrontData.deviation_degrees ?? 0);
      if (dev < 5) kneeFrontScore = 75;
      else if (dev < 10) kneeFrontScore = 50;
      else kneeFrontScore = 25;
    }
    knees = Math.min(kneeSideScore, kneeFrontScore);
  } else {
    // Manual Posture Scoring
    head = form.postureHeadOverall ? neutralScore(form.postureHeadOverall) : 0;
    shoulders = form.postureShouldersOverall ? neutralScore(form.postureShouldersOverall) : 0;
    back = form.postureBackOverall ? (backMap[form.postureBackOverall] ?? 0) : 0;
    hips = form.postureHipsOverall ? neutralScore(form.postureHipsOverall) : 0;
    knees = form.postureKneesOverall ? (kneesMap[form.postureKneesOverall] ?? 0) : 0;
  }

  const postureScores = [head, shoulders, back, hips, knees].filter(s => s > 0);
  const postureScore = postureScores.length > 0
    ? Math.round(postureScores.reduce((a, b) => a + b, 0) / postureScores.length)
    : 0;

  // 3. MOVEMENT PATTERN SCORING
  const scoreMap: Record<string, number> = {
    'excellent': 100, 'good': 85, 'fair': 60, 'poor': 40,
    'full-depth': 100, 'parallel': 80, 'quarter-depth': 50, 'no-depth': 30,
    'full-range': 100, 'compensated': 60, 'limited': 30,
    'upright': 100, 'moderate-lean': 60, 'excessive-lean': 30,
    'none': 100, 'minor': 80, 'moderate': 50, 'severe': 25,
    'stable': 100, 'tracks-straight': 100, 'neutral': 100,
    'valgus': 40, 'varus': 40, 'pronation': 50, 'supination': 50,
    'caves-inward': 40, 'bows-outward': 40,
    'anterior-tilt': 50, 'posterior-tilt': 50,
    'left': 60, 'right': 60
  };

  const getScore = (v: string | undefined) => (v ? (scoreMap[v.toLowerCase()] ?? 0) : 0);

  // Overhead Squat Score
  const ohsFields = [form.ohsShoulderMobility, form.ohsTorsoLean, form.ohsSquatDepth, form.ohsHipShift, form.ohsKneeAlignment, form.ohsFeetPosition];
  const ohsScores = ohsFields.map(getScore).filter(s => s > 0);
  const ohsScore = ohsScores.length > 0 ? ohsScores.reduce((a, b) => a + b, 0) / ohsScores.length : 0;

  // Hinge Score
  const hingeFields = [form.hingeDepth, form.hingeBackRounding];
  const hingeScores = hingeFields.map(getScore).filter(s => s > 0);
  const hingeScore = hingeScores.length > 0 ? hingeScores.reduce((a, b) => a + b, 0) / hingeScores.length : 0;

  // Lunge Score
  const lungeFields = [form.lungeLeftBalance, form.lungeRightBalance, form.lungeLeftKneeAlignment, form.lungeRightKneeAlignment, form.lungeLeftTorso, form.lungeRightTorso];
  const lungeScores = lungeFields.map(getScore).filter(s => s > 0);
  const lungeScore = lungeScores.length > 0 ? lungeScores.reduce((a, b) => a + b, 0) / lungeScores.length : 0;

  const mvmntScores = [ohsScore, hingeScore, lungeScore].filter(s => s > 0);
  const movementScore = mvmntScores.length > 0 
    ? Math.round(mvmntScores.reduce((a, b) => a + b, 0) / mvmntScores.length)
    : 0;

  // 4. CLINICAL INSIGHTS & CONTRAINDICATIONS
  const stretches: string[] = [];
  const activations: string[] = [];
  const contraindications: string[] = [];

  // Check for Upper Crossed Syndrome
  if (form.postureHeadOverall === 'forward-head' || form.postureShouldersOverall === 'rounded') {
    const dev = MOVEMENT_LOGIC_DB.upper_crossed;
    stretches.push(dev.primaryStretch);
    activations.push(dev.primaryActivation);
    contraindications.push(...dev.contraindications);
  }

  // Check for Lower Crossed Syndrome
  if (form.postureHipsOverall === 'anterior-tilt' || form.ohsTorsoLean === 'excessive-lean') {
    const dev = MOVEMENT_LOGIC_DB.lower_crossed;
    stretches.push(dev.primaryStretch);
    activations.push(dev.primaryActivation);
    contraindications.push(...dev.contraindications);
  }

  // Check for Knee Valgus
  if (form.ohsKneeAlignment === 'valgus' || form.lungeLeftKneeAlignment === 'caves-inward' || form.lungeRightKneeAlignment === 'caves-inward') {
    const dev = MOVEMENT_LOGIC_DB.knee_valgus;
    stretches.push(dev.primaryStretch);
    activations.push(dev.primaryActivation);
    contraindications.push(...dev.contraindications);
  }

  // Check for Posterior Pelvic Tilt
  if (form.postureHipsOverall === 'posterior-tilt' || form.hingeBackRounding === 'severe') {
    const dev = MOVEMENT_LOGIC_DB.posterior_pelvic_tilt;
    stretches.push(dev.primaryStretch);
    activations.push(dev.primaryActivation);
    contraindications.push(...dev.contraindications);
  }

  // Check for Feet Pronation
  if (form.ohsFeetPosition === 'pronation' || form.postureKneesOverall === 'valgus-knee') {
    const dev = MOVEMENT_LOGIC_DB.feet_pronation;
    stretches.push(dev.primaryStretch);
    activations.push(dev.primaryActivation);
    contraindications.push(...dev.contraindications);
  }

  // Check for Pain (Safety overrides)
  if (form.ohsHasPain === 'yes' || form.hingeHasPain === 'yes' || form.lungeHasPain === 'yes') {
    contraindications.push('Loaded movement in painful patterns');
  }

  // FINAL OUTPUT
  const details: ScoreDetail[] = [
    { id: 'posture', label: 'Posture', value: postureScore > 0 ? 'Analyzed' : '-', score: postureScore },
    { id: 'movement', label: 'Movement', value: movementScore > 0 ? 'Patterns' : '-', score: movementScore },
    { id: 'mobility', label: 'Mobility', value: mobilityScore > 0 ? 'Joints' : '-', score: mobilityScore },
  ];

  const allCategoryScores = [postureScore, movementScore, mobilityScore].filter(s => s > 0);
  const score = allCategoryScores.length > 0
    ? Math.round(allCategoryScores.reduce((a, b) => a + b, 0) / allCategoryScores.length)
    : 0;

  const strengths = [];
  const weaknesses = [];
  if (postureScore >= 80) strengths.push('Solid postural alignment');
  if (movementScore >= 80) strengths.push('Strong movement patterns');
  if (mobilityScore >= 80) strengths.push('Good joint mobility');
  
  if (postureScore > 0 && postureScore < 65) weaknesses.push('Postural imbalances identified');
  if (movementScore > 0 && movementScore < 65) weaknesses.push('Movement pattern compensation');
  if (mobilityScore > 0 && mobilityScore < 65) weaknesses.push('Joint mobility restrictions');

  return { 
    id: 'movementQuality', 
    title: 'Movement Quality', 
    score, 
    details, 
    strengths, 
    weaknesses,
    stretches: Array.from(new Set(stretches)), // Unique values
    activations: Array.from(new Set(activations)),
    contraindications: Array.from(new Set(contraindications))
  };
}

function scoreLifestyle(form: FormData, age: number, gender: string): ScoreCategory {
  // Score lifestyle factors (sleep, stress, hydration, nutrition, activity, recovery)

  const sleepQ = (form.sleepQuality || '').toLowerCase();
  const sleepC = (form.sleepConsistency || '').toLowerCase();
  const stress = (form.stressLevel || '').toLowerCase();
  const hydration = (form.hydrationHabits || '').toLowerCase();
  const nutrition = (form.nutritionHabits || '').toLowerCase();
  const steps = parseFloat(form.stepsPerDay || '0');
  const sedentary = parseFloat(form.sedentaryHours || '0');
  
  // Check if ANY lifestyle data was entered
  const hasLifestyleData = !!(sleepQ || sleepC || stress || hydration || nutrition || steps > 0 || sedentary > 0);
  
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
  
  // Sleep score (0-100, default 0 if not filled)
  let sleepScore = 0;
  if (sleepQ === 'excellent') sleepScore = 100;
  else if (sleepQ === 'good') sleepScore = 85;
  else if (sleepQ === 'fair') sleepScore = 60;
  else if (sleepQ === 'poor') sleepScore = 40;
  if (sleepC === 'very-consistent') sleepScore = Math.min(100, sleepScore + 10);
  else if (sleepC === 'consistent') sleepScore = Math.min(100, sleepScore + 5);
  else if (sleepC === 'inconsistent') sleepScore = Math.max(0, sleepScore - 10);
  else if (sleepC === 'very-inconsistent') sleepScore = Math.max(0, sleepScore - 20);
  
  // Stress score (inverted - lower stress = higher score, default 0 if not filled)
  let stressScore = 0;
  if (stress === 'very-low') stressScore = 100;
  else if (stress === 'low') stressScore = 85;
  else if (stress === 'moderate') stressScore = 65;
  else if (stress === 'high') stressScore = 45;
  else if (stress === 'very-high') stressScore = 30;
  
  // Hydration score (default 0 if not filled)
  let hydrationScore = 0;
  if (hydration === 'excellent') hydrationScore = 100;
  else if (hydration === 'good') hydrationScore = 85;
  else if (hydration === 'fair') hydrationScore = 60;
  else if (hydration === 'poor') hydrationScore = 40;
  
  // Nutrition score (default 0 if not filled)
  let nutritionScore = 0;
  if (nutrition === 'excellent') nutritionScore = 100;
  else if (nutrition === 'good') nutritionScore = 85;
  else if (nutrition === 'fair') nutritionScore = 60;
  else if (nutrition === 'poor') nutritionScore = 40;
  
  // Activity score (based on steps and sedentary time, default 0 if not filled)
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
  
  // Sleep advice
  if (sleepScore < 70) {
    lifestyleAdvice.push(LIFESTYLE_FEEDBACK_DB.find(a => a.category === 'Sleep' && a.riskLevel === 'High Risk')?.adviceBlock || '');
  } else if (sleepScore >= 85) {
    lifestyleAdvice.push(LIFESTYLE_FEEDBACK_DB.find(a => a.category === 'Sleep' && a.riskLevel === 'Optimal')?.adviceBlock || '');
  }

  // Stress advice
  if (stressScore < 50) {
    lifestyleAdvice.push(LIFESTYLE_FEEDBACK_DB.find(a => a.category === 'Stress' && a.riskLevel === 'High Risk')?.adviceBlock || '');
  } else if (stressScore < 75) {
    lifestyleAdvice.push(LIFESTYLE_FEEDBACK_DB.find(a => a.category === 'Stress' && a.riskLevel === 'Moderate Risk')?.adviceBlock || '');
  } else {
    lifestyleAdvice.push(LIFESTYLE_FEEDBACK_DB.find(a => a.category === 'Stress' && a.riskLevel === 'Low Risk')?.adviceBlock || '');
  }

  // Steps advice
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
  
  // Only calculate overall score if we have data
  const scoresWithData = [sleepScore, stressScore, hydrationScore, nutritionScore, activityScore].filter(s => s > 0);
  const overallScore = scoresWithData.length > 0
    ? Math.round(scoresWithData.reduce((a, b) => a + b, 0) / scoresWithData.length)
    : 0;
  
  const strengths = [];
  const weaknesses = [];
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

function generateSynthesis(categories: ScoreCategory[]): ScoreSummary['synthesis'] {
  const synthesis: ScoreSummary['synthesis'] = [];
  
  const bodyComp = categories.find(c => c.id === 'bodyComp');
  const cardio = categories.find(c => c.id === 'cardio');
  const strength = categories.find(c => c.id === 'strength');
  const movement = categories.find(c => c.id === 'movementQuality');
  const lifestyle = categories.find(c => c.id === 'lifestyle');

  // 1. Metabolic Risk: High Visceral + Low Cardio
  const visceral = bodyComp?.details.find(d => d.id === 'visceral')?.value;
  if (Number(visceral) >= 12 && (cardio?.score || 0) < 50) {
    synthesis.push({
      title: 'Metabolic Health Priority',
      description: 'The combination of high visceral fat and low cardiovascular recovery indicates a significant metabolic health risk. Aerobic base building is the primary lever here.',
      severity: 'high'
    });
  }

  // 2. Injury Risk: High Strength + Poor Movement
  if ((strength?.score || 0) > 70 && (movement?.score || 0) < 50) {
    synthesis.push({
      title: 'Structural Injury Risk',
      description: 'You have high absolute strength but significant movement compensations. Adding more weight without correcting these patterns increases the risk of joint injury.',
      severity: 'high'
    });
  }

  // 3. Recovery Crisis: Low Sleep + High Stress
  const sleep = lifestyle?.details.find(d => d.id === 'sleep')?.score || 0;
  const stress = lifestyle?.details.find(d => d.id === 'stress')?.score || 0;
  if (sleep < 50 && stress < 50) {
    synthesis.push({
      title: 'Systemic Recovery Crisis',
      description: 'Poor sleep combined with high stress levels is blunting your ability to adapt to training. Until this is addressed, high-intensity training may be counterproductive.',
      severity: 'medium'
    });
  }

  // 4. Sarcopenia/Foundation Risk: Low SMM + Low Strength
  const smmScore = bodyComp?.details.find(d => d.id === 'smm')?.score || 0;
  if (smmScore < 50 && (strength?.score || 0) < 50) {
    synthesis.push({
      title: 'Structural Integrity Needed',
      description: 'Low muscle mass and low baseline strength suggest a need for a dedicated hypertrophy and basic strength block to support long-term metabolic health and mobility.',
      severity: 'medium'
    });
  }

  return synthesis;
}

export function computeScores(form: FormData): ScoreSummary {
  const age = calculateAge(form.dateOfBirth);
  const gender = (form.gender || 'any').toLowerCase();

  const categories = [
    scoreBodyComp(form, age, gender),
    scoreCardio(form, age, gender),
    scoreStrength(form, age, gender),
    scoreMovementQuality(form, age, gender),
    scoreLifestyle(form, age, gender),
  ];
  const overall =
    Math.round(
      categories.reduce((acc, c) => acc + c.score, 0) / (categories.length || 1)
    );
  
  const synthesis = generateSynthesis(categories);

  return { overall, categories, synthesis };
}

export type RoadmapPhase = {
  title: string;
  weeks: number;
  focus: string[];
  rationale: string;
  expectedDelta: number; // projected improvement in related score (%)
};

export function buildRoadmap(scores: ScoreSummary, formData?: FormData): RoadmapPhase[] {
  const phases: RoadmapPhase[] = [];
  
  // Calculate realistic timeframes based on actual findings
  const gender = (formData?.gender || 'any').toLowerCase();
  const age = calculateAge(formData?.dateOfBirth || '');

  const weight = parseFloat(formData?.inbodyWeightKg || '0');
  const bf = parseFloat(formData?.inbodyBodyFatPct || '0');
  const smm = parseFloat(formData?.skeletalMuscleMassKg || '0');
  const visceral = parseFloat(formData?.visceralFatLevel || '0');
  const h = (parseFloat(formData?.heightCm || '0') || 0) / 100;
  const bmi = h > 0 ? weight / (h * h) : 0;
  
  // 1. FAT LOSS REALITY
  let fatLossWeeks = 0;
  let weightToLose = 0;
  
  const fatLossBenchmark = GOAL_TIMELINE_DB.find(b => 
    b.goalType === 'fat_loss' && 
    (b.gender === 'any' || b.gender === gender) &&
    (b.ageBracket.includes('+') ? age >= parseInt(b.ageBracket) : 
     age >= parseInt(b.ageBracket.split('-')[0]) && age <= parseInt(b.ageBracket.split('-')[1]))
  );

  if (weight > 0 && fatLossBenchmark) {
    const targetBF = gender === 'male' ? 15 : 22; // Target body fat %
    if (bf > targetBF) {
      const currentFatKg = (weight * bf) / 100;
      const leanMassKg = weight - currentFatKg;
      const targetWeight = leanMassKg / (1 - targetBF / 100);
      weightToLose = weight - targetWeight;
      
      // Calculate max weekly rate (e.g. 1% body weight)
      const maxWeeklyRatePct = parseFloat(fatLossBenchmark.maxWeeklyRate) / 100;
      const weeklyLossKg = weight * maxWeeklyRatePct;
      fatLossWeeks = Math.ceil(weightToLose / (weeklyLossKg || 0.5));
    }
  }

  // 2. MUSCLE GAIN REALITY
  let muscleGainWeeks = 0;
  let muscleToGain = 0;

  const muscleBenchmark = GOAL_TIMELINE_DB.find(b => 
    b.goalType === 'muscle_gain' && 
    (b.gender === 'any' || b.gender === gender) &&
    (b.ageBracket.includes('+') ? age >= parseInt(b.ageBracket) : 
     age >= parseInt(b.ageBracket.split('-')[0]) && age <= parseInt(b.ageBracket.split('-')[1]))
  );

  if (smm > 0 && muscleBenchmark) {
    const targetSMM = gender === 'male' ? 40 : 28; // Standard target
    if (smm < targetSMM) {
      muscleToGain = targetSMM - smm;
      const weeklyGainLbs = parseFloat(muscleBenchmark.maxWeeklyRate);
      const weeklyGainKg = weeklyGainLbs * 0.453592; // lbs to kg
      muscleGainWeeks = Math.ceil(muscleToGain / (weeklyGainKg || 0.1));
    }
  }

  // Posture improvement calculations
  let postureWeeks = 0;
  const postureIssues: string[] = [];
  if (formData?.postureHeadOverall === 'forward-head') {
    postureWeeks = Math.max(postureWeeks, 8);
    postureIssues.push('Forward head posture');
  }
  if (formData?.postureShouldersOverall === 'rounded') {
    postureWeeks = Math.max(postureWeeks, 8);
    postureIssues.push('Rounded shoulders');
  }
  if (formData?.ohsKneeAlignment === 'valgus') {
    postureWeeks = Math.max(postureWeeks, 12);
    postureIssues.push('Knee valgus');
  }

  // Build phases based on priority
  
  // Phase 1: Foundation / Fat Loss (if applicable)
  if (fatLossWeeks > 0) {
    phases.push({
      title: 'Metabolic & Fat Loss Foundation',
      weeks: Math.min(fatLossWeeks, 12),
      focus: ['Caloric deficit via Zone 2 activity', 'Establishing nutritional consistency', 'Aerobic base building'],
      rationale: `Based on your age (${age}) and current body fat (${bf}%), a controlled loss rate of ~${fatLossBenchmark?.maxWeeklyRate} per week is recommended for long-term health.`,
      expectedDelta: 15
    });
  }

  // Phase 2: Movement Quality (if applicable)
  if (postureWeeks > 0) {
    phases.push({
      title: 'Movement Quality & Correction',
      weeks: Math.min(postureWeeks, 8),
      focus: postureIssues.slice(0, 3),
      rationale: 'Correcting identified postural deviations before adding significant external load to reduce injury risk.',
      expectedDelta: 20
    });
  }

  // Phase 3: Strength & Muscle
  if (muscleGainWeeks > 0) {
    phases.push({
      title: 'Structural Strength & Hypertrophy',
      weeks: Math.min(muscleGainWeeks, 12),
      focus: ['Progressive resistance training', 'Increased protein availability', 'Compound movement proficiency'],
      rationale: `Focusing on gaining ~${muscleToGain.toFixed(1)}kg of muscle mass. Rate is adjusted for ${muscleBenchmark?.metabolicLogic || 'biological reality'}.`,
      expectedDelta: 10
    });
  }

  // If no phases created, add generic ones
  if (phases.length === 0) {
    phases.push({
      title: 'Foundation Phase',
      weeks: 6,
      focus: ['Movement consistency', 'Baseline fitness', 'Habit formation'],
      rationale: 'Establishing a solid foundation for future progress.',
      expectedDelta: 10
    });
  }

  // Final check - ensure we have at least 2 phases if we have data
  if (phases.length === 1 && (fatLossWeeks > 0 || muscleGainWeeks > 0)) {
    phases.push({
      title: 'Performance & Maintenance',
      weeks: 4,
      focus: ['Integrate gains', 'Maintain consistency', 'Prepare for re-assessment'],
      rationale: 'Consolidating improvements and preparing for the next block of training.',
      expectedDelta: 5
    });
  }

  return phases.slice(0, 4);
}
