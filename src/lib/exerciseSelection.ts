/**
 * Exercise Selection and Ranking Logic
 * 
 * Filters and ranks exercises from the database based on:
 * - Client goals
 * - Body composition (BMI, body fat, activity level)
 * - Movement issues (pain, mobility restrictions)
 * - Postural issues
 * - Asymmetries
 * - Gender
 * - Equipment preferences
 */

import type { FormData } from '@/contexts/FormContext';
import type { ScoreSummary } from './scoring';
import type { Exercise, GoalType, SessionType } from './exerciseDatabase';

export interface ClientProfile {
  goals: GoalType[];
  gender: string;
  bmi: number;
  bodyFatPct: number;
  sedentary: boolean;
  hasPain: {
    ohs: boolean;
    hinge: boolean;
    lunge: boolean;
  };
  mobilityIssues: {
    hip: boolean;
    ankle: boolean;
    shoulder: boolean;
  };
  posturalIssues: {
    forwardHead: boolean;
    roundedShoulders: boolean;
    kyphosis: boolean;
    lordosis: boolean;
    anteriorPelvicTilt: boolean;
    kneeValgus: boolean;
    headTilt: boolean;
  };
  asymmetries: {
    limbs: boolean;
    hips: boolean;
  };
}

export interface RankedExercise extends Exercise {
  rank: number;
  reason: string;
  sessionTypes: SessionType[];
}

/**
 * Movement pattern types to prevent redundancy
 * e.g. distinguishes between "Bench Press" (Horizontal) and "OHP" (Vertical)
 */
export type MovementPattern = 
  | 'squat' | 'lunge' | 'hinge' 
  | 'push_horizontal' | 'push_vertical' 
  | 'pull_vertical' | 'pull_horizontal' 
  | 'isolation' | 'carry' | 'core' | 'cardio' | 'mobility';

/**
 * Infer movement pattern to prevent redundancy
 * e.g. distinguishes between "Bench Press" (Horizontal) and "OHP" (Vertical)
 */
export function getMovementPattern(exercise: Exercise): MovementPattern {
  const name = exercise.name.toLowerCase();
  const parts = exercise.bodyParts;
  const types = exercise.sessionTypes;

  // Manual overrides for common complex moves
  if (name.includes('deadlift') && !name.includes('romanian')) return 'hinge';
  if (name.includes('squat')) return 'squat';
  if (name.includes('lunge') || name.includes('split squat') || name.includes('step-up')) return 'lunge';
  if (name.includes('bench') || name.includes('push-up')) return 'push_horizontal';
  if (name.includes('overhead') || name.includes('military') || name.includes('shoulder press')) return 'push_vertical';
  if (name.includes('pull-up') || name.includes('chin-up') || name.includes('lat pulldown')) return 'pull_vertical';
  if (name.includes('row')) return 'pull_horizontal';
  if (name.includes('carry') || name.includes('walk')) return 'carry';
  if (name.includes('plank') || name.includes('bug') || name.includes('crunch')) return 'core';
  
  // Fallbacks based on body parts
  if (parts.includes('shoulders') && types.includes('push')) return 'push_vertical';
  if (parts.includes('chest') && types.includes('push')) return 'push_horizontal';
  if (parts.includes('back') && types.includes('pull')) return 'pull_horizontal'; // Default to row if unsure
  if (parts.includes('legs')) return 'squat';
  
  return 'isolation';
}

/**
 * Build client profile from FormData and scores
 */
