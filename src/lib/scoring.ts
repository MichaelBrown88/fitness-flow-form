import type { FormData } from '@/contexts/FormContext';

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
};

export type ScoreSummary = {
  overall: number; // 0-100
  categories: ScoreCategory[];
};

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));

function scoreBodyComp(form: FormData): ScoreCategory {
  const weight = parseFloat(form.inbodyWeightKg || '0');
  const bodyFat = parseFloat(form.inbodyBodyFatPct || '0');
  const smm = parseFloat(form.skeletalMuscleMassKg || '0');
  const bfm = parseFloat(form.bodyFatMassKg || (weight > 0 && bodyFat > 0 ? ((weight * bodyFat) / 100).toFixed(1) : '0'));
  const whr = parseFloat(form.waistHipRatio || '0');
  const bmr = parseFloat(form.bmrKcal || '0');
  const inbodyScore = parseFloat(form.inbodyScore || '0');
  const bmi = parseFloat(form.inbodyBmi || '0');
  const tbw = parseFloat(form.totalBodyWaterL || '0');

  // Heuristic scoring
  const bfScore = bodyFat > 0 ? clamp(100 - (bodyFat - 12) * 3) : 0;
  const smmScore = smm > 0 ? clamp((smm / (weight || 1)) * 300) : 0; // rough ratio scaled
  const visceral = parseFloat(form.visceralFatLevel || '0');
  const visceralScore = visceral > 0 ? clamp(100 - (visceral - 8) * 10) : 0;
  const whrScore = whr > 0 ? clamp(100 - Math.max(0, (whr - 0.9) * 150)) : 0; // rough, gender-agnostic heuristic

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
  const score = Math.round((bfScore * 0.45 + smmScore * 0.25 + visceralScore * 0.2 + whrScore * 0.1));

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

function scoreCardio(form: FormData): ScoreCategory {
  const test = (form.cardioTestSelected || '').toLowerCase();
  const rhr = parseFloat(form.cardioRestingHr || '0');
  const hr60 = parseFloat(form.cardioPost1MinHr || '0');
  const dob = form.dateOfBirth;
  
  // Check if cardio test was actually performed
  const hasTest = !!(form.cardioTestSelected && form.cardioTestSelected.trim() !== '');
  const hasHr60 = !!(form.cardioPost1MinHr && form.cardioPost1MinHr.trim() !== '');
  const hasRhr = !!(form.cardioRestingHr && form.cardioRestingHr.trim() !== '');
  
  // Compute age from DOB (YYYY-MM-DD)
  let age = 0;
  if (dob) {
    const dobDate = new Date(dob);
    if (!isNaN(dobDate.getTime())) {
      const today = new Date();
      age = today.getFullYear() - dobDate.getFullYear();
      const m = today.getMonth() - dobDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) age--;
    }
  }

  // Map HR60 rating by test
  const rateYmca = (v: number) =>
    v < 96 ? 'Excellent'
      : v <= 102 ? 'Very Good'
      : v <= 110 ? 'Good'
      : v <= 119 ? 'Average'
      : v <= 129 ? 'Below Average'
      : 'Poor';
  const rateTreadmill = (v: number) =>
    v < 95 ? 'Excellent'
      : v <= 105 ? 'Very Good'
      : v <= 115 ? 'Good'
      : v <= 125 ? 'Average'
      : v <= 135 ? 'Below Average'
      : 'Poor';
  const hr60Rating = hasTest && hasHr60
    ? (test === 'ymca-step' ? rateYmca(hr60) : test === 'treadmill' ? rateTreadmill(hr60) : 'Unknown')
    : 'Unknown';

  // VO2max estimate
  const mhr = age > 0 ? 208 - 0.7 * age : 0;
  const vo2max = hasHr60 && hr60 > 0 && mhr > 0 ? 15.3 * (mhr / hr60) : 0;
  const vo2Class =
    vo2max >= 60 ? 'Excellent'
      : vo2max >= 52 ? 'Very Good'
      : vo2max >= 45 ? 'Good'
      : vo2max >= 38 ? 'Average'
      : vo2max >= 32 ? 'Below Average'
      : vo2max >= 25 ? 'Poor'
      : 'Very Poor';

  // Subscores - only count if test was performed
  const recoveryScore = hasTest && hasHr60
    ? (hr60Rating === 'Excellent' ? 40
      : hr60Rating === 'Very Good' ? 34
      : hr60Rating === 'Good' ? 28
      : hr60Rating === 'Average' ? 22
      : hr60Rating === 'Below Average' ? 14
      : hr60Rating === 'Poor' ? 6
      : 0)
    : 0;
  const vo2Score = hasTest && hasHr60
    ? (vo2Class === 'Excellent' ? 40
      : vo2Class === 'Very Good' ? 34
      : vo2Class === 'Good' ? 28
      : vo2Class === 'Average' ? 22
      : vo2Class === 'Below Average' ? 14
      : vo2Class === 'Poor' ? 8
      : vo2Class === 'Very Poor' ? 4
      : 0)
    : 0;
  const rhrScore = hasRhr
    ? (rhr > 0 && rhr < 55 ? 20
      : rhr <= 64 ? 16
      : rhr <= 74 ? 12
      : rhr <= 84 ? 8
      : rhr >= 85 ? 4
      : 0)
    : 0;

  const fitnessScoreRaw = recoveryScore + vo2Score + rhrScore;
  const fitnessScore = clamp(fitnessScoreRaw);
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
    recommendation = 'Cardio assessment not performed.';
  } else if (cardioClass === 'Poor' || vo2Class === 'Very Poor' || vo2Class === 'Poor') {
    recommendation = 'Low aerobic base – prioritise 3–4 sessions/week of 20–40 minutes Zone 2 walking.';
  } else if (cardioClass === 'Average' || cardioClass === 'Below Average' || vo2Class === 'Below Average' || vo2Class === 'Average') {
    recommendation = 'Moderate aerobic base – 2–3 Zone 2 sessions plus 1 slightly harder conditioning session per week.';
  } else {
    recommendation = 'Solid aerobic base – maintain 2–3 cardio sessions/week; consider adding intervals/tempo for performance.';
  }

  const details: ScoreDetail[] = [
    { id: 'rhr', label: 'Resting HR', value: rhr || '-', unit: 'bpm', score: rhrScore * 5 }, // scale to 100 for radar
    { id: 'hr60', label: 'Recovery', value: hr60 || '-', unit: 'bpm', score: recoveryScore * 2.5 }, // scale to 100
    { id: 'vo2', label: 'VO₂max', value: vo2max ? vo2max.toFixed(1) : '-', unit: 'ml/kg/min', score: vo2Score * 2.5 }, // scale to 100
    { id: 'cardioClass', label: 'Fitness Level', value: cardioClass, score: fitnessScore },
  ];

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  // Only add weaknesses if tests were actually performed
  if (hasTest && fitnessScore >= 75) strengths.push('Strong aerobic base');
  if (hasTest && hasHr60 && recoveryScore < 22) weaknesses.push('HR recovery needs improvement');
  if (hasTest && hasHr60 && vo2Score < 22) weaknesses.push('VO₂ capacity needs improvement');
  if (hasRhr && rhrScore < 12) weaknesses.push('Elevated resting HR');

  return { id: 'cardio', title: 'Cardiovascular Fitness', score: Math.round(fitnessScore), details, strengths, weaknesses };
}

