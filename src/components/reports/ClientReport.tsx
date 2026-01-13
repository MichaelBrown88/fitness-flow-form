/**
 * Simplified Client Report
 * Clean, focused report structure:
 * 1. Where you're at now (Scores, Archetype, Gap Analysis, Strengths/Weaknesses, Lifestyle)
 * 2. Where you want to get to (Goals, Issue Resolution)
 * 3. How we'll help (Blueprint, Sample Workout, Timeline)
 */

import React, { useMemo, useState, lazy, Suspense } from 'react';
import type { FormData } from '@/contexts/FormContext';
import type { ScoreSummary } from '@/lib/scoring';
import type { CoachPlan } from '@/lib/recommendations';
import { determineArchetype } from '@/lib/clientArchetypes';
import { Blueprint } from './Blueprint';
import { ClientReportRoadmap } from './ClientReportRoadmap';
import OverallRadarChart from './OverallRadarChart';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Scale, Dumbbell, Heart, CheckCircle2, AlertCircle,
  Activity, BarChart3, Target, Trophy, Clock, 
  Flame, Zap, Lock, MessageSquare, Repeat, Play, ArrowRight, Lightbulb, Loader2
} from 'lucide-react';
import { CATEGORY_ORDER, circleColor, niceLabel } from './ClientReportConstants';
import { useGapAnalysisData } from './useGapAnalysisData';
import { LifestyleFactorsBar } from './LifestyleFactorsBar';
import { MovementPostureMobility } from './MovementPostureMobility';
const CoachReport = lazy(() => import('./CoachReport'));
import { generateBodyCompInterpretation } from '@/lib/recommendations';
import { calculateAge } from '@/lib/scoring';
import { calculateBodyRecomposition, getTargetBodyFatFromLevel, getBodyFatRange } from '@/lib/utils/bodyRecomposition';
import { generateBlueprint } from '@/lib/strategy/blueprintEngine';

// Helper function to truncate insights to consistent length
const truncateInsight = (insight: string, maxLength: number = 120): string => {
  if (!insight || insight.length <= maxLength) return insight;
  // Truncate at the last complete sentence before maxLength
  const truncated = insight.substring(0, maxLength);
  const lastPeriod = truncated.lastIndexOf('.');
  const lastSpace = truncated.lastIndexOf(' ');
  
  // Prefer ending at a sentence, otherwise at a word
  if (lastPeriod > maxLength * 0.7) {
    return truncated.substring(0, lastPeriod + 1);
  } else if (lastSpace > maxLength * 0.7) {
    return truncated.substring(0, lastSpace) + '...';
  }
  return truncated + '...';
};

