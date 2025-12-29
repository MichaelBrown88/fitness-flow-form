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
  const hasStrength = formData?.pushupMaxReps && parseFloat(formData.pushupMaxReps) > 0;
  const hasCardio = formData?.cardioRestingHr && parseFloat(formData.cardioRestingHr) > 0;
  const hasLifestyle = formData?.sleepQuality || formData?.stressLevel;
  const isFormComplete =
    categoriesWithData >= 2 ||
    (hasBodyComp && hasStrength) ||
    (hasStrength && hasCardio) ||
    (hasCardio && hasLifestyle);

  if (!isFormComplete) {
    return (
      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-900">Your roadmap</h2>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-800">
            Complete more sections of your assessment to see your personalized roadmap and timeline.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold text-slate-900">Your roadmap</h2>
      <div className="rounded-lg border border-primary/20 bg-brand-light p-4 shadow-sm">
        <p className="text-sm text-slate-900 mb-3">
          <strong>This timeline shows when you can expect to start seeing results.</strong> More sessions per week means
          faster progress—adjust the slider below to see how training frequency affects your timeline.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-600">Sessions per week:</span>
        <input
          type="range"
          min={3}
          max={5}
          step={1}
          value={sessionsPerWeek}
          onChange={(e) => setSessionsPerWeek(parseInt(e.target.value))}
          className="flex-1"
        />
        <span className="text-sm font-medium text-slate-800 min-w-[60px]">{sessionsPerWeek} sessions</span>
      </div>
      <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        {orderedCats.map((cat) => {
          const weeks = weeksByCategory[cat.id] ?? 3;
          const color = CATEGORY_COLOR[cat.id] || 'bg-slate-500';
          return (
            <div key={cat.id}>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-800">{niceLabel(cat.id)}</span>
                <span className="text-xs text-slate-500">~{weeks} weeks to see improvements</span>
              </div>
              <div className="h-3 w-full rounded bg-slate-100">
                <div className={`h-3 rounded ${color}`} style={{ width: `${Math.min(100, (weeks / 26) * 100)}%` }} />
              </div>
            </div>
          );
        })}
        <div className="mt-4 pt-3 border-t border-slate-200">
          <p className="text-sm text-slate-700">
            <strong>Total timeline: ~{maxWeeks} weeks with {sessionsPerWeek} sessions/week.</strong> More sessions =
            faster results.
            {sessionsPerWeek === 3 && ' Training 4-5 times per week can reduce this timeline by 15-25%.'}
            {sessionsPerWeek === 4 && ' Training 5 times per week can reduce this timeline by an additional 10-15%.'}
            {sessionsPerWeek === 5 && " You're maximizing your training frequency for the fastest results."}
          </p>
        </div>
      </div>
    </section>
  );
}

