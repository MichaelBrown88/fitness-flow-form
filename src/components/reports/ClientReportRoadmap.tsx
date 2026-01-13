/**
 * ClientReport Roadmap Component
 * Displays timeline for achieving goals based on training frequency
 */

import React from 'react';
import type { ScoreSummary } from '@/lib/scoring';
import { CATEGORY_COLOR, niceLabel } from './ClientReportConstants';

interface ClientReportRoadmapProps {
  scores: ScoreSummary;
  orderedCats: ScoreSummary['categories'];
  weeksByCategory: Record<string, number>;
  maxWeeks: number;
  sessionsPerWeek: number;
  setSessionsPerWeek: (value: number) => void;
  formData?: {
    inbodyWeightKg?: string;
    pushupMaxReps?: string;
    pushupsOneMinuteReps?: string;
    squatsOneMinuteReps?: string;
    plankDurationSeconds?: string;
    cardioRestingHr?: string;
    sleepQuality?: string;
    stressLevel?: string;
  };
}

export function ClientReportRoadmap({
  scores,
  orderedCats,
  weeksByCategory,
  maxWeeks,
  sessionsPerWeek,
  setSessionsPerWeek,
  formData,
}: ClientReportRoadmapProps) {
  // Check if form has enough data to show meaningful roadmap
  const categoriesWithData = scores.categories.filter(c => c.score > 0).length;
  const hasBodyComp = formData?.inbodyWeightKg && parseFloat(formData.inbodyWeightKg) > 0;
  // Check multiple strength fields - pushups can be in different fields
  const hasStrength = !!(formData?.pushupsOneMinuteReps && parseFloat(formData.pushupsOneMinuteReps) > 0) ||
                      !!(formData?.pushupMaxReps && parseFloat(formData.pushupMaxReps) > 0) ||
                      !!(formData?.squatsOneMinuteReps && parseFloat(formData.squatsOneMinuteReps) > 0) ||
                      !!(formData?.plankDurationSeconds && parseFloat(formData.plankDurationSeconds) > 0);
  const hasCardio = formData?.cardioRestingHr && parseFloat(formData.cardioRestingHr) > 0;
  const hasLifestyle = formData?.sleepQuality || formData?.stressLevel;
  const isFormComplete =
    categoriesWithData >= 2 ||
    (hasBodyComp && hasStrength) ||
    (hasStrength && hasCardio) ||
    (hasCardio && hasLifestyle);

  if (!isFormComplete) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-800">
            Complete more sections of your assessment to see your personalized roadmap and timeline.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-primary/20 bg-brand-light p-3 sm:p-4 shadow-sm">
        <p className="text-xs sm:text-sm text-slate-900 mb-2 sm:mb-3">
          <strong>This timeline shows when you can expect to start seeing results.</strong> More sessions per week means
          faster progress—adjust the slider below to see how training frequency affects your timeline.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
        <span className="text-xs sm:text-sm text-slate-600 shrink-0">Sessions per week:</span>
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <input
            type="range"
            min={3}
            max={5}
            step={1}
            value={sessionsPerWeek}
            onChange={(e) => setSessionsPerWeek(parseInt(e.target.value))}
            className="flex-1 sm:flex-none sm:w-32"
          />
          <span className="text-xs sm:text-sm font-medium text-slate-800 min-w-[60px] sm:min-w-[70px] text-right sm:text-left">{sessionsPerWeek} sessions</span>
        </div>
      </div>
      <div className="space-y-2 sm:space-y-3 rounded-lg border border-slate-200 bg-white p-3 sm:p-4 shadow-sm">
        {orderedCats.map((cat) => {
          const weeks = weeksByCategory[cat.id] ?? 3;
          const color = CATEGORY_COLOR[cat.id] || 'bg-slate-500';
          return (
            <div key={cat.id}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-xs sm:text-sm font-medium text-slate-800 flex-1 min-w-0">{niceLabel(cat.id)}</span>
                <span className="text-[10px] sm:text-xs text-slate-500 shrink-0">~{weeks} weeks</span>
              </div>
              <div className="h-2.5 sm:h-3 w-full rounded bg-slate-100">
                <div className={`h-2.5 sm:h-3 rounded ${color}`} style={{ width: `${Math.min(100, (weeks / 26) * 100)}%` }} />
              </div>
            </div>
          );
        })}
        <div className="mt-3 sm:mt-4 pt-2 sm:pt-3 border-t border-slate-200">
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
            <strong>Total timeline: ~{maxWeeks} weeks with {sessionsPerWeek} sessions/week.</strong> More sessions =
            faster results.
            {sessionsPerWeek === 3 && ' Training 4-5 times per week can reduce this timeline by 15-25%.'}
            {sessionsPerWeek === 4 && ' Training 5 times per week can reduce this timeline by an additional 10-15%.'}
            {sessionsPerWeek === 5 && " You're maximizing your training frequency for the fastest results."}
          </p>
        </div>
      </div>
    </div>
  );
}

