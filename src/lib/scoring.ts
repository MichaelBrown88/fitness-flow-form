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
  
  // Posture scores - Handle AI or Manual
  let head = 0;
  let shoulders = 0;
  let back = 0;
  let hips = 0;
  let knees = 0;
  let postureLabel = 'Manual';

  if (form.postureAiResults) {
    postureLabel = 'AI Analyzed';
    const ai = form.postureAiResults;
    
    // 1. Head Posture (from side view only)
    const headData = ai['side-right']?.forward_head || ai['side-left']?.forward_head;
    if (headData && headData.status !== 'Neutral') {
      const dev = Math.abs(headData.deviation_degrees ?? 0);
      if (headData.status === 'Mild') head = 75;
      else if (headData.status === 'Moderate') head = 50;
      else if (headData.status === 'Severe') head = 25;
      else head = 100;
    } else if (headData) {
      head = 100; // Neutral
    }

    // 2. Shoulder Alignment (from front view)
    const shoulderData = ai.front?.shoulder_alignment;
    if (shoulderData) {
      const diff = Math.abs(shoulderData.height_difference_cm ?? 0);
      if (shoulderData.status === 'Neutral' && diff < 0.5) {
        shoulders = 100;
      } else if (shoulderData.status === 'Asymmetric' || diff >= 0.5) {
        if (diff < 1.0) shoulders = 75;
        else if (diff < 2.0) shoulders = 50;
        else shoulders = 25;
      } else {
        shoulders = 100;
      }
    }

    // 3. Kyphosis (from side view)
    const kyphosisData = ai['side-right']?.kyphosis || ai['side-left']?.kyphosis;
    let kyphosisScore = 100;
    if (kyphosisData && kyphosisData.status !== 'Normal') {
      if (kyphosisData.status === 'Mild') kyphosisScore = 75;
      else if (kyphosisData.status === 'Moderate') kyphosisScore = 50;
      else if (kyphosisData.status === 'Severe') kyphosisScore = 25;
    }

    // 4. Lordosis (from side view)
    const lordosisData = ai['side-right']?.lordosis || ai['side-left']?.lordosis;
    let lordosisScore = 100;
    if (lordosisData && lordosisData.status !== 'Normal') {
      if (lordosisData.status === 'Mild') lordosisScore = 75;
      else if (lordosisData.status === 'Moderate') lordosisScore = 50;
      else if (lordosisData.status === 'Severe') lordosisScore = 25;
    }

    // 5. Pelvic Tilt (from side view for anterior/posterior, from front/back for lateral)
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

    // 6. Hip Alignment (from front/back view)
    const hipData = ai.front?.hip_alignment || ai.back?.hip_alignment;
    if (hipData) {
      const diff = Math.abs(hipData.height_difference_cm ?? 0);
      if (hipData.status === 'Neutral' && diff < 0.5) {
        hips = 100;
      } else if (hipData.status === 'Asymmetric' || diff >= 0.5) {
        if (diff < 1.0) hips = 75;
        else if (diff < 2.0) hips = 50;
        else hips = 25;
      } else {
        hips = 100;
      }
    }

    // 7. Knee Position (from side view for hyperextension/flexion)
    const kneeSideData = ai['side-right']?.knee_position || ai['side-left']?.knee_position;
    let kneeSideScore = 100;
    if (kneeSideData && kneeSideData.status !== 'Neutral') {
      const dev = Math.abs(kneeSideData.deviation_degrees ?? 0);
      if (dev < 5) kneeSideScore = 75;
      else if (dev < 10) kneeSideScore = 50;
      else kneeSideScore = 25;
    }
    
    // 8. Knee Alignment (from front/back view for valgus/varus)
    const kneeFrontData = ai.front?.knee_alignment || ai.back?.knee_alignment;
    let kneeFrontScore = 100;
    if (kneeFrontData && kneeFrontData.status !== 'Neutral') {
      const dev = Math.abs(kneeFrontData.deviation_degrees ?? 0);
      if (dev < 5) kneeFrontScore = 75;
      else if (dev < 10) kneeFrontScore = 50;
      else kneeFrontScore = 25;
    }
    
    // Combine knee scores (use worst one)
    knees = Math.min(kneeSideScore, kneeFrontScore);

    // Back score is average of kyphosis, lordosis, and pelvic
    back = Math.round((kyphosisScore + lordosisScore + pelvicScore) / 3);
  } else {
    // Manual scoring
    const hasHead = !!(form.postureHeadOverall && form.postureHeadOverall.trim() !== '');
    const hasShoulders = !!(form.postureShouldersOverall && form.postureShouldersOverall.trim() !== '');
    const hasBack = !!(form.postureBackOverall && form.postureBackOverall.trim() !== '');
    const hasHips = !!(form.postureHipsOverall && form.postureHipsOverall.trim() !== '');
    const hasKnees = !!(form.postureKneesOverall && form.postureKneesOverall.trim() !== '');
    head = hasHead ? neutralScore(form.postureHeadOverall) : 0;
    shoulders = hasShoulders ? neutralScore(form.postureShouldersOverall) : 0;
    back = hasBack ? (backMap[form.postureBackOverall] ?? 0) : 0;
    hips = hasHips ? neutralScore(form.postureHipsOverall) : 0;
    knees = hasKnees ? (kneesMap[form.postureKneesOverall] ?? 0) : 0;
  }
  
  const details: ScoreDetail[] = [
    { id: 'hip', label: 'Hip Mobility', value: form.mobilityHip || '-', score: hip },
    { id: 'shoulder', label: 'Shoulder Mobility', value: form.mobilityShoulder || '-', score: shoulder },
    { id: 'ankle', label: 'Ankle Mobility', value: form.mobilityAnkle || '-', score: ankle },
    { id: 'head', label: 'Head Posture', value: form.postureAiResults ? 'AI' : (form.postureHeadOverall || '-'), score: head },
    { id: 'shoulders', label: 'Shoulder Alignment', value: form.postureAiResults ? 'AI' : (form.postureShouldersOverall || '-'), score: shoulders },
    { id: 'spinal', label: `Spinal Alignment (${postureLabel})`, value: form.postureAiResults ? 'AI' : (form.postureBackOverall || '-'), score: back },
    { id: 'hips', label: 'Hip Alignment', value: form.postureAiResults ? 'AI' : (form.postureHipsOverall || '-'), score: hips },
    { id: 'knee', label: 'Knee Alignment', value: form.postureAiResults ? 'AI' : (form.postureKneesOverall || '-'), score: knees },
  ];
  
  // Only include scores that have actual data
  // If only posture data is provided (no mobility), only average posture scores
  const mobilityScores = [hip, shoulder, ankle].filter(s => s > 0);
  const postureScores = [head, shoulders, back, hips, knees].filter(s => s > 0);
  
  // If we have posture data but no mobility data, only use posture scores
  // BUT: If only posture images were provided (no mobility assessment), reduce the score to reflect incomplete assessment
  const hasMobilityData = mobilityScores.length > 0;
  const hasPostureData = postureScores.length > 0;
  
  let allScores: number[];
  if (hasPostureData && !hasMobilityData) {
    // Only posture data - use posture scores but apply a penalty to reflect incomplete assessment
    allScores = postureScores;
  } else {
    // Both or only mobility - use all available scores
    allScores = [...mobilityScores, ...postureScores];
  }
  
  let score = allScores.length > 0 ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;
  
  // Apply penalty if only posture was assessed (no mobility): 
  // Posture is only 1/3 of "Posture, Movement and Mobility" category
  // So if only posture exists, max score should be ~33% of what it would be with all 3 components
  // But we still want to reflect the actual posture quality, so use a more nuanced approach:
  // If posture average is 100, score should be ~33 (since it's 1/3 of the category)
  // If posture average is 70, score should be ~23 (70% of 33)
  if (hasPostureData && !hasMobilityData && score > 0) {
    // Calculate what the score would be if posture was 1/3 of the total
    const postureOnlyScore = Math.round(score * 0.33);
    score = postureOnlyScore;
    console.log(`[SCORING] Only posture data provided. Posture average: ${score}, Adjusted to reflect 1/3 category: ${postureOnlyScore}`);
  }
  
  const strengths = [];
  const weaknesses = [];
  if (hasHip && hip < 60) weaknesses.push('Hip mobility');
  if (hasShoulder && shoulder < 60) weaknesses.push('Shoulder mobility');
  if (hasAnkle && ankle < 60) weaknesses.push('Ankle mobility');
  if (back < 60) weaknesses.push('Spinal alignment');
  if (knees < 60) weaknesses.push('Knee alignment');
  if (hips < 60) weaknesses.push('Pelvic alignment');
  if (score >= 75 && allScores.length >= 4) strengths.push('Overall movement quality');
  
  return { id: 'movementQuality', title: 'Posture, movement and mobility', score, details, strengths, weaknesses };
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
  
  // Check if ANY lifestyle data was entered
  const hasLifestyleData = !!(sleepQ || sleepC || sleepD > 0 || stress || hydration || nutrition || steps > 0 || sedentary > 0);
  
  if (!hasLifestyleData) {
    return {
      id: 'lifestyle',
      title: 'Lifestyle',
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
  
  // Recovery score (combination of sleep quality and stress)
  const recoveryScore = Math.round((sleepScore * 0.6 + stressScore * 0.4));
  
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

export function buildRoadmap(scores: ScoreSummary, formData?: any): RoadmapPhase[] {
  const phases: RoadmapPhase[] = [];
  
  // Calculate realistic timeframes based on actual findings
  const gender = (formData?.gender || '').toLowerCase();
  const weight = parseFloat(formData?.inbodyWeightKg || '0');
  const bf = parseFloat(formData?.inbodyBodyFatPct || '0');
  const bfm = parseFloat(formData?.bodyFatMassKg || '0');
  const visceral = parseFloat(formData?.visceralFatLevel || '0');
  const h = (parseFloat(formData?.heightCm || '0') || 0) / 100;
  const healthyMax = h > 0 ? 25 * h * h : 0;
  const bmi = h > 0 ? weight / (h * h) : 0;
  
  // Weight loss calculations (0.5kg/week conservative rate)
  let weightLossWeeks = 0;
  let weightLossKg = 0;
  if (weight > 0 && h > 0) {
    const targetBF = gender === 'male' ? 18 : 25; // Target body fat %
    const currentBF = bf > 0 ? bf : (bfm > 0 && weight > 0 ? (bfm / weight) * 100 : 0);
    if (currentBF > targetBF) {
      const targetWeight = weight * (1 - (currentBF - targetBF) / 100);
      weightLossKg = weight - targetWeight;
      weightLossWeeks = Math.ceil(weightLossKg / 0.5); // 0.5kg/week
    } else if (bmi > 25 && healthyMax > 0) {
      weightLossKg = weight - healthyMax;
      weightLossWeeks = Math.ceil(weightLossKg / 0.5);
    }
  }
  
  // Muscle building calculations (0.15-0.25kg/week for beginners)
  const smm = parseFloat(formData?.skeletalMuscleMassKg || '0');
  let muscleGainWeeks = 0;
  let muscleGainKg = 0;
  if (smm > 0) {
    const targetSMM = gender === 'male' ? 33 : 24;
    if (smm < targetSMM) {
      muscleGainKg = targetSMM - smm;
      const rate = smm < 25 ? 0.25 : 0.15; // Faster for very low muscle mass
      muscleGainWeeks = Math.ceil(muscleGainKg / rate);
    }
  }
  
  // Posture improvement calculations
  let postureWeeks = 0;
  const postureIssues: string[] = [];
  if (formData?.postureAiResults) {
    const ai = formData.postureAiResults;
    const views = ['front', 'back', 'side-left', 'side-right'] as const;
    
    for (const view of views) {
      const analysis = ai[view];
      if (!analysis) continue;
      
      // Forward head posture
      if (analysis.forward_head && analysis.forward_head.deviation_degrees > 0) {
        const degrees = analysis.forward_head.deviation_degrees;
        if (degrees > 15) {
          postureWeeks = Math.max(postureWeeks, 16); // Severe: 16+ weeks
          postureIssues.push(`Severe forward head (${degrees.toFixed(1)}°)`);
        } else if (degrees > 8) {
          postureWeeks = Math.max(postureWeeks, 12); // Moderate: 8-12 weeks
          postureIssues.push(`Moderate forward head (${degrees.toFixed(1)}°)`);
        } else {
          postureWeeks = Math.max(postureWeeks, 6); // Mild: 4-6 weeks
          postureIssues.push(`Mild forward head (${degrees.toFixed(1)}°)`);
        }
      }
      
      // Kyphosis
      if (analysis.kyphosis && analysis.kyphosis.curve_degrees > 0) {
        const degrees = analysis.kyphosis.curve_degrees;
        if (degrees > 60) {
          postureWeeks = Math.max(postureWeeks, 16);
          postureIssues.push(`Severe kyphosis (${degrees.toFixed(1)}°)`);
        } else if (degrees > 40) {
          postureWeeks = Math.max(postureWeeks, 12);
          postureIssues.push(`Moderate kyphosis (${degrees.toFixed(1)}°)`);
        } else if (degrees > 30) {
          postureWeeks = Math.max(postureWeeks, 8);
          postureIssues.push(`Mild kyphosis (${degrees.toFixed(1)}°)`);
        }
      }
      
      // Shoulder/hip asymmetry
      if (analysis.shoulder_alignment && analysis.shoulder_alignment.status === 'Asymmetric') {
        const diff = Math.abs(analysis.shoulder_alignment.height_difference_cm || 0);
        if (diff >= 1.5) {
          postureWeeks = Math.max(postureWeeks, 12);
          postureIssues.push(`Significant shoulder asymmetry (${diff.toFixed(1)}cm)`);
        } else if (diff >= 1.0) {
          postureWeeks = Math.max(postureWeeks, 8);
          postureIssues.push(`Moderate shoulder asymmetry (${diff.toFixed(1)}cm)`);
        }
      }
      
      if (analysis.hip_alignment && analysis.hip_alignment.status === 'Asymmetric') {
        const diff = Math.abs(analysis.hip_alignment.height_difference_cm || '0');
        if (diff >= 1.5) {
          postureWeeks = Math.max(postureWeeks, 12);
          postureIssues.push(`Significant hip asymmetry (${diff.toFixed(1)}cm)`);
        } else if (diff >= 1.0) {
          postureWeeks = Math.max(postureWeeks, 8);
          postureIssues.push(`Moderate hip asymmetry (${diff.toFixed(1)}cm)`);
        }
      }
    }
  }
  
  // Strength improvement (based on current score)
  const strengthScore = scores.categories.find(c => c.id === 'strength')?.score || 0;
  let strengthWeeks = 0;
  if (strengthScore > 0 && strengthScore < 50) {
    // Very low strength: 12-16 weeks to build foundation
    strengthWeeks = strengthScore < 30 ? 16 : 12;
  } else if (strengthScore >= 50 && strengthScore < 70) {
    // Moderate strength: 8-12 weeks to improve
    strengthWeeks = 10;
  }
  
  // Cardio improvement (based on current score)
  const cardioScore = scores.categories.find(c => c.id === 'cardio')?.score || 0;
  let cardioWeeks = 0;
  if (cardioScore > 0 && cardioScore < 50) {
    // Low cardio: 8-12 weeks to build base
    cardioWeeks = cardioScore < 30 ? 12 : 8;
  } else if (cardioScore >= 50 && cardioScore < 70) {
    // Moderate cardio: 6-8 weeks to improve
    cardioWeeks = 6;
  }
  
  // Lifestyle improvements (based on current state)
  const lifestyleScore = scores.categories.find(c => c.id === 'lifestyle')?.score || 0;
  let lifestyleWeeks = 0;
  if (lifestyleScore > 0 && lifestyleScore < 60) {
    // Poor lifestyle: 4-8 weeks to establish habits
    lifestyleWeeks = lifestyleScore < 40 ? 8 : 6;
  }
  
  // Build phases based on priority and realistic timeframes
  // Priority 1: Critical health issues (obesity, high visceral fat)
  if (weightLossWeeks > 0 || visceral >= 12) {
    const weeks = Math.max(weightLossWeeks, visceral >= 12 ? 16 : 0);
    if (weeks > 0) {
      phases.push({
        title: 'Health & Body Composition',
        weeks: Math.min(weeks, 24), // Cap at 24 weeks
        focus: [
          weightLossWeeks > 0 ? `Reduce body weight by ~${weightLossKg.toFixed(1)}kg` : '',
          visceral >= 12 ? 'Lower visceral fat (metabolic health priority)' : '',
          'Establish sustainable nutrition habits',
          'Build aerobic base for fat loss'
        ].filter(Boolean),
        rationale: weightLossWeeks > 0 
          ? `Targeting ${weightLossKg.toFixed(1)}kg weight loss at a safe rate of ~0.5kg/week. This phase focuses on metabolic health and sustainable fat loss.`
          : 'Addressing high visceral fat and metabolic health risks through lifestyle and training interventions.',
        expectedDelta: Math.min(25, Math.round((weightLossKg / weight) * 100) || 15)
      });
    }
  }
  
  // Priority 2: Posture issues (if significant)
  if (postureWeeks > 0) {
    phases.push({
      title: 'Posture & Movement Quality',
      weeks: Math.min(postureWeeks, 16), // Cap at 16 weeks
      focus: postureIssues.slice(0, 4),
      rationale: `Addressing postural deviations to improve movement quality and reduce injury risk. Timeframe based on severity of findings.`,
      expectedDelta: 15
    });
  }
  
  // Priority 3: Strength (if low)
  if (strengthWeeks > 0) {
    phases.push({
      title: 'Strength Foundation',
      weeks: strengthWeeks,
      focus: [
        'Build foundational movement patterns',
        'Progressive strength development',
        'Improve movement quality under load'
      ],
      rationale: `Building strength foundation to support all training goals. Timeframe based on current strength level.`,
      expectedDelta: strengthScore < 30 ? 20 : 15
    });
  }
  
  // Priority 4: Cardio (if low)
  if (cardioWeeks > 0) {
    phases.push({
      title: 'Cardiovascular Fitness',
      weeks: cardioWeeks,
      focus: [
        'Build aerobic base',
        'Improve recovery capacity',
        'Support overall health and performance'
      ],
      rationale: `Improving cardiovascular fitness to enhance recovery and support training goals.`,
      expectedDelta: 12
    });
  }
  
  // Priority 5: Lifestyle (if poor)
  if (lifestyleWeeks > 0) {
    phases.push({
      title: 'Lifestyle Habits',
      weeks: lifestyleWeeks,
      focus: [
        'Establish consistent sleep patterns',
        'Improve stress management',
        'Optimize hydration and nutrition timing'
      ],
      rationale: `Building sustainable lifestyle habits that support training and recovery.`,
      expectedDelta: 10
    });
  }
  
  // If no specific phases, create generic ones based on scores
  if (phases.length === 0) {
    const ordered = [...scores.categories].sort((a, b) => a.score - b.score);
    ordered.slice(0, 3).forEach((cat, idx) => {
      const weeks = cat.id === 'movementQuality' ? 6 : cat.id === 'strength' ? 8 : 6;
      const basePotential = Math.min(100 - cat.score, 30);
      const expectedDelta = Math.round(Math.max(6, Math.min(18, basePotential * 0.5)));
      phases.push({
        title: `${cat.title} Focus`,
        weeks,
        focus: cat.weaknesses.length ? cat.weaknesses.slice(0, 3) : [cat.title],
        rationale: `Address ${cat.title.toLowerCase()} limitations to unlock performance and reduce injury risk.`,
        expectedDelta,
      });
    });
  }
  
  // Add consolidation phase if we have multiple phases
  if (phases.length > 1) {
    phases.push({
      title: 'Consolidation & Maintenance',
      weeks: 4,
      focus: ['Integrate improvements', 'Maintain consistency', 'Prepare for next phase'],
      rationale: 'Solidify gains and establish sustainable patterns before progressing.',
      expectedDelta: 5,
    });
  }
  
  return phases.slice(0, 5); // Max 5 phases
}


