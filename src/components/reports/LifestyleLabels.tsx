/**
 * Simplified Lifestyle Labels Component
 * Small labels in a row showing lifestyle factors that need attention
 */

import React from 'react';
import type { FormData } from '@/contexts/FormContext';

interface LifestyleLabelsProps {
  formData?: FormData;
}

export function LifestyleLabels({ formData }: LifestyleLabelsProps) {
  if (!formData) return null;
  
  const labels: string[] = [];
  
  const sleepQ = (formData.sleepQuality || '').toLowerCase();
  const sleepC = (formData.sleepConsistency || '').toLowerCase();
  const stress = (formData.stressLevel || '').toLowerCase();
  const hydration = (formData.hydrationHabits || '').toLowerCase();
  const nutrition = (formData.nutritionHabits || '').toLowerCase();
  const steps = parseFloat(formData.stepsPerDay || '0');
  const sedentary = parseFloat(formData.sedentaryHours || '0');
  const caffeine = formData.lastCaffeineIntake || '';
  
  if (sleepQ === 'poor' || sleepQ === 'fair' || sleepC === 'inconsistent' || sleepC === 'very-inconsistent') {
    labels.push('Sleep');
  }
  
  if (stress === 'high' || stress === 'very-high') {
    labels.push('Stress');
  }
  
  if (hydration === 'poor' || hydration === 'fair') {
    labels.push('Hydration');
  }
  
  if (nutrition === 'poor' || nutrition === 'fair') {
    labels.push('Nutrition');
  }
  
  if (steps > 0 && steps < 7000) {
    labels.push('Daily Movement');
  }
  
  if (sedentary >= 8) {
    labels.push('Sedentary Time');
  }
  
  if (caffeine) {
    const hour = parseInt(caffeine.split(':')[0] || '0');
    if (hour >= 14) {
      labels.push('Caffeine Timing');
    }
  }
  
  if (labels.length === 0) {
    return null;
  }
  
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em]">Lifestyle Focus:</span>
      {labels.map((label, idx) => (
        <span
          key={idx}
          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-score-amber-muted text-score-amber-fg border border-score-amber-muted"
        >
          {label}
        </span>
      ))}
    </div>
  );
}

