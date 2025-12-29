/**
 * ClientReport Goals Component
 * Displays user goals with explanations and action plans
 */

import React, { useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ScoreSummary } from '@/lib/scoring';
import type { FormData } from '@/contexts/FormContext';

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

    if (goal === 'weight-loss') {
      const level = formData?.goalLevelWeightLoss || 'average';
      const rate = level === 'elite' ? '1%' : level === 'above-average' ? '0.7%' : '0.5%';
      explanation = `Your ${level.replace('-', ' ')} weight loss goal targets a sustainable reduction of ~${rate} body weight per week. This approach preserves muscle mass while optimizing metabolic health.`;
      whatItEntails = [
        'A controlled caloric deficit (dialing in nutrition at every meal)',
        `Training at least ${sessionsPerWeek} sessions per week (more is recommended for faster progress)`,
        'Prioritizing high-protein intake to protect your skeletal muscle',
        'Utilizing progressive overload to ensure you lose fat, not strength',
      ];
    } else if (goal === 'build-muscle') {
      const level = formData?.goalLevelMuscle || 'average';
      explanation = `Building ${level.replace('-', ' ')} muscle mass requires a dedicated hypertrophy block. We will focus on increasing your skeletal muscle "engine" to boost metabolism and functional power.`;
      whatItEntails = [
        'A slight caloric surplus with high-quality protein distribution',
        `Consistent resistance training (${sessionsPerWeek}+ times per week recommended)`,
        'Focusing on mechanical tension and metabolic stress in your lifts',
        'Prioritizing 7-9 hours of sleep to allow for tissue repair and growth',
      ];
    } else if (goal === 'build-strength') {
      const level = formData?.goalLevelStrength || 'average';
      explanation = `Your ${level.replace('-', ' ')} strength goal focuses on increasing absolute force production. We will prioritize neural adaptations and movement efficiency to help you lift heavier, safer.`;
      whatItEntails = [
        'Low-rep, high-intensity compound lifting sets',
        'Mastering technique on "The Big Rocks" (Squats, Deadlifts, Presses)',
        'Adequate rest between sets to maximize Central Nervous System recovery',
        'Strategic use of accessory work to eliminate weak links',
      ];
    } else if (goal === 'improve-fitness') {
      const level = formData?.goalLevelFitness || 'average';
      explanation = `Improving to an ${level.replace('-', ' ')} fitness level means pushing your cardiovascular ceiling. We will build a robust aerobic base to support higher intensity work and faster recovery.`;
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
                      <p className="text-xs font-semibold text-primary uppercase tracking-wide">What this entails:</p>
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
                    <p className="text-xs font-semibold text-primary uppercase tracking-wide">What this entails:</p>
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
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-amber-800 mb-3">Goals we discovered from your assessment</h3>
          <p className="text-sm text-amber-900 mb-3">
            Based on your assessment results, we also need to address these areas to put your body in the right state to reach your goals safely:
          </p>
          <ul className="list-disc pl-5 text-sm text-amber-900 space-y-2">
            {discoveredGoals.map((dg, i) => (
              <li key={i}>{dg}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

