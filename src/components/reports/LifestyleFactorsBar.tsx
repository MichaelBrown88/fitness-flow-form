/**
 * Lifestyle Factors Bar Component
 * Thin horizontal bar showing lifestyle factors that need improvement
 */

import React from 'react';
import type { FormData } from '@/contexts/FormContext';
import { Card } from '@/components/ui/card';
import { Moon, Activity, Coffee, Clock, TrendingUp } from 'lucide-react';

interface LifestyleFactorsBarProps {
  formData?: FormData;
}

export function LifestyleFactorsBar({ formData }: LifestyleFactorsBarProps) {
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
  
  if (factors.length === 0) {
    return null;
  }
  
  return (
    <Card className="border-none shadow-sm bg-white p-4 md:p-6 ring-1 ring-zinc-100">
      <div className="flex flex-wrap items-center gap-3 md:gap-4">
        <span className="text-xs md:text-sm font-semibold text-zinc-500 uppercase tracking-wide shrink-0">
          Lifestyle Focus:
        </span>
        {factors.map((factor, idx) => {
          const IconComponent = factor.icon;
          return (
            <div
              key={idx}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg glass-button-active text-white border border-transparent transition-apple hover:scale-105"
            >
              <IconComponent className="w-3.5 h-3.5 text-white" />
              <span className="text-xs md:text-sm font-medium text-white">
                {factor.label}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

