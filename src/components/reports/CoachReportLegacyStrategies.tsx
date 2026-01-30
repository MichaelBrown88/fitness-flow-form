/**
 * CoachReport Legacy Programming Strategies Component
 * Fallback display for legacy programming strategies format
 */

import React from 'react';
import { Activity } from 'lucide-react';
import type { CoachPlan } from '@/lib/recommendations';

interface CoachReportLegacyStrategiesProps {
  plan: CoachPlan;
}

export function CoachReportLegacyStrategies({ plan }: CoachReportLegacyStrategiesProps) {
  if (plan.prioritizedExercises && plan.prioritizedExercises.groups.length > 0) {
    return null;
  }

  if (!plan.programmingStrategies || plan.programmingStrategies.length === 0) {
    return null;
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-sky-600 p-2 rounded-lg">
          <Activity className="h-5 w-5 text-white" />
        </div>
        <h3 className="text-xl font-bold text-slate-900">Programming Strategies</h3>
      </div>

      <div className="grid gap-4">
        {plan.programmingStrategies.map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <h4 className="font-bold text-slate-900">{s.title}</h4>
              <span className="px-3 py-1 bg-sky-50 text-sky-700 rounded-full text-xs font-bold uppercase tracking-widest">
                Strategy
              </span>
            </div>
            <p className="text-sm text-slate-600 mb-4">{s.strategy}</p>
            <div className="flex flex-wrap gap-2">
              {s.exercises.map((ex, j) => (
                <span
                  key={j}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-100 text-slate-700 rounded-xl text-xs font-medium"
                >
                  {ex}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

