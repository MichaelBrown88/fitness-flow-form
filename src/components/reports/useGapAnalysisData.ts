/**
 * Hook to extract gap analysis data for the new report design
 * Reuses logic from GapAnalysis component but returns structured data
 */

import { useMemo } from 'react';
import type { ScoreSummary } from '@/lib/scoring';
import type { FormData } from '@/contexts/FormContext';
import { calculateAge } from '@/lib/scoring';
import { NORMATIVE_SCORING_DB } from '@/lib/clinical-data';
import { calculateBodyRecomposition, getTargetBodyFatFromLevel, getBodyFatRange } from '@/lib/utils/bodyRecomposition';
import { calculateFunctionalGaps } from '@/lib/utils/functionalStrength';
import { calculateCardioAnalysis, mapFitnessGoalLevel } from '@/lib/utils/cardioAnalysis';
import { convertGripStrength } from '@/lib/utils/measurementConverters';

/** Per-sub-metric delta from previous assessment (positive = improvement) */
export interface GapDeltas {
  [key: string]: number;
}

export interface GapAnalysisData {
  title: string;
  icon: string;
  current: string;
  currentLabel: string; // Descriptive label (e.g., "Athlete Level")
  currentValue: string; // Numeric value for small print (e.g., "58 bpm")
  target: string;
  targetLabel: string; // Descriptive label (e.g., "Elite Athlete")
  targetValue: string; // Numeric value for small print (e.g., "43 bpm")
  insight: string;
  status: 'red' | 'yellow' | 'green' | 'gray';
  /** Per-sub-metric deltas from previous assessment */
  deltas?: GapDeltas;
  bodyCompGaps?: {
    weight: { current: number; target: number; gap: number };
    muscle: { current: number; target: number; gap: number };
    fat: { current: number; target: number; gap: number };
  };
  functionalGaps?: {
    endurance: { current: number; target: number; gap: number };
    core: { current: number; target: number; gap: number };
    strength?: { 
      current: number; 
      target: number; 
      gap: number;
      method?: 'dynamometer' | 'deadhang' | 'pinch' | null;
      currentTime?: number;
      targetTime?: number;
    };
  };
  cardioGaps?: {
    vo2: { current: number; target: number; gap: number };
    rhr: { current: number; target: number; gap: number };
    recovery: { current: number; target: number; gap: number };
  };
}

