/**
 * Simplified Client Report
 * Clean, focused report structure:
 * 1. Where you're at now (Scores, Archetype, Gap Analysis, Strengths/Weaknesses, Lifestyle)
 * 2. Where you want to get to (Goals, Issue Resolution)
 * 3. How we'll help (Blueprint, Sample Workout, Timeline)
 */

import React, { useMemo } from 'react';
import type { FormData } from '@/contexts/FormContext';
import type { ScoreSummary } from '@/lib/scoring';
import type { CoachPlan } from '@/lib/recommendations';
import { determineArchetype } from '@/lib/clientArchetypes';
import { GapAnalysis } from './GapAnalysis';
import { Blueprint } from './Blueprint';
import { LifestyleLabels } from './LifestyleLabels';
import { ClientReportWorkout } from './ClientReportWorkout';
import { ClientReportRoadmap } from './ClientReportRoadmap';
import { CATEGORY_ORDER, circleColor, niceLabel } from './ClientReportConstants';

export default function ClientReportSimplified({
  scores,
  goals,
  formData,
  plan,
}: {
  scores: ScoreSummary;
  goals?: string[];
  formData?: FormData;
  plan?: CoachPlan;
}) {
  const orderedCats = useMemo(
    () => scores?.categories ? CATEGORY_ORDER.map(id => scores.categories.find(c => c.id === (id as 'bodyComp' | 'strength' | 'cardio' | 'movementQuality' | 'lifestyle'))).filter(Boolean) as ScoreSummary['categories'] : [],
    [scores?.categories]
  );
  
  const archetype = useMemo(() => determineArchetype(scores, formData), [scores, formData]);
  
  // Strengths and areas for improvement
  const strengths = useMemo(() => {
    return orderedCats.flatMap(cat => 
      cat.strengths.map(s => ({
        category: niceLabel(cat.id),
        strength: s,
        score: cat.score
      }))
    ).filter(s => s.score >= 70).slice(0, 3);
  }, [orderedCats]);
  
  const areasForImprovement = useMemo(() => {
    return orderedCats.flatMap(cat => 
      cat.weaknesses.map(w => ({
        category: niceLabel(cat.id),
        weakness: w,
        score: cat.score
      }))
    ).filter(a => a.score < 70).slice(0, 3);
  }, [orderedCats]);
  
  // Calculate weeks for roadmap
  const weeksByCategory: Record<string, number> = useMemo(() => {
    const map: Record<string, number> = {};
    const weightKg = parseFloat(formData?.inbodyWeightKg || '0');
    const heightM = (parseFloat(formData?.heightCm || '0') || 0) / 100;
    const healthyMax = heightM > 0 ? 25 * heightM * heightM : 0;
    const levelWL = formData?.goalLevelWeightLoss || '';
    let wlTarget = 0;
    if (healthyMax > 0 && weightKg > healthyMax) {
      if (levelWL === 'health-minimum') wlTarget = weightKg - healthyMax;
      else if (levelWL === 'average') wlTarget = weightKg - ((healthyMax + (22 * heightM * heightM)) / 2 || healthyMax);
      else if (levelWL === 'above-average' || levelWL === 'elite') wlTarget = weightKg - (22 * heightM * heightM);
      else wlTarget = weightKg - healthyMax;
      if (wlTarget < 0) wlTarget = 0;
    }
    const fatLossRate = 0.5;
    const fatLossWeeks = wlTarget > 0 ? Math.ceil(wlTarget / fatLossRate) : 16;
    const levelMG = formData?.goalLevelMuscle || '';
    const muscleTargetKg = levelMG === 'health-minimum' ? 1.5 : levelMG === 'average' ? 2.0 : levelMG === 'above-average' ? 3.0 : levelMG === 'elite' ? 4.0 : 2.0;
    const muscleRate = 0.15;
    const muscleWeeks = Math.ceil(muscleTargetKg / muscleRate);
    const levelST = formData?.goalLevelStrength || '';
    const strengthPct = levelST === 'health-minimum' ? 10 : levelST === 'average' ? 15 : levelST === 'above-average' ? 20 : levelST === 'elite' ? 30 : 15;
    const strengthWeeks = Math.ceil(strengthPct / 2.5) * 5;
    const levelFT = formData?.goalLevelFitness || '';
    const cardioWeeks = levelFT === 'elite' ? 20 : levelFT === 'above-average' ? 16 : 12;
    const mobilityWeeks = 6;
    const postureWeeks = 6;
    
    for (const cat of orderedCats) {
      let base = 12;
      if (cat.id === 'bodyComp') base = Math.max(12, Math.max(fatLossWeeks, muscleWeeks));
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
  
  return (
    <div className="space-y-12">
      {/* Header */}
      <section className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-900">
          {clientName ? `${clientName}'s Assessment Report` : 'Your Assessment Report'}
        </h1>
        <p className="text-slate-600">
          A clear path from where you are now to where you want to be.
        </p>
      </section>
      
      {/* ============================================
          1. WHERE YOU'RE AT NOW
          ============================================ */}
      <section className="space-y-8">
        <h2 className="text-2xl font-bold text-slate-900">Where You're At Now</h2>
        
        {/* Overall Score */}
        <div className="flex flex-col items-center text-center space-y-4">
          <div className={`flex h-32 w-32 items-center justify-center rounded-full border-8 bg-white shadow-lg ${circleColor(scores.overall)}`}>
            <div className="flex flex-col items-center">
              <span className="text-4xl font-black">{scores.overall}</span>
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-70">Overall</span>
            </div>
          </div>
        </div>
        
        {/* Archetype */}
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg p-6 border border-slate-200">
          <div className="flex items-center gap-4">
            <span className="text-4xl">{archetype.icon}</span>
            <div>
              <h3 className="text-xl font-bold text-slate-900">{archetype.name}</h3>
              <p className="text-sm text-slate-600 mt-1">{archetype.description}</p>
            </div>
          </div>
        </div>
        
        {/* Gap Analysis */}
        <GapAnalysis scores={scores} formData={formData} />
        
        {/* Strengths & Areas for Improvement */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Strengths */}
          {strengths.length > 0 && (
            <div className="bg-green-50 rounded-lg border border-green-200 p-6">
              <h3 className="text-lg font-bold text-green-900 mb-4">Your Strengths</h3>
              <ul className="space-y-2">
                {strengths.map((s, idx) => (
                  <li key={idx} className="text-sm text-green-800">
                    <span className="font-semibold">{s.category}:</span> {s.strength}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Areas for Improvement */}
          {areasForImprovement.length > 0 && (
            <div className="bg-amber-50 rounded-lg border border-amber-200 p-6">
              <h3 className="text-lg font-bold text-amber-900 mb-4">Areas for Improvement</h3>
              <ul className="space-y-2">
                {areasForImprovement.map((a, idx) => (
                  <li key={idx} className="text-sm text-amber-800">
                    <span className="font-semibold">{a.category}:</span> {a.weakness}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        {/* Lifestyle Labels */}
        <LifestyleLabels formData={formData} />
      </section>
      
      {/* ============================================
          2. WHERE YOU WANT TO GET TO
          ============================================ */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-slate-900">Where You Want to Get To</h2>
        
        {/* Goals */}
        {goals && goals.length > 0 && (
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
            <h3 className="text-lg font-bold text-blue-900 mb-3">Your Goals</h3>
            <div className="flex flex-wrap gap-2">
              {goals.map((goal, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-300"
                >
                  {goal.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {/* Issue Resolution Summary */}
        {plan?.clientScript?.findings && plan.clientScript.findings.length > 0 && (
          <div className="bg-slate-50 rounded-lg border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-3">What We'll Address</h3>
            <ul className="space-y-2">
              {plan.clientScript.findings.slice(0, 3).map((finding: string, idx: number) => (
                <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                  <span className="text-slate-400 mt-1">•</span>
                  <span>{finding}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
      
      {/* ============================================
          3. HOW WE'LL HELP YOU GET THERE
          ============================================ */}
      <section className="space-y-8">
        <h2 className="text-2xl font-bold text-slate-900">How We'll Help You Get There</h2>
        
        {/* Blueprint */}
        <Blueprint scores={scores} formData={formData} plan={plan} />
        
        {/* Sample Workout - but we'll replace this with the Blueprint's sample protocols */}
        {plan && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-slate-900">Sample Workout</h3>
            <ClientReportWorkout plan={plan} goalLabel={goalLabel} />
          </div>
        )}
        
        {/* Timeline */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-slate-900">Your Timeline</h3>
          <ClientReportRoadmap
            scores={scores}
            orderedCats={orderedCats}
            weeksByCategory={weeksByCategory}
            maxWeeks={maxWeeks}
            sessionsPerWeek={3}
            setSessionsPerWeek={() => {}}
            formData={formData}
          />
        </div>
      </section>
    </div>
  );
}

