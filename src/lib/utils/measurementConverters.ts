/**
 * Measurement Converters
 * 
 * Converts different measurement methods to standardized values for consistent scoring.
 * This allows different facilities to use different equipment while maintaining comparable results.
 */

/**
 * Grip Strength Conversion
 * Converts various grip strength tests to equivalent dynamometer kg for scoring
 */

export type GripStrengthMethod = 'dynamometer' | 'deadhang' | 'farmerswalk' | 'platepinch';

export interface GripStrengthConversion {
  normalizedKg: number; // Equivalent dynamometer kg
  rawValue: number;
  method: GripStrengthMethod;
  metadata?: Record<string, unknown>;
}

/**
 * Convert dead hang time to equivalent grip strength
 * Based on research: Dead hang time correlates with grip strength
 * Formula: Normalized strength = (bodyweight × time_in_seconds) / scaling_factor
 * 
 * Note: This is an approximation. Actual normative data for dead hang is limited,
 * so we use a bodyweight-relative formula that correlates with dynamometer readings.
 */
export function convertDeadHangToGripStrength(
  hangTimeSeconds: number,
  bodyweightKg: number,
  gender: 'male' | 'female'
): number {
  if (hangTimeSeconds <= 0 || bodyweightKg <= 0) return 0;
  
  // Rough conversion: Grip strength (kg) ≈ (bodyweight × hang_time) / scaling_factor
  // Scaling factors based on typical grip-to-bodyweight ratios
  // Males: Average grip ≈ 50% of bodyweight, females ≈ 35% of bodyweight
  const genderFactor = gender === 'male' ? 0.5 : 0.35;
  const baseGripStrength = bodyweightKg * genderFactor;
  
  // Hang time factor: Longer hang = stronger grip (roughly linear up to ~60 seconds)
  // Beyond 60s, diminishing returns (very strong grip)
  const timeFactor = Math.min(1.0, hangTimeSeconds / 60); // Normalize to 60s max
  
  // Estimated grip strength = base × time_factor × 1.5 (to account for isometric hold strength)
  const estimatedKg = baseGripStrength * (1 + timeFactor * 0.5);
  
  // Clamp to reasonable range (20-80kg typical)
  return Math.max(20, Math.min(80, estimatedKg));
}

/**
 * Convert farmers walk distance/time to grip strength
 * Assumes standard load: bodyweight or fixed weight (e.g., 20kg per hand)
 */
export function convertFarmersWalkToGripStrength(
  distanceMeters: number,
  timeSeconds: number,
  loadPerHandKg: number,
  bodyweightKg: number
): number {
  if (distanceMeters <= 0 || timeSeconds <= 0) return 0;
  
  // If load not specified, assume bodyweight
  const load = loadPerHandKg || bodyweightKg;
  
  // Rough estimation: Grip strength ≈ load × (distance_factor × time_factor)
  // Stronger grip allows carrying heavier load for longer distance/time
  const distanceFactor = Math.min(1.0, distanceMeters / 50); // Normalize to 50m
  const timeFactor = Math.min(1.0, timeSeconds / 60); // Normalize to 60s
  
  const estimatedKg = load * (0.5 + distanceFactor * 0.3 + timeFactor * 0.2);
  
  return Math.max(20, Math.min(80, estimatedKg));
}

/**
 * Convert plate pinch test to grip strength
 * Standard test: Pinch grip strength using weight plates
 */
export function convertPlatePinchToGripStrength(
  weightKg: number
): number {
  if (weightKg <= 0) return 0;
  
  // Pinch grip is typically 40-60% of crush grip (dynamometer)
  // So dynamometer ≈ pinch × 1.8 (rough average)
  return weightKg * 1.8;
}

/**
 * Main grip strength converter
 */
