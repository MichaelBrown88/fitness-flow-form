/**
 * Functional Strength Gap Analysis
 * Calculates performance targets and gaps for functional strength assessment
 */

import type { PillarRole } from '@/lib/goals/goalContext';
import {
  classifyFunctionalTotalReps,
  classifyPlankSeconds,
} from '@/lib/goals/metricBands';
import { computeHigherIsBetterTarget } from '@/lib/goals/targetStrategy';

export interface FunctionalGapsOptions {
  pillarRole?: PillarRole;
}

export interface FunctionalGapsResult {
  endurance: {
    current: number;
    target: number;
    gap: number;
  };
  core: {
    current: number;
    target: number;
    gap: number;
  };
  strength?: {
    current: number;
    target: number;
    gap: number;
    method?: 'dynamometer' | 'deadhang' | 'pinch' | null;
    currentTime?: number;
    targetTime?: number;
  };
  contextualInsight?: string;
}

/**
 * Calculate functional strength gaps
 * 
 * @param gender - 'male' or 'female'
 * @param bodyWeight - Body weight in kg
 * @param currentPushUps - Current pushup reps
 * @param currentSquats - Current squat reps
 * @param currentPlankTime - Current plank time in seconds
 * @param currentGripStrength - Current grip strength in kg (normalized from any method), optional
 * @param currentGripTime - Current grip time in seconds (for deadhang or pinch), optional
 * @param gripMethod - 'dynamometer' | 'deadhang' | 'pinch' | null
 * @param ambitionLevel - 'health' | 'active' | 'athletic' | 'elite'
 * @param trainingStyle - User's primary training style (optional)
 * @returns Object with endurance, core, and optionally strength gaps
 */
export function calculateFunctionalGaps(
  gender: 'male' | 'female',
  bodyWeight: number,
  currentPushUps: number,
  currentSquats: number,
  currentPlankTime: number,
  currentGripStrength?: number,
  currentGripTime?: number,
  gripMethod?: 'dynamometer' | 'deadhang' | 'pinch' | null,
  _ambitionLevel: 'health' | 'active' | 'athletic' | 'elite' = 'active',
  trainingStyle?: string,
  options?: FunctionalGapsOptions,
): FunctionalGapsResult {
  const role: PillarRole = options?.pillarRole ?? 'primary';

  const currentTotal = currentPushUps + currentSquats;
  const enduranceBand = classifyFunctionalTotalReps(currentTotal, gender);
  const enduranceResult = computeHigherIsBetterTarget(currentTotal, role, enduranceBand, {
    minStep: 5,
    maxCap: gender === 'male' ? 120 : 90,
  });
  const enduranceTarget = Math.ceil(enduranceResult.target);
  const enduranceGap = enduranceResult.gap;

  const coreBand = classifyPlankSeconds(currentPlankTime);
  const coreResult = computeHigherIsBetterTarget(currentPlankTime, role, coreBand, {
    minStep: 10,
    maxCap: 180,
  });
  const coreTarget = Math.ceil(coreResult.target);
  const coreGap = coreResult.gap;

  // 3. OVERALL STRENGTH (Grip Force) - Optional
  // Standardized formula works for all three methods: dynamometer (kg), deadhang (time), pinch (time)
  let strengthResult: { 
    current: number; 
    target: number; 
    gap: number; 
    method?: 'dynamometer' | 'deadhang' | 'pinch' | null; 
    currentTime?: number; 
    targetTime?: number 
  } | undefined;
  
  if (currentGripStrength !== undefined && currentGripStrength > 0 && bodyWeight > 0) {
    const goldStandardStrength = bodyWeight * (gender === 'male' ? 0.6 : 0.4);
    const gripBand =
      currentGripStrength >= goldStandardStrength * 0.9
        ? 'strong'
        : currentGripStrength >= goldStandardStrength * 0.65
          ? 'adequate'
          : currentGripStrength >= goldStandardStrength * 0.4
            ? 'weak'
            : 'critical';
    const gripResult = computeHigherIsBetterTarget(currentGripStrength, role, gripBand, {
      minStep: 2,
      maxCap: goldStandardStrength * 1.15,
    });
    const strengthTarget = gripResult.target;
    const strengthGap = gripResult.gap;
    
    // For time-based methods, calculate target time
    let targetTime: number | undefined;
    if (gripMethod === 'deadhang' && currentGripTime !== undefined) {
      // Deadhang: target time based on normalized strength improvement
      // Formula: target_time ≈ current_time × (target_strength / current_strength)
      const timeMultiplier = strengthTarget / currentGripStrength;
      targetTime = Math.ceil(currentGripTime * timeMultiplier);
    } else if (gripMethod === 'pinch' && currentGripTime !== undefined) {
      // Pinch: target time based on normalized strength improvement
      // Same formula as deadhang
      const timeMultiplier = strengthTarget / currentGripStrength;
      targetTime = Math.ceil(currentGripTime * timeMultiplier);
    }
    
    strengthResult = {
      current: currentGripStrength,
      target: strengthTarget,
      gap: strengthGap,
      method: (gripMethod ?? undefined) as 'dynamometer' | 'deadhang' | 'pinch' | null | undefined,
      currentTime: currentGripTime,
      targetTime
    };
  }

  // 4. CONTEXTUAL INSIGHTS (based on training style)
  let contextualInsight = '';
  if (trainingStyle) {
    const style = trainingStyle.toLowerCase();
    if (style.includes('powerlift') || style.includes('weightlift') || style.includes('bodybuild')) {
      if (currentPlankTime < 60) {
        contextualInsight = 'Your absolute strength is likely high, but core endurance is a limiting factor for higher volume blocks.';
      } else if (currentTotal < enduranceTarget) {
        contextualInsight = 'Focusing on increasing metabolic work capacity will help you recover faster between heavy sets.';
      }
    } else if (style.includes('yoga') || style.includes('pilates')) {
      if (currentGripStrength && currentGripStrength < (bodyWeight * (gender === 'male' ? 0.5 : 0.35))) {
        contextualInsight = 'Excellent stability, but adding more absolute strength work will further protect your joints during deep ranges of motion.';
      }
    } else if (style.includes('run') || style.includes('cycl') || style.includes('endurance')) {
      if (currentSquats < 30) {
        contextualInsight = 'Building lower-body structural strength will improve your running economy and injury resilience.';
      }
    }
  }

  if (!contextualInsight && currentPlankTime > 0 && currentPlankTime < 45) {
    contextualInsight = 'Prioritising neuromuscular core control (learning to brace) will provide a more stable foundation for all movements.';
  }

  return {
    endurance: {
      current: currentTotal,
      target: enduranceTarget,
      gap: enduranceGap
    },
    core: {
      current: currentPlankTime,
      target: coreTarget,
      gap: coreGap
    },
    ...(strengthResult && { strength: strengthResult }),
    ...(contextualInsight && { contextualInsight })
  };
}

