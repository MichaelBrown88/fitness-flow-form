/**
 * Cadence Recommendation Engine
 * 
 * Generates smart re-test schedules based on:
 * 1. Clinical baselines (ACSM/NASM aligned)
 * 2. Client goals (weight loss, muscle gain, etc.)
 * 3. Assessment findings (visceral fat, knee valgus, etc.)
 * 4. Pillar scores (low scores trigger more frequent retests)
 * 
 * This logic is intentionally separated from React components
 * for testability and reuse.
 */

import type { FormData } from '@/contexts/FormContext';
import type { ScoreSummary, ScoreCategory } from '@/lib/scoring/types';
import type {
  PillarCadence,
  CadenceConfig,
  PartialAssessmentCategory
} from '@/types/client';
import {
  BASE_CADENCE_INTERVALS,
  CADENCE_SCORE_THRESHOLDS
} from '@/types/client';
import type { DefaultCadenceConfig } from '@/services/organizations';

/**
 * Input options for cadence generation
 */
export interface CadenceGenerationOptions {
  formData: FormData;
  scores: ScoreSummary;
  orgDefaults?: DefaultCadenceConfig;
}

/**
 * Output of the cadence recommendation engine
 */
export interface CadenceRecommendationResult {
  schedule: PillarCadence;
  warnings: CadenceWarning[];
}

export interface CadenceWarning {
  pillar: PartialAssessmentCategory;
  type: 'hydration' | 'critical_finding' | 'multiple_flags';
  message: string;
}

/**
 * Mapping from score category IDs to partial assessment categories
 */
const SCORE_TO_PILLAR_MAP: Record<string, PartialAssessmentCategory> = {
  'bodyComp': 'inbody',
  'movementQuality': 'posture',
  'cardio': 'fitness',
  'strength': 'strength',
  'lifestyle': 'lifestyle',
};

/**
 * Generate recommended retest cadence based on assessment data
 * Supports both legacy signature (formData, scores) and new options object
 */
export function generateCadenceRecommendations(
  formDataOrOptions: FormData | CadenceGenerationOptions,
  scores?: ScoreSummary
): CadenceRecommendationResult {
  // Support both old and new signatures for backwards compatibility
  const options: CadenceGenerationOptions = 'formData' in formDataOrOptions
    ? formDataOrOptions
    : { formData: formDataOrOptions, scores: scores! };

  const { formData, scores: scoreData, orgDefaults } = options;
  const warnings: CadenceWarning[] = [];

  // 1. Establish base intervals: org defaults if enabled, otherwise clinical baselines
  const baseIntervals = orgDefaults?.enabled
    ? orgDefaults.intervals
    : BASE_CADENCE_INTERVALS;

  const baseReason = orgDefaults?.enabled
    ? 'Organization default schedule'
    : undefined;

  const schedule: PillarCadence = {
    inbody: createBaseCadence('inbody', baseReason ?? 'Standard monthly tracking', baseIntervals),
    posture: createBaseCadence('posture', baseReason ?? 'Standard corrective block (4-6 weeks)', baseIntervals),
    fitness: createBaseCadence('fitness', baseReason ?? 'Standard adaptation block', baseIntervals),
    strength: createBaseCadence('strength', baseReason ?? 'Standard hypertrophy block', baseIntervals),
    lifestyle: createBaseCadence('lifestyle', baseReason ?? 'Lifestyle factor reassessment', baseIntervals),
  };

  // 2. Apply Score-Based Modifiers
  applyScoreModifiers(schedule, scoreData);

  // 3. Apply Goal-Based Adjustments
  applyGoalModifiers(schedule, formData, warnings);

  // 4. Apply Finding-Based Overrides (Critical Path - highest priority)
  applyFindingOverrides(schedule, formData, scoreData, warnings);

  return { schedule, warnings };
}

/**
 * Create a base cadence config for a pillar
 */
function createBaseCadence(
  pillar: PartialAssessmentCategory,
  reason: string,
  intervals: Record<PartialAssessmentCategory, number> = BASE_CADENCE_INTERVALS
): CadenceConfig {
  return {
    intervalDays: intervals[pillar],
    priority: 'medium',
    reason,
  };
}

