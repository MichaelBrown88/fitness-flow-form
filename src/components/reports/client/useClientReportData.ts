import { useMemo } from 'react';
import type { FormData } from '@/contexts/FormContext';
import type { ScoreSummary } from '@/lib/scoring';
import type { CoachPlan } from '@/lib/recommendations';
import { determineArchetype } from '@/lib/clientArchetypes';
import { CATEGORY_ORDER, niceLabel } from '../ClientReportConstants';
import { useGapAnalysisData } from '../useGapAnalysisData';
import { calculateAge } from '@/lib/scoring';
import { calculateBodyRecomposition, getTargetBodyFatFromLevel, getBodyFatRange } from '@/lib/utils/bodyRecomposition';
import { generateBlueprint } from '@/lib/strategy/blueprintEngine';
import { getEffectiveGoalLevels } from '@/lib/goals/achievableLandmarks';

export interface UseClientReportDataProps {
  scores: ScoreSummary;
  goals?: string[];
  formData?: FormData;
  previousScores?: ScoreSummary | null;
  previousFormData?: FormData;
}

export function useClientReportData({
  scores,
  goals,
  formData,
  previousScores,
  previousFormData,
}: UseClientReportDataProps) {
  const safeScores = useMemo(() => {
    if (scores && scores.categories) return scores;
    return { overall: 0, categories: [], grade: 'N/A', percentile: 0 } as unknown as ScoreSummary;
  }, [scores]);

  const orderedCats = useMemo(
    () => safeScores.categories ? CATEGORY_ORDER.map(id => safeScores.categories.find(c => c.id === (id as 'bodyComp' | 'strength' | 'cardio' | 'movementQuality' | 'lifestyle'))).filter(Boolean) as ScoreSummary['categories'] : [],
    [safeScores.categories]
  );
  
  const archetype = useMemo(() => determineArchetype(safeScores, formData), [safeScores, formData]);
  
  const strengths = useMemo(() => {
    return orderedCats
      .filter(cat => cat.score >= 70 && cat.strengths.length > 0)
      .flatMap(cat => 
        cat.strengths.map(s => ({
          category: niceLabel(cat.id),
          strength: s,
          score: cat.score
        }))
      )
      .slice(0, 3);
  }, [orderedCats]);
  
  const areasForImprovement = useMemo(() => {
    return orderedCats
      .filter(cat => cat.weaknesses.length > 0)
      .flatMap(cat => 
        cat.weaknesses
          .filter(w => {
            if (cat.score >= 70) {
              const text = w.toLowerCase();
              return text.includes('optimization') || 
                     text.includes('refining') ||
                     text.includes('refinement') ||
                     text.includes('potential') ||
                     text.includes('peak') ||
                     text.includes('focus now shifts') ||
                     text.includes('enhance') ||
                     text.includes('build');
            }
            return true;
          })
          .map(w => ({
            category: niceLabel(cat.id),
            weakness: w,
            score: cat.score
          }))
      )
      .slice(0, 3);
  }, [orderedCats]);
  
  const isBodyRecomp = useMemo(() => (goals || [])[0] === 'body-recomposition' || (goals || []).includes('body-recomposition'), [goals]);
  
  const weeksByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    const primaryGoal = (goals || [])[0] || 'general-health';
    const effectiveLevels = getEffectiveGoalLevels(primaryGoal, formData);
    const weightKg = parseFloat(formData?.inbodyWeightKg || '0');
    
    const levelWL = effectiveLevels.goalLevelWeightLoss;
    let wlTarget = 0;
    if (weightKg > 0 && !isBodyRecomp) {
      if (levelWL.includes('kg')) {
        wlTarget = parseFloat(levelWL.replace('kg', '')) || 5;
      } else {
        const weightLossPct = parseFloat(levelWL) || 15;
        wlTarget = (weightKg * weightLossPct) / 100;
      }
      if (wlTarget < 0) wlTarget = 0;
    }
    const fatLossRate = 0.5;
    const fatLossWeeks = wlTarget > 0 ? Math.ceil(wlTarget / fatLossRate) : 16;
    
    const levelBR = effectiveLevels.goalLevelBodyRecomp;
    let recompWeeks = 0;
    if (isBodyRecomp && weightKg > 0) {
      const bf = parseFloat(formData?.inbodyBodyFatPct || '0');
      const gender = (formData?.gender || 'male').toLowerCase() as 'male' | 'female';
      if (bf > 0) {
        const targetBodyFat = getTargetBodyFatFromLevel(levelBR as 'healthy' | 'fit' | 'athletic' | 'shredded', gender);
        const currentMuscleMass = parseFloat(formData?.skeletalMuscleMassKg || '0');
        const recompResult = calculateBodyRecomposition(
          weightKg,
          bf,
          targetBodyFat,
          gender,
          currentMuscleMass > 0 ? currentMuscleMass : undefined
        );
        
        const currentFatMassKg = (weightKg * bf) / 100;
        const targetFatMassKg = (recompResult.targetWeight * targetBodyFat) / 100;
        const fatLossKg = Math.max(0, currentFatMassKg - targetFatMassKg);
        
        const fatLossRateRecomp = 0.3;
        recompWeeks = fatLossKg > 0 ? Math.ceil(fatLossKg / fatLossRateRecomp) : 20;
      } else {
        recompWeeks = 20;
      }
    }
    
    const levelMG = effectiveLevels.goalLevelMuscle;
    const muscleTargetKg = parseFloat(levelMG) || 6;
    
    const history = formData?.trainingHistory || 'beginner';
    let muscleRate = 0.25; 
    if (history === 'intermediate') muscleRate = 0.125;
    if (history === 'advanced') muscleRate = 0.05;
    
    let muscleWeeks = Math.ceil(muscleTargetKg / muscleRate);
    
    const strengthScore = safeScores.categories.find(c => c.id === 'strength')?.score || 0;
    if (strengthScore > 70 && history !== 'beginner') muscleWeeks = Math.round(muscleWeeks * 0.7);
    
    const levelST = effectiveLevels.goalLevelStrength;
    const strengthPct = parseFloat(levelST) || 30;
    
    let strengthRate = 1.0;
    if (history === 'beginner') strengthRate = 2.0;
    else if (history === 'intermediate') strengthRate = 1.0;
    else if (history === 'advanced') strengthRate = 0.5;
    
    let strengthWeeks = Math.ceil(strengthPct / strengthRate);
    strengthWeeks = Math.max(8, Math.min(36, strengthWeeks));
    
    const levelFT = effectiveLevels.goalLevelFitness;
    const cardioWeeks = levelFT === 'elite' ? 20 : levelFT === 'athletic' ? 16 : levelFT === 'active' ? 12 : 8;
    const mobilityWeeks = 6;
    const postureWeeks = 6;
    
    for (const cat of orderedCats) {
      let base = 12;
      if (cat.id === 'bodyComp') {
        if (isBodyRecomp) {
          base = Math.max(12, recompWeeks);
        } else {
          base = Math.max(12, Math.max(fatLossWeeks, muscleWeeks));
        }
      }
      if (cat.id === 'strength') base = strengthWeeks;
      if (cat.id === 'cardio') base = Math.max(8, cardioWeeks);
      if (cat.id === 'movementQuality') base = Math.max(mobilityWeeks, postureWeeks);
      if (cat.id === 'lifestyle') base = 4;
      map[cat.id] = base;
    }
    return map;
  }, [orderedCats, formData, isBodyRecomp, safeScores.categories, goals]);
  
  const maxWeeks = useMemo(() => Math.max(...orderedCats.map(c => weeksByCategory[c.id] ?? 0), 0), [orderedCats, weeksByCategory]);
  
  const clientName = (formData?.fullName || '').trim();
  const primaryGoal = goals && goals.length > 0 ? goals[0] : 'general-health';
  const goalLabel = primaryGoal === 'weight-loss' ? 'Weight Loss' : 
                    primaryGoal === 'build-muscle' ? 'Muscle Gain' :
                    primaryGoal === 'build-strength' ? 'Strength' :
                    primaryGoal === 'improve-fitness' ? 'Fitness' : 'General Health';
  
  const hasAnyData = useMemo(() => {
    if (!formData) return false;
    const hasBodyComp = !!(formData.inbodyWeightKg && parseFloat(formData.inbodyWeightKg || '0') > 0);
    const hasStrength = !!(formData.pushupMaxReps && parseFloat(formData.pushupMaxReps || '0') > 0) ||
                        !!(formData.pushupsOneMinuteReps && parseFloat(formData.pushupsOneMinuteReps || '0') > 0);
    const hasCardio = !!(formData.cardioRestingHr && parseFloat(formData.cardioRestingHr || '0') > 0);
    const hasPosture = !!(formData.postureAiResults || formData.postureHeadOverall || formData.postureShouldersOverall);
    const hasLifestyle = !!(formData.sleepQuality || formData.stressLevel || formData.hydrationHabits || 
                           formData.nutritionHabits || (formData.stepsPerDay && parseFloat(formData.stepsPerDay || '0') > 0));
    return hasBodyComp || hasStrength || hasCardio || hasPosture || hasLifestyle;
  }, [formData]);
  
  const overallRadarData = useMemo(() => {
    return orderedCats.map(cat => ({
      name: niceLabel(cat.id),
      fullLabel: niceLabel(cat.id),
      value: cat.score,
      color: '#3b82f6',
    }));
  }, [orderedCats]);
  
  const previousRadarData = useMemo(() => {
    if (!previousScores || !previousScores.categories) return undefined;
    const prevOrderedCats = CATEGORY_ORDER.map(id => 
      previousScores.categories.find(c => c.id === (id as 'bodyComp' | 'strength' | 'cardio' | 'movementQuality' | 'lifestyle'))
    ).filter(Boolean) as ScoreSummary['categories'];
    
    return prevOrderedCats.map(cat => ({
      name: niceLabel(cat.id),
      fullLabel: niceLabel(cat.id),
      value: cat.score,
      color: '#3b82f6',
    }));
  }, [previousScores]);

  const gapAnalysisData = useGapAnalysisData(safeScores, formData, previousFormData);

  // Compute previous gap analysis data (raw metric values from the prior assessment)
  // so the UI can animate from old to new values.
  const safePreviousScores = useMemo(() => {
    if (previousScores && previousScores.categories) return previousScores;
    return null;
  }, [previousScores]);

  const previousGapAnalysisData = useGapAnalysisData(
    safePreviousScores ?? safeScores,
    previousFormData ?? formData,
    undefined,
  );
  // previousGapAnalysisData only contains meaningful values if previousFormData exists.
  // If not, it mirrors current data (no animation needed).
  
  const reportDate = useMemo(() => {
    const date = new Date();
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }, []);

  const blueprintPillars = useMemo(() => {
    if (!formData || !safeScores) return [];
    
    const pillars = generateBlueprint(formData, safeScores);
    
    return pillars.map((pillar, idx) => ({
      title: pillar.title,
      weeks: pillar.timeframe,
      color: pillar.color,
      headline: pillar.focus,
      description: pillar.description,
      protocol: pillar.protocol,
      order: idx + 1,
      category: pillar.category
    }));
  }, [safeScores, formData]);

  return {
    safeScores,
    orderedCats,
    archetype,
    strengths,
    areasForImprovement,
    isBodyRecomp,
    weeksByCategory,
    maxWeeks,
    clientName,
    primaryGoal,
    goalLabel,
    hasAnyData,
    overallRadarData,
    previousRadarData,
    gapAnalysisData,
    previousGapAnalysisData: previousFormData ? previousGapAnalysisData : undefined,
    reportDate,
    blueprintPillars,
  };
}
