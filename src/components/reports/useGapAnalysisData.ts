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
  functionalGaps?: {
    endurance: { current: number; target: number; gap: number };
    core: { current: number; target: number; gap: number };
    strength?: { current: number; target: number; gap: number };
  };
  cardioGaps?: {
    vo2: { current: number; target: number; gap: number };
    rhr: { current: number; target: number; gap: number };
    recovery: { current: number; target: number; gap: number };
  };
}

export function useGapAnalysisData(scores: ScoreSummary, formData?: FormData): GapAnalysisData[] {
  return useMemo(() => {
    const gender = (formData?.gender || '').toLowerCase();
    const bf = parseFloat(formData?.inbodyBodyFatPct || '0');
    const visceral = parseFloat(formData?.visceralFatLevel || '0');
    const pushups = parseFloat(formData?.pushupsOneMinuteReps || formData?.pushupMaxReps || '0');
    const squats = parseFloat(formData?.squatsOneMinuteReps || '0');
    const plankTime = parseFloat(formData?.plankDurationSeconds || '0');
    const gripLeft = parseFloat(formData?.gripLeftKg || '0');
    const gripRight = parseFloat(formData?.gripRightKg || '0');
    const gripStrength = Math.max(gripLeft, gripRight); // Use max of left/right
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
      
      if (bf === 0) {
        targetValue = 'N/A';
        targetLabel = 'Assessment needed';
      } else {
        const currentBF = bf;
        const weightKg = parseFloat(formData?.inbodyWeightKg || '0');
        let targetBF = 0;
        
        // For weight loss goals, calculate target body fat based on weight loss percentage
        // For muscle building without weight loss, we might maintain or slightly increase
        // For body recomposition, we lose fat while building muscle (slight deficit)
        const isWeightLossGoal = primaryGoal === 'weight-loss' || goals.includes('weight-loss');
        const isBodyRecomp = primaryGoal === 'body-recomposition' || goals.includes('body-recomposition');
        
        if (isBodyRecomp && weightKg > 0) {
          // Body recomposition: Use new calculation function
          const recompLevel = (goalLevel || 'athletic') as 'healthy' | 'fit' | 'athletic' | 'shredded';
          const genderKey = gender as 'male' | 'female';
          
          // Get target body fat percentage from level
          const targetBodyFat = getTargetBodyFatFromLevel(recompLevel, genderKey);
          const targetBFRange = getBodyFatRange(recompLevel, genderKey);
          
          // Calculate target weight and muscle mass using the new function
          const currentMuscleMass = parseFloat(formData?.skeletalMuscleMassKg || '0');
          const recompResult = calculateBodyRecomposition(
            weightKg,
            currentBF,
            targetBodyFat,
            genderKey,
            currentMuscleMass > 0 ? currentMuscleMass : undefined
          );
          
          // Use the target body fat directly from the calculation
          // The calculateBodyRecomposition function already accounts for muscle gain
          // so we use the targetBodyFat that was used in the calculation
          targetBF = targetBodyFat;
          
          // Ensure target is realistic and never higher than current
          targetBF = Math.max(
            gender === 'male' ? 8 : 15,
            Math.min(targetBF, currentBF - 1)
          );
          
          const levelLabel = recompLevel.charAt(0).toUpperCase() + recompLevel.slice(1);
          targetLabel = `${levelLabel} (${targetBFRange[0]}-${targetBFRange[1]}% BF)`;
        } else if (isWeightLossGoal && weightKg > 0) {
          // Parse weight loss percentage (e.g., "15" = 15%)
          const weightLossPct = parseFloat(goalLevel) || 15;
          const targetWeightLossKg = (weightKg * weightLossPct) / 100;
          const targetWeightKg = weightKg - targetWeightLossKg;
          
          // Calculate current fat mass and lean mass
          const currentFatMassKg = (weightKg * currentBF) / 100;
          const currentLeanMassKg = weightKg - currentFatMassKg;
          
          // Assume we lose mostly fat (80% fat, 20% lean mass loss)
          const fatLossKg = targetWeightLossKg * 0.8;
          const targetFatMassKg = Math.max(0, currentFatMassKg - fatLossKg);
          const targetLeanMassKg = currentLeanMassKg - (targetWeightLossKg * 0.2);
          
          // Calculate target body fat percentage
          if (targetWeightKg > 0) {
            targetBF = (targetFatMassKg / targetWeightKg) * 100;
          } else {
            targetBF = currentBF * 0.75; // Fallback
          }
          
          // Ensure target is realistic and never higher than current
          targetBF = Math.max(
            gender === 'male' ? 12 : 18,
            Math.min(targetBF, currentBF - 2)
          );
          
          targetLabel = `${weightLossPct}% Weight Loss Target`;
        } else {
          // For muscle building goals, maintain or slightly reduce body fat
          const muscleGainKg = parseFloat(goalLevel) || 6;
          // When building muscle, body fat % typically decreases slightly due to increased lean mass
          // Calculate assuming we add muscle and maintain similar fat mass
          const currentFatMassKg = (weightKg * currentBF) / 100;
          const newWeightKg = weightKg + muscleGainKg;
          if (newWeightKg > 0) {
            targetBF = (currentFatMassKg / newWeightKg) * 100;
          } else {
            targetBF = currentBF * 0.95; // Slight reduction
          }
          
          // Ensure target is realistic
          targetBF = Math.max(
            gender === 'male' ? 12 : 18,
            Math.min(targetBF, currentBF)
          );
          
          targetLabel = `${muscleGainKg} kg Muscle Gain Target`;
        }
        
        targetValue = `${Math.round(targetBF)}%`;
      }
      
      let insight = '';
      if (visceral >= 12) {
        insight = `Visceral Fat Lvl ${visceral} indicates metabolic stress.`;
      } else if (bf > 0) {
        // Only show "high body fat" message if it's actually high
        const isHighBF = (gender === 'male' && bf > 20) || (gender === 'female' && bf > 28);
        if (isHighBF) {
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
        status
      };
    })();
    
    // Strength - Using new functional gaps calculation
    const strengthGap: GapAnalysisData = (() => {
      const genderKey = (gender || 'male') as 'male' | 'female';
      
      // Calculate functional gaps
      const functionalGaps = calculateFunctionalGaps(
        genderKey,
        bodyWeight,
        pushups,
        squats,
        plankTime,
        gripStrength > 0 ? gripStrength : undefined
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
        
        // Create summary current value (endurance total)
        if (hasEnduranceData) {
          currentValue = `${functionalGaps.endurance.current} total reps`;
        } else {
          currentValue = 'Assessment needed';
        }
        
        // Create summary target value
        if (hasEnduranceData) {
          targetValue = `${functionalGaps.endurance.target} total reps`;
          targetLabel = 'Functional Strength Target';
        } else {
          targetValue = 'N/A';
        }
      }
      
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
        functionalGaps
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
      const goalLevel = primaryGoal === 'improve-fitness' 
        ? (formData?.goalLevelFitness || 'active')
        : 'active';
      const ambitionLevel = mapFitnessGoalLevel(goalLevel);
      
      // Calculate cardio gaps using new function
      const cardioGaps = calculateCardioAnalysis(
        age,
        genderKey,
        ambitionLevel,
        rhr,
        peakHr,
        recoveryHr
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
        cardioGaps
      };
    })();
    
    return [bodyCompGap, strengthGap, cardioGap];
  }, [scores, formData]);
}

