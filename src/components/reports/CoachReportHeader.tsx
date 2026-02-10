/**
 * CoachReport Header Component
 * Displays client name, goals, synthesis, and overall radar chart
 */

import React, { useMemo } from 'react';
import OverallRadarChart from './OverallRadarChart';
import { niceLabel } from './CoachReportConstants';
import type { ScoreSummary } from '@/lib/scoring';

interface CoachReportHeaderProps {
  clientName: string;
  goals: string[];
  scores: ScoreSummary;
}

export function CoachReportHeader({ clientName, goals, scores }: CoachReportHeaderProps) {
  const overallRadarData = useMemo(() => {
    return scores.categories.map((cat) => ({
      name: niceLabel(cat.id).split(' ')[0],
      fullLabel: niceLabel(cat.id),
      value: cat.score,
      color: '#3b82f6',
    }));
  }, [scores.categories]);

  return (
    <section className="flex flex-col md:flex-row md:items-start justify-between gap-8 bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
      <div className="space-y-4 flex-1">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold text-slate-900">{clientName || 'Client Overview'}</h2>
          <p className="text-primary font-semibold uppercase tracking-wider text-xs">Coach Assessment & Strategy</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {goals.map((g) => (
            <span
              key={g}
              className="px-3 py-1 bg-brand-light text-primary border border-primary/10 rounded-full text-xs font-black uppercase tracking-widest"
            >
              {g.replace('-', ' ')}
            </span>
          ))}
        </div>

        <p className="text-slate-600 text-sm leading-relaxed max-w-xl">
          Based on the assessment data, we've identified the following training priorities and strategy for{' '}
          {clientName || 'this client'}.
        </p>

        {scores.synthesis && scores.synthesis.length > 0 && (
          <div className="pt-4 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Cross-Pillar Synthesis</h4>
            <div className="grid gap-3">
              {scores.synthesis.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border flex gap-3 ${
                    item.severity === 'high'
                      ? 'border-score-red-muted bg-score-red-light/50'
                      : item.severity === 'medium'
                      ? 'border-score-amber-muted bg-score-amber-light/50'
                      : 'border-blue-100 bg-blue-50/50'
                  }`}
                >
                  <span className="shrink-0">
                    {item.severity === 'high' ? '🚨' : item.severity === 'medium' ? '⚠️' : 'ℹ️'}
                  </span>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900">{item.title}</h5>
                    <p className="text-xs text-slate-600 leading-relaxed mt-0.5">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="w-full md:w-72 flex-shrink-0 bg-slate-50 rounded-2xl p-4 border border-slate-100">
        <OverallRadarChart data={overallRadarData} />
      </div>
    </section>
  );
}

