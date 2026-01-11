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
  ambitionLevel: 'health' | 'active' | 'athletic' | 'elite' = 'active',
  trainingStyle?: string
): FunctionalGapsResult {
  // 1. MUSCULAR ENDURANCE (Total Reps)
  const currentTotal = currentPushUps + currentSquats;
  
  // Base standards (Gold Standards)
  const goldStandardEndurance = gender === 'male' ? 75 : 50;
  
  // Dynamic target based on current performance and ambition
  // Ambition multipliers: health: +10%, active: +20%, athletic: +30%, elite: +40%
  // These represent realistic "next step" targets for each profile
  const enduranceMultipliers = {
    health: 1.10,
    active: 1.20,
    athletic: 1.30,
    elite: 1.40
  };
  const eMultiplier = enduranceMultipliers[ambitionLevel] || 1.20;
  
  // Logic: Set target based on current performance but capped towards gold standard
  // If they are very far from gold standard, give them a realistic step up (+20-40%)
  // If they are near or above, push them further beyond gold standard
  let enduranceTarget = Math.max(
    currentTotal + 5, // Minimum improvement floor
    Math.ceil(currentTotal * eMultiplier)
  );

  // If the calculated target is still way below gold standard, 
  // we keep it realistic. If it's near gold standard, we might floor it at gold standard
  // only if they are within 15% of it.
  if (currentTotal < goldStandardEndurance * 0.85 && enduranceTarget > goldStandardEndurance) {
    // This case shouldn't happen with the multiplier logic unless current is already high
  } else if (currentTotal >= goldStandardEndurance * 0.85 && enduranceTarget < goldStandardEndurance) {
    enduranceTarget = goldStandardEndurance;
  }
  
  const enduranceGap = Math.max(0, enduranceTarget - currentTotal);

  // 2. CORE STABILITY (Time)
  const goldStandardCore = 120; // 2 minutes standard
  const coreMultipliers = {
    health: 1.15,
    active: 1.25,
    athletic: 1.35,
    elite: 1.50
  };
  const cMultiplier = coreMultipliers[ambitionLevel] || 1.25;

  let coreTarget = Math.max(
    currentPlankTime + 15, // Minimum 15s improvement
    Math.ceil(currentPlankTime * cMultiplier)
  );

  // Calibration towards gold standard
  if (currentPlankTime >= goldStandardCore * 0.85 && coreTarget < goldStandardCore) {
    coreTarget = goldStandardCore;
  }
  
  const coreGap = Math.max(0, coreTarget - currentPlankTime);

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
    const baseMultiplier = gender === 'male' ? 0.6 : 0.4;
    const goldStandardStrength = bodyWeight * baseMultiplier;
    
    const strengthMultipliers = {
      health: 1.05,
      active: 1.10,
      athletic: 1.15,
      elite: 1.20
    };
    const sMultiplier = strengthMultipliers[ambitionLevel] || 1.10;

    // Calculate target in normalized kg (works for all methods)
    let strengthTarget = Math.max(
      currentGripStrength + 2, // Minimum 2kg improvement
      currentGripStrength * sMultiplier
    );

    if (currentGripStrength >= goldStandardStrength * 0.9 && strengthTarget < goldStandardStrength) {
      strengthTarget = goldStandardStrength;
    }
    
    const strengthGap = Math.max(0, strengthTarget - currentGripStrength);
    
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