function scoreStrength(form: FormData): ScoreCategory {
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

  const pushScore = hasPushups ? clamp(pushups * 3) : 0; // 33 reps ~ 100
  const squatScore = hasSquats ? clamp(squats * 2.5) : 0; // 40 reps ~ 100
  const plankScore = hasPlank ? clamp(plank / 1.2) : 0; // 120s ~ 100
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
  // Only add weaknesses if the test was actually performed
  if (hasPlank && plankScore < 60) weaknesses.push('Core endurance');
  if (hasPushups && pushScore < 60) weaknesses.push('Upper body endurance');
  if (hasSquats && squatScore < 60) weaknesses.push('Lower body endurance');
  if (hasGrip && gripScore < 50) weaknesses.push('Grip strength');
  if (score >= 75 && filledTests >= 2) strengths.push('Overall strength & endurance');

  return { id: 'strength', title: 'Strength & Endurance', score, details, strengths, weaknesses };
}

function scoreMovementQuality(form: FormData): ScoreCategory {
  // Combine mobility and posture into Movement Quality
  const mapMobility = (v: string) => (v === 'good' ? 100 : v === 'fair' ? 60 : v === 'poor' ? 30 : 0);
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
  
  // Mobility scores
  const hasHip = !!(form.mobilityHip && form.mobilityHip.trim() !== '');
  const hasShoulder = !!(form.mobilityShoulder && form.mobilityShoulder.trim() !== '');
  const hasAnkle = !!(form.mobilityAnkle && form.mobilityAnkle.trim() !== '');
  const hip = hasHip ? mapMobility(form.mobilityHip) : 0;
  const shoulder = hasShoulder ? mapMobility(form.mobilityShoulder) : 0;
  const ankle = hasAnkle ? mapMobility(form.mobilityAnkle) : 0;
  
  // Posture scores
  const hasHead = !!(form.postureHeadOverall && form.postureHeadOverall.trim() !== '');
  const hasShoulders = !!(form.postureShouldersOverall && form.postureShouldersOverall.trim() !== '');
  const hasBack = !!(form.postureBackOverall && form.postureBackOverall.trim() !== '');
  const hasHips = !!(form.postureHipsOverall && form.postureHipsOverall.trim() !== '');
  const hasKnees = !!(form.postureKneesOverall && form.postureKneesOverall.trim() !== '');
  const head = hasHead ? neutralScore(form.postureHeadOverall) : 0;
  const shoulders = hasShoulders ? neutralScore(form.postureShouldersOverall) : 0;
  const back = hasBack ? (backMap[form.postureBackOverall] ?? 0) : 0;
  const hips = hasHips ? neutralScore(form.postureHipsOverall) : 0;
  const knees = hasKnees ? (kneesMap[form.postureKneesOverall] ?? 0) : 0;
  
  const details: ScoreDetail[] = [
    { id: 'hip', label: 'Hip Mobility', value: form.mobilityHip || '-', score: hip },
    { id: 'shoulder', label: 'Shoulder Mobility', value: form.mobilityShoulder || '-', score: shoulder },
    { id: 'ankle', label: 'Ankle Mobility', value: form.mobilityAnkle || '-', score: ankle },
    { id: 'spinal', label: 'Spinal Alignment', value: form.postureBackOverall || '-', score: back },
    { id: 'knee', label: 'Knee Alignment', value: form.postureKneesOverall || '-', score: knees },
  ];
  
  const allScores = [hip, shoulder, ankle, head, shoulders, back, hips, knees].filter(s => s > 0);
  const score = allScores.length > 0 ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;
  
  const strengths = [];
  const weaknesses = [];
  if (hasHip && hip < 60) weaknesses.push('Hip mobility');
  if (hasShoulder && shoulder < 60) weaknesses.push('Shoulder mobility');
  if (hasAnkle && ankle < 60) weaknesses.push('Ankle mobility');
  if (hasBack && back < 60) weaknesses.push('Spinal alignment');
  if (hasKnees && knees < 60) weaknesses.push('Knee alignment');
  if (hasHips && hips < 60) weaknesses.push('Pelvic alignment');
  if (score >= 75 && allScores.length >= 4) strengths.push('Overall movement quality');
  
  return { id: 'movementQuality', title: 'Movement Quality', score, details, strengths, weaknesses };
}

