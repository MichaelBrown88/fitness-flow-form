/**
 * CoachReport Header — "Client Brief" intelligence card
 * Displays client name, quick facts, goals, compact score bars, and radar chart
 */

import React from 'react';
import { ClipboardList } from 'lucide-react';
import type { FormData } from '@/contexts/FormContext';
import type { ScoreSummary } from '@/lib/scoring';
import { calculateAge } from '@/lib/scoring';
import { niceLabel } from './CoachReportConstants';
import { ASSESSMENT_OPTIONS } from '@/constants/assessment';

function trainingExperienceLabel(value: string): string {
  if (!value) return '';
  const opt = ASSESSMENT_OPTIONS.trainingHistory.find((o) => o.value === value);
  return opt?.label ?? value;
}

interface CoachReportHeaderProps {
  clientName: string;
  goals: string[];
  scores: ScoreSummary;
  formData?: FormData;
}

export function CoachReportHeader({ clientName, goals, scores, formData }: CoachReportHeaderProps) {
  const age = formData?.dateOfBirth ? calculateAge(formData.dateOfBirth) : null;
  const gender = formData?.gender?.trim();
  const trainingLabel = formData?.trainingHistory ? trainingExperienceLabel(formData.trainingHistory) : '';

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-sm transition-apple">
      <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-foreground-secondary">
        <ClipboardList className="size-3.5" />
        Identity & pillar scores
      </h4>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm text-foreground-secondary">
        <span className="font-semibold text-foreground">{clientName || 'Client'}</span>
        {age != null && age > 0 && <span>{age} yrs</span>}
        {gender && <span className="capitalize">{gender}</span>}
        {trainingLabel && (
          <span className="font-medium max-w-[200px] truncate text-foreground-secondary" title={trainingLabel}>
            {trainingLabel}
          </span>
        )}
      </div>
      {goals.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {goals.map((g) => (
            <span
              key={g}
              className="px-2.5 py-0.5 bg-muted text-foreground rounded-lg text-xs font-semibold"
            >
              {g.replace(/-/g, ' ')}
            </span>
          ))}
        </div>
      )}
      <div className="space-y-1.5">
        <div className="flex gap-1.5">
          {scores.categories.map((cat) => (
            <div
              key={cat.id}
              className="flex-1 min-w-0 flex flex-col gap-0.5"
              title={`${niceLabel(cat.id)}: ${cat.score}`}
            >
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${cat.score}%` }}
                />
              </div>
              <span className="text-[10px] text-foreground-secondary truncate text-center">
                {niceLabel(cat.id).split(' ')[0]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