export function convertGripStrength(
  rawValue: number,
  method: GripStrengthMethod,
  bodyweightKg?: number,
  gender?: 'male' | 'female',
  metadata?: Record<string, unknown>
): number {
  switch (method) {
    case 'dynamometer':
      return rawValue; // Already in kg
      
    case 'deadhang':
      if (!bodyweightKg || !gender) {
        console.warn('[CONVERT] Dead hang conversion requires bodyweight and gender');
        return rawValue; // Fallback
      }
      return convertDeadHangToGripStrength(rawValue, bodyweightKg, gender);
      
    case 'farmerswalk': {
      const loadPerHand = metadata?.loadPerHandKg;
      const distance = metadata?.distanceMeters || rawValue; // If rawValue is distance
      const time = metadata?.timeSeconds;
      if (!bodyweightKg) {
        console.warn('[CONVERT] Farmers walk conversion requires bodyweight');
        return rawValue;
      }
      // Convert loadPerHand to number, defaulting to 0 if not provided
      const loadPerHandNum = typeof loadPerHand === 'number' ? loadPerHand : 0;
      // Convert time to number, defaulting to 60 if not provided or invalid
      const timeNum = typeof time === 'number' ? time : 60;
      return convertFarmersWalkToGripStrength(Number(distance), timeNum, loadPerHandNum, bodyweightKg);
    }
      
    case 'platepinch':
      return convertPlatePinchToGripStrength(rawValue);
      
    default:
      return rawValue;
  }
}

/**
 * Body Composition Conversion
 */

export type BodyCompositionMethod = 'bioimpedance' | 'dexa' | 'bodpod' | 'skinfold' | 'measurements';
export type SkinfoldMethod = 'jackson-pollock-7' | 'jackson-pollock-3' | 'durnin-womersley-4';

/**
 * Calculate body fat % from 7-site Jackson-Pollock skinfold method
 * Sites: Chest, Axilla, Tricep, Subscapular, Abdomen, Suprailiac, Thigh
 */
export function calculateBodyFatFrom7SiteSkinfold(
  chest: number,      // mm
  axilla: number,     // mm
  tricep: number,     // mm
  subscapular: number, // mm
  abdomen: number,    // mm
  suprailiac: number, // mm
  thigh: number,      // mm
  age: number,
  gender: 'male' | 'female'
): number {
  const sum = chest + axilla + tricep + subscapular + abdomen + suprailiac + thigh;
  
  if (gender === 'male') {
    // Jackson-Pollock 7-site formula for men
    const density = 1.112 - (0.00043499 * sum) + (0.00000055 * sum * sum) - (0.00028826 * age);
    // Siri equation: %BF = (495 / density) - 450
    const bodyFatPct = (495 / density) - 450;
    return Math.max(0, Math.min(50, bodyFatPct)); // Clamp to reasonable range
  } else {
    // Jackson-Pollock 7-site formula for women
    const density = 1.097 - (0.00046971 * sum) + (0.00000056 * sum * sum) - (0.00012828 * age);
    const bodyFatPct = (495 / density) - 450;
    return Math.max(0, Math.min(50, bodyFatPct));
  }
}

/**
 * Calculate body fat % from 3-site Jackson-Pollock skinfold method
 * Men: Chest, Abdomen, Thigh
 * Women: Tricep, Suprailiac, Thigh
 */
export function calculateBodyFatFrom3SiteSkinfold(
  site1: number,  // mm
  site2: number,  // mm
  site3: number,  // mm
  age: number,
  gender: 'male' | 'female'
): number {
  const sum = site1 + site2 + site3;
  
  if (gender === 'male') {
    // Jackson-Pollock 3-site (chest, abdomen, thigh)
    const density = 1.10938 - (0.0008267 * sum) + (0.0000016 * sum * sum) - (0.0002574 * age);
    const bodyFatPct = (495 / density) - 450;
    return Math.max(0, Math.min(50, bodyFatPct));
  } else {
    // Jackson-Pollock 3-site (tricep, suprailiac, thigh)
    const density = 1.0994921 - (0.0009929 * sum) + (0.0000023 * sum * sum) - (0.0001392 * age);
    const bodyFatPct = (495 / density) - 450;
    return Math.max(0, Math.min(50, bodyFatPct));
  }
}

/**
 * Calculate body fat % from Durnin-Womersley 4-site method
 * Sites: Bicep, Tricep, Subscapular, Suprailiac
 */