function scoreLifestyle(form: FormData): ScoreCategory {
  // Score lifestyle factors (sleep, stress, hydration, nutrition, activity, recovery)
  const sleepQ = (form.sleepQuality || '').toLowerCase();
  const sleepC = (form.sleepConsistency || '').toLowerCase();
  const sleepD = parseFloat(form.sleepDuration || '0');
  const stress = (form.stressLevel || '').toLowerCase();
  const hydration = (form.hydrationHabits || '').toLowerCase();
  const nutrition = (form.nutritionHabits || '').toLowerCase();
  const steps = parseFloat(form.stepsPerDay || '0');
  const sedentary = parseFloat(form.sedentaryHours || '0');
  
  // Sleep score (0-100)
  let sleepScore = 70; // baseline
  if (sleepQ === 'excellent') sleepScore = 100;
  else if (sleepQ === 'good') sleepScore = 85;
  else if (sleepQ === 'fair') sleepScore = 60;
  else if (sleepQ === 'poor') sleepScore = 40;
  if (sleepC === 'very-consistent') sleepScore = Math.min(100, sleepScore + 10);
  else if (sleepC === 'consistent') sleepScore = Math.min(100, sleepScore + 5);
  else if (sleepC === 'inconsistent') sleepScore = Math.max(0, sleepScore - 10);
  else if (sleepC === 'very-inconsistent') sleepScore = Math.max(0, sleepScore - 20);
  
  // Stress score (inverted - lower stress = higher score)
  let stressScore = 70;
  if (stress === 'very-low') stressScore = 100;
  else if (stress === 'low') stressScore = 85;
  else if (stress === 'moderate') stressScore = 65;
  else if (stress === 'high') stressScore = 45;
  else if (stress === 'very-high') stressScore = 30;
  
  // Hydration score
  let hydrationScore = 70;
  if (hydration === 'excellent') hydrationScore = 100;
  else if (hydration === 'good') hydrationScore = 85;
  else if (hydration === 'fair') hydrationScore = 60;
  else if (hydration === 'poor') hydrationScore = 40;
  
  // Nutrition score
  let nutritionScore = 70;
  if (nutrition === 'excellent') nutritionScore = 100;
  else if (nutrition === 'good') nutritionScore = 85;
  else if (nutrition === 'fair') nutritionScore = 60;
  else if (nutrition === 'poor') nutritionScore = 40;
  
  // Activity score (based on steps and sedentary time)
  let activityScore = 70;
  if (steps > 0) {
    if (steps >= 10000) activityScore = 100;
    else if (steps >= 8000) activityScore = 85;
    else if (steps >= 6000) activityScore = 70;
    else if (steps >= 4000) activityScore = 55;
    else activityScore = 40;
  }
  if (sedentary >= 10) activityScore = Math.max(30, activityScore - 20);
  else if (sedentary >= 8) activityScore = Math.max(40, activityScore - 15);
  
  // Recovery score (combination of sleep quality and stress)
  const recoveryScore = Math.round((sleepScore * 0.6 + stressScore * 0.4));
  
  const details: ScoreDetail[] = [
    { id: 'sleep', label: 'Sleep Quality', value: sleepQ || '-', score: Math.round(sleepScore) },
    { id: 'stress', label: 'Stress Management', value: stress || '-', score: Math.round(stressScore) },
    { id: 'hydration', label: 'Hydration', value: hydration || '-', score: Math.round(hydrationScore) },
    { id: 'nutrition', label: 'Nutrition', value: nutrition || '-', score: Math.round(nutritionScore) },
    { id: 'activity', label: 'Daily Activity', value: steps > 0 ? `${Math.round(steps)} steps` : '-', score: Math.round(activityScore) },
  ];
  
  const overallScore = Math.round((sleepScore * 0.25 + stressScore * 0.2 + hydrationScore * 0.15 + nutritionScore * 0.2 + activityScore * 0.2));
  
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
  
  return { id: 'lifestyle', title: 'Lifestyle', score: overallScore, details, strengths, weaknesses };
}