export default function ClientReport({
  scores,
  goals,
  formData,
  plan,
  bodyComp,
  previousScores,
  standalone = true,
}: {
  scores: ScoreSummary;
  goals?: string[];
  formData?: FormData;
  plan?: CoachPlan;
  bodyComp?: { timeframeWeeks: number };
  previousScores?: ScoreSummary | null;
  standalone?: boolean;
}) {
  const safeScores = useMemo(() => {
    if (scores && scores.categories) return scores;
    return { overall: 0, categories: [], grade: 'N/A', percentile: 0 } as unknown as ScoreSummary;
  }, [scores]);

  const orderedCats = useMemo(
    () => safeScores.categories ? CATEGORY_ORDER.map(id => safeScores.categories.find(c => c.id === (id as 'bodyComp' | 'strength' | 'cardio' | 'movementQuality' | 'lifestyle'))).filter(Boolean) as ScoreSummary['categories'] : [],
    [safeScores.categories]
  );
  
  const archetype = useMemo(() => determineArchetype(safeScores, formData), [safeScores, formData]);
  
  // Strengths and areas for improvement - only show if data is consistent
  const strengths = useMemo(() => {
    return orderedCats
      .filter(cat => cat.score >= 70 && cat.strengths.length > 0) // Only categories with good scores
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
      .filter(cat => {
        // Show actual weaknesses (score < 70) 
        // OR show optimizations (score >= 70) if they have relevant optimization messages
        const hasWeaknesses = cat.weaknesses.length > 0;
        return hasWeaknesses;
      })
      .flatMap(cat => 
        cat.weaknesses
          .filter(w => {
            // If score is high, only show messages about optimization/potential/focus
            // If score is low, show everything
            if (cat.score >= 70) {
              const text = w.toLowerCase();
              const isOptimization = text.includes('optimization') || 
                                     text.includes('refining') ||
                                     text.includes('refinement') ||
                                     text.includes('potential') ||
                                     text.includes('peak') ||
                                     text.includes('focus now shifts') ||
                                     text.includes('enhance') ||
                                     text.includes('build');
              return isOptimization;
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
  
  // Check if body recomposition is the goal (needed throughout component)
  const isBodyRecomp = (goals || [])[0] === 'body-recomposition' || (goals || []).includes('body-recomposition');
  
  // Calculate weeks for roadmap
  const weeksByCategory: Record<string, number> = useMemo(() => {
    const map: Record<string, number> = {};
    const weightKg = parseFloat(formData?.inbodyWeightKg || '0');
    const heightM = (parseFloat(formData?.heightCm || '0') || 0) / 100;
    const healthyMax = heightM > 0 ? 25 * heightM * heightM : 0;
    const primaryGoal = (goals || [])[0] || 'general-health';
    
    const levelWL = formData?.goalLevelWeightLoss || '15';
    let wlTarget = 0;
    if (weightKg > 0 && !isBodyRecomp) {
      if (levelWL.includes('kg')) {
        wlTarget = parseFloat(levelWL.replace('kg', '')) || 5;
      } else {
      // Parse weight loss percentage (e.g., "15" = 15%)
      const weightLossPct = parseFloat(levelWL) || 15;
      wlTarget = (weightKg * weightLossPct) / 100;
      }
      if (wlTarget < 0) wlTarget = 0;
    }
    const fatLossRate = 0.5;
    const fatLossWeeks = wlTarget > 0 ? Math.ceil(wlTarget / fatLossRate) : 16;
    
    // Body recomposition: slower fat loss rate (slight deficit) + muscle gain
    const levelBR = formData?.goalLevelBodyRecomp || 'athletic';
    let recompWeeks = 0;
    if (isBodyRecomp && weightKg > 0) {
      const bf = parseFloat(formData?.inbodyBodyFatPct || '0');
      const gender = (formData?.gender || 'male').toLowerCase() as 'male' | 'female';
      if (bf > 0) {
        // Use new body recomposition calculation function
        const targetBodyFat = getTargetBodyFatFromLevel(levelBR as 'healthy' | 'fit' | 'athletic' | 'shredded', gender);
        const currentMuscleMass = parseFloat(formData?.skeletalMuscleMassKg || '0');
        const recompResult = calculateBodyRecomposition(
          weightKg,
          bf,
          targetBodyFat,
          gender,
          currentMuscleMass > 0 ? currentMuscleMass : undefined
        );
        
        // Calculate fat loss needed (current fat mass - target fat mass at target weight)
        const currentFatMassKg = (weightKg * bf) / 100;
        const targetFatMassKg = (recompResult.targetWeight * targetBodyFat) / 100;
        const fatLossKg = Math.max(0, currentFatMassKg - targetFatMassKg);
        
        // Body recomposition is slower - use 0.3kg/week fat loss rate (slight deficit)
        const fatLossRateRecomp = 0.3;
        recompWeeks = fatLossKg > 0 ? Math.ceil(fatLossKg / fatLossRateRecomp) : 20;
      } else {
        recompWeeks = 20; // Default if no body fat data
      }
    }
    
    const levelMG = formData?.goalLevelMuscle || '6';
    const muscleTargetKg = parseFloat(levelMG) || 6;
    
    // Dynamic muscle rate based on experience level
    // Beginner: ~1kg/month (0.25kg/week), Intermediate: ~0.5kg/month (0.125kg/week), Advanced: ~0.2kg/month (0.05kg/week)
    const history = formData?.trainingHistory || 'beginner';
    let muscleRate = 0.25; 
    if (history === 'intermediate') muscleRate = 0.125;
    if (history === 'advanced') muscleRate = 0.05;
    
    let muscleWeeks = Math.ceil(muscleTargetKg / muscleRate);
    
    // Reduce timeline if they are already strong/athletic (muscle gain is more about refinement)
    const strengthScore = safeScores.categories.find(c => c.id === 'strength')?.score || 0;
    if (strengthScore > 70 && history !== 'beginner') muscleWeeks = Math.round(muscleWeeks * 0.7);
    
    const levelST = formData?.goalLevelStrength || '30';
    const strengthPct = parseFloat(levelST) || 30;
    
    // Faster strength progression based on experience level
    // Beginner: 2% per week, Intermediate: 1% per week, Advanced: 0.5% per week
    let strengthRate = 1.0;
    if (history === 'beginner') strengthRate = 2.0;
    else if (history === 'intermediate') strengthRate = 1.0;
    else if (history === 'advanced') strengthRate = 0.5;
    
    let strengthWeeks = Math.ceil(strengthPct / strengthRate);
    
    // Minimum 8 weeks for meaningful adaptation, but cap at 24 weeks per phase
    strengthWeeks = Math.max(8, Math.min(36, strengthWeeks));
    
    const levelFT = formData?.goalLevelFitness || 'active';
    // Fitness weeks based on ambition level
    // Health: 8 weeks, Active: 12 weeks, Athletic: 16 weeks, Elite: 20 weeks
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
  }, [orderedCats, formData, goals, isBodyRecomp, safeScores.categories]);
  
  const maxWeeks = useMemo(() => Math.max(...orderedCats.map(c => weeksByCategory[c.id] ?? 0), 0), [orderedCats, weeksByCategory]);
  
  const clientName = (formData?.fullName || '').trim();
  const primaryGoal = goals && goals.length > 0 ? goals[0] : 'general-health';
  const goalLabel = primaryGoal === 'weight-loss' ? 'Weight Loss' : 
                    primaryGoal === 'build-muscle' ? 'Muscle Gain' :
                    primaryGoal === 'build-strength' ? 'Strength' :
                    primaryGoal === 'improve-fitness' ? 'Fitness' : 'General Health';
  
  // State for roadmap slider
  const [sessionsPerWeek, setSessionsPerWeek] = useState(3);
  // In standalone/public mode, always show client report (no coach tab)
  const [activeView, setActiveView] = useState<'client' | 'coach'>(standalone ? 'client' : 'client');
  
  // Force client view if standalone (prevent switching to coach report)
  React.useEffect(() => {
    if (standalone && activeView === 'coach') {
      setActiveView('client');
    }
  }, [standalone, activeView]);
  
  // Check if form has data
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
  

  
  // Prepare radar chart data - use full labels
  const overallRadarData = useMemo(() => {
    return orderedCats.map(cat => ({
      name: niceLabel(cat.id), // Full label, not abbreviated
      fullLabel: niceLabel(cat.id),
      value: cat.score,
      color: '#3b82f6',
    }));
  }, [orderedCats]);
  
  // Prepare previous radar chart data for comparison
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

  // Get gap analysis data
  const gapAnalysisData = useGapAnalysisData(safeScores, formData);
  
  // Format date
  const reportDate = useMemo(() => {
    const date = new Date();
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }, []);

  // Get blueprint pillars data - using centralized strategy engine
  const blueprintPillars = useMemo(() => {
    if (!formData || !safeScores) return [];
    
    const pillars = generateBlueprint(formData, safeScores);
    
    // Map to component format (add order field)
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
  
  // Responsive container with proper padding and max-width
  const containerClass = standalone 
    ? "min-h-screen bg-zinc-50 text-zinc-900 px-3 sm:px-4 md:px-6 lg:px-8 xl:px-12 py-2 sm:py-4 md:py-6 lg:py-8 xl:py-12 overflow-x-hidden"
    : "w-full text-zinc-900 overflow-x-hidden";
  if (!scores || !scores.categories || scores.categories.length === 0 || !hasAnyData) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-semibold mb-2">No assessment data available</p>
        <p>Please complete at least one section of the assessment to generate a report.</p>
      </div>
    );
  }

  const contentClass = standalone
    ? "max-w-[1400px] mx-auto space-y-4 sm:space-y-6 md:space-y-8 lg:space-y-10 xl:space-y-12 2xl:space-y-16 w-full min-w-0"
    : "space-y-4 sm:space-y-6 md:space-y-8 lg:space-y-10 xl:space-y-12 2xl:space-y-16 w-full min-w-0";
  
  return (
    <div className={containerClass}>
      <div className={`${contentClass} overflow-x-hidden`}>
        
      {/* Header */}
        <div className="space-y-2 sm:space-y-3 md:space-y-4 lg:space-y-5 xl:space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-3 md:gap-4 lg:gap-6">
            <div className="space-y-1 sm:space-y-1.5 md:space-y-2">
              <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
                <span className="inline-flex items-center rounded-full glass-label px-2 sm:px-2.5 md:px-3 py-0.5 sm:py-1 text-[9px] sm:text-[10px] md:text-xs font-semibold text-zinc-700">
                  Assessment Report
                </span>
                <span className="text-[9px] sm:text-[10px] md:text-xs text-zinc-400 font-medium">{reportDate}</span>
              </div>
              <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl 2xl:text-5xl font-black tracking-tight text-zinc-900 leading-tight">
                {clientName || 'Your Assessment Report'}
        </h1>
              <p className="text-[10px] sm:text-xs md:text-sm lg:text-base text-zinc-500 font-medium leading-snug">
                Your personalized journey to better health and performance.
              </p>
            </div>
            
            {/* Only show toggle if not in standalone/public mode */}
            {!standalone && (
              <div className="flex glass-button p-1.5 rounded-2xl gap-1">
                <button 
                  onClick={() => setActiveView('client')}
                  className={`px-6 py-2.5 text-sm font-semibold rounded-xl transition-apple ${
                    activeView === 'client' 
                      ? 'glass-button-active' 
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  Client Report
                </button>
                <button 
                  onClick={() => setActiveView('coach')}
                  className={`px-6 py-2.5 text-sm font-semibold rounded-xl transition-apple ${
                    activeView === 'coach' 
                      ? 'glass-button-active' 
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  Coach Report
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Client Info Bar */}
        {formData && (
          <div className="glass-subtle rounded-lg sm:rounded-xl px-2 sm:px-3 md:px-4 lg:px-5 py-1.5 sm:py-2 md:py-2.5 lg:py-3 mb-2 sm:mb-3 md:mb-4 lg:mb-5">
            <div className="flex flex-nowrap items-center gap-x-1.5 sm:gap-x-2 md:gap-x-3 lg:gap-x-4 overflow-x-auto scrollbar-hide text-[8px] sm:text-[9px] md:text-[10px]">
              {formData.gender && (
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-zinc-500">Gender</span>
                  <span className="text-zinc-700 font-semibold capitalize">{formData.gender}</span>
            </div>
              )}
              {formData.dateOfBirth && (
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-zinc-500">•</span>
                  <span className="text-zinc-500">Age</span>
                  <span className="text-zinc-700 font-semibold">{calculateAge(formData.dateOfBirth)}</span>
          </div>
              )}
              {formData.heightCm && parseFloat(formData.heightCm) > 0 && (
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-zinc-500">•</span>
                  <span className="text-zinc-500">Height</span>
                  <span className="text-zinc-700 font-semibold">
                    {parseFloat(formData.heightCm) >= 100 
                      ? `${(parseFloat(formData.heightCm) / 100).toFixed(2)} m`
                      : `${formData.heightCm} cm`
                    }
                  </span>
        </div>
              )}
              {formData.inbodyWeightKg && parseFloat(formData.inbodyWeightKg) > 0 && (
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-zinc-500">•</span>
                  <span className="text-zinc-500">Weight</span>
                  <span className="text-zinc-700 font-semibold">{parseFloat(formData.inbodyWeightKg).toFixed(1)} kg</span>
                </div>
              )}
              {formData.inbodyBmi && parseFloat(formData.inbodyBmi) > 0 && (
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-zinc-500">•</span>
                  <span className="text-zinc-500">BMI</span>
                  <span className="text-zinc-700 font-semibold">{parseFloat(formData.inbodyBmi).toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Show coach report or client report */}
        {activeView === 'coach' ? (
          <Suspense fallback={
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-zinc-200">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-sm font-black uppercase tracking-widest text-zinc-400">Loading Coach Plan...</p>
            </div>
          }>
            {plan ? (
              <CoachReport
                plan={plan}
                scores={scores}
                bodyComp={formData ? generateBodyCompInterpretation(formData) : undefined}
                formData={formData}
              />
            ) : (
              <div className="bg-white rounded-xl p-8 border border-zinc-200">
                <h2 className="text-xl font-bold text-zinc-900 mb-4">Coach Report</h2>
                <p className="text-zinc-600">Generating coach plan...</p>
              </div>
            )}
          </Suspense>
        ) : (
          <>
        
        {/* Starting Point */}
        <section className="w-full min-w-0 overflow-x-hidden">
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 mb-2 sm:mb-3 md:mb-4 lg:mb-5 xl:mb-6">
            <div className="p-1 sm:p-1.5 md:p-2 bg-gradient-light text-zinc-900 rounded-lg">
              <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
            </div>
            <h3 className="text-[10px] sm:text-xs md:text-sm lg:text-base font-bold text-zinc-900 uppercase tracking-widest">Your Starting Point</h3>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
            {/* Score Card */}
            <Card className="col-span-1 flex flex-col items-center justify-center p-3 sm:p-4 md:p-6 lg:p-8 text-center relative overflow-hidden min-h-[280px] sm:min-h-[320px] md:min-h-[360px] lg:min-h-[420px]">
              
              {/* Circular Progress Gauge */}
                <div className="relative w-36 h-36 sm:w-40 sm:h-40 md:w-48 md:h-48 lg:w-56 lg:h-56 xl:w-64 xl:h-64 flex items-center justify-center mb-3 sm:mb-4 md:mb-6 lg:mb-8 mt-1 sm:mt-2 md:mt-3 lg:mt-4">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle 
                    cx="50" cy="50" r="42" 
                    fill="transparent" 
                    stroke="#f4f4f5" 
                    strokeWidth="8" 
                    strokeLinecap="round"
                    strokeDasharray="190 264" 
                    transform="rotate(140 50 50)" 
                  />
                  <circle 
                    cx="50" cy="50" r="42" 
                    fill="transparent" 
                    stroke="url(#gradient-score)" 
                    strokeWidth="8" 
                    strokeLinecap="round"
                    strokeDasharray={`${(scores.overall / 100) * 190} 264`}
                    transform="rotate(140 50 50)"
                    className="transition-all duration-1000 ease-out" 
                  />
                  <defs>
                    <linearGradient id="gradient-score" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="var(--gradient-from-hex)" />
                      <stop offset="100%" stopColor="var(--gradient-to-hex)" />
                    </linearGradient>
                  </defs>
                </svg>
                
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-zinc-900 tracking-tighter leading-none">{scores.overall}</span>
                  <span className="text-[8px] sm:text-[9px] md:text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mt-1 sm:mt-1.5 md:mt-2">Overall Score</span>
                </div>
              </div>

              {/* Badge */}
              <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 rounded-full bg-gradient-light text-zinc-900 text-xs sm:text-sm font-bold border border-gradient-medium mb-4 sm:mb-5 md:mb-6">
                <Trophy className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 fill-current text-zinc-900" />
                <span className="text-center">{archetype.name}</span>
              </div>

              {/* Description */}
              <p className="text-[10px] sm:text-xs md:text-sm text-zinc-500 font-medium leading-relaxed max-w-[240px] sm:max-w-[260px] mx-auto">
                {archetype.description}
              </p>
            </Card>

            {/* Radar Chart */}
            <Card className="col-span-1 lg:col-span-2 p-3 sm:p-4 md:p-5 lg:p-8 relative min-h-[280px] sm:min-h-[320px] md:min-h-[360px] lg:min-h-[420px]">
              <div className="flex justify-between items-start mb-3 sm:mb-4">
            <div>
                  <h4 className="text-sm font-bold text-zinc-900">Performance Profile</h4>
                  <p className="text-[10px] sm:text-xs text-zinc-500 mt-0.5 sm:mt-1">
                    Visualizing your current baseline across health pillars.
                  </p>
            </div>
          </div>
              <div className="h-[240px] sm:h-[260px] md:h-[280px] lg:h-[320px] w-full mt-1 sm:mt-2 md:mt-4">
                <OverallRadarChart data={overallRadarData} previousData={previousRadarData} />
        </div>
            </Card>
        </div>
        </section>
        
        {/* Gap Analysis */}
        <section className="w-full min-w-0 overflow-x-hidden">
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 mb-2 sm:mb-3 md:mb-4 lg:mb-5 xl:mb-6">
            <div className="p-1 sm:p-1.5 md:p-2 bg-gradient-light text-zinc-900 rounded-lg">
              <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
            </div>
            <h3 className="text-[10px] sm:text-xs md:text-sm lg:text-base font-bold text-zinc-900 uppercase tracking-widest">Gap Analysis</h3>
          </div>
          <p className="text-[10px] sm:text-xs md:text-sm text-zinc-500 mb-3 sm:mb-4 md:mb-5 lg:mb-6">Current metrics vs. optimal performance targets.</p>
          
          {/* Desktop: Grid Layout (lg+) */}
          <div className="hidden lg:grid grid-cols-3 gap-4 sm:gap-5 md:gap-6 mb-6 md:mb-8">
            {/* Body Composition */}
            <Card className="p-4 sm:p-5 md:p-6 flex flex-col">
              {/* Header - outside grid - Fixed height */}
              <div className="flex items-center justify-between mb-4 sm:mb-5 md:mb-6 h-[44px]">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-light text-zinc-900 rounded-lg">
                    <Scale className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-zinc-900">Body Composition</h4>
                </div>
                <Badge className="glass-button-active text-white border-transparent whitespace-nowrap">
                  {gapAnalysisData[0]?.status === 'red' ? 'Priority Focus' : 'Optimize'}
                </Badge>
              </div>
              
              {/* Metrics Layout - Single header, stats aligned below */}
              <div className="flex flex-col justify-between flex-1 min-h-[140px] mb-6">
                {/* Header Row - Current and Target labels centered over right-aligned stats */}
                <div className="flex items-center justify-end gap-2 mb-3">
                  <span className="text-[9px] text-zinc-400 uppercase tracking-wider text-center w-16">Current</span>
                  <div className="w-3"></div>
                  <span className="text-[9px] text-zinc-400 uppercase tracking-wider text-center w-16">Target</span>
                </div>
                
                {/* Row 1: Weight - Top */}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-zinc-700 text-left whitespace-nowrap flex-shrink-0">Body Weight (kg)</span>
                  <div className="flex items-center gap-2">
                    {gapAnalysisData[0]?.bodyCompGaps ? (
                      <>
                        <span className="text-sm text-zinc-600 text-right w-16">{gapAnalysisData[0].bodyCompGaps.weight.current.toFixed(1)}</span>
                        <ArrowRight className="w-3 h-3 text-gradient-dark flex-shrink-0" />
                        <span className="text-sm font-bold text-gradient-dark text-right w-16">{gapAnalysisData[0].bodyCompGaps.weight.target.toFixed(1)}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-sm text-zinc-400 text-right w-16">--</span>
                        <ArrowRight className="w-3 h-3 text-zinc-300 flex-shrink-0" />
                        <span className="text-sm font-bold text-zinc-400 text-right w-16">--</span>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Row 2: Muscle Mass - Middle */}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-zinc-700 text-left whitespace-nowrap flex-shrink-0">Muscle Mass (kg)</span>
                  <div className="flex items-center gap-2">
                    {gapAnalysisData[0]?.bodyCompGaps ? (
                      <>
                        <span className="text-sm text-zinc-600 text-right w-16">{gapAnalysisData[0].bodyCompGaps.muscle.current.toFixed(1)}</span>
                        <ArrowRight className="w-3 h-3 text-gradient-dark flex-shrink-0" />
                        <span className="text-sm font-bold text-gradient-dark text-right w-16">{gapAnalysisData[0].bodyCompGaps.muscle.target.toFixed(1)}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-sm text-zinc-400 text-right w-16">--</span>
                        <ArrowRight className="w-3 h-3 text-zinc-300 flex-shrink-0" />
                        <span className="text-sm font-bold text-zinc-400 text-right w-16">--</span>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Row 3: Body Fat - Bottom */}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-zinc-700 text-left whitespace-nowrap flex-shrink-0">Body Fat (%)</span>
                  <div className="flex items-center gap-2">
                    {gapAnalysisData[0]?.bodyCompGaps ? (
                      <>
                        <span className="text-sm text-zinc-600 text-right w-16">{gapAnalysisData[0].bodyCompGaps.fat.current.toFixed(1)}</span>
                        <ArrowRight className="w-3 h-3 text-gradient-dark flex-shrink-0" />
                        <span className="text-sm font-bold text-gradient-dark text-right w-16">{gapAnalysisData[0].bodyCompGaps.fat.target.toFixed(1)}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-sm text-zinc-400 text-right w-16">--</span>
                        <ArrowRight className="w-3 h-3 text-zinc-300 flex-shrink-0" />
                        <span className="text-sm font-bold text-zinc-400 text-right w-16">--</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Coach Insight - outside grid, aligned at bottom */}
              <div className="pt-3 sm:pt-4 border-t border-zinc-100">
                <div className="flex items-start gap-1.5 sm:gap-2">
                  <Lightbulb className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-[10px] sm:text-xs text-zinc-600 leading-relaxed">{truncateInsight(gapAnalysisData[0]?.insight || '')}</p>
                </div>
              </div>
            </Card>
            
            {/* Functional Strength */}
            <Card className="p-4 sm:p-5 md:p-6 flex flex-col">
              {/* Header - outside grid - Fixed height */}
              <div className="flex items-center justify-between mb-4 sm:mb-5 md:mb-6 h-[44px]">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-light text-zinc-900 rounded-lg">
                    <Dumbbell className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-zinc-900">Functional Strength</h4>
                </div>
                <Badge className="glass-button-active text-white border-transparent whitespace-nowrap">
                  {gapAnalysisData[1]?.status === 'red' 
                    ? 'Priority Focus' 
                    : 'Optimize'}
                </Badge>
              </div>
              
              {/* Metrics Layout - Single header, stats aligned below */}
              <div className="flex flex-col justify-between flex-1 min-h-[140px] mb-6">
                {/* Header Row - Current and Target labels centered over stats */}
                <div className="flex items-center justify-end gap-2 mb-3 pr-0.5">
                  <span className="text-[9px] text-zinc-400 uppercase tracking-wider text-center w-16">Current</span>
                  <div className="w-3"></div>
                  <span className="text-[9px] text-zinc-400 uppercase tracking-wider text-center w-16">Target</span>
                </div>
                
                {/* Row 1: Muscular Endurance - Top */}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-zinc-700 text-left whitespace-nowrap flex-shrink-0">Muscular Endurance (reps)</span>
                  <div className="flex items-center gap-2">
                    {gapAnalysisData[1]?.functionalGaps ? (
                      <>
                        <span className="text-sm text-zinc-600 text-right w-16">{gapAnalysisData[1].functionalGaps.endurance.current}</span>
                        <ArrowRight className="w-3 h-3 text-gradient-dark flex-shrink-0" />
                        <span className="text-sm font-bold text-gradient-dark text-right w-16">{gapAnalysisData[1].functionalGaps.endurance.target}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-sm text-zinc-400 text-right w-16">--</span>
                        <ArrowRight className="w-3 h-3 text-zinc-300 flex-shrink-0" />
                        <span className="text-sm font-bold text-zinc-400 text-right w-16">--</span>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Row 2: Core Stability - Middle */}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-zinc-700 text-left whitespace-nowrap flex-shrink-0">Core Stability (time)</span>
                  <div className="flex items-center gap-2">
                    {gapAnalysisData[1]?.functionalGaps ? (() => {
                      const functionalGaps = gapAnalysisData[1].functionalGaps;
                      const currentSeconds = functionalGaps.core.current;
                      const targetSeconds = functionalGaps.core.target;
                      const currentMinutes = Math.floor(currentSeconds / 60);
                      const currentSecs = currentSeconds % 60;
                      const targetMinutes = Math.floor(targetSeconds / 60);
                      const targetSecs = targetSeconds % 60;
                      const currentDisplay = currentMinutes > 0 ? `${currentMinutes}:${currentSecs.toString().padStart(2, '0')}` : `${currentSeconds}s`;
                      const targetDisplay = targetMinutes > 0 ? `${targetMinutes}:${targetSecs.toString().padStart(2, '0')}` : `${targetSeconds}s`;
                      return (
                        <>
                          <span className="text-sm text-zinc-600 text-right w-16">{currentDisplay}</span>
                          <ArrowRight className="w-3 h-3 text-gradient-dark flex-shrink-0" />
                          <span className="text-sm font-bold text-gradient-dark text-right w-16">{targetDisplay}</span>
                        </>
                      );
                    })() : (
                      <>
                        <span className="text-sm text-zinc-400 text-right w-16">--</span>
                        <ArrowRight className="w-3 h-3 text-zinc-300 flex-shrink-0" />
                        <span className="text-sm font-bold text-zinc-400 text-right w-16">--</span>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Row 3: Overall Strength - Bottom */}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-zinc-700 text-left whitespace-nowrap flex-shrink-0">
                    {gapAnalysisData[1]?.functionalGaps?.strength ? (() => {
                      const strength = gapAnalysisData[1].functionalGaps.strength;
                      if (strength.method === 'deadhang' && strength.currentTime !== undefined && strength.targetTime !== undefined) {
                        return 'Overall Strength (s)';
                      } else if (strength.method === 'pinch' && strength.currentTime !== undefined && strength.targetTime !== undefined) {
                        const standardizedWeight = (formData?.gender || '').toLowerCase() === 'female' ? 10 : 15;
                        return `Overall Strength (s, ${standardizedWeight}kg)`;
                      } else {
                        return 'Overall Strength (kg)';
                      }
                    })() : 'Overall Strength'}
                  </span>
                  <div className="flex items-center gap-2">
                    {gapAnalysisData[1]?.functionalGaps?.strength ? (() => {
                      const strength = gapAnalysisData[1].functionalGaps.strength;
                      let currentDisplay: string;
                      let targetDisplay: string;
                      
                      if (strength.method === 'deadhang' && strength.currentTime !== undefined && strength.targetTime !== undefined) {
                        currentDisplay = `${strength.currentTime.toFixed(0)}`;
                        targetDisplay = `${strength.targetTime.toFixed(0)}`;
                      } else if (strength.method === 'pinch' && strength.currentTime !== undefined && strength.targetTime !== undefined) {
                        currentDisplay = `${strength.currentTime.toFixed(0)}`;
                        targetDisplay = `${strength.targetTime.toFixed(0)}`;
                      } else {
                        currentDisplay = `${strength.current.toFixed(1)}`;
                        targetDisplay = `${strength.target.toFixed(1)}`;
                      }
                      return (
                        <>
                          <span className="text-sm text-zinc-600 text-right w-16">{currentDisplay}</span>
                          <ArrowRight className="w-3 h-3 text-gradient-dark flex-shrink-0" />
                          <span className="text-sm font-bold text-gradient-dark text-right w-16">{targetDisplay}</span>
                        </>
                      );
                    })() : (
                      <>
                        <span className="text-sm text-zinc-400 text-right w-16">--</span>
                        <ArrowRight className="w-3 h-3 text-zinc-300 flex-shrink-0" />
                        <span className="text-sm font-bold text-zinc-400 text-right w-16">--</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Coach Insight - outside grid, aligned at bottom */}
              <div className="pt-3 sm:pt-4 border-t border-zinc-100">
                <div className="flex items-start gap-1.5 sm:gap-2">
                  <Lightbulb className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-[10px] sm:text-xs text-zinc-600 leading-relaxed">{truncateInsight(gapAnalysisData[1]?.insight || '')}</p>
                </div>
              </div>
            </Card>
            
            {/* Metabolic Fitness */}
            <Card className="p-4 sm:p-5 md:p-6 flex flex-col">
              {/* Header - outside grid - Fixed height */}
              <div className="flex items-center justify-between mb-4 sm:mb-5 md:mb-6 h-[44px]">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-light text-zinc-900 rounded-lg">
                    <Heart className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-zinc-900">Metabolic Fitness</h4>
                </div>
                <Badge className="glass-button-active text-white border-transparent whitespace-nowrap">
                  {gapAnalysisData[2]?.status === 'red' 
                    ? 'Priority Focus' 
                    : gapAnalysisData[2]?.status === 'yellow' || (goals || []).includes('improve-fitness')
                    ? 'Optimize'
                    : 'Maintain'}
                </Badge>
              </div>
              
              {/* Metrics Layout - Single header, stats aligned below */}
              <div className="flex flex-col justify-between flex-1 min-h-[140px] mb-6">
                {/* Header Row - Current and Target labels centered over stats */}
                <div className="flex items-center justify-end gap-2 mb-3 pr-0.5">
                  <span className="text-[9px] text-zinc-400 uppercase tracking-wider text-center w-16">Current</span>
                  <div className="w-3"></div>
                  <span className="text-[9px] text-zinc-400 uppercase tracking-wider text-center w-16">Target</span>
                </div>
                
                {/* Row 1: Resting HR - Top */}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-zinc-700 text-left whitespace-nowrap flex-shrink-0">Resting HR (bpm)</span>
                  <div className="flex items-center gap-2">
                    {gapAnalysisData[2]?.cardioGaps && gapAnalysisData[2].cardioGaps.rhr.current > 0 ? (
                      <>
                        <span className="text-sm text-zinc-600 text-right w-16">{Math.round(gapAnalysisData[2].cardioGaps.rhr.current)}</span>
                        <ArrowRight className="w-3 h-3 text-gradient-dark flex-shrink-0" />
                        <span className="text-sm font-bold text-gradient-dark text-right w-16">{Math.round(gapAnalysisData[2].cardioGaps.rhr.target)}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-sm text-zinc-400 text-right w-16">--</span>
                        <ArrowRight className="w-3 h-3 text-zinc-300 flex-shrink-0" />
                        <span className="text-sm font-bold text-zinc-400 text-right w-16">--</span>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Row 2: Recovery HR - Middle */}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-zinc-700 text-left whitespace-nowrap flex-shrink-0">Recovery HR (bpm)</span>
                  <div className="flex items-center gap-2">
                    {gapAnalysisData[2]?.cardioGaps && gapAnalysisData[2].cardioGaps.recovery.current > 0 ? (
                      <>
                        <span className="text-sm text-zinc-600 text-right w-16">{Math.round(gapAnalysisData[2].cardioGaps.recovery.current)}</span>
                        <ArrowRight className="w-3 h-3 text-gradient-dark flex-shrink-0" />
                        <span className="text-sm font-bold text-gradient-dark text-right w-16">{Math.round(gapAnalysisData[2].cardioGaps.recovery.target)}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-sm text-zinc-400 text-right w-16">--</span>
                        <ArrowRight className="w-3 h-3 text-zinc-300 flex-shrink-0" />
                        <span className="text-sm font-bold text-zinc-400 text-right w-16">--</span>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Row 3: VO2 Max - Bottom */}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-zinc-700 text-left whitespace-nowrap flex-shrink-0">VO2 Max (ml/kg/min)</span>
                  <div className="flex items-center gap-2">
                    {gapAnalysisData[2]?.cardioGaps && gapAnalysisData[2].cardioGaps.vo2.current > 0 ? (
                      <>
                        <span className="text-sm text-zinc-600 text-right w-16">{gapAnalysisData[2].cardioGaps.vo2.current.toFixed(1)}</span>
                        <ArrowRight className="w-3 h-3 text-gradient-dark flex-shrink-0" />
                        <span className="text-sm font-bold text-gradient-dark text-right w-16">{gapAnalysisData[2].cardioGaps.vo2.target.toFixed(1)}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-sm text-zinc-400 text-right w-16">--</span>
                        <ArrowRight className="w-3 h-3 text-zinc-300 flex-shrink-0" />
                        <span className="text-sm font-bold text-zinc-400 text-right w-16">--</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Coach Insight - outside grid, aligned at bottom */}
              <div className="pt-3 sm:pt-4 border-t border-zinc-100">
                <div className="flex items-start gap-1.5 sm:gap-2">
                  <Lightbulb className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-[10px] sm:text-xs text-zinc-600 leading-relaxed">{truncateInsight(gapAnalysisData[2]?.insight || '')}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Mobile/Tablet: Tabs Layout (below lg) */}
          <Tabs defaultValue="body-comp" className="w-full mb-6 md:mb-8 lg:hidden">
            <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0 mb-3 sm:mb-4 scrollbar-hide">
              <TabsList className="w-full sm:w-auto justify-start rounded-lg sm:rounded-xl glass-button h-auto p-1 sm:p-1.5 gap-1 inline-flex min-w-max sm:min-w-0">
                <TabsTrigger
                  value="body-comp"
                  className="text-[9px] sm:text-[10px] font-semibold px-2 sm:px-2.5 md:px-3 py-1 sm:py-1.5 rounded-md transition-apple whitespace-nowrap shrink-0 data-[state=active]:glass-button-active data-[state=active]:text-white data-[state=inactive]:text-zinc-600 data-[state=inactive]:hover:text-zinc-900"
                >
                  Body Composition
                </TabsTrigger>
                <TabsTrigger
                  value="strength"
                  className="text-[9px] sm:text-[10px] font-semibold px-2 sm:px-2.5 md:px-3 py-1 sm:py-1.5 rounded-md transition-apple whitespace-nowrap shrink-0 data-[state=active]:glass-button-active data-[state=active]:text-white data-[state=inactive]:text-zinc-600 data-[state=inactive]:hover:text-zinc-900"
                >
                  Functional Strength
                </TabsTrigger>
                <TabsTrigger
                  value="metabolic"
                  className="text-[9px] sm:text-[10px] font-semibold px-2 sm:px-2.5 md:px-3 py-1 sm:py-1.5 rounded-md transition-apple whitespace-nowrap shrink-0 data-[state=active]:glass-button-active data-[state=active]:text-white data-[state=inactive]:text-zinc-600 data-[state=inactive]:hover:text-zinc-900"
                >
                  Metabolic Fitness
                </TabsTrigger>
              </TabsList>
            </div>
            
            <div className="space-y-4 sm:space-y-5 md:space-y-6">
            {/* Body Composition */}
            <TabsContent value="body-comp" className="m-0">
            <Card className="p-5 sm:p-6 md:p-7 flex flex-col">
              {/* Header - outside grid - Fixed height */}
              <div className="flex items-center justify-between mb-4 sm:mb-5 md:mb-6 h-[44px]">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-light text-zinc-900 rounded-lg">
                    <Scale className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-zinc-900">Body Composition</h4>
                </div>
                <Badge className="glass-button-active text-white border-transparent whitespace-nowrap">
                  {gapAnalysisData[0]?.status === 'red' ? 'Priority Focus' : 'Optimize'}
                </Badge>
              </div>
              
              {/* Metrics Layout - Single header, stats aligned below */}
              <div className="flex flex-col justify-between flex-1 min-h-[120px] sm:min-h-[140px] mb-4 sm:mb-5 md:mb-6">
                {/* Header Row - Current and Target labels right-aligned to match stats */}
                <div className="flex items-center mb-3" style={{ width: '140px', marginLeft: 'auto', justifyContent: 'space-between', paddingRight: '2px' }}>
                  <span className="text-[9px] text-zinc-400 uppercase tracking-wider text-right whitespace-nowrap" style={{ width: '64px' }}>Current</span>
                  <div style={{ width: '12px', height: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}></div>
                  <span className="text-[9px] text-zinc-400 uppercase tracking-wider text-right whitespace-nowrap" style={{ width: '64px' }}>Target</span>
                </div>
                
                {/* Row 1: Weight - Top */}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-zinc-700 text-left whitespace-nowrap flex-shrink-0">Body Weight (kg)</span>
                  <div className="flex items-center" style={{ width: '140px', flexShrink: 0, justifyContent: 'space-between', paddingRight: '2px' }}>
                    {gapAnalysisData[0]?.bodyCompGaps ? (
                      <>
                        <span className="text-sm text-zinc-600 text-right whitespace-nowrap" style={{ width: '64px' }}>{gapAnalysisData[0].bodyCompGaps.weight.current.toFixed(1)}</span>
                        <div style={{ width: '12px', height: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                          <ArrowRight className="w-3 h-3 text-gradient-dark flex-shrink-0" />
                        </div>
                        <span className="text-sm font-bold text-gradient-dark text-right whitespace-nowrap" style={{ width: '64px' }}>{gapAnalysisData[0].bodyCompGaps.weight.target.toFixed(1)}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-sm text-zinc-400 text-right whitespace-nowrap" style={{ width: '64px' }}>--</span>
                        <div style={{ width: '12px', height: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                          <ArrowRight className="w-3 h-3 text-zinc-300 flex-shrink-0" />
                        </div>
                        <span className="text-sm font-bold text-zinc-400 text-right whitespace-nowrap" style={{ width: '64px' }}>--</span>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Row 2: Muscle Mass - Middle */}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-zinc-700 text-left whitespace-nowrap flex-shrink-0">Muscle Mass (kg)</span>
                  <div className="flex items-center" style={{ width: '140px', flexShrink: 0, justifyContent: 'space-between', paddingRight: '2px' }}>
                    {gapAnalysisData[0]?.bodyCompGaps ? (
                      <>
                        <span className="text-sm text-zinc-600 text-right whitespace-nowrap" style={{ width: '64px' }}>{gapAnalysisData[0].bodyCompGaps.muscle.current.toFixed(1)}</span>
                        <div style={{ width: '12px', height: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                          <ArrowRight className="w-3 h-3 text-gradient-dark flex-shrink-0" />
                        </div>
                        <span className="text-sm font-bold text-gradient-dark text-right whitespace-nowrap" style={{ width: '64px' }}>{gapAnalysisData[0].bodyCompGaps.muscle.target.toFixed(1)}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-sm text-zinc-400 text-right whitespace-nowrap" style={{ width: '64px' }}>--</span>
                        <div style={{ width: '12px', height: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                          <ArrowRight className="w-3 h-3 text-zinc-300 flex-shrink-0" />
                        </div>
                        <span className="text-sm font-bold text-zinc-400 text-right whitespace-nowrap" style={{ width: '64px' }}>--</span>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Row 3: Body Fat - Bottom */}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-zinc-700 text-left whitespace-nowrap flex-shrink-0">Body Fat (%)</span>
                  <div className="flex items-center" style={{ width: '140px', flexShrink: 0, justifyContent: 'space-between', paddingRight: '2px' }}>
                    {gapAnalysisData[0]?.bodyCompGaps ? (
                      <>
                        <span className="text-sm text-zinc-600 text-right whitespace-nowrap" style={{ width: '64px' }}>{gapAnalysisData[0].bodyCompGaps.fat.current.toFixed(1)}</span>
                        <div style={{ width: '12px', height: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                          <ArrowRight className="w-3 h-3 text-gradient-dark flex-shrink-0" />
                        </div>
                        <span className="text-sm font-bold text-gradient-dark text-right whitespace-nowrap" style={{ width: '64px' }}>{gapAnalysisData[0].bodyCompGaps.fat.target.toFixed(1)}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-sm text-zinc-400 text-right whitespace-nowrap" style={{ width: '64px' }}>--</span>
                        <div style={{ width: '12px', height: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                          <ArrowRight className="w-3 h-3 text-zinc-300 flex-shrink-0" />
                        </div>
                        <span className="text-sm font-bold text-zinc-400 text-right whitespace-nowrap" style={{ width: '64px' }}>--</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Coach Insight - outside grid, aligned at bottom */}
              <div className="pt-3 sm:pt-4 border-t border-zinc-100">
                <div className="flex items-start gap-1.5 sm:gap-2">
                  <Lightbulb className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-[10px] sm:text-xs text-zinc-600 leading-relaxed">{truncateInsight(gapAnalysisData[0]?.insight || '')}</p>
                </div>
              </div>
            </Card>
            </TabsContent>
            
            {/* Functional Strength */}
            <TabsContent value="strength" className="m-0">
            <Card className="p-5 sm:p-6 md:p-7 flex flex-col">
              {/* Header - outside grid - Fixed height */}
              <div className="flex items-center justify-between mb-4 sm:mb-5 md:mb-6 h-[44px]">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-light text-zinc-900 rounded-lg">
                    <Dumbbell className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-zinc-900">Functional Strength</h4>
                </div>
                <Badge className="glass-button-active text-white border-transparent whitespace-nowrap">
                  {gapAnalysisData[1]?.status === 'red'
                    ? 'Priority Focus'
                    : 'Optimize'}
                </Badge>
              </div>

              {/* Metrics Layout - Single header, stats aligned below */}
              <div className="flex flex-col justify-between flex-1 min-h-[120px] sm:min-h-[140px] mb-4 sm:mb-5 md:mb-6">
                {/* Header Row - Current and Target labels right-aligned to match stats */}
                <div className="flex items-center mb-3" style={{ width: '140px', marginLeft: 'auto', justifyContent: 'space-between', paddingRight: '2px' }}>
                  <span className="text-[9px] text-zinc-400 uppercase tracking-wider text-right whitespace-nowrap" style={{ width: '64px' }}>Current</span>
                  <div style={{ width: '12px', height: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}></div>
                  <span className="text-[9px] text-zinc-400 uppercase tracking-wider text-right whitespace-nowrap" style={{ width: '64px' }}>Target</span>
                </div>
                
                {/* Row 1: Muscular Endurance - Top */}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-zinc-700 text-left whitespace-nowrap flex-shrink-0">Muscular Endurance (reps)</span>
                  <div className="flex items-center" style={{ width: '140px', flexShrink: 0, justifyContent: 'space-between', paddingRight: '2px' }}>
                    {gapAnalysisData[1]?.functionalGaps ? (
                      <>
                        <span className="text-sm text-zinc-600 text-right whitespace-nowrap" style={{ width: '64px' }}>{gapAnalysisData[1].functionalGaps.endurance.current}</span>
                        <div style={{ width: '12px', height: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                          <ArrowRight className="w-3 h-3 text-gradient-dark flex-shrink-0" />
                        </div>
                        <span className="text-sm font-bold text-gradient-dark text-right whitespace-nowrap" style={{ width: '64px' }}>{gapAnalysisData[1].functionalGaps.endurance.target}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-sm text-zinc-400 text-right whitespace-nowrap" style={{ width: '64px' }}>--</span>
                        <div style={{ width: '12px', height: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                          <ArrowRight className="w-3 h-3 text-zinc-300 flex-shrink-0" />
                        </div>
                        <span className="text-sm font-bold text-zinc-400 text-right whitespace-nowrap" style={{ width: '64px' }}>--</span>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Row 2: Core Stability - Middle */}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-zinc-700 text-left whitespace-nowrap flex-shrink-0">Core Stability (secs)</span>
                  <div className="flex items-center" style={{ width: '140px', flexShrink: 0, justifyContent: 'space-between', paddingRight: '2px' }}>
                    {gapAnalysisData[1]?.functionalGaps ? (() => {
                      const functionalGaps = gapAnalysisData[1].functionalGaps;
                      const currentSeconds = functionalGaps.core.current;
                      const targetSeconds = functionalGaps.core.target;
                      const currentMinutes = Math.floor(currentSeconds / 60);
                      const currentSecs = currentSeconds % 60;
                      const targetMinutes = Math.floor(targetSeconds / 60);
                      const targetSecs = targetSeconds % 60;
                      const currentDisplay = currentMinutes > 0 ? `${currentMinutes}:${currentSecs.toString().padStart(2, '0')}` : `${currentSeconds}`;
                      const targetDisplay = targetMinutes > 0 ? `${targetMinutes}:${targetSecs.toString().padStart(2, '0')}` : `${targetSeconds}`;
                      return (
                        <>
                          <span className="text-sm text-zinc-600 text-right whitespace-nowrap" style={{ width: '64px' }}>{currentDisplay}</span>
                          <div style={{ width: '12px', height: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <ArrowRight className="w-3 h-3 text-gradient-dark flex-shrink-0" />
                          </div>
                          <span className="text-sm font-bold text-gradient-dark text-right whitespace-nowrap" style={{ width: '64px' }}>{targetDisplay}</span>
                        </>
                      );
                    })() : (
                      <>
                        <span className="text-sm text-zinc-400 text-right whitespace-nowrap" style={{ width: '64px' }}>--</span>
                        <div style={{ width: '12px', height: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                          <ArrowRight className="w-3 h-3 text-zinc-300 flex-shrink-0" />
                        </div>
                        <span className="text-sm font-bold text-zinc-400 text-right whitespace-nowrap" style={{ width: '64px' }}>--</span>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Row 3: Overall Strength - Bottom */}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-zinc-700 text-left whitespace-nowrap flex-shrink-0">
                    {gapAnalysisData[1]?.functionalGaps?.strength ? (() => {
                      const strength = gapAnalysisData[1].functionalGaps.strength;
                      if (strength.method === 'deadhang' && strength.currentTime !== undefined && strength.targetTime !== undefined) {
                        return 'Overall Strength (s)';
                      } else if (strength.method === 'pinch' && strength.currentTime !== undefined && strength.targetTime !== undefined) {
                        const standardizedWeight = (formData?.gender || '').toLowerCase() === 'female' ? 10 : 15;
                        return `Overall Strength (s, ${standardizedWeight}kg)`;
                      } else {
                        return 'Overall Strength (kg)';
                      }
                    })() : 'Overall Strength'}
                  </span>
                  <div className="flex items-center" style={{ width: '140px', flexShrink: 0, justifyContent: 'space-between', paddingRight: '2px' }}>
                    {gapAnalysisData[1]?.functionalGaps?.strength ? (() => {
                      const strength = gapAnalysisData[1].functionalGaps.strength;
                      let currentDisplay: string;
                      let targetDisplay: string;
                      
                      if (strength.method === 'deadhang' && strength.currentTime !== undefined && strength.targetTime !== undefined) {
                        currentDisplay = `${strength.currentTime.toFixed(0)}`;
                        targetDisplay = `${strength.targetTime.toFixed(0)}`;
                      } else if (strength.method === 'pinch' && strength.currentTime !== undefined && strength.targetTime !== undefined) {
                        currentDisplay = `${strength.currentTime.toFixed(0)}`;
                        targetDisplay = `${strength.targetTime.toFixed(0)}`;
                      } else {
                        currentDisplay = `${strength.current.toFixed(1)}`;
                        targetDisplay = `${strength.target.toFixed(1)}`;
                      }
                      return (
                        <>
                          <span className="text-sm text-zinc-600 text-right whitespace-nowrap" style={{ width: '64px' }}>{currentDisplay}</span>
                          <div style={{ width: '12px', height: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <ArrowRight className="w-3 h-3 text-gradient-dark flex-shrink-0" />
                          </div>
                          <span className="text-sm font-bold text-gradient-dark text-right whitespace-nowrap" style={{ width: '64px' }}>{targetDisplay}</span>
                        </>
                      );
                    })() : (
                      <>
                        <span className="text-sm text-zinc-400 text-right whitespace-nowrap" style={{ width: '64px' }}>--</span>
                        <div style={{ width: '12px', height: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                          <ArrowRight className="w-3 h-3 text-zinc-300 flex-shrink-0" />
                        </div>
                        <span className="text-sm font-bold text-zinc-400 text-right whitespace-nowrap" style={{ width: '64px' }}>--</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Coach Insight - outside grid, aligned at bottom */}
              <div className="pt-3 sm:pt-4 border-t border-zinc-100">
                <div className="flex items-start gap-1.5 sm:gap-2">
                  <Lightbulb className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-[10px] sm:text-xs text-zinc-600 leading-relaxed">{truncateInsight(gapAnalysisData[1]?.insight || '')}</p>
                </div>
              </div>
            </Card>
            </TabsContent>
            
            {/* Metabolic Fitness */}
            <TabsContent value="metabolic" className="m-0">
            <Card className="p-5 sm:p-6 md:p-7 flex flex-col">
              {/* Header - outside grid - Fixed height */}
              <div className="flex items-center justify-between mb-4 sm:mb-5 md:mb-6 h-[44px]">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-light text-zinc-900 rounded-lg">
                    <Heart className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-zinc-900">Metabolic Fitness</h4>
                </div>
                <Badge className="glass-button-active text-white border-transparent whitespace-nowrap">
                  {gapAnalysisData[2]?.status === 'red'
                    ? 'Priority Focus'
                    : gapAnalysisData[2]?.status === 'yellow' || (goals || []).includes('improve-fitness')
                    ? 'Optimize'
                    : 'Maintain'}
                </Badge>
              </div>

              {/* Metrics Layout - Single header, stats aligned below */}
              <div className="flex flex-col justify-between flex-1 min-h-[120px] sm:min-h-[140px] mb-4 sm:mb-5 md:mb-6">
                {/* Header Row - Current and Target labels right-aligned to match stats */}
                <div className="flex items-center mb-3" style={{ width: '140px', marginLeft: 'auto', justifyContent: 'space-between', paddingRight: '2px' }}>
                  <span className="text-[9px] text-zinc-400 uppercase tracking-wider text-right whitespace-nowrap" style={{ width: '64px' }}>Current</span>
                  <div style={{ width: '12px', height: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}></div>
                  <span className="text-[9px] text-zinc-400 uppercase tracking-wider text-right whitespace-nowrap" style={{ width: '64px' }}>Target</span>
                </div>
                
                {/* Row 1: Resting HR - Top */}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-zinc-700 text-left whitespace-nowrap flex-shrink-0">Resting HR (bpm)</span>
                  <div className="flex items-center" style={{ width: '140px', flexShrink: 0, justifyContent: 'space-between', paddingRight: '2px' }}>
                    {gapAnalysisData[2]?.cardioGaps && gapAnalysisData[2].cardioGaps.rhr.current > 0 ? (
                      <>
                        <span className="text-sm text-zinc-600 text-right whitespace-nowrap" style={{ width: '64px' }}>{Math.round(gapAnalysisData[2].cardioGaps.rhr.current)}</span>
                        <div style={{ width: '12px', height: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                          <ArrowRight className="w-3 h-3 text-gradient-dark flex-shrink-0" />
                        </div>
                        <span className="text-sm font-bold text-gradient-dark text-right whitespace-nowrap" style={{ width: '64px' }}>{Math.round(gapAnalysisData[2].cardioGaps.rhr.target)}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-sm text-zinc-400 text-right whitespace-nowrap" style={{ width: '64px' }}>--</span>
                        <div style={{ width: '12px', height: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                          <ArrowRight className="w-3 h-3 text-zinc-300 flex-shrink-0" />
                        </div>
                        <span className="text-sm font-bold text-zinc-400 text-right whitespace-nowrap" style={{ width: '64px' }}>--</span>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Row 2: Recovery HR - Middle */}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-zinc-700 text-left whitespace-nowrap flex-shrink-0">Recovery HR (bpm)</span>
                  <div className="flex items-center" style={{ width: '140px', flexShrink: 0, justifyContent: 'space-between', paddingRight: '2px' }}>
                    {gapAnalysisData[2]?.cardioGaps && gapAnalysisData[2].cardioGaps.recovery.current > 0 ? (
                      <>
                        <span className="text-sm text-zinc-600 text-right whitespace-nowrap" style={{ width: '64px' }}>{Math.round(gapAnalysisData[2].cardioGaps.recovery.current)}</span>
                        <div style={{ width: '12px', height: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                          <ArrowRight className="w-3 h-3 text-gradient-dark flex-shrink-0" />
                        </div>
                        <span className="text-sm font-bold text-gradient-dark text-right whitespace-nowrap" style={{ width: '64px' }}>{Math.round(gapAnalysisData[2].cardioGaps.recovery.target)}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-sm text-zinc-400 text-right whitespace-nowrap" style={{ width: '64px' }}>--</span>
                        <div style={{ width: '12px', height: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                          <ArrowRight className="w-3 h-3 text-zinc-300 flex-shrink-0" />
                        </div>
                        <span className="text-sm font-bold text-zinc-400 text-right whitespace-nowrap" style={{ width: '64px' }}>--</span>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Row 3: VO2 Max - Bottom */}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-zinc-700 text-left whitespace-nowrap flex-shrink-0">VO2 Max (ml/kg/min)</span>
                  <div className="flex items-center" style={{ width: '140px', flexShrink: 0, justifyContent: 'space-between', paddingRight: '2px' }}>
                    {gapAnalysisData[2]?.cardioGaps && gapAnalysisData[2].cardioGaps.vo2.current > 0 ? (
                      <>
                        <span className="text-sm text-zinc-600 text-right whitespace-nowrap" style={{ width: '64px' }}>{gapAnalysisData[2].cardioGaps.vo2.current.toFixed(1)}</span>
                        <div style={{ width: '12px', height: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                          <ArrowRight className="w-3 h-3 text-gradient-dark flex-shrink-0" />
                        </div>
                        <span className="text-sm font-bold text-gradient-dark text-right whitespace-nowrap" style={{ width: '64px' }}>{gapAnalysisData[2].cardioGaps.vo2.target.toFixed(1)}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-sm text-zinc-400 text-right whitespace-nowrap" style={{ width: '64px' }}>--</span>
                        <div style={{ width: '12px', height: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                          <ArrowRight className="w-3 h-3 text-zinc-300 flex-shrink-0" />
                        </div>
                        <span className="text-sm font-bold text-zinc-400 text-right whitespace-nowrap" style={{ width: '64px' }}>--</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Coach Insight - outside grid, aligned at bottom */}
              <div className="pt-3 sm:pt-4 border-t border-zinc-100">
                <div className="flex items-start gap-1.5 sm:gap-2">
                  <Lightbulb className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-[10px] sm:text-xs text-zinc-600 leading-relaxed">{truncateInsight(gapAnalysisData[2]?.insight || '')}</p>
                </div>
              </div>
            </Card>
            </TabsContent>
            </div>
          </Tabs>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-5 lg:gap-6 mb-4 sm:mb-5 md:mb-6 lg:mb-8">
            <Card className="p-4 sm:p-5 md:p-6 lg:p-7">
              <h4 className="text-sm font-bold text-zinc-900 mb-2 sm:mb-3 md:mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-gradient-dark" />
                Key Strengths
              </h4>
              <ul className="space-y-2 sm:space-y-3">
                {strengths.map((item, i) => (
                  <li key={i} className="text-xs sm:text-sm text-zinc-600 flex items-start gap-2 sm:gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-gradient-from mt-2 shrink-0" style={{ backgroundColor: 'hsl(var(--gradient-from))' }} />
                    {item.strength}
                  </li>
                ))}
              </ul>
            </Card>
            
            <Card className="p-4 sm:p-5 md:p-6 lg:p-7">
              <h4 className="text-sm font-bold text-zinc-900 mb-2 sm:mb-3 md:mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                Primary Focus Areas
              </h4>
              <ul className="space-y-2 sm:space-y-3">
                {areasForImprovement.map((item, i) => (
                  <li key={i} className="text-xs sm:text-sm text-zinc-600 flex items-start gap-2 sm:gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-300 mt-2 shrink-0" />
                    {item.weakness}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
      </section>
        
      {/* Lifestyle Factors - Thin Bar */}
      <section>
        <LifestyleFactorsBar formData={formData} />
      </section>
      
      {/* Movement, Posture & Mobility */}
      <section>
            <MovementPostureMobility formData={formData} scores={scores} standalone={standalone} />
      </section>
      
        {/* Destination */}
        <section className="w-full min-w-0 overflow-x-hidden">
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 mb-2 sm:mb-3 md:mb-4 lg:mb-5 xl:mb-6">
            <div className="p-1 sm:p-1.5 md:p-2 bg-gradient-light text-zinc-900 rounded-lg">
              <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
            </div>
            <h3 className="text-[10px] sm:text-xs md:text-sm lg:text-base font-bold text-zinc-900 uppercase tracking-widest">Your Destination</h3>
          </div>
          
        {goals && goals.length > 0 && (
            <Tabs defaultValue={goals[0]} className="w-full">
              <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0 mb-3 sm:mb-4 scrollbar-hide">
                <TabsList className="w-full sm:w-auto justify-start rounded-lg sm:rounded-xl glass-button h-auto p-1 sm:p-1.5 gap-1 inline-flex min-w-max sm:min-w-0">
                  {goals.map((g, idx) => (
                  <TabsTrigger
                  key={idx}
                      value={g}
                      className="text-[9px] sm:text-[10px] font-semibold px-2 sm:px-2.5 md:px-3 py-1 sm:py-1.5 rounded-md transition-apple whitespace-nowrap shrink-0 data-[state=active]:glass-button-active data-[state=active]:text-white data-[state=inactive]:text-zinc-600 data-[state=inactive]:hover:text-zinc-900"
                    >
                      {g.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
              
              <Card className="rounded-xl">
                {goals.map((goal, idx) => {
                const goalLevel = goal === 'weight-loss' 
                  ? (formData?.goalLevelWeightLoss || '15')
                  : goal === 'build-muscle'
                  ? (formData?.goalLevelMuscle || '6')
                  : goal === 'body-recomposition'
                  ? (formData?.goalLevelBodyRecomp || 'athletic')
                  : goal === 'build-strength'
                  ? (formData?.goalLevelStrength || '30')
                  : goal === 'improve-fitness'
                  ? (formData?.goalLevelFitness || '30')
                  : '15';
                
                let explanation = '';
                let whatItEntails: string[] = [];
                
                if (goal === 'body-recomposition') {
                  const recompLevel = (goalLevel || 'athletic') as 'healthy' | 'fit' | 'athletic' | 'shredded';
                  const gender = (formData?.gender || 'male').toLowerCase() as 'male' | 'female';
                  const weightKg = parseFloat(formData?.inbodyWeightKg || '0');
                  const bf = parseFloat(formData?.inbodyBodyFatPct || '0');
                  
                  // Use utility functions to get target body fat range
                  const targetBFRange = getBodyFatRange(recompLevel, gender);
                  const targetBodyFat = getTargetBodyFatFromLevel(recompLevel, gender);
                  const currentMuscleMass = parseFloat(formData?.skeletalMuscleMassKg || '0');
                  
                  // Calculate target weight and muscle mass
                  const recompResult = calculateBodyRecomposition(
                    weightKg,
                    bf,
                    targetBodyFat,
                    gender,
                    currentMuscleMass > 0 ? currentMuscleMass : undefined
                  );
                  
                  const levelLabel = recompLevel.charAt(0).toUpperCase() + recompLevel.slice(1);
                  const muscleGain = gender === 'male' ? 1.5 : 0.75;
                  
                  explanation = `Your goal is body recomposition: achieve a ${levelLabel} look (${targetBFRange[0]}-${targetBFRange[1]}% body fat) while building ${muscleGain} kg of muscle. Target weight: ${recompResult.targetWeight.toFixed(1)} kg. This uses a slight calorie deficit to lose fat while gaining muscle.`;
                  whatItEntails = [
                    'Slight calorie deficit (200-500 kcal/day) with high-protein intake',
                    'Progressive resistance training to build muscle',
                    'Zone 2 cardio for metabolic health',
                    'Adequate recovery and sleep (7-9 hours) to support muscle growth'
                  ];
                } else if (goal === 'weight-loss') {
                  const weightLossPct = parseFloat(goalLevel) || 15;
                  const weightKg = parseFloat(formData?.inbodyWeightKg || '0');
                  const targetWeightLossKg = weightKg > 0 ? (weightKg * weightLossPct) / 100 : 0;
                  explanation = `Your goal is to lose ${weightLossPct}% of your body weight (${targetWeightLossKg.toFixed(1)} kg), targeting a sustainable reduction of ~0.5-1% body weight per week.`;
                  whatItEntails = [
                    'Controlled caloric deficit with high-protein intake',
                    'Progressive resistance training to preserve muscle',
                    'Zone 2 cardio for metabolic health',
                    'Consistent lifestyle habits'
                  ];
                } else if (goal === 'build-muscle') {
                  const muscleGainKg = parseFloat(goalLevel) || 6;
                  explanation = `Your goal is to build ${muscleGainKg} kg of muscle mass through dedicated hypertrophy training.`;
                  whatItEntails = [
                    'Slight caloric surplus with quality protein',
                    'Progressive overload on compound movements',
                    'Adequate recovery and sleep (7-9 hours)',
                    'Consistent training frequency'
                  ];
                } else if (goal === 'build-strength') {
                  const strengthPct = parseFloat(goalLevel) || 30;
                  explanation = `Your goal is to increase strength by ${strengthPct}%, focusing on improving force production across all major lifts.`;
                  whatItEntails = [
                    'Low-rep, high-intensity compound lifts',
                    'Mastering technique on foundational movements',
                    'Adequate rest between sets for CNS recovery',
                    'Strategic accessory work to eliminate weak links'
                  ];
                } else if (goal === 'improve-fitness') {
                  const ambitionLabels = {
                    'health': 'Health Focus (50th percentile)',
                    'active': 'Active (75th percentile)',
                    'athletic': 'Athletic (85th percentile)',
                    'elite': 'Elite (95th percentile)'
                  };
                  const ambitionLabel = ambitionLabels[goalLevel as keyof typeof ambitionLabels] || 'Active (75th percentile)';
                  explanation = `Your goal is to achieve ${ambitionLabel} cardiovascular fitness, targeting specific RHR and recovery HR improvements along with VO2 max gains.`;
                  whatItEntails = [
                    'Mix of Zone 2 and HIIT training',
                    'Consistent conditioning 3+ times per week',
                    'Monitoring heart rate recovery',
                    'Focus on aerobic efficiency'
                  ];
                } else {
                  explanation = 'General health means improving overall wellbeing through balanced training.';
                  whatItEntails = [
                    'Mix of strength, cardio, and movement work',
                    'Lifestyle habits that support recovery',
                    'Sustainable routines',
                    'Focus on feeling better day-to-day'
                  ];
                }
                
                  // Get "What We'll Address" items
                  const addressingItems: Array<{ icon: React.ElementType; title: string; desc: string }> = [];
                  
                  if (goal === 'weight-loss' || goal === 'body-recomposition') {
                    const bf = parseFloat(formData?.inbodyBodyFatPct || '0');
                    const restingHr = parseFloat(formData?.cardioRestingHr || '0');
                    if (bf > 0) {
                      addressingItems.push({
                        icon: Scale,
                        title: 'Metabolic Drag',
                        desc: `Your ${bf}% body fat is acting as a limit on your daily energy.`
                      });
                    }
                    if (restingHr > 0) {
                      addressingItems.push({
                        icon: Activity,
                        title: 'Recovery Capacity',
                        desc: `Slow heart rate recovery (${restingHr} bpm) indicates a need for aerobic base building.`
                      });
                    }
                  } else if (goal === 'improve-fitness') {
                    const restingHr = parseFloat(formData?.cardioRestingHr || '0');
                    addressingItems.push({
                      icon: Heart,
                      title: 'Aerobic Base',
                      desc: `We need to lower your resting heart rate from ${restingHr} bpm to improve general stamina.`
                    });
                    addressingItems.push({
                      icon: Lock,
                      title: 'Joint Integrity',
                      desc: "Addressing 'Upper Crossed' patterns to prevent injury as volume increases."
                    });
                  } else if (goal === 'build-muscle') {
                    const pushups = parseFloat(formData?.pushupsOneMinuteReps || formData?.pushupMaxReps || '0');
                    addressingItems.push({
                      icon: Dumbbell,
                      title: 'Strength Foundation',
                      desc: `Your ${pushups} push-up reps show good endurance, but we need to build raw power.`
                    });
                    addressingItems.push({
                      icon: Activity,
                      title: 'Structural Balance',
                      desc: 'Ensuring core stability is solid before loading heavy compounds.'
                    });
                  }
                  
                  return (
                    <TabsContent key={idx} value={goal} className="p-4 sm:p-5 md:p-6 lg:p-8 xl:p-10 m-0 tab-content-enter">
                      <div className="flex flex-col md:flex-row gap-4 sm:gap-6 md:gap-8 lg:gap-10">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-base sm:text-lg font-bold text-zinc-900 mb-2 sm:mb-3">
                            {goal === 'body-recomposition' ? 'Body Recomposition Protocol' :
                             goal === 'weight-loss' ? 'Weight Loss Protocol' :
                             goal === 'build-muscle' ? 'Hypertrophy & Strength Protocol' :
                             goal === 'build-strength' ? 'Strength Development Protocol' :
                             goal === 'improve-fitness' ? 'Athletic Performance Protocol' :
                             'General Health Protocol'}
                          </h4>
                          <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed mb-4 sm:mb-6 md:mb-8">
                            {explanation}
                          </p>
                          
                          <div className="bg-gradient-light/50 rounded-xl p-3 sm:p-4 md:p-5 lg:p-6 border border-gradient-medium/50">
                            <p className="text-[10px] sm:text-xs font-bold text-gradient-dark uppercase tracking-wide mb-3 sm:mb-4">What This Entails:</p>
                            <ul className="space-y-2 sm:space-y-3 md:space-y-4">
                              {whatItEntails.map((item, j) => (
                                <li key={j} className="flex items-start gap-2 sm:gap-3">
                                  <div className="glass-label p-0.5 rounded-full mt-0.5 shrink-0">
                                    <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gradient-dark" />
            </div>
                                  <span className="text-xs sm:text-sm text-zinc-700 leading-relaxed">{item}</span>
                                </li>
                              ))}
                            </ul>
          </div>
          </div>

                        {addressingItems.length > 0 && (
                          <div className="flex-1 border-t md:border-t-0 md:border-l border-zinc-100 pt-6 sm:pt-8 md:pt-0 md:pl-4 lg:pl-6 xl:pl-10 min-w-0">
                            <p className="text-[10px] sm:text-xs font-bold text-zinc-900 uppercase tracking-wide mb-3 sm:mb-4 md:mb-6">What We'll Address</p>
                            <ul className="space-y-3 sm:space-y-4 md:space-y-6">
                              {addressingItems.map((item, i) => (
                                <li key={i} className="flex items-start gap-2 sm:gap-3 md:gap-4 group">
                                  <div className="p-1.5 sm:p-2 md:p-2.5 glass-label text-zinc-600 rounded-lg shrink-0 group-hover:bg-white/80 group-hover:text-gradient-dark transition-apple">
                                    <item.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <span className="font-bold text-zinc-900 text-[10px] sm:text-xs md:text-sm block mb-0.5 sm:mb-1">{item.title}</span>
                                    <span className="text-[10px] sm:text-xs md:text-sm text-zinc-500 block leading-relaxed">{item.desc}</span>
                                  </div>
                </li>
              ))}
            </ul>
          </div>
                        )}
                      </div>
                    </TabsContent>
                  );
                })}
              </Card>
            </Tabs>
        )}
      </section>
        
        {/* Blueprint */}
        <section className="w-full min-w-0 overflow-x-hidden">
          <div className="mb-3 sm:mb-4 md:mb-5 lg:mb-6">
            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 mb-2 sm:mb-3">
              <div className="p-1 sm:p-1.5 md:p-2 bg-gradient-light text-zinc-900 rounded-lg">
                <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
              </div>
              <h3 className="text-[10px] sm:text-xs md:text-sm lg:text-base font-bold text-zinc-900 uppercase tracking-widest">The Blueprint</h3>
            </div>
            <p className="text-[10px] sm:text-xs md:text-sm text-zinc-500 ml-0 sm:ml-8 md:ml-12">
              3 Strategic Pillars designed to bridge the gap from where you are to where you want to be.
            </p>
          </div>

          {blueprintPillars.length > 0 && (
            <>
              {/* Desktop: Grid Layout (lg+) */}
              <div className="hidden lg:grid grid-cols-3 gap-4 sm:gap-5 md:gap-6">
                {blueprintPillars.map((pillar, idx) => {
              const isBlue = pillar.color === 'blue';
              const isRed = pillar.color === 'red';
              
              const badgeBg = 'glass-button-active text-white';
              const textColor = 'text-gradient-dark';
              const iconColor = 'text-gradient-dark';

              return (
                <Card key={idx} className="overflow-hidden flex flex-col">
                  <div className="p-4 sm:p-5 md:p-6 lg:p-8 flex-1">
                    <div className="flex justify-between items-start mb-6">
                      <Badge className={`${badgeBg} border-transparent`}>
                        {pillar.weeks}
                      </Badge>
                      {isBlue && <Lock className={`w-5 h-5 ${iconColor}`} />}
                      {isRed && <Play className={`w-5 h-5 ${iconColor}`} />}
                      {!isBlue && !isRed && <Trophy className={`w-5 h-5 ${iconColor}`} />}
                    </div>

                    <h4 className="text-sm font-bold text-zinc-900 mb-2">{pillar.title}</h4>
                    <div className={`text-xs font-semibold ${textColor} mb-4`}>{pillar.headline}</div>
                    
                    <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed mb-6">
                      {pillar.description}
                    </p>

                    <div className="glass-subtle rounded-xl p-5">
                      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-zinc-200">
                        <Play className="w-3 h-3 text-zinc-400 fill-current" />
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Sample Protocol</span>
                      </div>
                      <div className="space-y-3">
                        {pillar.protocol.map((row: { name: string; setsReps: string }, rIdx: number) => (
                          <div key={rIdx} className="flex justify-between items-center text-xs">
                            <span className="font-bold text-zinc-700">{row.name}</span>
                            <span className="text-zinc-500 glass-label px-2.5 py-1 rounded">{row.setsReps}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
              </div>

              {/* Mobile/Tablet: Tabs Layout (below lg) */}
              <Tabs defaultValue={`pillar-0`} className="w-full lg:hidden">
                <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0 mb-3 sm:mb-4 scrollbar-hide">
                  <TabsList className="w-full sm:w-auto justify-start rounded-lg sm:rounded-xl glass-button h-auto p-1 sm:p-1.5 gap-1 inline-flex min-w-max sm:min-w-0">
                    {blueprintPillars.map((pillar, idx) => (
                      <TabsTrigger
                        key={idx}
                        value={`pillar-${idx}`}
                        className="text-[9px] sm:text-[10px] font-semibold px-2 sm:px-2.5 md:px-3 py-1 sm:py-1.5 rounded-md transition-apple whitespace-nowrap shrink-0 data-[state=active]:glass-button-active data-[state=active]:text-white data-[state=inactive]:text-zinc-600 data-[state=inactive]:hover:text-zinc-900"
                      >
                        {pillar.title}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>
                
                <div className="space-y-4 sm:space-y-5 md:space-y-6">
                  {blueprintPillars.map((pillar, idx) => {
              const isBlue = pillar.color === 'blue';
              const isRed = pillar.color === 'red';
              
              const badgeBg = 'glass-button-active text-white';
              const textColor = 'text-gradient-dark';
              const iconColor = 'text-gradient-dark';

              return (
                <TabsContent key={idx} value={`pillar-${idx}`} className="m-0">
                <Card className="overflow-hidden flex flex-col">
                  <div className="p-4 sm:p-5 md:p-6 lg:p-8 flex-1">
                    <div className="flex justify-between items-start mb-4 sm:mb-5 md:mb-6">
                      <Badge className={`${badgeBg} border-transparent text-[10px] sm:text-xs`}>
                        {pillar.weeks}
                      </Badge>
                      {isBlue && <Lock className={`w-5 h-5 ${iconColor}`} />}
                      {isRed && <Play className={`w-5 h-5 ${iconColor}`} />}
                      {!isBlue && !isRed && <Trophy className={`w-5 h-5 ${iconColor}`} />}
                    </div>

                    <h4 className="text-xs sm:text-sm font-black uppercase tracking-wide text-zinc-900 mb-1.5 sm:mb-2">{pillar.title}</h4>
                    <div className={`text-[10px] sm:text-xs font-bold ${textColor} mb-3 sm:mb-4 md:mb-5`}>{pillar.headline}</div>
                    
                    <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed mb-4 sm:mb-6 md:mb-8">
                      {pillar.description}
                    </p>

                    <div className="glass-subtle rounded-xl p-3 sm:p-4 md:p-5">
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-3 sm:mb-4 pb-2 sm:pb-3 border-b border-zinc-200">
                        <Play className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-zinc-400 fill-current" />
                        <span className="text-[9px] sm:text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Sample Protocol</span>
                      </div>
                      <div className="space-y-2 sm:space-y-3">
                        {pillar.protocol.map((row: { name: string; setsReps: string }, rIdx: number) => (
                          <div key={rIdx} className="flex justify-between items-center text-[10px] sm:text-xs gap-2">
                            <span className="font-bold text-zinc-700 flex-1 min-w-0">{row.name}</span>
                            <span className="text-zinc-500 glass-label px-2 sm:px-2.5 py-0.5 sm:py-1 rounded text-[9px] sm:text-[10px] shrink-0">{row.setsReps}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
                </TabsContent>
              );
            })}
                </div>
              </Tabs>
            </>
          )}
        </section>
        
        {/* Timeline & Workout */}
        <section className="w-full min-w-0 overflow-x-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 md:gap-6 lg:gap-8 mb-6 md:mb-8">
            {/* Timeline - Full Width */}
            <div className="lg:col-span-12 flex flex-col">
              <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 mb-2 sm:mb-3 md:mb-4 lg:mb-5 xl:mb-6">
                <div className="p-1 sm:p-1.5 md:p-2 bg-gradient-light text-zinc-900 rounded-lg">
                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                </div>
                <h3 className="text-[10px] sm:text-xs md:text-sm lg:text-base font-bold text-zinc-900 uppercase tracking-widest">Your Timeline</h3>
              </div>
              
              <Card className="p-4 sm:p-5 md:p-6 rounded-2xl overflow-hidden">
                <div className="glass-subtle rounded-xl p-3 sm:p-4 mb-4 sm:mb-5 md:mb-6">
                  <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                    <span className="font-bold text-zinc-900">This timeline shows when you can expect to start seeing results.</span> More sessions per week means faster progress—adjust the slider below to see how training frequency affects your timeline.
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-5 md:mb-6 w-full min-w-0">
                  <span className="text-xs sm:text-sm font-medium text-zinc-500 shrink-0 w-full sm:w-auto">Sessions per week:</span>
                  <div className="flex-grow w-full sm:w-auto min-w-0 max-w-full">
                    <input 
                      type="range" min={3} max={5} step={1}
                      value={sessionsPerWeek}
                      onChange={(e) => setSessionsPerWeek(parseInt(e.target.value))}
                      className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer hover:bg-zinc-300 transition-colors slider-apple max-w-full"
                      style={{ maxWidth: '100%' }}
                    />
                    <div className="flex justify-between text-[9px] sm:text-[10px] text-zinc-400 font-bold uppercase mt-1.5 sm:mt-2 px-1 max-w-full">
                      <span className="shrink-0">3</span>
                      <span className="shrink-0">4</span>
                      <span className="shrink-0">5</span>
                    </div>
                  </div>
                  <span className="font-bold text-zinc-900 bg-gradient-light px-2.5 sm:px-3 py-1 rounded-lg shrink-0 text-center text-xs sm:text-sm w-full sm:w-auto sm:min-w-[90px]">
                    {sessionsPerWeek} / Week
                  </span>
                </div>
                
        <div className="space-y-3 sm:space-y-4 w-full">
                  {orderedCats.map((cat, i) => {
                    const weeks = Math.round((weeksByCategory[cat.id] ?? 0) * (sessionsPerWeek === 3 ? 1 : sessionsPerWeek === 4 ? 0.85 : 0.70));
                    const width = (weeks / 40) * 100;
                    
                    const gradientClass = "gradient-bg";

                    return (
                      <div key={i} className="group w-full min-w-0">
                        <div className="flex justify-between items-center gap-2 text-xs font-bold mb-2 w-full min-w-0">
                          <span className="text-zinc-800 truncate flex-1 min-w-0">{niceLabel(cat.id)}</span>
                          <span className="text-zinc-400 font-medium shrink-0 text-left text-[10px] sm:text-xs">~{weeks} weeks</span>
                        </div>
                        <div className="h-2.5 w-full bg-zinc-100 rounded-full overflow-hidden relative max-w-full">
                          <div 
                            className={`h-full rounded-full ${gradientClass} transition-all duration-700 ease-out`} 
                            style={{ width: `${Math.min(100, width)}%` }} 
          />
        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 sm:mt-5 md:mt-6 pt-3 sm:pt-4 border-t border-zinc-100 w-full">
                  <p className="text-[10px] sm:text-xs text-zinc-500 leading-relaxed text-center break-words">
                    <span className="text-zinc-900 font-bold">Total estimated timeline: ~{Math.round(maxWeeks * (sessionsPerWeek === 3 ? 1 : sessionsPerWeek === 4 ? 0.85 : 0.70))} weeks.</span><br className="hidden sm:block"/>
                    <span className="block sm:inline">Increasing frequency can reduce this timeline by up to 30%.</span>
                  </p>
                </div>
              </Card>
            </div>
          </div>

          {/* Non-Negotiables */}
          <Card className="bg-zinc-900 text-white p-5 sm:p-6 md:p-8 lg:p-10 rounded-2xl ring-1 ring-zinc-800 overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-start gap-6 sm:gap-8 md:gap-10 lg:gap-12 w-full min-w-0">
              <div className="md:w-1/3 min-w-0">
                <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-5">
                  <div className="p-2 sm:p-2.5 gradient-bg rounded-lg">
                    <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <h4 className="text-xl sm:text-2xl font-black text-white tracking-tight">Non-Negotiables</h4>
                </div>
                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed mb-4 sm:mb-6 md:mb-8">
                  We handle the programming, the tracking, and the analysis. Your job is simple but demanding: execute the plan.
                </p>
                <div className="inline-block px-4 sm:px-5 py-2 sm:py-3 bg-white/5 rounded-xl border border-white/5 backdrop-blur-sm">
                  <p className="text-[10px] sm:text-xs font-bold text-white/80 uppercase tracking-wider break-words">
                    "As long as you do your part, we'll do ours."
                  </p>
                </div>
              </div>

              <div className="md:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-5 w-full min-w-0">
                <div className="flex gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all duration-300 group min-w-0">
                  <div className="p-1.5 sm:p-2 bg-zinc-800 rounded-lg h-fit group-hover:bg-gradient-from/20 group-hover:text-gradient-from transition-colors shrink-0">
                    <Repeat className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-400 group-hover:text-gradient-from" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs sm:text-sm font-bold text-white mb-1 sm:mb-1.5">Consistency is King</div>
                    <div className="text-[10px] sm:text-xs text-zinc-400 leading-relaxed group-hover:text-zinc-300 break-words">
                      Show up. 90% attendance is the baseline. Missing sessions compounds negatively over time.
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all duration-300 group min-w-0">
                  <div className="p-1.5 sm:p-2 bg-zinc-800 rounded-lg h-fit group-hover:bg-gradient-from/20 group-hover:text-gradient-from transition-colors shrink-0">
                    <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-400 group-hover:text-gradient-from" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs sm:text-sm font-bold text-white mb-1 sm:mb-1.5">Maximum Effort</div>
                    <div className="text-[10px] sm:text-xs text-zinc-400 leading-relaxed group-hover:text-zinc-300 break-words">
                      We track the weights, you bring the intensity. Leave nothing in the tank when you're on the floor.
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all duration-300 group min-w-0">
                  <div className="p-1.5 sm:p-2 bg-zinc-800 rounded-lg h-fit group-hover:bg-gradient-from/20 group-hover:text-gradient-from transition-colors shrink-0">
                    <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-400 group-hover:text-gradient-from" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs sm:text-sm font-bold text-white mb-1 sm:mb-1.5">Trust the Process</div>
                    <div className="text-[10px] sm:text-xs text-zinc-400 leading-relaxed group-hover:text-zinc-300 break-words">
                      Adherence to the macro cycle is mandatory. Don't freelance. We optimize the plan, you execute it.
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all duration-300 group min-w-0">
                  <div className="p-1.5 sm:p-2 bg-zinc-800 rounded-lg h-fit group-hover:bg-gradient-from/20 group-hover:text-gradient-from transition-colors shrink-0">
                    <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-400 group-hover:text-gradient-from" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs sm:text-sm font-bold text-white mb-1 sm:mb-1.5">Open Communication</div>
                    <div className="text-[10px] sm:text-xs text-zinc-400 leading-relaxed group-hover:text-zinc-300 break-words">
                      If something feels off, tell us immediately. We can't adjust what we don't know about.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
      </section>
          </>
        )}
      </div>
    </div>
  );
}