/**
 * Apply score-based modifiers to cadence intervals
 * Low scores = more frequent testing
 * High scores = less frequent testing
 */
function applyScoreModifiers(
  schedule: PillarCadence,
  scores: ScoreSummary
): void {
  for (const category of scores.categories) {
    const pillar = SCORE_TO_PILLAR_MAP[category.id];
    if (!pillar || !schedule[pillar]) continue;

    const current = schedule[pillar];
    const { critical, needsWork, strong } = CADENCE_SCORE_THRESHOLDS;

    if (category.score < critical) {
      // Critical: reduce by 50%
      schedule[pillar] = {
        ...current,
        intervalDays: Math.round(current.intervalDays * 0.5),
        priority: 'high',
        reason: `Critical ${category.title} score (${category.score}%) requires close monitoring`,
      };
    } else if (category.score < needsWork) {
      // Needs work: reduce by 25%
      schedule[pillar] = {
        ...current,
        intervalDays: Math.round(current.intervalDays * 0.75),
        priority: 'medium',
        reason: `${category.title} score (${category.score}%) needs attention`,
      };
    } else if (category.score >= strong) {
      // Strong: extend by 25%
      schedule[pillar] = {
        ...current,
        intervalDays: Math.round(current.intervalDays * 1.25),
        priority: 'low',
        reason: `Strong ${category.title} score (${category.score}%) - maintenance schedule`,
      };
    }
  }
}

/**
 * Apply goal-based adjustments to cadence
 */
function applyGoalModifiers(
  schedule: PillarCadence,
  formData: FormData,
  warnings: CadenceWarning[]
): void {
  const goals = formData.clientGoals || [];

  // Weight loss: Aggressive InBody tracking
  if (goals.includes('weight-loss')) {
    schedule.inbody = {
      intervalDays: 14,
      priority: 'high',
      reason: 'Weight loss goal - track body composition changes closely',
    };
    warnings.push({
      pillar: 'inbody',
      type: 'hydration',
      message: 'Frequent scanning may reflect hydration changes. Look for 4-week trends.',
    });
  }

  // Build muscle: More frequent strength + InBody
  if (goals.includes('build-muscle')) {
    if (schedule.inbody.intervalDays > 21) {
      schedule.inbody = {
        ...schedule.inbody,
        intervalDays: 21,
        reason: 'Muscle building goal - monitor lean mass changes',
      };
    }
    if (schedule.strength.intervalDays > 45) {
      schedule.strength = {
        ...schedule.strength,
        intervalDays: 45,
        reason: 'Muscle building goal - track strength progression',
      };
    }
  }

  // Improve fitness: More frequent cardio testing
  if (goals.includes('improve-fitness')) {
    if (schedule.fitness.intervalDays > 30) {
      schedule.fitness = {
        ...schedule.fitness,
        intervalDays: 30,
        priority: 'high',
        reason: 'Fitness improvement goal - track cardiovascular adaptation',
      };
    }
  }

  // Build strength: More frequent strength testing
  if (goals.includes('build-strength')) {
    if (schedule.strength.intervalDays > 45) {
      schedule.strength = {
        ...schedule.strength,
        intervalDays: 45,
        priority: 'high',
        reason: 'Strength building goal - track progression',
      };
    }
  }

  // Body recomposition: Balanced approach
  if (goals.includes('body-recomposition')) {
    if (schedule.inbody.intervalDays > 21) {
      schedule.inbody = {
        ...schedule.inbody,
        intervalDays: 21,
        reason: 'Body recomposition goal - monitor fat loss and muscle gain',
      };
    }
    if (schedule.strength.intervalDays > 45) {
      schedule.strength = {
        ...schedule.strength,
        intervalDays: 45,
        reason: 'Body recomposition goal - track strength while cutting',
      };
    }
  }
}

/**
 * Apply finding-based overrides (highest priority)
 * These override previous settings when critical findings are detected
 */
