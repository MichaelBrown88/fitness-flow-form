/**
 * CoachReport Body Composition Component
 * Displays body composition analysis and recommendations
 */

import React from 'react';
import { Target, Activity } from 'lucide-react';
import type { BodyCompInterpretation } from '@/lib/recommendations';
import type { CoachPlan } from '@/lib/recommendations';
import type { FormData } from '@/contexts/FormContext';
import { CoachReportLifestyleContext } from './CoachReportLifestyleContext';

interface CoachReportBodyCompProps {
  bodyComp?: BodyCompInterpretation;
  segmentalGuidance?: CoachPlan['segmentalGuidance'];
  formData?: FormData;
}

export function CoachReportBodyComp({ bodyComp, segmentalGuidance, formData }: CoachReportBodyCompProps) {
  return (
    <>
      {segmentalGuidance && segmentalGuidance.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="bg-score-green p-2 rounded-lg">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Segmental Analysis Guidance</h3>
          </div>
          <div className="grid gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <ul className="space-y-3">
                {segmentalGuidance.map((item, i) => (
                  <li key={i} className="text-sm text-slate-700 flex gap-3">
                    <span className="text-score-green font-bold">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {bodyComp && (
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="bg-amber-600 p-2 rounded-lg">
              <Target className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Body Composition Analysis</h3>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h4 className="font-semibold mb-3 text-sm text-slate-400">Health Priority</h4>
                {bodyComp.healthPriority.length ? (
                  <ul className="space-y-2">
                    {bodyComp.healthPriority.map((p, i) => (
                      <li key={i} className="text-sm text-slate-700 flex gap-2">
                        <span className="text-primary font-bold">•</span> {p}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500 italic">No urgent priorities identified.</p>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h4 className="font-semibold mb-3 text-sm text-slate-400">Training Focus</h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Primary Block</p>
                    <p className="text-sm text-slate-900 font-semibold">{bodyComp.trainingFocus.primary}</p>
                  </div>
                  {bodyComp.trainingFocus.secondary && (
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Secondary Focus</p>
                      <ul className="text-sm text-slate-700 list-disc list-inside">
                        {bodyComp.trainingFocus.secondary.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {bodyComp.trainingFocus.unilateralVolume && (
                    <div className="p-3 bg-brand-light rounded-xl border border-primary/10">
                      <p className="text-[10px] font-black text-primary uppercase tracking-[0.15em]">Unilateral Strategy</p>
                      <p className="text-sm text-slate-900">{bodyComp.trainingFocus.unilateralVolume}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h4 className="font-semibold mb-3 text-sm text-slate-400">
                  Nutritional Strategy
                </h4>
                <div className="space-y-4">
                  {bodyComp.nutrition.calorieRange && (
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Energy Intake</p>
                      <p className="text-sm text-slate-900">{bodyComp.nutrition.calorieRange}</p>
                    </div>
                  )}
                  {bodyComp.nutrition.proteinTarget && (
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Protein Goal</p>
                      <p className="text-sm text-slate-900">{bodyComp.nutrition.proteinTarget}</p>
                    </div>
                  )}
                  {bodyComp.nutrition.hydration && (
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Hydration</p>
                      <p className="text-sm text-slate-900">{bodyComp.nutrition.hydration}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h4 className="font-semibold mb-3 text-sm text-slate-400">
                  Timeframe Projection
                </h4>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-primary">{bodyComp.timeframeWeeks}</p>
                  <p className="text-xs text-slate-400 italic">Target Range</p>
                </div>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Estimated time to reach recommended body composition markers based on standard physiological
                  adaptation rates.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}
      {formData && <CoachReportLifestyleContext formData={formData} />}
    </>
  );
}

