/**
 * CoachReport Header — "Client Brief" intelligence card
 * Displays client name, quick facts, goals, compact score bars, and radar chart
 */

import React, { useMemo } from 'react';
import { ClipboardList } from 'lucide-react';
import type { FormData } from '@/contexts/FormContext';
import type { ScoreSummary } from '@/lib/scoring';
import { calculateAge } from '@/lib/scoring';
import OverallRadarChart from './OverallRadarChart';
import { niceLabel } from './CoachReportConstants';
import { ASSESSMENT_OPTIONS } from '@/constants/assessment';

const CATEGORY_COLORS: Record<string, string> = {
  bodyComp: '#10b981',
  strength: '#6366f1',
  cardio: '#0ea5e9',
  movementQuality: '#f59e0b',
  lifestyle: '#a855f7',
};

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
  const overallRadarData = useMemo(
    () =>
      scores.categories.map((cat) => ({
        name: niceLabel(cat.id).split(' ')[0],
        fullLabel: niceLabel(cat.id),
        value: cat.score,
        color: '#3b82f6',
      })),
    [scores.categories]
  );

  const age = formData?.dateOfBirth ? calculateAge(formData.dateOfBirth) : null;
  const gender = formData?.gender?.trim();
  const trainingLabel = formData?.trainingHistory ? trainingExperienceLabel(formData.trainingHistory) : '';

  return (
    <section className="flex flex-col md:flex-row md:items-stretch gap-6 md:gap-8 bg-white rounded-3xl border border-slate-100 p-6 md:p-8 shadow-sm">
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
          <ClipboardList className="size-3.5" />
          Client Brief
        </h4>

        <h3 className="text-2xl font-bold text-slate-900 truncate">
          {clientName || 'Client Overview'}
        </h3>

        {(age != null || gender || trainingLabel) && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
            {age != null && age > 0 && <span>{age} yrs</span>}
            {gender && <span className="capitalize">{gender}</span>}
            {trainingLabel && (
              <span className="text-slate-700 font-medium max-w-[200px] truncate" title={trainingLabel}>
                {trainingLabel}
              </span>
            )}
          </div>
        )}

        {goals.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {goals.map((g) => (
              <span
                key={g}
                className="px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-md text-xs font-semibold"
              >
                {g.replace(/-/g, ' ')}
              </span>
            ))}
          </div>
        )}

        <div className="space-y-1.5 mt-auto">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-600">Overall</span>
            <span className="font-bold text-slate-900">{Math.round(scores.overall)}</span>
          </div>
          <div className="flex gap-1.5">
            {scores.categories.map((cat) => (
              <div
                key={cat.id}
                className="flex-1 min-w-0 flex flex-col gap-0.5"
                title={`${niceLabel(cat.id)}: ${cat.score}`}
              >
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${cat.score}%`,
                      backgroundColor: CATEGORY_COLORS[cat.id] ?? '#94a3b8',
                    }}
                  />
                </div>
                <span className="text-[10px] text-slate-400 truncate text-center">
                  {niceLabel(cat.id).split(' ')[0]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full md:w-64 flex-shrink-0 bg-slate-50 rounded-2xl p-4 min-h-[220px]">
        <OverallRadarChart data={overallRadarData} />
      </div>
    </section>
  );
}