export function computeScores(form: FormData): ScoreSummary {
  const categories = [
    scoreBodyComp(form),
    scoreCardio(form),
    scoreStrength(form),
    scoreMovementQuality(form),
    scoreLifestyle(form),
  ];
  const overall =
    Math.round(
      categories.reduce((acc, c) => acc + c.score, 0) / (categories.length || 1)
    );
  return { overall, categories };
}

export type RoadmapPhase = {
  title: string;
  weeks: number;
  focus: string[];
  rationale: string;
  expectedDelta: number; // projected improvement in related score (%)
};

export function buildRoadmap(scores: ScoreSummary): RoadmapPhase[] {
  // Prioritize lowest categories first
  const ordered = [...scores.categories].sort((a, b) => a.score - b.score);
  const phases: RoadmapPhase[] = [];
  ordered.forEach((cat, idx) => {
    const weeks = cat.id === 'movementQuality' ? 4 : 3;
    const focus = cat.weaknesses.length ? cat.weaknesses : [cat.title];
    // Heuristic projected improvement: more for earlier, more for lower scores
    const basePotential = Math.min(100 - cat.score, 30);
    const priorityBoost = idx === 0 ? 1.2 : idx === 1 ? 1.0 : 0.8;
    const expectedDelta = Math.round(Math.max(6, Math.min(18, basePotential * 0.5 * priorityBoost)));
    phases.push({
      title: `${cat.title} Focus`,
      weeks,
      focus,
      rationale: `Address ${cat.title.toLowerCase()} limitations to unlock performance and reduce injury risk.`,
      expectedDelta,
    });
    if (idx === 1) {
      phases.push({
        title: 'Consolidation',
        weeks: 2,
        focus: ['Integrate gains', 'Maintain consistency'],
        rationale: 'Solidify improvements before progressing.',
        expectedDelta: 5,
      });
    }
  });
  return phases.slice(0, 5);
}


