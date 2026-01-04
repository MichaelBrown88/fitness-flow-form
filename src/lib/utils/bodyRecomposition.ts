/**
 * Body Recomposition Calculations
 * Calculates target weight and muscle mass for body recomposition goals
 */

export interface BodyRecompResult {
  targetWeight: number; // Final calculated scale weight (kg)
  targetMuscleMass: number; // Current muscle mass + gender-specific gain (kg)
  projectedLeanMass: number; // Total lean mass used for calculation (kg)
}

/**
 * Calculate target weight and muscle mass for body recomposition
 * 
 * CONSTANTS (Muscle Gain Potential per 12-week phase):
 * - Male: +1.5 kg
 * - Female: +0.75 kg
 * 
 * ALGORITHM:
 * 1. Calculate Current Fat Mass = Current Weight * (Current Body Fat % / 100)
 * 2. Calculate Current Lean Body Mass (LBM) = Current Weight - Current Fat Mass
 * 3. Determine "Projected Muscle Gain" based on Gender (use the constants above)
 * 4. Calculate New Projected LBM = Current LBM + Projected Muscle Gain
 * 5. Calculate Final Target Weight = New Projected LBM / (1 - (Target Body Fat % / 100))
 * 
 * @param currentWeight - Current weight in kg
 * @param currentBodyFat - Current body fat percentage (e.g., 27.9)
 * @param targetBodyFat - Target body fat percentage (e.g., 20.0)
 * @param gender - 'male' or 'female'
 * @param currentMuscleMass - Current muscle mass in kg (optional, defaults to LBM if not provided)
 * @returns Object with targetWeight, targetMuscleMass, and projectedLeanMass
 */
export function calculateBodyRecomposition(
  currentWeight: number,
  currentBodyFat: number,
  targetBodyFat: number,
  gender: 'male' | 'female',
  currentMuscleMass?: number
): BodyRecompResult {
  // Validate inputs
  if (currentWeight <= 0 || currentBodyFat < 0 || targetBodyFat < 0 || targetBodyFat > 50) {
    return {
      targetWeight: currentWeight,
      targetMuscleMass: currentMuscleMass || 0,
      projectedLeanMass: currentWeight * (1 - currentBodyFat / 100)
    };
  }

  // Step 1: Calculate Current Fat Mass
  const currentFatMass = currentWeight * (currentBodyFat / 100);

  // Step 2: Calculate Current Lean Body Mass (LBM)
  const currentLBM = currentWeight - currentFatMass;

  // Step 3: Determine Projected Muscle Gain based on Gender
  const projectedMuscleGain = gender === 'male' ? 1.5 : 0.75; // kg per 12-week phase

  // Step 4: Calculate New Projected LBM
  const projectedLeanMass = currentLBM + projectedMuscleGain;

  // Step 5: Calculate Final Target Weight
  // Target Weight = New Projected LBM / (1 - (Target Body Fat % / 100))
  const targetWeight = projectedLeanMass / (1 - (targetBodyFat / 100));

  // Calculate Target Muscle Mass
  // If currentMuscleMass is provided, use it; otherwise use LBM as approximation
  const baseMuscleMass = currentMuscleMass || currentLBM;
  const targetMuscleMass = baseMuscleMass + projectedMuscleGain;

  return {
    targetWeight,
    targetMuscleMass,
    projectedLeanMass
  };
}

/**
 * Map body recomposition goal level to target body fat percentage range
 * Returns the upper end of the range as the target (more achievable and aligns with calculations)
 */
export function getTargetBodyFatFromLevel(
  level: 'healthy' | 'fit' | 'athletic' | 'shredded',
  gender: 'male' | 'female'
): number {
  if (gender === 'male') {
    switch (level) {
      case 'shredded':
        return 10; // Upper end of 8-10%
      case 'athletic':
        return 15; // Upper end of 10-15%
      case 'fit':
        return 20; // Upper end of 15-20%
      case 'healthy':
      default:
        return 25; // Upper end of 20-25%
    }
  } else {
    // Female
    switch (level) {
      case 'shredded':
        return 17; // Upper end of 15-17%
      case 'athletic':
        return 21; // Upper end of 17-21%
      case 'fit':
        return 25; // Upper end of 21-25%
      case 'healthy':
      default:
        return 30; // Upper end of 25-30%
    }
  }
}

/**
 * Get body fat percentage range for a given level and gender
 */
export function getBodyFatRange(
  level: 'healthy' | 'fit' | 'athletic' | 'shredded',
  gender: 'male' | 'female'
): [number, number] {
  if (gender === 'male') {
    switch (level) {
      case 'shredded':
        return [8, 10];
      case 'athletic':
        return [10, 15];
      case 'fit':
        return [15, 20];
      case 'healthy':
      default:
        return [20, 25];
    }
  } else {
    // Female
    switch (level) {
      case 'shredded':
        return [15, 17];
      case 'athletic':
        return [17, 21];
      case 'fit':
        return [21, 25];
      case 'healthy':
      default:
        return [25, 30];
    }
  }
}

