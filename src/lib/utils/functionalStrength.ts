/**
 * Functional Strength Gap Analysis
 * Calculates performance targets and gaps for functional strength assessment
 */

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
  };
}

/**
 * Calculate functional strength gaps
 * 
 * @param gender - 'male' or 'female'
 * @param bodyWeight - Body weight in kg
 * @param currentPushUps - Current pushup reps
 * @param currentSquats - Current squat reps
 * @param currentPlankTime - Current plank time in seconds
 * @param currentGripStrength - Current grip strength in kg (max dominant hand, optional)
 * @returns Object with endurance, core, and optionally strength gaps
 */
export function calculateFunctionalGaps(
  gender: 'male' | 'female',
  bodyWeight: number,
  currentPushUps: number,
  currentSquats: number,
  currentPlankTime: number,
  currentGripStrength?: number
): FunctionalGapsResult {
  // 1. MUSCULAR ENDURANCE (Total Reps)
  const currentTotal = currentPushUps + currentSquats;
  const enduranceTarget = gender === 'male' ? 75 : 50;
  const enduranceGap = Math.max(0, enduranceTarget - currentTotal);

  // 2. CORE STABILITY (Time)
  const coreTarget = 120; // 2 minutes
  const coreGap = currentPlankTime >= coreTarget ? 0 : coreTarget - currentPlankTime;

  // 3. OVERALL STRENGTH (Grip Force) - Optional
  let strengthResult: { current: number; target: number; gap: number } | undefined;
  if (currentGripStrength !== undefined && currentGripStrength > 0 && bodyWeight > 0) {
    const multiplier = gender === 'male' ? 0.6 : 0.4;
    const strengthTarget = bodyWeight * multiplier;
    const strengthGap = Math.max(0, strengthTarget - currentGripStrength);
    
    strengthResult = {
      current: currentGripStrength,
      target: strengthTarget,
      gap: strengthGap
    };
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
    ...(strengthResult && { strength: strengthResult })
  };
}

