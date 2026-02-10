/**
 * ClientReport Lifestyle Component
 * Displays lifestyle factors with status indicators
 */

import React, { useMemo } from 'react';
import type { FormData } from '@/contexts/FormContext';

interface LifestyleFactor {
  name: string;
  status: 'good' | 'needs-work' | 'poor';
  description: string;
}

interface ClientReportLifestyleProps {
  formData?: FormData;
}

export function ClientReportLifestyle({ formData }: ClientReportLifestyleProps) {
  const lifestyleFactors = useMemo((): LifestyleFactor[] => {
    const factors: LifestyleFactor[] = [];
    const sleepQ = (formData?.sleepQuality || '').toLowerCase();
    const sleepC = (formData?.sleepConsistency || '').toLowerCase();
    const sleepD = parseFloat(formData?.sleepDuration || '0');
    const stress = (formData?.stressLevel || '').toLowerCase();
    const hydration = (formData?.hydrationHabits || '').toLowerCase();
    const nutrition = (formData?.nutritionHabits || '').toLowerCase();
    const steps = parseFloat(formData?.stepsPerDay || '0');
    const sedentary = parseFloat(formData?.sedentaryHours || '0');
    const caffeine = parseFloat(formData?.caffeineCupsPerDay || '0');
    const lastCaffeine = formData?.lastCaffeineIntake || '';

    // Sleep & Recovery
    let sleepStatus: 'good' | 'needs-work' | 'poor' = 'good';
    let sleepDesc = '';
    if (sleepQ === 'excellent' && (sleepC === 'consistent' || sleepC === 'very-consistent')) {
      sleepStatus = 'good';
      sleepDesc = `Excellent sleep quality (${sleepQ}) with consistent schedule (${sleepC})`;
    } else if (sleepQ === 'good' && sleepC === 'consistent') {
      sleepStatus = 'good';
      sleepDesc = `Good sleep quality (${sleepQ}) with consistent schedule`;
    } else if (sleepQ === 'poor' || sleepC === 'very-inconsistent') {
      sleepStatus = 'poor';
      sleepDesc = `Sleep needs attention: ${sleepQ} quality, ${sleepC} schedule`;
    } else {
      sleepStatus = 'needs-work';
      sleepDesc = `Sleep can improve: ${sleepQ} quality, ${sleepC} schedule`;
    }
    if (sleepQ || sleepC || sleepD > 0) {
      factors.push({ name: 'Sleep & Recovery', status: sleepStatus, description: sleepDesc });
    }

    // Stress Management
    if (stress) {
      let stressStatus: 'good' | 'needs-work' | 'poor' = 'good';
      let stressDesc = '';
      if (stress === 'very-low' || stress === 'low') {
        stressStatus = 'good';
        stressDesc = `Well-managed stress (${stress})`;
      } else if (stress === 'very-high') {
        stressStatus = 'poor';
        stressDesc = `Very high stress (${stress}) needs immediate attention`;
      } else {
        stressStatus = 'needs-work';
        stressDesc = `Moderate to high stress (${stress}) can be improved`;
      }
      factors.push({ name: 'Stress Management', status: stressStatus, description: stressDesc });
    }

    // Nutrition
    if (nutrition) {
      let nutritionStatus: 'good' | 'needs-work' | 'poor' = 'good';
      let nutritionDesc = '';
      if (nutrition === 'excellent' || nutrition === 'good') {
        nutritionStatus = 'good';
        nutritionDesc = `${nutrition.charAt(0).toUpperCase() + nutrition.slice(1)} nutrition habits`;
      } else if (nutrition === 'poor') {
        nutritionStatus = 'poor';
        nutritionDesc = `Poor nutrition habits need improvement`;
      } else {
        nutritionStatus = 'needs-work';
        nutritionDesc = `Fair nutrition habits can be enhanced`;
      }
      factors.push({ name: 'Nutrition', status: nutritionStatus, description: nutritionDesc });
    }

    // Hydration
    if (hydration) {
      let hydrationStatus: 'good' | 'needs-work' | 'poor' = 'good';
      let hydrationDesc = '';
      if (hydration === 'excellent' || hydration === 'good') {
        hydrationStatus = 'good';
        hydrationDesc = `${hydration.charAt(0).toUpperCase() + hydration.slice(1)} hydration habits`;
      } else if (hydration === 'poor') {
        hydrationStatus = 'poor';
        hydrationDesc = `Poor hydration needs improvement`;
      } else {
        hydrationStatus = 'needs-work';
        hydrationDesc = `Fair hydration can be enhanced`;
      }
      factors.push({ name: 'Hydration', status: hydrationStatus, description: hydrationDesc });
    }

    // Daily Movement
    if (steps > 0 || sedentary > 0) {
      let movementStatus: 'good' | 'needs-work' | 'poor' = 'good';
      let movementDesc = '';
      if (steps >= 10000) {
        movementStatus = 'good';
        movementDesc = `Excellent daily movement (${Math.round(steps).toLocaleString()} steps/day)`;
      } else if (steps >= 8000) {
        movementStatus = 'good';
        movementDesc = `Good daily movement (${Math.round(steps).toLocaleString()} steps/day)`;
      } else if (steps >= 6000) {
        movementStatus = 'needs-work';
        movementDesc = `Daily movement can increase (${Math.round(steps).toLocaleString()} steps/day, target 8-10k)`;
      } else if (steps > 0) {
        movementStatus = 'poor';
        movementDesc = `Low daily movement (${Math.round(steps).toLocaleString()} steps/day) needs improvement`;
      } else {
        movementStatus = 'needs-work';
        movementDesc = `Daily movement tracking needed`;
      }
      if (sedentary >= 10) {
        movementStatus = 'poor';
        movementDesc += `, too sedentary (${sedentary}h/day)`;
      } else if (sedentary >= 8 && movementStatus === 'good') {
        movementStatus = 'needs-work';
        movementDesc += `, high sedentary time (${sedentary}h/day)`;
      }
      factors.push({ name: 'Daily Movement', status: movementStatus, description: movementDesc });
    }

    // Caffeine Timing
    if (caffeine > 0) {
      let caffeineStatus: 'good' | 'needs-work' | 'poor' = 'good';
      let caffeineDesc = '';
      if (lastCaffeine) {
        const hour = parseInt(lastCaffeine.split(':')[0] || '0');
        if (hour < 14) {
          caffeineStatus = 'good';
          caffeineDesc = `Good caffeine timing (last at ${lastCaffeine}, ${caffeine} cups/day)`;
        } else if (hour < 16) {
          caffeineStatus = 'needs-work';
          caffeineDesc = `Caffeine timing can improve (last at ${lastCaffeine}, aim for before 2pm)`;
        } else {
          caffeineStatus = 'poor';
          caffeineDesc = `Caffeine too late (last at ${lastCaffeine}) affecting sleep, ${caffeine} cups/day`;
        }
      } else {
        caffeineStatus = 'needs-work';
        caffeineDesc = `${caffeine} cups/day - track timing to protect sleep`;
      }
      factors.push({ name: 'Caffeine Timing', status: caffeineStatus, description: caffeineDesc });
    }

    return factors;
  }, [formData]);

  if (lifestyleFactors.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold text-slate-900">Your lifestyle status</h2>
      <p className="text-sm text-slate-600">
        Here's how you're doing across all lifestyle factors. These are the foundation for your training results:
      </p>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {lifestyleFactors.map((factor, i) => {
          const bgColor =
            factor.status === 'good'
              ? 'border-score-green-muted bg-score-green-light'
              : factor.status === 'poor'
              ? 'border-score-red-muted bg-score-red-light'
              : 'border-score-amber-muted bg-score-amber-light';
          const textColor =
            factor.status === 'good'
              ? 'text-score-green-bold'
              : factor.status === 'poor'
              ? 'text-score-red-bold'
              : 'text-score-amber-bold';
          const statusColor =
            factor.status === 'good'
              ? 'bg-score-green-muted text-score-green-fg'
              : factor.status === 'poor'
              ? 'bg-score-red-muted text-score-red-fg'
              : 'bg-score-amber-muted text-score-amber-fg';
          const statusLabel =
            factor.status === 'good' ? 'Doing well' : factor.status === 'poor' ? 'Needs attention' : 'Needs work';

          return (
            <div key={i} className={`rounded-lg border p-4 shadow-sm ${bgColor}`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className={`text-base font-semibold ${textColor}`}>{factor.name}</h3>
                <span className={`text-xs font-medium px-2 py-1 rounded ${statusColor}`}>{statusLabel}</span>
              </div>
              <p className={`text-sm ${textColor}`}>{factor.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