export function buildClientProfile(form: FormData, scores: ScoreSummary): ClientProfile {
  const goals = Array.isArray(form.clientGoals) ? form.clientGoals : [];
  const gender = (form.gender || '').toLowerCase();
  const weight = parseFloat(form.inbodyWeightKg || '0');
  const height = (parseFloat(form.heightCm || '0') || 0) / 100;
  const bmi = height > 0 ? weight / (height * height) : 0;
  const bodyFatPct = parseFloat(form.inbodyBodyFatPct || '0');
  
  // Determine if sedentary (low activity level or low steps)
  const activityLevel = form.activityLevel || '';
  const stepsPerDay = parseFloat(form.stepsPerDay || '0');
  const sedentary = activityLevel === 'sedentary' || stepsPerDay < 5000;
  
  // Pain detection
  const hasPain = {
    ohs: form.ohsHasPain === 'yes',
    hinge: form.hingeHasPain === 'yes',
    lunge: form.lungeHasPain === 'yes',
  };
  
  // Mobility issues from movement quality scores and posture
  const movementScore = scores.categories.find(c => c.id === 'movementQuality')?.score || 0;
  const hasMobilityIssues = movementScore < 70;
  
  // Posture issues
  const postureResults = form.postureAiResults;
  let forwardHead = false;
  let roundedShoulders = false;
  let kyphosis = false;
  let lordosis = false;
  let anteriorPelvicTilt = false;
  let kneeValgus = false;
  let headTilt = false;
  
  if (postureResults) {
    const views = ['front', 'side-left', 'back', 'side-right'] as const;
    for (const view of views) {
      const analysis = postureResults[view];
      if (!analysis) continue;
      
      if (analysis.forward_head?.deviation_degrees > 10) forwardHead = true;
      if (analysis.head_alignment?.tilt_degrees > 5) headTilt = true;
      if (analysis.kyphosis?.curve_degrees > 45) kyphosis = true;
      if (analysis.pelvic_tilt?.status === 'Anterior Tilt') anteriorPelvicTilt = true;
      if (analysis.spinal_curvature) lordosis = true;
    }
  }
  
  // Check manual posture assessments
  const headPos = Array.isArray(form.postureHeadOverall) ? form.postureHeadOverall : [form.postureHeadOverall];
  const shoulderPos = Array.isArray(form.postureShouldersOverall) ? form.postureShouldersOverall : [form.postureShouldersOverall];
  const backPos = Array.isArray(form.postureBackOverall) ? form.postureBackOverall : [form.postureBackOverall];
  const hipPos = Array.isArray(form.postureHipsOverall) ? form.postureHipsOverall : [form.postureHipsOverall];
  const kneePos = Array.isArray(form.postureKneesOverall) ? form.postureKneesOverall : [form.postureKneesOverall];
  
  if (headPos.some(p => p === 'forward-head')) forwardHead = true;
  if (shoulderPos.some(p => p === 'rounded')) roundedShoulders = true;
  if (backPos.some(p => p === 'increased-kyphosis')) kyphosis = true;
  if (backPos.some(p => p === 'increased-lordosis')) lordosis = true;
  if (hipPos.some(p => p === 'anterior-tilt')) anteriorPelvicTilt = true;
  if (kneePos.some(p => p === 'caves-inward')) kneeValgus = true;
  
  // Asymmetry detection
  const ra = parseFloat(form.segmentalArmRightKg || '0');
  const la = parseFloat(form.segmentalArmLeftKg || '0');
  const rl = parseFloat(form.segmentalLegRightKg || '0');
  const ll = parseFloat(form.segmentalLegLeftKg || '0');
  const armDiff = (ra > 0 && la > 0) ? Math.abs(ra - la) / Math.max(ra, la) : 0;
  const legDiff = (rl > 0 && ll > 0) ? Math.abs(rl - ll) / Math.max(rl, ll) : 0;
  const hasLimbAsymmetry = armDiff > 0.1 || legDiff > 0.1;
  
  // Hip instability from lunge assessment
  const lungeLeftHip = form.lungeLeftTorso;
  const lungeRightHip = form.lungeRightTorso;
  const hasHipInstability = (lungeLeftHip && lungeLeftHip !== 'neutral') || (lungeRightHip && lungeRightHip !== 'neutral');
  
  // Mobility restrictions from movement assessments
  // ohsSquatDepth: 'full-depth' | 'parallel' | 'quarter-depth' | 'no-depth'
  // ohsShoulderMobility: 'full-range' | 'compensated' | 'limited'
  // hingeDepth: 'excellent' | 'good' | 'fair' | 'poor'
  const ankleMobility = form.ohsSquatDepth === 'quarter-depth' || form.ohsSquatDepth === 'no-depth';
  const shoulderMobility = form.ohsShoulderMobility === 'limited' || form.ohsShoulderMobility === 'compensated';
  const hipMobility = form.hingeDepth === 'poor' || form.hingeDepth === 'fair';
  
  return {
    goals: (goals || []) as GoalType[],
    gender,
    bmi,
    bodyFatPct,
    sedentary,
    hasPain,
    mobilityIssues: {
      hip: hipMobility || hasMobilityIssues,
      ankle: ankleMobility || hasMobilityIssues,
      shoulder: shoulderMobility || hasMobilityIssues,
    },
    posturalIssues: {
      forwardHead,
      roundedShoulders,
      kyphosis,
      lordosis,
      anteriorPelvicTilt,
      kneeValgus,
      headTilt,
    },
    asymmetries: {
      limbs: hasLimbAsymmetry,
      hips: hasHipInstability,
    },
  };
}

