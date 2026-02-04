import type { FormData } from '@/contexts/FormContext';
import { MOVEMENT_LOGIC_DB } from '../clinical-data';
import type { ScoreCategory, ScoreDetail } from './types';

export function scoreMovementQuality(form: FormData, age: number, gender: string): ScoreCategory {
  // 1. MOBILITY SCORING
  const mapMobility = (v: string) => (v === 'good' ? 100 : v === 'fair' ? 60 : v === 'poor' ? 30 : 0);

  const hasHip = !!(form.mobilityHip && form.mobilityHip.trim() !== '');
  const hasShoulder = !!(form.mobilityShoulder && form.mobilityShoulder.trim() !== '');
  // Support both new bilateral fields and legacy single field
  const hasAnkleLeft = !!(form.mobilityAnkleLeft && form.mobilityAnkleLeft.trim() !== '');
  const hasAnkleRight = !!(form.mobilityAnkleRight && form.mobilityAnkleRight.trim() !== '');
  const hasAnkleLegacy = !!(form.mobilityAnkle && form.mobilityAnkle.trim() !== '');

  const hipMob = hasHip ? mapMobility(form.mobilityHip) : 0;
  const shoulderMob = hasShoulder ? mapMobility(form.mobilityShoulder) : 0;

  // Calculate ankle mobility: use bilateral if available, otherwise fall back to legacy
  let ankleMob = 0;
  if (hasAnkleLeft || hasAnkleRight) {
    const ankleLeftMob = hasAnkleLeft ? mapMobility(form.mobilityAnkleLeft) : 0;
    const ankleRightMob = hasAnkleRight ? mapMobility(form.mobilityAnkleRight) : 0;
    const ankleScores = [ankleLeftMob, ankleRightMob].filter(s => s > 0);
    ankleMob = ankleScores.length > 0 ? Math.round(ankleScores.reduce((a, b) => a + b, 0) / ankleScores.length) : 0;
  } else if (hasAnkleLegacy) {
    ankleMob = mapMobility(form.mobilityAnkle);
  }

  const mobilityScores = [hipMob, shoulderMob, ankleMob].filter(s => s > 0);
  const mobilityScore = mobilityScores.length > 0
    ? Math.round(mobilityScores.reduce((a, b) => a + b, 0) / mobilityScores.length)
    : 0;

  // 2. POSTURE SCORING
  const scorePostureArray = (arr: string[] | string | undefined, map: Record<string, number> | ((v: string) => number)) => {
    if (!arr) return 0;
    const values = Array.isArray(arr) ? arr : [arr];
    if (values.length === 0) return 0;
    const scores = values.map(v => typeof map === 'function' ? map(v) : (map[v] ?? 0));
    return Math.min(...scores);
  };

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
    head = scorePostureArray(form.postureHeadOverall, neutralScore);
    shoulders = scorePostureArray(form.postureShouldersOverall, neutralScore);
    back = scorePostureArray(form.postureBackOverall, backMap);
    hips = scorePostureArray(form.postureHipsOverall, neutralScore);
    knees = scorePostureArray(form.postureKneesOverall, kneesMap);
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

  const ohsFields = [form.ohsShoulderMobility, form.ohsTorsoLean, form.ohsSquatDepth, form.ohsHipShift, form.ohsKneeAlignment, form.ohsFeetPosition];
  const ohsScores = ohsFields.map(getScore).filter(s => s > 0);
  const ohsScore = ohsScores.length > 0 ? ohsScores.reduce((a, b) => a + b, 0) / ohsScores.length : 0;

  const hingeFields = [form.hingeDepth, form.hingeBackRounding];
  const hingeScores = hingeFields.map(getScore).filter(s => s > 0);
  const hingeScore = hingeScores.length > 0 ? hingeScores.reduce((a, b) => a + b, 0) / hingeScores.length : 0;

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

  const headPos = Array.isArray(form.postureHeadOverall) ? form.postureHeadOverall : [form.postureHeadOverall];
  const shoulderPos = Array.isArray(form.postureShouldersOverall) ? form.postureShouldersOverall : [form.postureShouldersOverall];
  const hipPos = Array.isArray(form.postureHipsOverall) ? form.postureHipsOverall : [form.postureHipsOverall];
  const kneePos = Array.isArray(form.postureKneesOverall) ? form.postureKneesOverall : [form.postureKneesOverall];

  // Check for Upper Crossed Syndrome
  if (headPos.includes('forward-head') || shoulderPos.includes('rounded')) {
    const dev = MOVEMENT_LOGIC_DB.upper_crossed;
    stretches.push(dev.primaryStretch);
    activations.push(dev.primaryActivation);
    contraindications.push(...dev.contraindications);
  }

  // Check for Lower Crossed Syndrome
  if (hipPos.includes('anterior-tilt') || form.ohsTorsoLean === 'excessive-lean') {
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
  if (hipPos.includes('posterior-tilt') || form.hingeBackRounding === 'severe') {
    const dev = MOVEMENT_LOGIC_DB.posterior_pelvic_tilt;
    stretches.push(dev.primaryStretch);
    activations.push(dev.primaryActivation);
    contraindications.push(...dev.contraindications);
  }

  // Check for Feet Pronation
  if (form.ohsFeetPosition === 'pronation' || kneePos.includes('valgus-knee')) {
    const dev = MOVEMENT_LOGIC_DB.feet_pronation;
    stretches.push(dev.primaryStretch);
    activations.push(dev.primaryActivation);
    contraindications.push(...dev.contraindications);
  }

  // Check for Pain
  if (form.ohsHasPain === 'yes' || form.hingeHasPain === 'yes' || form.lungeHasPain === 'yes') {
    contraindications.push('Loaded movement in painful patterns');
  }

  const details: ScoreDetail[] = [
    { id: 'posture', label: 'Posture', value: postureScore > 0 ? 'Analyzed' : '-', score: postureScore },
    { id: 'movement', label: 'Movement', value: movementScore > 0 ? 'Patterns' : '-', score: movementScore },
    { id: 'mobility', label: 'Mobility', value: mobilityScore > 0 ? 'Joints' : '-', score: mobilityScore },
  ];

  const allCategoryScores = [postureScore, movementScore, mobilityScore].filter(s => s > 0);
  const score = allCategoryScores.length > 0
    ? Math.round(allCategoryScores.reduce((a, b) => a + b, 0) / allCategoryScores.length)
    : 0;

  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (postureScore >= 85) strengths.push('Elite-level postural alignment');
  else if (postureScore >= 70) strengths.push('Solid foundational alignment');

  if (movementScore >= 85) strengths.push('Exceptional control during dynamic movement');
  else if (movementScore >= 70) strengths.push('Reliable movement patterns');

  if (mobilityScore >= 85) strengths.push('Full functional range of motion in key joints');
  else if (mobilityScore >= 70) strengths.push('Good joint mobility baseline');

  const items = [
    { label: 'Postural Alignment', score: postureScore },
    { label: 'Movement Pattern Quality', score: movementScore },
    { label: 'Joint Mobility', score: mobilityScore }
  ].filter(i => i.score > 0).sort((a, b) => a.score - b.score);

  items.slice(0, 2).forEach(item => {
    if (item.score < 60) {
      weaknesses.push(`${item.label} identified as a movement bottleneck`);
    } else {
      weaknesses.push(`Refining ${item.label} to unlock further potential`);
    }
  });

  return {
    id: 'movementQuality',
    title: 'Movement Quality',
    score,
    details,
    strengths,
    weaknesses,
    stretches: Array.from(new Set(stretches)),
    activations: Array.from(new Set(activations)),
    contraindications: Array.from(new Set(contraindications))
  };
}