function applyFindingOverrides(
  schedule: PillarCadence,
  formData: FormData,
  scores: ScoreSummary,
  warnings: CadenceWarning[]
): void {
  // Visceral Fat > 10 (Metabolic Emergency)
  const visceralFat = parseFloat(formData.visceralFatLevel || '0');
  if (visceralFat > 10) {
    schedule.inbody = {
      intervalDays: 14,
      priority: 'high',
      reason: `Elevated visceral fat (${visceralFat}) - metabolic risk monitoring`,
    };
    warnings.push({
      pillar: 'inbody',
      type: 'critical_finding',
      message: `Visceral fat level ${visceralFat} indicates metabolic risk. Close monitoring recommended.`,
    });
  }

  // Knee Valgus/Varus (Injury Risk)
  if (formData.ohsKneeAlignment === 'valgus' || formData.ohsKneeAlignment === 'varus') {
    schedule.posture = {
      intervalDays: 28, // 4 weeks for motor control issues
      priority: 'high',
      reason: `Knee ${formData.ohsKneeAlignment} detected - corrective exercise monitoring`,
    };
    warnings.push({
      pillar: 'posture',
      type: 'critical_finding',
      message: `Knee ${formData.ohsKneeAlignment} is a motor control issue that can improve in 3-4 weeks with proper cueing.`,
    });
  }

  // Limb Imbalance > 6% (affects both InBody and Strength)
  const limbImbalance = calculateLimbImbalance(formData);
  if (limbImbalance.hasImbalance) {
    // Don't reduce below existing if already short
    if (schedule.strength.intervalDays > 45) {
      schedule.strength = {
        ...schedule.strength,
        intervalDays: 45,
        reason: `Limb imbalance detected (${limbImbalance.details}) - monitor correction`,
      };
    }
  }

  // Poor Mobility (any joint marked 'poor')
  const hasPoorMobility = checkPoorMobility(formData);
  if (hasPoorMobility.detected) {
    if (schedule.posture.intervalDays > 35) {
      schedule.posture = {
        ...schedule.posture,
        intervalDays: 35,
        reason: `Poor mobility detected (${hasPoorMobility.joints.join(', ')}) - track improvement`,
      };
    }
  }

  // Forward Head / Rounded Shoulders
  const hasPosturalIssues = checkPosturalIssues(formData);
  if (hasPosturalIssues.detected) {
    if (schedule.posture.intervalDays > 35) {
      schedule.posture = {
        ...schedule.posture,
        intervalDays: 35,
        reason: `Postural issues detected (${hasPosturalIssues.issues.join(', ')}) - corrective tracking`,
      };
    }
  }

  // Poor Recovery HR (cardio fitness concern)
  const hasCardioRisk = checkCardioRisk(formData, scores);
  if (hasCardioRisk) {
    if (schedule.fitness.intervalDays > 35) {
      schedule.fitness = {
        ...schedule.fitness,
        intervalDays: 35,
        priority: 'high',
        reason: 'Poor cardiovascular recovery - monitor fitness improvements',
      };
    }
  }

  // Low Grip Strength (functional strength marker)
  const hasLowGrip = checkLowGripStrength(formData);
  if (hasLowGrip) {
    if (schedule.strength.intervalDays > 45) {
      schedule.strength = {
        ...schedule.strength,
        intervalDays: 45,
        reason: 'Low grip strength detected - monitor functional strength',
      };
    }
  }
}

/**
 * Calculate limb imbalance from segmental analysis
 */
function calculateLimbImbalance(formData: FormData): { hasImbalance: boolean; details: string } {
  const armRight = parseFloat(formData.segmentalArmRightKg || '0');
  const armLeft = parseFloat(formData.segmentalArmLeftKg || '0');
  const legRight = parseFloat(formData.segmentalLegRightKg || '0');
  const legLeft = parseFloat(formData.segmentalLegLeftKg || '0');

  const issues: string[] = [];

  // Check arm imbalance
  if (armRight > 0 && armLeft > 0) {
    const armDiff = Math.abs(armRight - armLeft) / Math.max(armRight, armLeft) * 100;
    if (armDiff > 6) {
      issues.push(`arms ${armDiff.toFixed(1)}%`);
    }
  }

  // Check leg imbalance
  if (legRight > 0 && legLeft > 0) {
    const legDiff = Math.abs(legRight - legLeft) / Math.max(legRight, legLeft) * 100;
    if (legDiff > 6) {
      issues.push(`legs ${legDiff.toFixed(1)}%`);
    }
  }

  return {
    hasImbalance: issues.length > 0,
    details: issues.join(', '),
  };
}

