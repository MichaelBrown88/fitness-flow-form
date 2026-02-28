/**
 * ClientReport Goals Component
 * Displays user goals with explanations and action plans
 */

import React, { useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ScoreSummary } from '@/lib/scoring';
import type { FormData } from '@/contexts/FormContext';
import { calculateBodyRecomposition, getTargetBodyFatFromLevel, getBodyFatRange } from '@/lib/utils/bodyRecomposition';

interface ClientReportGoalsProps {
  goals?: string[];
  formData?: FormData;
  orderedCats: ScoreSummary['categories'];
  immediateActions: string[];
  secondaryActions: string[];
  quickWins: string[];
  sessionsPerWeek: number;
}

export function ClientReportGoals({
  goals,
  formData,
  orderedCats,
  immediateActions,
  secondaryActions,
  quickWins,
  sessionsPerWeek,
}: ClientReportGoalsProps) {
  const discoveredGoals = useMemo(() => {
    const discovered: string[] = [];
    const gender = (formData?.gender || '').toLowerCase();
    const bf = parseFloat(formData?.inbodyBodyFatPct || '0');
    const visceral = parseFloat(formData?.visceralFatLevel || '0');
    const h = (parseFloat(formData?.heightCm || '0') || 0) / 100;
    const w = parseFloat(formData?.inbodyWeightKg || '0');
    const healthyMax = h > 0 ? 25 * h * h : 0;

    if (healthyMax > 0 && w > healthyMax + 3) {
      discovered.push('Improve body composition to reduce health risk');
    }
    if ((gender === 'male' && bf > 25) || (gender === 'female' && bf > 32)) {
      discovered.push('Reduce body fat percentage for better health');
    }
    if (visceral >= 12) {
      discovered.push('Reduce visceral fat through lifestyle and training');
    }

    const movementCat = orderedCats.find(c => c.id === 'movementQuality');
    if (movementCat && movementCat.score < 60) {
      discovered.push('Improve movement quality to reduce injury risk and enhance performance');
    }

    const lifestyleCat = orderedCats.find(c => c.id === 'lifestyle');
    if (lifestyleCat && lifestyleCat.score < 60) {
      discovered.push('Optimize lifestyle habits to support training and recovery');
    }

    return discovered;
  }, [formData, orderedCats]);

  if (!goals || goals.length === 0) return null;

  const getGoalContent = (goal: string) => {
    let explanation = '';
    let whatItEntails: string[] = [];

    if (goal === 'body-recomposition') {
      const recompLevel = (formData?.goalLevelBodyRecomp || 'athletic') as 'healthy' | 'fit' | 'athletic' | 'shredded';
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
      
      explanation = `Your goal is body recomposition: achieve a ${levelLabel} look (${targetBFRange[0]}-${targetBFRange[1]}% body fat) while building ${muscleGain} kg of muscle. Target weight: ${recompResult.targetWeight.toFixed(1)} kg. This uses a slight calorie deficit (200-500 kcal/day) to lose fat while gaining muscle, requiring precise nutrition and progressive training.`;
      whatItEntails = [
        'Slight calorie deficit (200-500 kcal/day) with high-protein intake (1.6-2.2g/kg)',
        `Training at least ${sessionsPerWeek} sessions per week with progressive overload`,
        'Prioritizing resistance training to build muscle while in a deficit',
        'Adequate recovery and sleep (7-9 hours) to support muscle growth in a deficit',
      ];
    } else if (goal === 'weight-loss') {
      const weightLossPct = parseFloat(formData?.goalLevelWeightLoss || '15');
      const weightKg = parseFloat(formData?.inbodyWeightKg || '0');
      const targetWeightLossKg = weightKg > 0 ? (weightKg * weightLossPct) / 100 : 0;
      explanation = `Your goal is to lose ${weightLossPct}% of your body weight (${targetWeightLossKg.toFixed(1)} kg), targeting a sustainable reduction of ~0.5-1% body weight per week. This approach preserves muscle mass while optimizing metabolic health.`;
      whatItEntails = [
        'A controlled caloric deficit (dialing in nutrition at every meal)',
        `Training at least ${sessionsPerWeek} sessions per week (more is recommended for faster progress)`,
        'Prioritizing high-protein intake to protect your skeletal muscle',
        'Utilizing progressive overload to ensure you lose fat, not strength',
      ];
    } else if (goal === 'build-muscle') {
      const muscleGainKg = parseFloat(formData?.goalLevelMuscle || '6');
      explanation = `Your goal is to build ${muscleGainKg} kg of muscle mass through a dedicated hypertrophy block. We will focus on increasing your skeletal muscle "engine" to boost metabolism and functional power.`;
      whatItEntails = [
        'A slight caloric surplus with high-quality protein distribution',
        `Consistent resistance training (${sessionsPerWeek}+ times per week recommended)`,
        'Focusing on mechanical tension and metabolic stress in your lifts',
        'Prioritizing 7-9 hours of sleep to allow for tissue repair and growth',
      ];
    } else if (goal === 'build-strength') {
      const strengthPct = parseFloat(formData?.goalLevelStrength || '30');
      explanation = `Your goal is to increase strength by ${strengthPct}%, focusing on increasing absolute force production. We will prioritize neural adaptations and movement efficiency to help you lift heavier, safer.`;
      whatItEntails = [
        'Low-rep, high-intensity compound lifting sets',
        'Mastering technique on "The Big Rocks" (Squats, Deadlifts, Presses)',
        'Adequate rest between sets to maximize Central Nervous System recovery',
        'Strategic use of accessory work to eliminate weak links',
      ];
    } else if (goal === 'improve-fitness') {
      const fitnessLevel = formData?.goalLevelFitness || 'active';
      const ambitionLabels = {
        'health': 'Health Focus (50th percentile)',
        'active': 'Active (75th percentile)',
        'athletic': 'Athletic (85th percentile)',
        'elite': 'Elite (95th percentile)'
      };
      const ambitionLabel = ambitionLabels[fitnessLevel as keyof typeof ambitionLabels] || 'Active (75th percentile)';
      explanation = `Your goal is to achieve ${ambitionLabel} cardiovascular fitness, targeting specific RHR and recovery HR improvements along with VO2 max gains. We will build a robust aerobic base to support higher intensity work and faster recovery.`;
      whatItEntails = [
        'Mix of Zone 2 steady-state and high-intensity intervals (HIIT)',
        'Consistent conditioning work at least 3 times per week',
        'Monitoring Heart Rate Recovery (HRR) to track progress',
        'Focusing on breathwork and aerobic efficiency',
      ];
    } else if (goal === 'general-health') {
      explanation = 'General health means improving overall wellbeing, energy, and quality of life through balanced training and lifestyle habits.';
      whatItEntails = [
        'A mix of strength, cardio, and movement quality work',
        'Lifestyle habits that support recovery and energy',
        'Sustainable routines that fit your life',
        'Focus on feeling better day-to-day',
      ];
    }

    return { explanation, whatItEntails };
  };

  const goalLabel = (goal: string) => {
    if (goal === 'weight-loss') return 'Weight Loss';
    if (goal === 'build-muscle') return 'Muscle Gain';
    if (goal === 'body-recomposition') return 'Body Recomposition';
    if (goal === 'build-strength') return 'Strength';
    if (goal === 'improve-fitness') return 'Fitness';
    return 'General Health';
  };

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold text-slate-900">Your goals</h2>

      {goals.length > 1 ? (
        <Tabs defaultValue={goals[0]} className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
            {goals.map((goal) => (
              <TabsTrigger key={goal} value={goal} className="text-xs sm:text-sm">
                {goalLabel(goal)}
              </TabsTrigger>
            ))}
          </TabsList>
          {goals.map((goal) => {
            const { explanation, whatItEntails } = getGoalContent(goal);
            const goalActions = immediateActions.slice(0, 3);

            return (
              <TabsContent key={goal} value={goal} className="mt-4">
                <div className="space-y-4">
                  <div className="rounded-lg border border-primary/20 bg-brand-light p-5 shadow-sm">
                    <p className="text-sm text-slate-900 mb-3">{explanation}</p>
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-primary uppercase tracking-[0.15em]">What this entails:</p>
                      <ul className="list-disc pl-5 text-sm text-slate-900 space-y-1">
                        {whatItEntails.map((item, j) => (
                          <li key={j}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg border border-primary/20 bg-brand-light p-4 shadow-sm">
                      <h3 className="text-base font-semibold text-primary mb-3">What we'll do first</h3>
                      <ul className="space-y-2 text-sm text-slate-900">
                        {goalActions.map((action, j) => (
                          <li key={j} className="flex items-start gap-2">
                            <span className="text-primary mt-1">•</span>
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-lg border border-primary/20 bg-brand-light p-4 shadow-sm">
                      <h3 className="text-base font-semibold text-primary mb-3">What we'll do next</h3>
                      <ul className="space-y-2 text-sm text-slate-900">
                        {secondaryActions.map((action, j) => (
                          <li key={j} className="flex items-start gap-2">
                            <span className="text-primary mt-1">•</span>
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      ) : (
        <div className="space-y-4">
          {goals.map((goal, i) => {
            const { explanation, whatItEntails } = getGoalContent(goal);
            const goalActions = immediateActions.slice(0, 3);

            return (
              <div key={i} className="space-y-4">
                <div className="rounded-lg border border-primary/20 bg-brand-light p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-flex items-center rounded-full bg-primary px-3 py-1 text-sm font-medium text-white">
                      {goalLabel(goal)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-900 mb-3">{explanation}</p>
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.15em]">What this entails:</p>
                    <ul className="list-disc pl-5 text-sm text-slate-900 space-y-1">
                      {whatItEntails.map((item, j) => (
                        <li key={j}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border border-primary/20 bg-brand-light p-4 shadow-sm">
                    <h3 className="text-base font-semibold text-primary mb-3">What we'll do first</h3>
                    <ul className="space-y-2 text-sm text-slate-900">
                      {goalActions.map((action, j) => (
                        <li key={j} className="flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-lg border border-primary/20 bg-brand-light p-4 shadow-sm">
                    <h3 className="text-base font-semibold text-primary mb-3">What we'll do next</h3>
                    <ul className="space-y-2 text-sm text-slate-900">
                      {secondaryActions.map((action, j) => (
                        <li key={j} className="flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {discoveredGoals.length > 0 && (
        <div className="rounded-lg border border-score-amber-muted bg-score-amber-light p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-score-amber-fg mb-3">Goals we discovered from your assessment</h3>
          <p className="text-sm text-score-amber-bold mb-3">
            Based on your assessment results, we also need to address these areas to put your body in the right state to reach your goals safely:
          </p>
          <ul className="list-disc pl-5 text-sm text-score-amber-bold space-y-2">
            {discoveredGoals.map((dg, i) => (
              <li key={i}>{dg}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

