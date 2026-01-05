/**
 * Cardiovascular Fitness Analysis
 * Calculates VO2 Max, RHR gaps, and Recovery HR gaps based on ambition level
 */

export interface CardioGapsResult {
  vo2: {
    current: number;
    target: number;
    gap: number;
  };
  rhr: {
    current: number;
    target: number;
    gap: number;
  };
  recovery: {
    current: number;
    target: number;
    gap: number;
  };
  safetyNotice?: string;
}

export type FitnessAmbitionLevel = 'health' | 'active' | 'athletic' | 'elite';

/**
 * Calculate cardiovascular fitness gaps and VO2 Max
 * 
 * @param age - Age in years
 * @param gender - 'male' or 'female'
 * @param ambitionLevel - 'health' | 'active' | 'athletic' | 'elite'
 * @param restingHR - Resting heart rate (bpm)
 * @param peakHR - Peak heart rate during test (bpm)
 * @param recoveryHR - Heart rate 1 minute after test (bpm)
 * @param recentActivity - User's recent activity level (optional)
 * @returns Object with VO2, RHR, and Recovery gaps
 */
export function calculateCardioAnalysis(
  age: number,
  gender: 'male' | 'female',
  ambitionLevel: FitnessAmbitionLevel,
  restingHR: number,
  peakHR: number,
  recoveryHR: number,
  recentActivity?: string
): CardioGapsResult {
  // 1. Define targets based on ambition level
  const targets = {
    'health': { rhr: 70, recovery: 20, percentile: 0.50 },
    'active': { rhr: 65, recovery: 30, percentile: 0.75 },
    'athletic': { rhr: 55, recovery: 40, percentile: 0.85 },
    'elite': { rhr: 50, recovery: 50, percentile: 0.95 }
  };
  
  const userGoals = targets[ambitionLevel] || targets['active'];
  
  // Ambition multipliers for "pushing for more"
  const ambitionMultipliers = {
    health: 1.05,
    active: 1.10,
    athletic: 1.15,
    elite: 1.25
  };
  const multiplier = ambitionMultipliers[ambitionLevel] || 1.10;
  
  // 2. Calculate metrics
  
  // A. Heart Rate Recovery (Peak - 1 min post)
  const currentRecovery = peakHR > 0 && recoveryHR > 0 ? peakHR - recoveryHR : 0;
  
  // Dynamic recovery target: Achievable step up (+25-50%) or ambition target, whichever is lower
  let recoveryTarget = Math.max(
    currentRecovery + 5, // Minimum 5 bpm improvement
    Math.ceil(currentRecovery * multiplier)
  );

  // If the step-up is still below the ambition target, and they are not elite, 
  // we might cap it towards the ambition target for higher performance
  if (currentRecovery >= userGoals.recovery * 0.8 && recoveryTarget < userGoals.recovery) {
    recoveryTarget = userGoals.recovery;
  }
  
  const recoveryGap = Math.max(0, recoveryTarget - currentRecovery);
  
  // B. Resting Heart Rate Gap (lower is better)
  // Dynamic RHR target: Achievable step down (-5 to -15%)
  let rhrTarget = Math.min(
    restingHR - 2, // Minimum 2 bpm improvement
    Math.floor(restingHR * (1 / (multiplier * 0.95))) // ~5-15% reduction
  );

  // Calibration: If they are near their ambition target, floor it there
  if (restingHR <= userGoals.rhr * 1.15 && rhrTarget > userGoals.rhr) {
    rhrTarget = userGoals.rhr;
  }
  
  const rhrGap = Math.max(0, restingHR - rhrTarget);
  
  // C. VO2 Max Calculation (ACSM Metabolic Equation)
  // ... (rest of VO2 calculation)
  let currentVO2 = 0;
  
  if (peakHR > 0 && restingHR > 0 && age > 0) {
    // Calculate max HR estimate: 208 - 0.7 * age
    const maxHREstimate = 208 - (0.7 * age);
    const hrReserve = maxHREstimate - restingHR;
    
    if (hrReserve > 0) {
      // Effort used = (PeakHR - RestingHR) / HRReserve
      const effortUsed = (peakHR - restingHR) / hrReserve;
      
      if (effortUsed > 0) {
        // Current VO2 = ((26.8 - 3.5) / effortUsed) + 3.5
        currentVO2 = ((26.8 - 3.5) / effortUsed) + 3.5;
        
        // Clamp for safety
        currentVO2 = Math.max(15, Math.min(85, currentVO2));
      }
    }
  }
  
  // 3. Get dynamic VO2 target
  let baseVO2 = gender === 'male' ? 40 : 32;
  const ageAdjust = age > 20 ? (age - 20) * 0.3 : 0;
  baseVO2 = baseVO2 - ageAdjust;
  
  const percentileMultiplier = 1 + ((userGoals.percentile - 0.5) * 2);
  let targetVO2 = baseVO2 * percentileMultiplier;
  
  // If already at or above target, push for more but be conservative if elite
  if (currentVO2 >= targetVO2) {
    // If they are already over 50 (very good) or 60 (elite), the multiplier should be smaller
    // For extreme elite (>75), only push for very minor gains (+1%)
    const adaptiveMultiplier = currentVO2 > 75 ? 1.01 : currentVO2 > 60 ? 1.02 : currentVO2 > 50 ? 1.05 : multiplier;
    targetVO2 = currentVO2 * adaptiveMultiplier;
  }
  
  // Hard cap for realistic targets
  targetVO2 = Math.min(95, targetVO2);
  
  const vo2Gap = Math.max(0, targetVO2 - currentVO2);

  // 4. Safety Context (Detrained status)
  let safetyNotice = '';
  if (recentActivity === 'stopped-6-months') {
    safetyNotice = 'Tendon and joint durability may be low after a prolonged break. Caps on high-impact volume are recommended for weeks 1-4 to prevent overuse injuries (e.g. shin splints).';
  } else if (recentActivity === 'stopped-3-months') {
    safetyNotice = 'Gradual re-introduction of high-intensity work is advised to ensure connective tissue adaptation.';
  }
  
  return {
    vo2: {
      current: currentVO2,
      target: targetVO2,
      gap: vo2Gap
    },
    rhr: {
      current: restingHR,
      target: rhrTarget,
      gap: rhrGap
    },
    recovery: {
      current: currentRecovery,
      target: recoveryTarget,
      gap: recoveryGap
    },
    ...(safetyNotice && { safetyNotice })
  };
}

/**
 * Map goal level string to ambition level
 */
export function mapFitnessGoalLevel(goalLevel: string): FitnessAmbitionLevel {
  // Handle old percentage-based values for backward compatibility
  if (goalLevel === 'health' || goalLevel === 'active' || goalLevel === 'athletic' || goalLevel === 'elite') {
    return goalLevel as FitnessAmbitionLevel;
  }
  
  // Default to 'active' if unrecognized
  return 'active';
}