/**
 * Check if exercise should be excluded for this client
 */
function isExcluded(exercise: Exercise, profile: ClientProfile): string | null {
  // Body composition exclusions
  if (exercise.exclusions?.bodyComp) {
    const bc = exercise.exclusions.bodyComp;
    if (bc.maxBMI && profile.bmi > bc.maxBMI) {
      return `BMI (${profile.bmi.toFixed(1)}) exceeds limit (${bc.maxBMI})`;
    }
    if (bc.maxBodyFat && profile.bodyFatPct > bc.maxBodyFat) {
      return `Body fat (${profile.bodyFatPct.toFixed(1)}%) exceeds limit (${bc.maxBodyFat}%)`;
    }
    if (bc.sedentary && profile.sedentary) {
      return 'Client is sedentary';
    }
  }
  
  // Movement pain exclusions
  if (exercise.exclusions?.movement) {
    if (exercise.exclusions.movement.includes('ohs-pain') && profile.hasPain.ohs) {
      return 'Pain reported during overhead squat';
    }
    if (exercise.exclusions.movement.includes('hinge-pain') && profile.hasPain.hinge) {
      return 'Pain reported during hip hinge';
    }
    if (exercise.exclusions.movement.includes('lunge-pain') && profile.hasPain.lunge) {
      return 'Pain reported during lunge';
    }
  }
  
  // Mobility exclusions
  if (exercise.exclusions?.mobility) {
    if (exercise.exclusions.mobility.includes('poor-ankle-mobility') && profile.mobilityIssues.ankle) {
      return 'Poor ankle mobility';
    }
    if (exercise.exclusions.mobility.includes('poor-shoulder-mobility') && profile.mobilityIssues.shoulder) {
      return 'Poor shoulder mobility';
    }
    if (exercise.exclusions.mobility.includes('poor-hip-mobility') && profile.mobilityIssues.hip) {
      return 'Poor hip mobility';
    }
  }
  
  return null;
}

/**
 * Calculate exercise relevance score (0-100)
 * Higher score = more relevant for this client
 */
