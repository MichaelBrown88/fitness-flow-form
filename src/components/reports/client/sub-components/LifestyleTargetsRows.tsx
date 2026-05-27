import React from 'react';
import type { FormData } from '@/contexts/FormContext';
import { CLIENT_REPORT_COPY } from '@/constants/clientReport';
import { ReportTargetRowGrid, type ReportTargetRowData } from './ReportTargetRowGrid';

interface LifestyleTargetsRowsProps {
  formData?: FormData;
}

/**
 * Deterministic lifestyle aim rows (no Firestore gap hook).
 */
export function LifestyleTargetsRows({ formData }: LifestyleTargetsRowsProps) {
  const rows = buildLifestyleTargetRows(formData);
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{CLIENT_REPORT_COPY.targetsUnavailable}</p>
    );
  }

  return <ReportTargetRowGrid rows={rows} />;
}

function buildLifestyleTargetRows(formData?: FormData): ReportTargetRowData[] {
  if (!formData) return [];

  const rows: ReportTargetRowData[] = [];

  const steps = parseFloat(formData.stepsPerDay || '0');
  if (steps > 0) {
    const aim = steps < 7500 ? '7,500+' : '8,000+';
    rows.push({
      name: 'Daily steps',
      current: formatThousands(steps),
      target: aim,
      unit: '/ day',
    });
  }

  const sleepQ = (formData.sleepQuality || '').toLowerCase();
  const sleepDur = (formData.sleepDuration || '').toLowerCase();
  if (sleepQ || sleepDur) {
    const current = [sleepDur, sleepQ].filter(Boolean).map(capitalise).join(' · ') || '—';
    rows.push({
      name: 'Sleep',
      current,
      target: sleepQ === 'good' || sleepQ === 'excellent' ? 'Maintain' : '7–8 h',
      unit: sleepQ === 'good' || sleepQ === 'excellent' ? '' : 'most nights',
    });
  }

  const stress = (formData.stressLevel || '').toLowerCase();
  if (stress) {
    rows.push({
      name: 'Stress',
      current: capitalise(stress.replace(/-/g, ' ')),
      target: stress === 'low' || stress === 'minimal' ? 'Managing' : 'Lower load',
      unit: '',
    });
  }

  const sedentary = parseFloat(formData.sedentaryHours || '0');
  if (sedentary > 0) {
    rows.push({
      name: 'Sedentary time',
      current: sedentary.toFixed(sedentary % 1 === 0 ? 0 : 1),
      target: sedentary >= 8 ? 'Under 8' : 'Maintain',
      unit: 'h / day',
    });
  }

  return rows.slice(0, 4);
}

function capitalise(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatThousands(n: number): string {
  return n.toLocaleString('en-GB');
}