export function calculateBodyFatFromDurninWomersley(
  bicep: number,      // mm
  tricep: number,     // mm
  subscapular: number, // mm
  suprailiac: number, // mm
  age: number,
  gender: 'male' | 'female'
): number {
  const sum = bicep + tricep + subscapular + suprailiac;
  
  // Durnin-Womersley uses age-based constants
  const getConstants = () => {
    if (gender === 'male') {
      if (age >= 17 && age <= 19) return { a: 1.1620, b: 0.0630 };
      if (age >= 20 && age <= 29) return { a: 1.1631, b: 0.0632 };
      if (age >= 30 && age <= 39) return { a: 1.1422, b: 0.0544 };
      if (age >= 40 && age <= 49) return { a: 1.1620, b: 0.0700 };
      return { a: 1.1715, b: 0.0779 }; // 50+
    } else {
      if (age >= 17 && age <= 19) return { a: 1.1549, b: 0.0678 };
      if (age >= 20 && age <= 29) return { a: 1.1599, b: 0.0717 };
      if (age >= 30 && age <= 39) return { a: 1.1423, b: 0.0632 };
      if (age >= 40 && age <= 49) return { a: 1.1333, b: 0.0612 };
      return { a: 1.1339, b: 0.0645 }; // 50+
    }
  };
  
  const { a, b } = getConstants();
  const density = a - (b * Math.log10(sum));
  const bodyFatPct = (495 / density) - 450;
  return Math.max(0, Math.min(50, bodyFatPct));
}

/**
 * Estimate body fat % from body measurements (tape measure)
 * Uses US Navy method or similar circumference-based formulas
 */
export function calculateBodyFatFromMeasurements(
  waistCm: number,
  neckCm: number,
  heightCm: number,
  gender: 'male' | 'female',
  hipCm?: number // For women
): number {
  if (gender === 'male') {
    // US Navy method for men: %BF = 86.010 × log10(waist - neck) - 70.041 × log10(height) + 36.76
    const bodyFatPct = 86.010 * Math.log10(waistCm - neckCm) - 70.041 * Math.log10(heightCm) + 36.76;
    return Math.max(5, Math.min(40, bodyFatPct));
  } else {
    // US Navy method for women: %BF = 163.205 × log10(waist + hip - neck) - 97.684 × log10(height) - 78.387
    if (!hipCm) {
      console.warn('[CONVERT] Hip measurement required for women');
      return 0;
    }
    const bodyFatPct = 163.205 * Math.log10(waistCm + hipCm - neckCm) - 97.684 * Math.log10(heightCm) - 78.387;
    return Math.max(10, Math.min(45, bodyFatPct));
  }
}

/**
 * Main body composition converter
 */
export function convertBodyComposition(
  method: BodyCompositionMethod,
  rawMeasurements: Record<string, number>,
  age: number,
  gender: 'male' | 'female',
  weightKg?: number,
  heightCm?: number,
  skinfoldMethod?: SkinfoldMethod
): number {
  switch (method) {
    case 'dexa':
    case 'bodpod':
    case 'bioimpedance':
      // These methods already provide body fat % directly
      return rawMeasurements.bodyFatPct || rawMeasurements.inbodyBodyFatPct || 0;
      
    case 'skinfold':
      if (!skinfoldMethod) {
        console.warn('[CONVERT] Skinfold method not specified');
        return 0;
      }
      
      if (skinfoldMethod === 'jackson-pollock-7') {
        return calculateBodyFatFrom7SiteSkinfold(
          rawMeasurements.chest || 0,
          rawMeasurements.axilla || 0,
          rawMeasurements.tricep || 0,
          rawMeasurements.subscapular || 0,
          rawMeasurements.abdomen || 0,
          rawMeasurements.suprailiac || 0,
          rawMeasurements.thigh || 0,
          age,
          gender
        );
      } else if (skinfoldMethod === 'jackson-pollock-3') {
        // Determine sites based on gender
        if (gender === 'male') {
          return calculateBodyFatFrom3SiteSkinfold(
            rawMeasurements.chest || 0,
            rawMeasurements.abdomen || 0,
            rawMeasurements.thigh || 0,
            age,
            gender
          );
        } else {
          return calculateBodyFatFrom3SiteSkinfold(
            rawMeasurements.tricep || 0,
            rawMeasurements.suprailiac || 0,
            rawMeasurements.thigh || 0,
            age,
            gender
          );
        }
      } else if (skinfoldMethod === 'durnin-womersley-4') {
        return calculateBodyFatFromDurninWomersley(
          rawMeasurements.bicep || 0,
          rawMeasurements.tricep || 0,
          rawMeasurements.subscapular || 0,
          rawMeasurements.suprailiac || 0,
          age,
          gender
        );
      }
      return 0;
      
    case 'measurements':
      if (!heightCm) {
        console.warn('[CONVERT] Height required for measurement-based body fat calculation');
        return 0;
      }
      return calculateBodyFatFromMeasurements(
        rawMeasurements.waistCm || 0,
        rawMeasurements.neckCm || 0,
        heightCm,
        gender,
        rawMeasurements.hipCm
      );
      
    default:
      return 0;
  }
}

