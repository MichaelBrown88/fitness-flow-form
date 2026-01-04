/**
 * Simplified Client Report
 * Clean, focused report structure:
 * 1. Where you're at now (Scores, Archetype, Gap Analysis, Strengths/Weaknesses, Lifestyle)
 * 2. Where you want to get to (Goals, Issue Resolution)
 * 3. How we'll help (Blueprint, Sample Workout, Timeline)
 */

import React, { useMemo, useState } from 'react';
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
  Flame, Zap, Lock, MessageSquare, Repeat, Play, ArrowRight, Lightbulb
} from 'lucide-react';
import { CATEGORY_ORDER, circleColor, niceLabel } from './ClientReportConstants';
import { useGapAnalysisData } from './useGapAnalysisData';
import { LifestyleFactorsBar } from './LifestyleFactorsBar';
import { MovementPostureMobility } from './MovementPostureMobility';
import CoachReport from './CoachReport';
import { generateBodyCompInterpretation } from '@/lib/recommendations';
import { calculateAge } from '@/lib/scoring';
import { calculateBodyRecomposition, getTargetBodyFatFromLevel, getBodyFatRange } from '@/lib/utils/bodyRecomposition';

export default function ClientReport({
  scores,
  goals,
  formData,
  plan,
  previousScores,
}: {
  scores: ScoreSummary;
  goals?: string[];
  formData?: FormData;
  plan?: CoachPlan;
  previousScores?: ScoreSummary | null;
}) {
  const orderedCats = useMemo(
    () => scores?.categories ? CATEGORY_ORDER.map(id => scores.categories.find(c => c.id === (id as 'bodyComp' | 'strength' | 'cardio' | 'movementQuality' | 'lifestyle'))).filter(Boolean) as ScoreSummary['categories'] : [],
    [scores?.categories]
  );
  
  const archetype = useMemo(() => determineArchetype(scores, formData), [scores, formData]);
  
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
      .filter(cat => cat.score < 70 && cat.weaknesses.length > 0) // Only categories with low scores
      .flatMap(cat => 
        cat.weaknesses
          .filter(w => {
            // Filter out "optimization" or "refinement" messages for high-scoring categories
            // Only show actual weaknesses, not relative weaknesses from good categories
            const isActualWeakness = !w.toLowerCase().includes('optimization') && 
                                     !w.toLowerCase().includes('refining') &&
                                     !w.toLowerCase().includes('unlock further potential');
            return isActualWeakness;
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
      // Parse weight loss percentage (e.g., "15" = 15%)
      const weightLossPct = parseFloat(levelWL) || 15;
      wlTarget = (weightKg * weightLossPct) / 100;
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
    const muscleRate = 0.15;
    const muscleWeeks = Math.ceil(muscleTargetKg / muscleRate);
    const levelST = formData?.goalLevelStrength || '30';
    const strengthPct = parseFloat(levelST) || 30;
    const strengthWeeks = Math.ceil(strengthPct / 2.5) * 5;
    const levelFT = formData?.goalLevelFitness || 'active';
    // Fitness weeks based on ambition level
    // Health: 12 weeks, Active: 16 weeks, Athletic: 18 weeks, Elite: 20 weeks
    const cardioWeeks = levelFT === 'elite' ? 20 : levelFT === 'athletic' ? 18 : levelFT === 'active' ? 16 : 12;
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
      if (cat.id === 'strength') base = Math.max(12, strengthWeeks);
      if (cat.id === 'cardio') base = Math.max(12, cardioWeeks);
      if (cat.id === 'movementQuality') base = Math.max(mobilityWeeks, postureWeeks);
      if (cat.id === 'lifestyle') base = 4;
      map[cat.id] = base;
    }
    return map;
  }, [orderedCats, formData]);
  
  const maxWeeks = useMemo(() => Math.max(...orderedCats.map(c => weeksByCategory[c.id] ?? 0), 0), [orderedCats, weeksByCategory]);
  
  const clientName = (formData?.fullName || '').trim();
  const primaryGoal = goals && goals.length > 0 ? goals[0] : 'general-health';
  const goalLabel = primaryGoal === 'weight-loss' ? 'Weight Loss' : 
                    primaryGoal === 'build-muscle' ? 'Muscle Gain' :
                    primaryGoal === 'build-strength' ? 'Strength' :
                    primaryGoal === 'improve-fitness' ? 'Fitness' : 'General Health';
  
  // State for roadmap slider
  const [sessionsPerWeek, setSessionsPerWeek] = useState(3);
  const [activeView, setActiveView] = useState<'client' | 'coach'>('client' as 'client' | 'coach');
  
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
  
  if (!scores || !scores.categories || scores.categories.length === 0 || !hasAnyData) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-semibold mb-2">No assessment data available</p>
        <p>Please complete at least one section of the assessment to generate a report.</p>
      </div>
    );
  }
  
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
  const gapAnalysisData = useGapAnalysisData(scores, formData);
  
  // Format date
  const reportDate = useMemo(() => {
    const date = new Date();
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }, []);

  // Get blueprint pillars data - ordered and deduplicated
  const blueprintPillars = useMemo(() => {
    const movement = scores.categories.find(c => c.id === 'movementQuality') || { score: 0 };
    const bodyComp = scores.categories.find(c => c.id === 'bodyComp') || { score: 0 };
    const strength = scores.categories.find(c => c.id === 'strength') || { score: 0 };
    
    const headPos = Array.isArray(formData?.postureHeadOverall) ? formData.postureHeadOverall : [formData?.postureHeadOverall];
    const shoulderPos = Array.isArray(formData?.postureShouldersOverall) ? formData.postureShouldersOverall : [formData?.postureShouldersOverall];
    const kneeValgus = formData?.ohsKneeAlignment === 'valgus' || formData?.lungeLeftKneeAlignment === 'valgus' || formData?.lungeRightKneeAlignment === 'valgus';
    const visceral = parseFloat(formData?.visceralFatLevel || '0');
    const goals = formData?.clientGoals || [];
    const primaryGoal = goals[0] || 'general-health';
    
    const pillars: Array<{ title: string; weeks: string; color: string; headline: string; description: string; protocol: Array<{ name: string; setsReps: string }>; order: number }> = [];
    
    // Pillar 1: Structural Restoration (always first if needed, weeks 1-8)
    if (movement.score < 70 || headPos.includes('forward-head') || shoulderPos.includes('rounded') || kneeValgus) {
      let focus = '';
      let exercises: Array<{ name: string; setsReps: string }> = [];
      
      if (kneeValgus) {
        focus = 'FIXING THE VALGUS KNEE & TECH NECK';
        exercises = [
          { name: 'Knee Banded Walks', setsReps: '2 x 15 steps' },
          { name: 'Chin Tucks', setsReps: '2 x 10 reps' },
          { name: 'Single Leg Touchdowns', setsReps: '3 x 8/side' }
        ];
      } else if (headPos.includes('forward-head') || shoulderPos.includes('rounded')) {
        focus = 'FIXING TECH NECK & POSTURE';
        exercises = [
          { name: 'Chin Tucks', setsReps: '2 x 10 reps' },
          { name: 'Wall Angels', setsReps: '2 x 12 reps' },
          { name: 'Band Pull-Aparts', setsReps: '2 x 15 reps' }
        ];
      } else {
        focus = 'IMPROVING MOVEMENT QUALITY';
        exercises = [
          { name: 'Hip Mobility Drills', setsReps: '2 x 10 reps' },
          { name: 'Shoulder CARs', setsReps: '2 x 5 each direction' },
          { name: 'Ankle Mobility', setsReps: '2 x 8/side' }
        ];
      }
      
      pillars.push({
        title: 'Structural Restoration',
        weeks: 'Weeks 1-8',
        color: 'blue',
        headline: focus,
        description: 'We cannot load a dysfunctional pattern. Phase 1 prioritizes joint stacking so you can train pain-free.',
        protocol: exercises,
        order: 1
      });
    }
    
    // Pillar 2: Metabolic Fire (weeks 1-16, overlaps with structural)
    if (bodyComp.score < 70 || visceral >= 10 || primaryGoal === 'weight-loss') {
      pillars.push({
        title: 'Metabolic Fire',
        weeks: 'Weeks 1-16',
        color: 'red',
        headline: 'TARGETING VISCERAL FAT',
        description: 'Shifting your body from sugar-burning to fat-burning through Zone 2 cardio and nutrient timing.',
        protocol: [
          { name: 'Incline Walk (12%)', setsReps: '30 mins' },
          { name: 'Nasal Breathing', setsReps: 'Continuous' },
          { name: 'Heart Rate Target', setsReps: '135-145 BPM' }
        ],
        order: 2
      });
    }
    
    // Pillar 3: Strength Expression (weeks 8-24, comes after structural)
    if (strength.score >= 60 || primaryGoal === 'build-strength' || primaryGoal === 'build-muscle') {
      pillars.push({
        title: 'Strength Expression',
        weeks: 'Weeks 8-24',
        color: 'green',
        headline: 'BUILDING POWER',
        description: 'Progressive overload and strength development.',
        protocol: [
          { name: 'Compound Lifts', setsReps: '3-4 x 6-8' },
          { name: 'Accessory Work', setsReps: '3 x 10-12' },
          { name: 'Progressive Overload', setsReps: 'Weekly' }
        ],
        order: 3
      });
    }
    
    // Fill to 3 pillars if needed, ensuring no duplicates
    const existingTitles = new Set(pillars.map(p => p.title));
    
    if (pillars.length < 3) {
      if (!existingTitles.has('Structural Restoration')) {
        pillars.push({
          title: 'Structural Restoration',
          weeks: 'Weeks 1-8',
          color: 'blue',
          headline: 'MOVEMENT QUALITY',
          description: 'Building a solid foundation of movement patterns and joint stability.',
          protocol: [
            { name: 'Hip Mobility', setsReps: '2 x 10 reps' },
            { name: 'Shoulder Mobility', setsReps: '2 x 10 reps' },
            { name: 'Core Activation', setsReps: '2 x 12 reps' }
          ],
          order: 1
        });
      }
      
      if (pillars.length < 3 && !existingTitles.has('Metabolic Fire')) {
        pillars.push({
          title: 'Metabolic Fire',
          weeks: 'Weeks 1-16',
          color: 'red',
          headline: 'FAT LOSS & ENERGY',
          description: 'Optimizing metabolism through strategic training and nutrition.',
          protocol: [
            { name: 'Zone 2 Cardio', setsReps: '30-45 mins' },
            { name: 'Metabolic Circuits', setsReps: '3-4 rounds' },
            { name: 'Recovery Walks', setsReps: 'Daily' }
          ],
          order: 2
        });
      }
      
      if (pillars.length < 3 && !existingTitles.has('Strength Expression')) {
        pillars.push({
          title: 'Strength Expression',
          weeks: 'Weeks 8-24',
          color: 'green',
          headline: 'BUILDING POWER',
          description: 'Progressive overload and strength development.',
          protocol: [
            { name: 'Compound Lifts', setsReps: '3-4 x 6-8' },
            { name: 'Accessory Work', setsReps: '3 x 10-12' },
            { name: 'Progressive Overload', setsReps: 'Weekly' }
          ],
          order: 3
        });
      }
    }
    
    // Sort by order and remove duplicates by title
    const uniquePillars = Array.from(
      new Map(pillars.map(p => [p.title, p])).values()
    ).sort((a, b) => a.order - b.order);
    
    return uniquePillars.slice(0, 3);
  }, [scores, formData]);
  
  // Responsive container with proper padding and max-width
  const containerClass = "min-h-screen bg-zinc-50 text-zinc-900 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12";
  const contentClass = "max-w-6xl mx-auto space-y-12 md:space-y-16";
  
  return (
    <div className={containerClass}>
      <div className={contentClass}>
        
      {/* Header */}
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center rounded-full glass-label px-4 py-1.5 text-xs font-semibold text-zinc-700">
                  Assessment Report
                </span>
                <span className="text-xs text-zinc-400 font-medium">{reportDate}</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-black tracking-tight text-zinc-900">
                {clientName || 'Your Assessment Report'}
        </h1>
              <p className="text-zinc-500 font-medium text-base">
                Your personalized journey to better health and performance.
              </p>
            </div>
            
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
          </div>
        </div>
        
        {/* Client Info Bar */}
        {formData && (
          <div className="glass-subtle rounded-xl px-6 py-4 mb-6">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs">
              {formData.gender && (
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-500">Gender</span>
                  <span className="text-zinc-700 font-semibold capitalize">{formData.gender}</span>
            </div>
              )}
              {formData.dateOfBirth && (
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-500">•</span>
                  <span className="text-zinc-500">Age</span>
                  <span className="text-zinc-700 font-semibold">{calculateAge(formData.dateOfBirth)}</span>
          </div>
              )}
              {formData.heightCm && parseFloat(formData.heightCm) > 0 && (
                <div className="flex items-center gap-1.5">
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
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-500">•</span>
                  <span className="text-zinc-500">Weight</span>
                  <span className="text-zinc-700 font-semibold">{parseFloat(formData.inbodyWeightKg).toFixed(1)} kg</span>
                </div>
              )}
              {formData.inbodyBmi && parseFloat(formData.inbodyBmi) > 0 && (
                <div className="flex items-center gap-1.5">
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
          plan ? (
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
          )
        ) : (
          <>
        
        {/* Starting Point */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-light text-zinc-900 rounded-lg">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-zinc-900 uppercase tracking-widest">Your Starting Point</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {/* Score Card */}
            <Card className="col-span-1 flex flex-col items-center justify-center p-6 md:p-8 text-center relative overflow-hidden min-h-[360px] md:min-h-[420px]">
              
              {/* Circular Progress Gauge */}
              <div className="relative w-48 h-48 md:w-64 md:h-64 flex items-center justify-center mb-6 md:mb-8 mt-2 md:mt-4">
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
                
                <div className="absolute inset-0 flex flex-col items-center justify-center pt-4 md:pt-6">
                  <span className="text-5xl md:text-7xl font-black text-zinc-900 tracking-tighter">{scores.overall}</span>
                  <span className="text-[9px] md:text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mt-1 md:mt-2">Overall Score</span>
                </div>
              </div>

              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-light text-zinc-900 text-sm font-bold border border-gradient-medium mb-6 shadow-sm">
                <Trophy className="w-4 h-4 fill-current text-zinc-900" />
                {archetype.name}
              </div>

              {/* Description */}
              <p className="text-sm text-zinc-500 font-medium leading-relaxed max-w-[260px] mx-auto">
                {archetype.description}
              </p>
            </Card>

            {/* Radar Chart */}
            <Card className="col-span-1 md:col-span-2 p-6 md:p-8 relative min-h-[360px] md:min-h-[420px]">
              <div className="flex justify-between items-start mb-4">
            <div>
                  <h4 className="font-bold text-zinc-900 text-lg">Performance Profile</h4>
                  <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wide font-semibold">
                    Visualizing your current baseline across health pillars.
                  </p>
            </div>
          </div>
              <div className="h-[280px] md:h-[320px] w-full mt-2 md:mt-4">
                <OverallRadarChart data={overallRadarData} previousData={previousRadarData} />
        </div>
            </Card>
        </div>
        </section>
        
        {/* Gap Analysis */}
        <section>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-gradient-light text-zinc-900 rounded-lg">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-zinc-900 uppercase tracking-widest">Gap Analysis</h3>
          </div>
          <p className="text-sm text-zinc-500 mb-6">Current metrics vs. optimal performance targets.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
            {/* Body Composition */}
            <Card className="p-6 flex flex-col">
              {/* Header - outside grid - Fixed height */}
              <div className="flex items-center justify-between mb-6 h-[44px]">
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
              
              {/* Metrics Grid - Consistent across all cards - Fixed 3 rows */}
              <div className="grid grid-cols-[1fr_auto_auto_1fr] gap-x-3 gap-y-3 mb-6 min-h-[140px]">
                {/* Column Headers */}
                <div></div>
                <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider text-center">Current</div>
                <div></div>
                <div className="text-xs font-semibold text-gradient-dark uppercase tracking-wider text-right">Target</div>
                
                {/* Row 1: Weight */}
                {formData?.inbodyWeightKg && parseFloat(formData.inbodyWeightKg) > 0 ? (() => {
                  const currentWeight = parseFloat(formData.inbodyWeightKg);
                  let targetWeight = currentWeight * 0.96; // Default fallback
                  
                  // For body recomposition, use the calculated target weight
                  if (isBodyRecomp) {
                    const bf = parseFloat(formData?.inbodyBodyFatPct || '0');
                    const gender = (formData?.gender || 'male').toLowerCase() as 'male' | 'female';
                    const recompLevel = (formData?.goalLevelBodyRecomp || 'athletic') as 'healthy' | 'fit' | 'athletic' | 'shredded';
                    
                    if (bf > 0) {
                      const targetBodyFat = getTargetBodyFatFromLevel(recompLevel, gender);
                      const currentMuscleMass = parseFloat(formData?.skeletalMuscleMassKg || '0');
                      const recompResult = calculateBodyRecomposition(
                        currentWeight,
                        bf,
                        targetBodyFat,
                        gender,
                        currentMuscleMass > 0 ? currentMuscleMass : undefined
                      );
                      targetWeight = recompResult.targetWeight;
                    }
                  } else if (formData?.weightLossTargetKg) {
                    // For weight loss goals, use stored target
                    targetWeight = parseFloat(formData.weightLossTargetKg);
                  }
                  
                  return (
                    <>
                      <span className="text-sm font-medium text-zinc-700">Weight</span>
                      <span className="text-sm text-zinc-600 text-center">{currentWeight.toFixed(1)} kg</span>
                      <ArrowRight className="w-3 h-3 text-gradient-dark flex-shrink-0 justify-self-center" />
                      <span className="text-sm font-bold text-gradient-dark text-right">{targetWeight.toFixed(1)} kg</span>
                    </>
                  );
                })() : (
                  <>
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                  </>
                )}
                
                {/* Row 2: Muscle Mass */}
                {formData?.skeletalMuscleMassKg && parseFloat(formData.skeletalMuscleMassKg) > 0 ? (() => {
                  const currentMuscle = parseFloat(formData.skeletalMuscleMassKg);
                  let targetMuscle = currentMuscle * 1.025; // Default 2.5% increase
                  
                  // For body recomposition, use the calculated target muscle mass
                  if (isBodyRecomp) {
                    const weightKg = parseFloat(formData?.inbodyWeightKg || '0');
                    const bf = parseFloat(formData?.inbodyBodyFatPct || '0');
                    const gender = (formData?.gender || 'male').toLowerCase() as 'male' | 'female';
                    const recompLevel = (formData?.goalLevelBodyRecomp || 'athletic') as 'healthy' | 'fit' | 'athletic' | 'shredded';
                    
                    if (bf > 0 && weightKg > 0) {
                      const targetBodyFat = getTargetBodyFatFromLevel(recompLevel, gender);
                      const recompResult = calculateBodyRecomposition(
                        weightKg,
                        bf,
                        targetBodyFat,
                        gender,
                        currentMuscle
                      );
                      targetMuscle = recompResult.targetMuscleMass;
                    }
                  }
                  
                  return (
                    <>
                      <span className="text-sm font-medium text-zinc-700">Muscle Mass</span>
                      <span className="text-sm text-zinc-600 text-center">{currentMuscle.toFixed(1)} kg</span>
                      <ArrowRight className="w-3 h-3 text-gradient-dark flex-shrink-0 justify-self-center" />
                      <span className="text-sm font-bold text-gradient-dark text-right">{targetMuscle.toFixed(1)} kg</span>
                    </>
                  );
                })() : (
                  <>
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                  </>
                )}
                
                {/* Row 3: Body Fat */}
                {formData?.inbodyBodyFatPct && parseFloat(formData.inbodyBodyFatPct) > 0 ? (() => {
                  const currentBF = parseFloat(formData.inbodyBodyFatPct);
                  const targetBF = gapAnalysisData[0]?.targetValue ? parseFloat(gapAnalysisData[0].targetValue.replace('%', '')) : currentBF * 0.85;
                  return (
                    <>
                      <span className="text-sm font-medium text-zinc-700">Body Fat</span>
                      <span className="text-sm text-zinc-600 text-center">{currentBF.toFixed(1)}%</span>
                      <ArrowRight className="w-3 h-3 text-gradient-dark flex-shrink-0 justify-self-center" />
                      <span className="text-sm font-bold text-gradient-dark text-right">{targetBF.toFixed(1)}%</span>
                    </>
                  );
                })() : (
                  <>
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                  </>
                )}
              </div>
              
              {/* Coach Insight - outside grid, aligned at bottom */}
              <div className="pt-4 border-t border-zinc-100">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-zinc-600 leading-relaxed">{gapAnalysisData[0]?.insight}</p>
                </div>
              </div>
            </Card>
            
            {/* Functional Strength */}
            <Card className="p-6 flex flex-col">
              {/* Header - outside grid - Fixed height */}
              <div className="flex items-center justify-between mb-6 h-[44px]">
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
              
              {/* Metrics Grid - Same structure as other cards - Fixed 3 rows */}
              <div className="grid grid-cols-[1fr_auto_auto_1fr] gap-x-3 gap-y-3 mb-6 min-h-[140px]">
                {/* Column Headers */}
                <div></div>
                <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider text-center">Current</div>
                <div></div>
                <div className="text-xs font-semibold text-gradient-dark uppercase tracking-wider text-right">Target</div>
                
                {/* Row 1: Muscular Endurance (Pushups + Squats) */}
                {(() => {
                  const functionalGaps = gapAnalysisData[1]?.functionalGaps;
                  if (functionalGaps) {
                    return (
                      <>
                        <span className="text-sm font-medium text-zinc-700">Muscular Endurance</span>
                        <span className="text-sm text-zinc-600 text-center">{functionalGaps.endurance.current} reps</span>
                        <ArrowRight className="w-3 h-3 text-gradient-dark flex-shrink-0 justify-self-center" />
                        <span className="text-sm font-bold text-gradient-dark text-right">{functionalGaps.endurance.target} reps</span>
                      </>
                    );
                  }
                  return (
                    <>
                      <div></div>
                      <div></div>
                      <div></div>
                      <div></div>
                    </>
                  );
                })()}
                
                {/* Row 2: Core Stability (Plank) */}
                {(() => {
                  const functionalGaps = gapAnalysisData[1]?.functionalGaps;
                  if (functionalGaps) {
                    const currentSeconds = functionalGaps.core.current;
                    const targetSeconds = functionalGaps.core.target;
                    const currentMinutes = Math.floor(currentSeconds / 60);
                    const currentSecs = currentSeconds % 60;
                    const targetMinutes = Math.floor(targetSeconds / 60);
                    const targetSecs = targetSeconds % 60;
                    
                    return (
                      <>
                        <span className="text-sm font-medium text-zinc-700">Core Stability</span>
                        <span className="text-sm text-zinc-600 text-center">
                          {currentMinutes > 0 ? `${currentMinutes}:${currentSecs.toString().padStart(2, '0')}` : `${currentSeconds}s`}
                        </span>
                        <ArrowRight className="w-3 h-3 text-gradient-dark flex-shrink-0 justify-self-center" />
                        <span className="text-sm font-bold text-gradient-dark text-right">
                          {targetMinutes > 0 ? `${targetMinutes}:${targetSecs.toString().padStart(2, '0')}` : `${targetSeconds}s`}
                        </span>
                      </>
                    );
                  }
                  return (
                    <>
                      <div></div>
                      <div></div>
                      <div></div>
                      <div></div>
                    </>
                  );
                })()}
                
                {/* Row 3: Overall Strength (Grip) - Optional */}
                {(() => {
                  const functionalGaps = gapAnalysisData[1]?.functionalGaps;
                  if (functionalGaps?.strength) {
                    return (
                      <>
                        <span className="text-sm font-medium text-zinc-700">Overall Strength</span>
                        <span className="text-sm text-zinc-600 text-center">{functionalGaps.strength.current.toFixed(1)} kg</span>
                        <ArrowRight className="w-3 h-3 text-gradient-dark flex-shrink-0 justify-self-center" />
                        <span className="text-sm font-bold text-gradient-dark text-right">{functionalGaps.strength.target.toFixed(1)} kg</span>
                      </>
                    );
                  }
                  // Empty placeholder if no grip data
                  return (
                    <>
                      <div></div>
                      <div></div>
                      <div></div>
                      <div></div>
                    </>
                  );
                })()}
              </div>
              
              {/* Coach Insight - outside grid, aligned at bottom */}
              <div className="pt-4 border-t border-zinc-100">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-zinc-600 leading-relaxed">{gapAnalysisData[1]?.insight}</p>
                </div>
              </div>
            </Card>
            
            {/* Metabolic Fitness */}
            <Card className="p-6 flex flex-col">
              {/* Header - outside grid - Fixed height */}
              <div className="flex items-center justify-between mb-6 h-[44px]">
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
              
              {/* Metrics Grid - Same structure as other cards - Fixed 3 rows */}
              <div className="grid grid-cols-[1fr_auto_auto_1fr] gap-x-3 gap-y-3 mb-6 min-h-[140px]">
                {/* Column Headers */}
                <div></div>
                <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider text-center">Current</div>
                <div></div>
                <div className="text-xs font-semibold text-gradient-dark uppercase tracking-wider text-right">Target</div>
                
                {/* Row 1: Resting HR */}
                {(() => {
                  const cardioGaps = gapAnalysisData[2]?.cardioGaps;
                  if (cardioGaps && cardioGaps.rhr.current > 0) {
                    return (
                      <>
                        <span className="text-sm font-medium text-zinc-700">Resting HR</span>
                        <span className="text-sm text-zinc-600 text-center">{Math.round(cardioGaps.rhr.current)} bpm</span>
                        <ArrowRight className="w-3 h-3 text-gradient-dark flex-shrink-0 justify-self-center" />
                        <span className="text-sm font-bold text-gradient-dark text-right">{Math.round(cardioGaps.rhr.target)} bpm</span>
                      </>
                    );
                  }
                  return (
                    <>
                      <div></div>
                      <div></div>
                      <div></div>
                      <div></div>
                    </>
                  );
                })()}
                
                {/* Row 2: Recovery HR */}
                {(() => {
                  const cardioGaps = gapAnalysisData[2]?.cardioGaps;
                  if (cardioGaps && cardioGaps.recovery.current > 0) {
                    return (
                      <>
                        <span className="text-sm font-medium text-zinc-700">Recovery HR</span>
                        <span className="text-sm text-zinc-600 text-center">{Math.round(cardioGaps.recovery.current)} bpm</span>
                        <ArrowRight className="w-3 h-3 text-gradient-dark flex-shrink-0 justify-self-center" />
                        <span className="text-sm font-bold text-gradient-dark text-right">{Math.round(cardioGaps.recovery.target)} bpm</span>
                      </>
                    );
                  }
                  return (
                    <>
                      <div></div>
                      <div></div>
                      <div></div>
                      <div></div>
                    </>
                  );
                })()}
                
                {/* Row 3: VO2 Max */}
                {(() => {
                  const cardioGaps = gapAnalysisData[2]?.cardioGaps;
                  if (cardioGaps && cardioGaps.vo2.current > 0) {
                    return (
                      <>
                        <span className="text-sm font-medium text-zinc-700">VO2 Max</span>
                        <span className="text-sm text-zinc-600 text-center">{cardioGaps.vo2.current.toFixed(1)} ml/kg/min</span>
                        <ArrowRight className="w-3 h-3 text-gradient-dark flex-shrink-0 justify-self-center" />
                        <span className="text-sm font-bold text-gradient-dark text-right">{cardioGaps.vo2.target.toFixed(1)} ml/kg/min</span>
                      </>
                    );
                  }
                  return (
                    <>
                      <div></div>
                      <div></div>
                      <div></div>
                      <div></div>
                    </>
                  );
                })()}
              </div>
              
              {/* Coach Insight - outside grid, aligned at bottom */}
              <div className="pt-4 border-t border-zinc-100">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-zinc-600 leading-relaxed">{gapAnalysisData[2]?.insight}</p>
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
            <Card className="p-6">
              <h4 className="text-sm font-bold text-zinc-900 mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-gradient-dark" />
                Key Strengths
              </h4>
              <ul className="space-y-3">
                {strengths.map((item, i) => (
                  <li key={i} className="text-sm text-zinc-600 flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-gradient-from mt-2 shrink-0" style={{ backgroundColor: 'hsl(var(--gradient-from))' }} />
                    {item.strength}
                  </li>
                ))}
              </ul>
            </Card>
            
            <Card className="p-6">
              <h4 className="text-sm font-bold text-zinc-900 mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                Primary Focus Areas
              </h4>
              <ul className="space-y-3">
                {areasForImprovement.map((item, i) => (
                  <li key={i} className="text-sm text-zinc-600 flex items-start gap-3">
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
        <MovementPostureMobility formData={formData} scores={scores} />
      </section>
      
        {/* Destination */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-light text-zinc-900 rounded-lg">
              <Target className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-zinc-900 uppercase tracking-widest">Your Destination</h3>
          </div>
          
        {goals && goals.length > 0 && (
            <Tabs defaultValue={goals[0]} className="w-full">
              <TabsList className="w-full justify-start rounded-xl glass-button h-auto p-2 gap-1 mb-4">
                {goals.map((g, idx) => (
                  <TabsTrigger
                  key={idx}
                    value={g}
                    className="text-sm font-semibold px-5 py-2.5 rounded-xl transition-apple whitespace-nowrap data-[state=active]:glass-button-active data-[state=active]:text-white data-[state=inactive]:text-zinc-600 data-[state=inactive]:hover:text-zinc-900"
                  >
                    {g.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </TabsTrigger>
                ))}
              </TabsList>
              
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
                  const addressingItems: Array<{ icon: any; title: string; desc: string }> = [];
                  
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
                    <TabsContent key={idx} value={goal} className="p-8 md:p-10 m-0 tab-content-enter">
                      <div className="flex flex-col md:flex-row gap-10">
                        <div className="flex-1">
                          <h4 className="text-lg font-bold text-zinc-900 mb-3">
                            {goal === 'body-recomposition' ? 'Body Recomposition Protocol' :
                             goal === 'weight-loss' ? 'Weight Loss Protocol' :
                             goal === 'build-muscle' ? 'Hypertrophy & Strength Protocol' :
                             goal === 'build-strength' ? 'Strength Development Protocol' :
                             goal === 'improve-fitness' ? 'Athletic Performance Protocol' :
                             'General Health Protocol'}
                          </h4>
                          <p className="text-sm text-zinc-600 leading-relaxed mb-8">
                            {explanation}
                          </p>
                          
                          <div className="bg-gradient-light/50 rounded-xl p-6 border border-gradient-medium/50">
                            <p className="text-xs font-bold text-gradient-dark uppercase tracking-wide mb-4">What This Entails:</p>
                            <ul className="space-y-4">
                              {whatItEntails.map((item, j) => (
                                <li key={j} className="flex items-start gap-3">
                                  <div className="glass-label p-0.5 rounded-full mt-0.5">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-gradient-dark" />
            </div>
                                  <span className="text-sm text-zinc-700">{item}</span>
                                </li>
                              ))}
                            </ul>
          </div>
          </div>

                        {addressingItems.length > 0 && (
                          <div className="flex-1 border-t md:border-t-0 md:border-l border-zinc-100 pt-8 md:pt-0 md:pl-6 lg:pl-10 min-w-0">
                            <p className="text-xs font-bold text-zinc-900 uppercase tracking-wide mb-6">What We'll Address</p>
                            <ul className="space-y-6">
                              {addressingItems.map((item, i) => (
                                <li key={i} className="flex items-start gap-3 md:gap-4 group">
                                  <div className="p-2 md:p-2.5 glass-label text-zinc-600 rounded-lg shrink-0 group-hover:bg-white/80 group-hover:text-gradient-dark transition-apple">
                                    <item.icon className="w-4 h-4 md:w-5 md:h-5" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <span className="font-bold text-zinc-900 text-xs md:text-sm block mb-1">{item.title}</span>
                                    <span className="text-xs md:text-sm text-zinc-500 block leading-relaxed">{item.desc}</span>
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
        <section>
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gradient-light text-zinc-900 rounded-lg">
                <Trophy className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 uppercase tracking-widest">The Blueprint</h3>
            </div>
            <p className="text-zinc-500 text-sm ml-12">
              3 Strategic Pillars designed to bridge the gap from where you are to where you want to be.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
            {blueprintPillars.map((pillar, idx) => {
              const isBlue = pillar.color === 'blue';
              const isRed = pillar.color === 'red';
              
              const badgeBg = 'glass-button-active text-white';
              const textColor = 'text-gradient-dark';
              const iconColor = 'text-gradient-dark';

              return (
                <Card key={idx} className="overflow-hidden flex flex-col">
                  <div className="p-6 md:p-8 flex-1">
                    <div className="flex justify-between items-start mb-6">
                      <Badge className={`${badgeBg} border-transparent`}>
                        {pillar.weeks}
                      </Badge>
                      {isBlue && <Lock className={`w-5 h-5 ${iconColor}`} />}
                      {isRed && <Play className={`w-5 h-5 ${iconColor}`} />}
                      {!isBlue && !isRed && <Trophy className={`w-5 h-5 ${iconColor}`} />}
          </div>

                    <h4 className="text-sm font-black uppercase tracking-wide text-zinc-900 mb-2">{pillar.title}</h4>
                    <div className={`text-xs font-bold ${textColor} mb-5`}>{pillar.headline}</div>
                    
                    <p className="text-sm text-zinc-600 leading-relaxed mb-8">
                      {pillar.description}
                    </p>

                    <div className="glass-subtle rounded-xl p-5">
                      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-zinc-200">
                        <Play className="w-3 h-3 text-zinc-400 fill-current" />
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Sample Protocol</span>
                      </div>
                      <div className="space-y-3">
                        {pillar.protocol.map((row: any, rIdx: number) => (
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
        </section>
        
        {/* Timeline & Workout */}
        <section>
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 md:gap-8 mb-6 md:mb-8">
            {/* Timeline - Full Width */}
            <div className="xl:col-span-12 flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-light text-zinc-900 rounded-lg">
                  <Clock className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-zinc-900 uppercase tracking-widest">Your Timeline</h3>
              </div>
              
              <Card className="p-6 rounded-2xl">
                <div className="glass-subtle rounded-xl p-4 mb-6">
                  <p className="text-sm text-zinc-600 leading-relaxed">
                    <span className="font-bold text-zinc-900">This timeline shows when you can expect to start seeing results.</span> More sessions per week means faster progress—adjust the slider below to see how training frequency affects your timeline.
                  </p>
                </div>
                
                <div className="flex items-center gap-6 mb-6">
                  <span className="text-sm font-medium text-zinc-500 whitespace-nowrap">Sessions per week:</span>
                  <div className="flex-grow">
                    <input 
                      type="range" min={3} max={5} step={1}
                      value={sessionsPerWeek}
                      onChange={(e) => setSessionsPerWeek(parseInt(e.target.value))}
                      className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer hover:bg-zinc-300 transition-colors slider-apple"
                    />
                    <div className="flex justify-between text-[10px] text-zinc-400 font-bold uppercase mt-2 px-1">
                      <span>3 Sessions</span>
                      <span>4 Sessions</span>
                      <span>5 Sessions</span>
                    </div>
                  </div>
                  <span className="font-bold text-zinc-900 bg-gradient-light px-3 py-1 rounded-lg whitespace-nowrap min-w-[90px] text-center text-sm">
                    {sessionsPerWeek} / Week
                  </span>
                </div>
                
        <div className="space-y-4">
                  {orderedCats.map((cat, i) => {
                    const weeks = Math.round((weeksByCategory[cat.id] ?? 0) * (sessionsPerWeek === 3 ? 1 : sessionsPerWeek === 4 ? 0.85 : 0.70));
                    const width = (weeks / 40) * 100;
                    
                    const gradientClass = "gradient-bg";

                    return (
                      <div key={i} className="group">
                        <div className="flex justify-between text-xs font-bold mb-2">
                          <span className="text-zinc-800">{niceLabel(cat.id)}</span>
                          <span className="text-zinc-400 font-medium">~{weeks} weeks</span>
                        </div>
                        <div className="h-2.5 w-full bg-zinc-100 rounded-full overflow-hidden relative shadow-inner">
                          <div 
                            className={`h-full rounded-full ${gradientClass} transition-all duration-700 ease-out shadow-sm`} 
                            style={{ width: `${width}%` }} 
          />
        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-100">
                  <p className="text-xs text-zinc-500 leading-relaxed text-center">
                    <span className="text-zinc-900 font-bold">Total estimated timeline: ~{Math.round(maxWeeks * (sessionsPerWeek === 3 ? 1 : sessionsPerWeek === 4 ? 0.85 : 0.70))} weeks.</span><br/>
                    Increasing frequency can reduce this timeline by up to 30%.
                  </p>
                </div>
              </Card>
            </div>
          </div>

          {/* Non-Negotiables */}
          <Card className="bg-zinc-900 text-white p-8 md:p-10 rounded-2xl shadow-2xl shadow-zinc-900/20 ring-1 ring-zinc-800">
            <div className="flex flex-col md:flex-row md:items-start gap-8 md:gap-12">
              <div className="md:w-1/3">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2.5 gradient-bg rounded-lg shadow-lg shadow-apple-colored">
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="text-2xl font-black text-white tracking-tight">Non-Negotiables</h4>
                </div>
                <p className="text-sm text-zinc-400 leading-relaxed mb-8">
                  We handle the programming, the tracking, and the analysis. Your job is simple but demanding: execute the plan.
                </p>
                <div className="inline-block px-5 py-3 bg-white/5 rounded-xl border border-white/5 backdrop-blur-sm">
                  <p className="text-xs font-bold text-white/80 uppercase tracking-wider">
                    "As long as you do your part, we'll do ours."
                  </p>
                </div>
              </div>

              <div className="md:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                <div className="flex gap-4 p-5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all duration-300 group">
                  <div className="p-2 bg-zinc-800 rounded-lg h-fit group-hover:bg-gradient-from/20 group-hover:text-gradient-from transition-colors">
                    <Repeat className="w-5 h-5 text-zinc-400 group-hover:text-gradient-from" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white mb-1.5">Consistency is King</div>
                    <div className="text-xs text-zinc-400 leading-relaxed group-hover:text-zinc-300">
                      Show up. 90% attendance is the baseline. Missing sessions compounds negatively over time.
                    </div>
                  </div>
                </div>
                <div className="flex gap-4 p-5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all duration-300 group">
                  <div className="p-2 bg-zinc-800 rounded-lg h-fit group-hover:bg-gradient-from/20 group-hover:text-gradient-from transition-colors">
                    <Zap className="w-5 h-5 text-zinc-400 group-hover:text-gradient-from" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white mb-1.5">Maximum Effort</div>
                    <div className="text-xs text-zinc-400 leading-relaxed group-hover:text-zinc-300">
                      We track the weights, you bring the intensity. Leave nothing in the tank when you're on the floor.
                    </div>
                  </div>
                </div>
                <div className="flex gap-4 p-5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all duration-300 group">
                  <div className="p-2 bg-zinc-800 rounded-lg h-fit group-hover:bg-gradient-from/20 group-hover:text-gradient-from transition-colors">
                    <Lock className="w-5 h-5 text-zinc-400 group-hover:text-gradient-from" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white mb-1.5">Trust the Process</div>
                    <div className="text-xs text-zinc-400 leading-relaxed group-hover:text-zinc-300">
                      Adherence to the macro cycle is mandatory. Don't freelance. We optimize the plan, you execute it.
                    </div>
                  </div>
                </div>
                <div className="flex gap-4 p-5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all duration-300 group">
                  <div className="p-2 bg-zinc-800 rounded-lg h-fit group-hover:bg-gradient-from/20 group-hover:text-gradient-from transition-colors">
                    <MessageSquare className="w-5 h-5 text-zinc-400 group-hover:text-gradient-from" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white mb-1.5">Open Communication</div>
                    <div className="text-xs text-zinc-400 leading-relaxed group-hover:text-zinc-300">
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