function calculateRelevance(exercise: Exercise, profile: ClientProfile, primaryGoal: GoalType): number {
  let score = 0;
  
  // Goal alignment (40 points max)
  if (exercise.goals.includes(primaryGoal)) {
    score += 40;
  } else if (exercise.goals.some(g => profile.goals.includes(g))) {
    score += 20; // Secondary goal match
  }
  
  // Issue addressing (30 points max)
  if (exercise.addresses) {
    let issueScore = 0;
    const maxIssueScore = 30;
    const issuesPerPoint = maxIssueScore / 10; // ~3 points per addressed issue
    
    if (exercise.addresses.postural) {
      for (const issue of exercise.addresses.postural) {
        if (issue === 'forward-head' && profile.posturalIssues.forwardHead) issueScore += issuesPerPoint;
        if (issue === 'rounded-shoulders' && profile.posturalIssues.roundedShoulders) issueScore += issuesPerPoint;
        if (issue === 'kyphosis' && profile.posturalIssues.kyphosis) issueScore += issuesPerPoint;
        if (issue === 'lordosis' && profile.posturalIssues.lordosis) issueScore += issuesPerPoint;
        if (issue === 'anterior-pelvic-tilt' && profile.posturalIssues.anteriorPelvicTilt) issueScore += issuesPerPoint;
        if (issue === 'knee-valgus' && profile.posturalIssues.kneeValgus) issueScore += issuesPerPoint;
        if (issue === 'head-tilt' && profile.posturalIssues.headTilt) issueScore += issuesPerPoint;
      }
    }
    
    if (exercise.addresses.mobility) {
      for (const issue of exercise.addresses.mobility) {
        if (issue === 'hip-mobility' && profile.mobilityIssues.hip) issueScore += issuesPerPoint;
        if (issue === 'ankle-mobility' && profile.mobilityIssues.ankle) issueScore += issuesPerPoint;
        if (issue === 'shoulder-mobility' && profile.mobilityIssues.shoulder) issueScore += issuesPerPoint;
      }
    }
    
    if (exercise.addresses.asymmetry) {
      for (const issue of exercise.addresses.asymmetry) {
        if (issue === 'limb-asymmetry' && profile.asymmetries.limbs) issueScore += issuesPerPoint;
        if (issue === 'hip-instability' && profile.asymmetries.hips) issueScore += issuesPerPoint;
      }
    }
    
    score += Math.min(issueScore, maxIssueScore);
  }
  
  // Preference bonuses (20 points max)
  if (exercise.preference?.whenPreferred) {
    const pref = exercise.preference.whenPreferred;
    if (pref.goal && pref.goal === primaryGoal) {
      score += 20; // Goal match is strong preference signal
    }
  }
  
  // Preference penalties (-20 points max)
  if (exercise.preference?.whenNotPreferred) {
    const pref = exercise.preference.whenNotPreferred;
    if (pref.goal && pref.goal === primaryGoal) {
      score -= 10;
    }
    if (pref.hasIssues) {
      for (const issue of pref.hasIssues) {
        if (issue === 'limb-asymmetry' && profile.asymmetries.limbs) score -= 5;
        if (issue === 'rounded-shoulders' && profile.posturalIssues.roundedShoulders) score -= 5;
        if (issue === 'poor-shoulder-mobility' && profile.mobilityIssues.shoulder) score -= 5;
        if (issue === 'poor-ankle-mobility' && profile.mobilityIssues.ankle) score -= 5;
        if (issue === 'knee-valgus' && profile.posturalIssues.kneeValgus) score -= 5;
      }
    }
  }
  
  // Gender suitability (10 points max)
  if (exercise.genderSuitability === 'all') {
    score += 10;
  } else if (exercise.genderSuitability === 'male-preferred' && profile.gender === 'male') {
    score += 10;
  } else if (exercise.genderSuitability === 'female-preferred' && profile.gender === 'female') {
    score += 10;
  } else {
    score += 5; // Still usable but not ideal
  }
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Generate reason why this exercise is recommended
 */
function generateReason(exercise: Exercise, profile: ClientProfile, relevance: number): string {
  const reasons: string[] = [];
  
  // Goal alignment
  const primaryGoal = profile.goals[0];
  if (exercise.goals.includes(primaryGoal)) {
    reasons.push(`Supports ${primaryGoal.replace('-', ' ')} goal`);
  }
  
  // Issue addressing
  if (exercise.addresses) {
    if (exercise.addresses.postural) {
      for (const issue of exercise.addresses.postural) {
        if (issue === 'forward-head' && profile.posturalIssues.forwardHead) reasons.push('Corrects forward head');
        if (issue === 'rounded-shoulders' && profile.posturalIssues.roundedShoulders) reasons.push('Corrects rounded shoulders');
        if (issue === 'kyphosis' && profile.posturalIssues.kyphosis) reasons.push('Addresses kyphosis');
        if (issue === 'lordosis' && profile.posturalIssues.lordosis) reasons.push('Addresses lordosis');
        if (issue === 'anterior-pelvic-tilt' && profile.posturalIssues.anteriorPelvicTilt) reasons.push('Corrects anterior pelvic tilt');
        if (issue === 'knee-valgus' && profile.posturalIssues.kneeValgus) reasons.push('Improves knee alignment');
        if (issue === 'head-tilt' && profile.posturalIssues.headTilt) reasons.push('Corrects head tilt');
      }
    }
    
    if (exercise.addresses.asymmetry) {
      for (const issue of exercise.addresses.asymmetry) {
        if (issue === 'limb-asymmetry' && profile.asymmetries.limbs) reasons.push('Corrects limb asymmetry');
        if (issue === 'hip-instability' && profile.asymmetries.hips) reasons.push('Improves hip stability');
      }
    }
    
    if (exercise.addresses.mobility) {
      for (const issue of exercise.addresses.mobility) {
        if (issue === 'hip-mobility' && profile.mobilityIssues.hip) reasons.push('Improves hip mobility');
        if (issue === 'ankle-mobility' && profile.mobilityIssues.ankle) reasons.push('Improves ankle mobility');
        if (issue === 'shoulder-mobility' && profile.mobilityIssues.shoulder) reasons.push('Improves shoulder mobility');
      }
    }
  }
  
  return reasons.length > 0 ? reasons.join(', ') : 'General exercise';
}

/**
 * Get filtered and ranked exercises for a client
 * Uses dynamic import to lazy-load the exercise database
 */
export async function getRankedExercises(
  profile: ClientProfile,
  category: 'warm-up' | 'workout' | 'cardio',
  sessionType?: SessionType
): Promise<RankedExercise[]> {
  // Dynamic import to avoid loading large exercise database at app startup
  const { ALL_EXERCISES } = await import('./exerciseDatabase');
  
  const primaryGoal = profile.goals[0] || 'general-health';
  
  // Filter by category
  let candidates = ALL_EXERCISES.filter(ex => ex.category === category);
  
  // Filter by session type if specified
  if (sessionType) {
    candidates = candidates.filter(ex => ex.sessionTypes.includes(sessionType));
  }
  
  // Remove excluded exercises
  const valid: RankedExercise[] = [];
  for (const exercise of candidates) {
    const exclusionReason = isExcluded(exercise, profile);
    if (exclusionReason) continue; // Skip excluded exercises
    
    const relevance = calculateRelevance(exercise, profile, primaryGoal);
    const reason = generateReason(exercise, profile, relevance);
    
    valid.push({
      ...exercise,
      rank: relevance,
      reason,
    });
  }
  
  // Sort by rank (highest first)
  valid.sort((a, b) => b.rank - a.rank);
  
  return valid;
}

/**
 * Get exercises organized by session type
 */
export async function getExercisesBySession(
  profile: ClientProfile,
  category: 'warm-up' | 'workout' | 'cardio'
): Promise<Record<SessionType, RankedExercise[]>> {
  const sessionTypes: SessionType[] = ['pull', 'push', 'legs', 'upper-body', 'lower-body', 'full-body', 'cardio', 'warm-up'];
  const result: Record<string, RankedExercise[]> = {};
  
  for (const sessionType of sessionTypes) {
    result[sessionType] = await getRankedExercises(profile, category, sessionType);
  }
  
  return result as Record<SessionType, RankedExercise[]>;
}