/**
 * Check for poor mobility in any joint
 */
function checkPoorMobility(formData: FormData): { detected: boolean; joints: string[] } {
  const joints: string[] = [];

  if (formData.mobilityHip === 'poor') joints.push('hip');
  if (formData.mobilityShoulder === 'poor') joints.push('shoulder');
  if (formData.mobilityAnkleLeft === 'poor' || formData.mobilityAnkleRight === 'poor') {
    joints.push('ankle');
  }

  return { detected: joints.length > 0, joints };
}

/**
 * Check for postural issues (forward head, rounded shoulders)
 */
function checkPosturalIssues(formData: FormData): { detected: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check AI or manual posture results
  if (formData.postureForwardHead === 'yes' || formData.postureForwardHead === 'moderate' || formData.postureForwardHead === 'severe') {
    issues.push('forward head');
  }
  if (formData.postureRoundedShoulders === 'yes' || formData.postureRoundedShoulders === 'moderate' || formData.postureRoundedShoulders === 'severe') {
    issues.push('rounded shoulders');
  }

  // Check array-based posture findings
  if (formData.postureHeadOverall?.includes('forward-head')) {
    issues.push('forward head');
  }
  if (formData.postureShouldersOverall?.includes('rounded') || formData.postureShouldersOverall?.includes('protracted')) {
    issues.push('rounded shoulders');
  }

  // Deduplicate
  return { detected: issues.length > 0, issues: [...new Set(issues)] };
}

/**
 * Check for cardiovascular risk indicators
 */
function checkCardioRisk(formData: FormData, scores: ScoreSummary): boolean {
  // Check recovery HR (higher is worse - indicates poor fitness)
  const post1MinHr = parseFloat(formData.cardioPost1MinHr || '0');
  const peakHr = parseFloat(formData.cardioPeakHr || '0');
  
  if (post1MinHr > 0 && peakHr > 0) {
    const recoveryDrop = peakHr - post1MinHr;
    // Less than 12 BPM drop in first minute is concerning
    if (recoveryDrop < 12) {
      return true;
    }
  }

  // Also check if cardio score is in critical range
  const cardioCategory = scores.categories.find(c => c.id === 'cardio');
  if (cardioCategory && cardioCategory.score < CADENCE_SCORE_THRESHOLDS.critical) {
    return true;
  }

  return false;
}

/**
 * Check for low grip strength
 */
function checkLowGripStrength(formData: FormData): boolean {
  const gripLeft = parseFloat(formData.gripLeftKg || '0');
  const gripRight = parseFloat(formData.gripRightKg || '0');
  
  if (gripLeft === 0 && gripRight === 0) return false;
  
  const avgGrip = (gripLeft + gripRight) / 2;
  const gender = (formData.gender || '').toLowerCase();
  
  // Thresholds based on general population norms
  const threshold = gender === 'female' ? 20 : 35;
  
  return avgGrip < threshold;
}

/**
 * Get the effective interval for a pillar, considering custom overrides
 */
export function getEffectiveInterval(
  recommended: PillarCadence | undefined,
  custom: Partial<PillarCadence> | undefined,
  pillar: PartialAssessmentCategory
): number {
  // Priority: custom > recommended > fallback
  return custom?.[pillar]?.intervalDays 
    ?? recommended?.[pillar]?.intervalDays 
    ?? BASE_CADENCE_INTERVALS[pillar];
}

/**
 * Get the reason for a pillar's cadence
 */
export function getEffectiveReason(
  recommended: PillarCadence | undefined,
  custom: Partial<PillarCadence> | undefined,
  pillar: PartialAssessmentCategory
): string {
  return custom?.[pillar]?.reason 
    ?? recommended?.[pillar]?.reason 
    ?? 'Scheduled retest';
}

/**
 * Get the priority for a pillar
 */
export function getEffectivePriority(
  recommended: PillarCadence | undefined,
  custom: Partial<PillarCadence> | undefined,
  pillar: PartialAssessmentCategory
): 'high' | 'medium' | 'low' {
  return custom?.[pillar]?.priority 
    ?? recommended?.[pillar]?.priority 
    ?? 'medium';
}