export function useGapAnalysisData(scores: ScoreSummary, formData?: FormData, previousFormData?: FormData): GapAnalysisData[] {
  return useMemo(() => {
    // Helper: compute delta between two numeric form fields (positive = better)
    const numDelta = (field: keyof FormData, invert = false): number | undefined => {
      if (!previousFormData || !formData) return undefined;
      const cur = parseFloat(String(formData[field] || '0'));
      const prev = parseFloat(String(previousFormData[field] || '0'));
      if (prev === 0 && cur === 0) return undefined;
      if (prev === 0) return undefined; // No previous data
      const raw = cur - prev;
      return raw === 0 ? undefined : (invert ? -raw : raw);
    };
    const gender = (formData?.gender || '').toLowerCase();
    const bf = parseFloat(formData?.inbodyBodyFatPct || '0');
    const visceral = parseFloat(formData?.visceralFatLevel || '0');
    const pushups = parseFloat(formData?.pushupsOneMinuteReps || formData?.pushupMaxReps || '0');
    const squats = parseFloat(formData?.squatsOneMinuteReps || '0');
    const plankTime = parseFloat(formData?.plankDurationSeconds || '0');
    // Grip strength - handle all three methods
    const gripLeft = parseFloat(formData?.gripLeftKg || '0');
    const gripRight = parseFloat(formData?.gripRightKg || '0');
    const gripDeadhang = parseFloat(formData?.gripDeadhangSeconds || '0');
    const gripPinchTime = parseFloat(formData?.gripPlatePinchSeconds || '0');
    const gripTestMethod = formData?.gripTestMethod || '';
    const genderKey = (gender || 'male').toLowerCase() as 'male' | 'female';
    
    // Determine which grip method was used and get standardized value
    let gripStrength: number | undefined;
    let gripMethod: 'dynamometer' | 'deadhang' | 'pinch' | null = null;
    let gripDisplayValue: string = 'N/A';
    let gripCurrentTime: number | undefined; // For time-based methods
    let gripStandardizedWeight: number | undefined; // For pinch test
    
    if (gripLeft > 0 || gripRight > 0) {
      gripStrength = Math.max(gripLeft, gripRight);
      gripMethod = 'dynamometer';
      gripDisplayValue = `${gripStrength.toFixed(1)} kg`;
    } else if (gripDeadhang > 0) {
      gripMethod = 'deadhang';
      gripCurrentTime = gripDeadhang;
      gripDisplayValue = `${gripDeadhang.toFixed(0)}s`;
      // Convert deadhang time to equivalent kg for gap analysis
      const bodyweightKg = parseFloat(formData?.inbodyWeightKg || '0');
      if (bodyweightKg > 0) {
        gripStrength = convertGripStrength(gripDeadhang, 'deadhang', bodyweightKg, genderKey);
      }
    } else if (gripPinchTime > 0 || gripTestMethod === 'pinch') {
      gripMethod = 'pinch';
      gripCurrentTime = gripPinchTime;
      gripStandardizedWeight = genderKey === 'male' ? 15 : 10; // 15kg for male, 10kg for female
      gripDisplayValue = `${gripPinchTime.toFixed(0)}s (${gripStandardizedWeight}kg)`;
      // Convert pinch time to equivalent kg for gap analysis
      const timeFactor = Math.min(1.0, gripPinchTime / 60); // Normalize to 60s max
      gripStrength = gripStandardizedWeight * (1 + timeFactor * 0.5);
      gripStrength = Math.max(20, Math.min(80, gripStrength)); // Clamp to reasonable range
    }
    
    const bodyWeight = parseFloat(formData?.inbodyWeightKg || '0');
    const restingHr = parseFloat(formData?.cardioRestingHr || '0');
    
    const goals = formData?.clientGoals || [];
    const primaryGoal = goals[0] || 'general-health';
    
    // Body Composition
    const bodyCompGap: GapAnalysisData = (() => {
      let currentValue = `${bf}%`;
      let currentLabel = 'Current Body Fat';
      let status: 'red' | 'yellow' | 'green' | 'gray' = 'red';
      
      if (bf === 0) {
        currentValue = 'N/A';
        currentLabel = 'Not measured';
        status = 'gray';
      } else if ((gender === 'male' && bf <= 15) || (gender === 'female' && bf <= 22)) {
        status = 'green';
      } else if ((gender === 'male' && bf <= 20) || (gender === 'female' && bf <= 28)) {
        status = 'yellow';
      }
      
      const goalLevel = primaryGoal === 'weight-loss' 
        ? (formData?.goalLevelWeightLoss || '15')
        : primaryGoal === 'build-muscle'
        ? (formData?.goalLevelMuscle || '6')
        : primaryGoal === 'body-recomposition'
        ? (formData?.goalLevelBodyRecomp || 'athletic')
        : '15';
      
      let targetValue = '';
      let targetLabel = '';
      let targetWeight = 0;
      let targetMuscle = 0;
      let bodyCompGaps: GapAnalysisData['bodyCompGaps'] = undefined;
      
      if (bf === 0) {
        targetValue = 'N/A';
        targetLabel = 'Assessment needed';
      } else {
        const currentBF = bf;
        const weightKg = parseFloat(formData?.inbodyWeightKg || '0');
        const currentMuscleMass = parseFloat(formData?.skeletalMuscleMassKg || '0');
        let targetBF = 0;
        targetWeight = weightKg;
        targetMuscle = currentMuscleMass;
        
        // For weight loss goals, calculate target body fat based on weight loss percentage
        // For muscle building without weight loss, we might maintain or slightly increase
        // For body recomposition, we lose fat while building muscle (slight deficit)
        const isWeightLossGoal = primaryGoal === 'weight-loss' || goals.includes('weight-loss');
        const isBodyRecomp = primaryGoal === 'body-recomposition' || goals.includes('body-recomposition');
        const isMuscleGoal = primaryGoal === 'build-muscle' || goals.includes('build-muscle');
        
        if (isBodyRecomp && weightKg > 0) {
          // Body recomposition logic
          const recompLevel = (formData?.goalLevelBodyRecomp || 'athletic') as 'healthy' | 'fit' | 'athletic' | 'shredded';
          const genderKey = gender as 'male' | 'female';
          const targetBodyFat = getTargetBodyFatFromLevel(recompLevel, genderKey);
          const targetBFRange = getBodyFatRange(recompLevel, genderKey);
          
          const recompResult = calculateBodyRecomposition(
            weightKg,
            currentBF,
            targetBodyFat,
            genderKey,
            currentMuscleMass > 0 ? currentMuscleMass : undefined
          );
          
          targetBF = targetBodyFat;
          targetWeight = recompResult.targetWeight;
          targetMuscle = recompResult.targetMuscleMass;
          
          const levelLabel = recompLevel.charAt(0).toUpperCase() + recompLevel.slice(1);
          targetLabel = `${levelLabel} (${targetBFRange[0]}-${targetBFRange[1]}% BF)`;
        } 
        else if (isWeightLossGoal && isMuscleGoal && weightKg > 0) {
          // COMBINED GOAL: Weight Loss + Muscle Gain (Lean Gain / Transformation)
          // 1. Calculate Weight Loss Target in KG
          let fatLossKg = 0;
          const weightLossGoal = formData?.goalLevelWeightLoss || '15';
          if (weightLossGoal.includes('kg')) {
            fatLossKg = parseFloat(weightLossGoal.replace('kg', '')) || 5;
          } else {
            const weightLossPct = parseFloat(weightLossGoal) || 15;
            fatLossKg = (weightKg * weightLossPct) / 100;
          }
          
          // 2. Calculate Muscle Gain Target in KG
          const muscleGainGoal = formData?.goalLevelMuscle || '6';
          const muscleGainKg = parseFloat(muscleGainGoal) || 2;
          
          // 3. Vector math: Net weight change
          targetWeight = weightKg - fatLossKg + muscleGainKg;
          targetMuscle = currentMuscleMass + muscleGainKg;
          
          // 4. Calculate target Body Fat %
          const currentFatMassKg = (weightKg * currentBF) / 100;
          const targetFatMassKg = Math.max(2, currentFatMassKg - fatLossKg); // Floor at 2kg fat
          
          if (targetWeight > 0) {
            targetBF = (targetFatMassKg / targetWeight) * 100;
          } else {
            targetBF = currentBF * 0.8;
          }
          
          targetLabel = `Transform: -${fatLossKg.toFixed(0)}kg Fat, +${muscleGainKg.toFixed(0)}kg Muscle`;
        }
        else if (isWeightLossGoal && weightKg > 0) {
          // Pure Weight Loss logic
          const weightLossGoal = formData?.goalLevelWeightLoss || '15';
          let targetWeightLossKg = 0;
          if (weightLossGoal.includes('kg')) {
            targetWeightLossKg = parseFloat(weightLossGoal.replace('kg', '')) || 5;
            targetLabel = `${targetWeightLossKg}kg Weight Loss Target`;
          } else {
            const weightLossPct = parseFloat(weightLossGoal) || 15;
            targetWeightLossKg = (weightKg * weightLossPct) / 100;
            targetLabel = `${weightLossPct}% Weight Loss Target`;
          }
          
          targetWeight = weightKg - targetWeightLossKg;
          const currentFatMassKg = (weightKg * currentBF) / 100;
          const currentLeanMassKg = weightKg - currentFatMassKg;
          
          // Assume 80% fat loss, 20% lean loss
          const fatLossKg = targetWeightLossKg * 0.8;
          const targetFatMassKg = Math.max(2, currentFatMassKg - fatLossKg);
          const targetLeanMassKg = currentLeanMassKg - (targetWeightLossKg * 0.2);
          
          if (targetWeight > 0) {
            targetBF = (targetFatMassKg / targetWeight) * 100;
          } else {
            targetBF = currentBF * 0.75;
          }
          
          targetMuscle = currentMuscleMass * 0.98;
        } 
        else if (isMuscleGoal && weightKg > 0) {
          // Pure Muscle Gain logic
          const muscleGainKg = parseFloat(formData?.goalLevelMuscle || '6') || 6;
          targetWeight = weightKg + muscleGainKg;
          targetMuscle = currentMuscleMass + muscleGainKg;
          
          const currentFatMassKg = (weightKg * currentBF) / 100;
          if (targetWeight > 0) {
            targetBF = (currentFatMassKg / targetWeight) * 100;
          } else {
            targetBF = currentBF;
          }
          
          targetLabel = `Goal: +${muscleGainKg}kg Muscle`;
        } 
        else {
          // Default / General Health
          targetBF = gender === 'male' ? 15 : 22;
          targetWeight = weightKg;
          targetMuscle = currentMuscleMass;
          targetLabel = 'Healthy Range';
          }
          
        // Safety: Ensure target BF is realistic
        const minBF = gender === 'male' ? 8 : 15;
        targetBF = Math.max(minBF, targetBF);
          
        targetValue = `${targetBF.toFixed(1)}%`;
        
        // Store body comp gaps for UI
        bodyCompGaps = {
          weight: { current: weightKg, target: targetWeight, gap: targetWeight - weightKg },
          muscle: { current: currentMuscleMass, target: targetMuscle, gap: targetMuscle - currentMuscleMass },
          fat: { current: currentBF, target: targetBF, gap: targetBF - currentBF }
        };
      }
      
      let insight = '';
      if (visceral >= 12) {
        insight = `Visceral Fat Lvl ${visceral} indicates metabolic stress.`;
      } else if (bf > 0) {
        // Only show "high body fat" message if it's actually high
        const isHighBF = (gender === 'male' && bf > 20) || (gender === 'female' && bf > 28);
        const isMuscleGoal = primaryGoal === 'build-muscle' || goals.includes('build-muscle');
        
          if (isMuscleGoal) {
            status = 'green'; // Muscle building is usually a positive/growth phase
            insight = `Focusing on controlled weight gain to maximize hypertrophy. Target: ${targetWeight.toFixed(1)}kg (${targetValue}).`;
          } else if (isHighBF) {
          insight = `High body fat is creating metabolic drag.`;
        } else if ((gender === 'male' && bf <= 15) || (gender === 'female' && bf <= 22)) {
          insight = `Excellent body fat management. We'll optimize for peak performance.`;
        } else {
          insight = `Body fat is within a healthy range. Focus on maintaining while building muscle.`;
        }
      } else {
        insight = `Body composition assessment needed to set specific targets.`;
      }
      
      // Create descriptive labels
      let descriptiveCurrentLabel = '';
      if (bf === 0) {
        descriptiveCurrentLabel = 'Not Assessed';
      } else if ((gender === 'male' && bf <= 12) || (gender === 'female' && bf <= 18)) {
        descriptiveCurrentLabel = 'Elite Body Composition';
      } else if ((gender === 'male' && bf <= 15) || (gender === 'female' && bf <= 22)) {
        descriptiveCurrentLabel = 'Athlete Level';
      } else if ((gender === 'male' && bf <= 20) || (gender === 'female' && bf <= 28)) {
        descriptiveCurrentLabel = 'Healthy Range';
      } else {
        descriptiveCurrentLabel = 'Needs Improvement';
      }
      
      let descriptiveTargetLabel = '';
      if (targetValue === 'N/A') {
        descriptiveTargetLabel = 'Assessment Needed';
      } else {
        const targetBF = parseFloat(targetValue.replace('%', ''));
        if ((gender === 'male' && targetBF <= 12) || (gender === 'female' && targetBF <= 18)) {
          descriptiveTargetLabel = 'Elite Target';
        } else if ((gender === 'male' && targetBF <= 15) || (gender === 'female' && targetBF <= 22)) {
          descriptiveTargetLabel = 'Athlete Target';
        } else if ((gender === 'male' && targetBF <= 20) || (gender === 'female' && targetBF <= 28)) {
          descriptiveTargetLabel = 'Healthy Target';
        } else {
          descriptiveTargetLabel = 'Improved Range';
        }
      }
      
      // Compute body comp deltas (weight loss = good so invert, muscle gain = good, fat loss = good so invert)
      const bodyCompDeltas: GapDeltas = {};
      const weightDelta = numDelta('inbodyWeightKg');
      if (weightDelta !== undefined) bodyCompDeltas.weight = weightDelta;
      const muscleDelta = numDelta('skeletalMuscleMassKg');
      if (muscleDelta !== undefined) bodyCompDeltas.muscle = muscleDelta;
      const fatDelta = numDelta('inbodyBodyFatPct', true); // invert: lower fat = positive
      if (fatDelta !== undefined) bodyCompDeltas.fat = fatDelta;

      return {
        title: 'BODY COMPOSITION',
        icon: '⚖️',
        current: descriptiveCurrentLabel,
        currentLabel: descriptiveCurrentLabel,
        currentValue: currentValue,
        target: descriptiveTargetLabel,
        targetLabel: descriptiveTargetLabel,
        targetValue: targetValue,
        insight,
        status,
        bodyCompGaps,
        deltas: Object.keys(bodyCompDeltas).length > 0 ? bodyCompDeltas : undefined,
      };
    })();
    
    // Strength - Using new functional gaps calculation
    const strengthGap: GapAnalysisData = (() => {
      const genderKey = (gender || 'male') as 'male' | 'female';
      
      // Get ambition level for strength
      // Map strength options (10, 20, 30, 40) to ambition levels (health, active, athletic, elite)
      const strengthGoalValue = formData?.goalLevelStrength || '30';
      const strengthAmbitionMap: Record<string, string> = {
        '10': 'health',
        '20': 'active',
        '30': 'athletic',
        '40': 'elite'
      };
      const ambitionLevel = mapFitnessGoalLevel(strengthAmbitionMap[strengthGoalValue] || 'active');
      
      // Calculate functional gaps (pass grip method info for time-based targets)
      const functionalGaps = calculateFunctionalGaps(
        genderKey,
        bodyWeight,
        pushups,
        squats,
        plankTime,
        gripStrength > 0 ? gripStrength : undefined,
        gripCurrentTime,
        gripMethod,
        ambitionLevel,
        formData?.primaryTrainingStyle
      );
      
      // Determine overall status based on gaps
      const hasEnduranceData = pushups > 0 || squats > 0;
      const hasCoreData = plankTime > 0;
      const hasStrengthData = gripStrength > 0;
      
      let status: 'red' | 'yellow' | 'green' | 'gray' = 'gray';
      let currentValue = 'N/A';
      let currentLabel = 'Not measured';
      let targetValue = 'N/A';
      let targetLabel = 'Assessment needed';
      let insight = '';
      
      if (!hasEnduranceData && !hasCoreData && !hasStrengthData) {
        // No data at all
        insight = 'Functional strength assessment needed to establish baseline.';
      } else {
        // Determine status based on gaps (worst case)
        const gaps = [
          functionalGaps.endurance.gap,
          functionalGaps.core.gap,
          ...(functionalGaps.strength ? [functionalGaps.strength.gap] : [])
        ].filter(g => g !== undefined);
        
        const maxGap = Math.max(...gaps, 0);
        const totalGap = gaps.reduce((sum, g) => sum + g, 0);
        
        if (maxGap === 0 && totalGap === 0) {
          status = 'green';
          currentLabel = 'Target Achieved';
          insight = 'All functional strength targets met. Focus on maintenance and progression.';
        } else if (maxGap <= 10) {
          status = 'green';
          currentLabel = 'Near Target';
          insight = 'Functional strength is strong. Minor improvements will optimize performance.';
        } else if (maxGap <= 25) {
          status = 'yellow';
          currentLabel = 'Building Capacity';
          insight = 'Functional strength shows promise. Focused training will close the gaps.';
        } else {
          status = 'red';
          currentLabel = 'Needs Development';
          insight = 'Functional strength requires focused development across multiple domains.';
        }

        // Add contextual insight if available
        if (functionalGaps.contextualInsight) {
          insight = `${insight} ${functionalGaps.contextualInsight}`;
        }
        
        // Create summary current value (endurance total or grip strength)
        if (hasEnduranceData) {
          currentValue = `${functionalGaps.endurance.current} total reps`;
        } else if (hasStrengthData && functionalGaps.strength) {
          // Show grip strength based on method
          if (gripMethod === 'deadhang' && functionalGaps.strength.currentTime !== undefined) {
            currentValue = `${functionalGaps.strength.currentTime.toFixed(0)}s hang`;
          } else if (gripMethod === 'pinch' && functionalGaps.strength.currentTime !== undefined && gripStandardizedWeight) {
            currentValue = `${functionalGaps.strength.currentTime.toFixed(0)}s (${gripStandardizedWeight}kg)`;
          } else if (gripMethod === 'dynamometer') {
            currentValue = `${functionalGaps.strength.current.toFixed(1)} kg`;
          } else {
            currentValue = 'Assessment needed';
          }
        } else {
          currentValue = 'Assessment needed';
        }
        
        // Create summary target value
        if (hasEnduranceData) {
          targetValue = `${functionalGaps.endurance.target} total reps`;
          targetLabel = 'Functional Strength Target';
        } else if (hasStrengthData && functionalGaps.strength) {
          // Show grip strength target based on method
          if (gripMethod === 'deadhang' && functionalGaps.strength.targetTime !== undefined) {
            targetValue = `${functionalGaps.strength.targetTime.toFixed(0)}s hang`;
            targetLabel = 'Dead Hang Target';
          } else if (gripMethod === 'pinch' && functionalGaps.strength.targetTime !== undefined && gripStandardizedWeight) {
            targetValue = `${functionalGaps.strength.targetTime.toFixed(0)}s (${gripStandardizedWeight}kg)`;
            targetLabel = 'Pinch Test Target';
          } else if (gripMethod === 'dynamometer') {
            targetValue = `${functionalGaps.strength.target.toFixed(1)} kg`;
            targetLabel = 'Grip Strength Target';
          } else {
            targetValue = 'N/A';
          }
        } else {
          targetValue = 'N/A';
        }
      }
      
      // Compute strength deltas (higher reps/time/kg = better)
      const strengthDeltas: GapDeltas = {};
      const pushupDelta = numDelta('pushupsOneMinuteReps') ?? numDelta('pushupMaxReps');
      if (pushupDelta !== undefined) strengthDeltas.endurance = pushupDelta;
      const plankDelta = numDelta('plankDurationSeconds');
      if (plankDelta !== undefined) strengthDeltas.core = plankDelta;
      const gripDelta = numDelta('gripLeftKg') ?? numDelta('gripRightKg') ?? numDelta('gripDeadhangSeconds');
      if (gripDelta !== undefined) strengthDeltas.strength = gripDelta;

      return {
        title: 'FUNCTIONAL STRENGTH',
        icon: '💪',
        current: currentLabel,
        currentLabel: currentLabel,
        currentValue: currentValue,
        target: targetLabel,
        targetLabel: targetLabel,
        targetValue: targetValue,
        insight,
        status,
        // Store the functional gaps data for UI rendering
        functionalGaps,
        deltas: Object.keys(strengthDeltas).length > 0 ? strengthDeltas : undefined,
      };
    })();
    
    // Cardio - Use new cardio analysis calculation
    const cardioGap: GapAnalysisData = (() => {
      const cardio = scores.categories.find(c => c.id === 'cardio') || { score: 0 };
      const rhr = parseFloat(formData?.cardioRestingHr || '0');
      const peakHr = parseFloat(formData?.cardioPeakHr || '0');
      const recoveryHr = parseFloat(formData?.cardioPost1MinHr || '0');
      const hasTest = !!(formData?.cardioTestSelected && formData.cardioTestSelected.trim() !== '');
      
      // Get age and gender
      const age = formData?.dateOfBirth ? calculateAge(formData.dateOfBirth) : 40;
      const genderKey = (gender || 'male') as 'male' | 'female';
      
      // Get fitness ambition level
      const fitnessGoalValue = formData?.goalLevelFitness || 'active';
      const ambitionLevel = mapFitnessGoalLevel(fitnessGoalValue);
      
      // Calculate cardio gaps using new function
      const cardioGaps = calculateCardioAnalysis(
        age,
        genderKey,
        ambitionLevel,
        rhr,
        peakHr,
        recoveryHr,
        formData?.recentActivity
      );
      
      // Determine overall status based on gaps
      let status: 'red' | 'yellow' | 'green' | 'gray' = 'gray';
      let currentLabel = 'Not Assessed';
      let currentValue = 'N/A';
      let targetLabel = 'Assessment Needed';
      let targetValue = 'N/A';
      
      if (!hasTest && rhr === 0) {
        status = 'gray';
        currentLabel = 'Not Assessed';
        currentValue = 'N/A';
        targetLabel = 'Assessment Needed';
        targetValue = 'N/A';
      } else {
        // Determine status based on VO2 and gaps
        const vo2Gap = cardioGaps.vo2.gap;
        const rhrGap = cardioGaps.rhr.gap;
        const recoveryGap = cardioGaps.recovery.gap;
        
        // Overall status based on worst gap
        const maxGap = Math.max(vo2Gap, rhrGap, recoveryGap);
        
        if (maxGap === 0 && vo2Gap === 0 && rhrGap === 0 && recoveryGap === 0) {
          status = 'green';
          currentLabel = 'Target Achieved';
        } else if (maxGap <= 5) {
          status = 'green';
          currentLabel = 'Near Target';
        } else if (maxGap <= 15) {
          status = 'yellow';
          currentLabel = 'Building Capacity';
        } else {
          status = 'red';
          currentLabel = 'Needs Development';
        }
        
        // Build current value string
        const parts: string[] = [];
        if (cardioGaps.vo2.current > 0) {
          parts.push(`VO2: ${cardioGaps.vo2.current.toFixed(1)} ml/kg/min`);
        }
        if (rhr > 0) {
          parts.push(`RHR: ${rhr} bpm`);
        }
        if (recoveryHr > 0 && peakHr > 0) {
          parts.push(`Recovery: ${cardioGaps.recovery.current} bpm`);
        }
        currentValue = parts.length > 0 ? parts.join(', ') : 'N/A';
        
        // Build target value string
        const targetParts: string[] = [];
        if (cardioGaps.vo2.target > 0) {
          targetParts.push(`VO2: ${cardioGaps.vo2.target.toFixed(1)} ml/kg/min`);
        }
        if (cardioGaps.rhr.target > 0) {
          targetParts.push(`RHR: ${cardioGaps.rhr.target} bpm`);
        }
        if (cardioGaps.recovery.target > 0) {
          targetParts.push(`Recovery: ${cardioGaps.recovery.target} bpm`);
        }
        targetValue = targetParts.length > 0 ? targetParts.join(', ') : 'N/A';
        
        // Build target label
        const ambitionLabels = {
          'health': 'Health Focus (50th percentile)',
          'active': 'Active (75th percentile)',
          'athletic': 'Athletic (85th percentile)',
          'elite': 'Elite (95th percentile)'
        };
        targetLabel = ambitionLabels[ambitionLevel] || 'Fitness Target';
      }
      
      let insight = '';
      if (!hasTest && rhr === 0) {
        insight = 'Cardio assessment needed to establish baseline.';
      } else if (cardioGaps.vo2.gap > 10) {
        insight = 'Improving cardiovascular fitness will boost energy and recovery.';
      } else if (cardioGaps.recovery.gap > 10) {
        insight = 'Slow heart rate recovery indicates poor aerobic conditioning.';
      } else if (cardioGaps.rhr.gap > 10) {
        insight = 'Elevated resting heart rate suggests need for cardiovascular training.';
      } else if (status === 'green') {
        insight = 'Strong cardiovascular base. We\'ll optimize for peak performance.';
      } else {
        insight = 'Building aerobic capacity will enhance overall performance.';
      }

      // Add safety notice if available
      if (cardioGaps.safetyNotice) {
        insight = `${insight} ${cardioGaps.safetyNotice}`;
      }
      
      // Compute cardio deltas (lower RHR = better so invert, higher VO2 = better, lower recovery = better so invert)
      const cardioDeltas: GapDeltas = {};
      const rhrDelta = numDelta('cardioRestingHr', true); // lower is better
      if (rhrDelta !== undefined) cardioDeltas.rhr = rhrDelta;
      const vo2Delta = numDelta('cardioVo2MaxEstimate'); // higher is better
      if (vo2Delta !== undefined) cardioDeltas.vo2 = vo2Delta;
      const recoveryDelta = numDelta('cardioPost1MinHr', true); // lower recovery HR is better
      if (recoveryDelta !== undefined) cardioDeltas.recovery = recoveryDelta;

      return {
        title: 'METABOLIC HEALTH',
        icon: '❤️',
        current: currentLabel,
        currentLabel: currentLabel,
        currentValue: currentValue,
        target: targetLabel,
        targetLabel: targetLabel,
        targetValue: targetValue,
        insight,
        status,
        // Store the cardio gaps data for UI rendering
        cardioGaps,
        deltas: Object.keys(cardioDeltas).length > 0 ? cardioDeltas : undefined,
      };
    })();
    
    return [bodyCompGap, strengthGap, cardioGap];
  }, [scores, formData, previousFormData]);
}

