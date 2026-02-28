/**
 * Lifestyle Factors Bar Component
 * Thin horizontal bar showing lifestyle factors that need improvement
 */

import React from 'react';
import type { FormData } from '@/contexts/FormContext';
import { Moon, Activity, Coffee, Clock, TrendingUp, TrendingDown } from 'lucide-react';

interface LifestyleFactorsBarProps {
  formData?: FormData;
  previousFormData?: FormData;
}

export function LifestyleFactorsBar({ formData, previousFormData }: LifestyleFactorsBarProps) {
  if (!formData) return null;
  
  const factors: Array<{ label: string; icon: React.ElementType }> = [];
  
  const sleepQ = (formData.sleepQuality || '').toLowerCase();
  const sleepC = (formData.sleepConsistency || '').toLowerCase();
  const stress = (formData.stressLevel || '').toLowerCase();
  const hydration = (formData.hydrationHabits || '').toLowerCase();
  const nutrition = (formData.nutritionHabits || '').toLowerCase();
  const steps = parseFloat(formData.stepsPerDay || '0');
  const sedentary = parseFloat(formData.sedentaryHours || '0');
  const caffeine = formData.lastCaffeineIntake || '';
  
  if (sleepQ === 'poor' || sleepQ === 'fair' || sleepC === 'inconsistent' || sleepC === 'very-inconsistent') {
    factors.push({
      label: 'Sleep Quality',
      icon: Moon
    });
  }
  
  if (stress === 'high' || stress === 'very-high') {
    factors.push({
      label: 'Stress Management',
      icon: TrendingUp
    });
  }
  
  if (hydration === 'poor' || hydration === 'fair') {
    factors.push({
      label: 'Hydration',
      icon: Activity
    });
  }
  
  if (nutrition === 'poor' || nutrition === 'fair') {
    factors.push({
      label: 'Nutrition',
      icon: Activity
    });
  }
  
  if (steps > 0 && steps < 7000) {
    factors.push({
      label: 'Daily Movement',
      icon: Activity
    });
  }
  
  if (sedentary >= 8) {
    factors.push({
      label: 'Sedentary Time',
      icon: Clock
    });
  }
  
  if (caffeine) {
    const hour = parseInt(caffeine.split(':')[0] || '0');
    if (hour >= 14) {
      factors.push({
        label: 'Caffeine Timing',
        icon: Coffee
      });
    }
  }
  
  const previousFactorLabels = new Set<string>();
  if (previousFormData) {
    const prevSleepQ = (previousFormData.sleepQuality || '').toLowerCase();
    const prevSleepC = (previousFormData.sleepConsistency || '').toLowerCase();
    const prevStress = (previousFormData.stressLevel || '').toLowerCase();
    const prevHydration = (previousFormData.hydrationHabits || '').toLowerCase();
    const prevNutrition = (previousFormData.nutritionHabits || '').toLowerCase();
    const prevSteps = parseFloat(previousFormData.stepsPerDay || '0');
    const prevSedentary = parseFloat(previousFormData.sedentaryHours || '0');
    const prevCaffeine = previousFormData.lastCaffeineIntake || '';
    if (prevSleepQ === 'poor' || prevSleepQ === 'fair' || prevSleepC === 'inconsistent' || prevSleepC === 'very-inconsistent') previousFactorLabels.add('Sleep Quality');
    if (prevStress === 'high' || prevStress === 'very-high') previousFactorLabels.add('Stress Management');
    if (prevHydration === 'poor' || prevHydration === 'fair') previousFactorLabels.add('Hydration');
    if (prevNutrition === 'poor' || prevNutrition === 'fair') previousFactorLabels.add('Nutrition');
    if (prevSteps > 0 && prevSteps < 7000) previousFactorLabels.add('Daily Movement');
    if (prevSedentary >= 8) previousFactorLabels.add('Sedentary Time');
    if (prevCaffeine) { const h = parseInt(prevCaffeine.split(':')[0] || '0'); if (h >= 14) previousFactorLabels.add('Caffeine Timing'); }
  }

  const currentLabels = new Set(factors.map(f => f.label));
  const resolvedFactors = previousFormData
    ? [...previousFactorLabels].filter(l => !currentLabels.has(l))
    : [];

  if (factors.length === 0 && resolvedFactors.length === 0) {
    return null;
  }
  
  return (
    <div className="sm:border-none sm:shadow-sm sm:bg-white sm:p-4 md:p-6 sm:ring-1 sm:ring-zinc-100 sm:rounded-xl">
      <div className="flex flex-wrap items-start gap-2 sm:gap-3 md:gap-4">
        <div className="shrink-0 w-full sm:w-auto mb-1 sm:mb-0">
          <span className="text-xs font-semibold text-zinc-700 block">Lifestyle factors to address</span>
          <span className="text-[10px] text-zinc-400 block mt-0.5">These habits are currently limiting your progress</span>
        </div>
        {factors.map((factor, idx) => {
          const IconComponent = factor.icon;
          const isNew = previousFormData && !previousFactorLabels.has(factor.label);
          const wasResolved = previousFormData && previousFactorLabels.has(factor.label) && !currentLabels.has(factor.label);
          return (
            <div
              key={idx}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-zinc-200 text-zinc-600 bg-white sm:glass-button-active sm:text-white sm:border-transparent transition-apple hover:scale-105"
            >
              <IconComponent className="hidden sm:block w-3.5 h-3.5 text-white" />
              <span className="text-xs md:text-sm font-medium whitespace-nowrap">
                {factor.label}
              </span>
              {isNew && <TrendingDown className="w-3 h-3 text-score-red-fg sm:text-red-300" />}
              {wasResolved && <TrendingUp className="w-3 h-3 text-score-green-fg sm:text-green-300" />}
            </div>
          );
        })}
        {resolvedFactors.map((label, idx) => (
          <div
            key={`resolved-${idx}`}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-score-green-muted text-score-green-fg bg-score-green-light transition-apple"
          >
            <TrendingUp className="w-3 h-3" />
            <span className="text-xs md:text-sm font-medium whitespace-nowrap line-through opacity-70">
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

