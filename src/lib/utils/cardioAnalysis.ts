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
 * @returns Object with VO2, RHR, and Recovery gaps
 */
export function calculateCardioAnalysis(
  age: number,
  gender: 'male' | 'female',
  ambitionLevel: FitnessAmbitionLevel,
  restingHR: number,
  peakHR: number,
  recoveryHR: number
): CardioGapsResult {
  // 1. Define targets based on ambition level
  const targets = {
    'health': { rhr: 70, recovery: 20, percentile: 0.50 },
    'active': { rhr: 65, recovery: 30, percentile: 0.75 },
    'athletic': { rhr: 55, recovery: 40, percentile: 0.85 },
    'elite': { rhr: 50, recovery: 50, percentile: 0.95 }
  };
  
  const userGoals = targets[ambitionLevel] || targets['active'];
  
  // 2. Calculate metrics
  
  // A. Heart Rate Recovery (Peak - 1 min post)
  const currentRecovery = peakHR > 0 && recoveryHR > 0 ? peakHR - recoveryHR : 0;
  const recoveryGap = Math.max(0, userGoals.recovery - currentRecovery);
  
  // B. Resting Heart Rate Gap (lower is better, so gap is current - target)
  const rhrGap = Math.max(0, restingHR - userGoals.rhr);
  
  // C. VO2 Max Calculation (ACSM Metabolic Equation)
  // Protocol: 3 mins @ 5km/h, 10% Incline
  // Cost of 5kph @ 10% Incline = ~26.8 ml/kg/min
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
  
  // 3. Get dynamic VO2 target (simplified lookup)
  // Base VO2 for 30-40 year olds
  let baseVO2 = gender === 'male' ? 40 : 32;
  
  // Adjust base down by age (approx -0.3 per year over 20)
  const ageAdjust = age > 20 ? (age - 20) * 0.3 : 0;
  baseVO2 = baseVO2 - ageAdjust;
  
  // Apply ambition multiplier
  // Percentile 0.5 = base, 0.75 = +50%, 0.85 = +70%, 0.95 = +90%
  const percentileMultiplier = 1 + ((userGoals.percentile - 0.5) * 2);
  const targetVO2 = baseVO2 * percentileMultiplier;
  
  const vo2Gap = Math.max(0, targetVO2 - currentVO2);
  
  return {
    vo2: {
      current: currentVO2,
      target: targetVO2,
      gap: vo2Gap
    },
    rhr: {
      current: restingHR,
      target: userGoals.rhr,
      gap: rhrGap
    },
    recovery: {
      current: currentRecovery,
      target: userGoals.recovery,
      gap: recoveryGap
    }
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

