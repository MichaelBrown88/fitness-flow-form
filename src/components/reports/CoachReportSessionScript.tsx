/**
 * CoachReport First Session Script Component
 * Displays talking points for the first session with client
 */

import React from 'react';
import { CheckCircle2, MessageSquare, Target } from 'lucide-react';
import type { CoachPlan } from '@/lib/recommendations';

interface CoachReportSessionScriptProps {
  clientScript: CoachPlan['clientScript'];
}

export function CoachReportSessionScript({ clientScript }: CoachReportSessionScriptProps) {
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-primary p-2 rounded-lg">
          <MessageSquare className="h-5 w-5 text-white" />
        </div>
        <h3 className="text-xl font-bold text-slate-900">First Session Talking Points</h3>
      </div>

      <div className="grid gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">1. What we found</h4>
              <ul className="space-y-2">
                {clientScript.findings.map((item, i) => (
                  <li key={i} className="flex gap-3 text-slate-700 text-sm">
                    <span className="text-primary font-bold">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">
                2. Why this matters for your goals
              </h4>
              <ul className="space-y-2">
                {clientScript.whyItMatters.map((item, i) => (
                  <li key={i} className="flex gap-3 text-slate-700 text-sm">
                    <span className="text-score-amber font-bold">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">3. Our immediate focus</h4>
              <ul className="space-y-2">
                {clientScript.actionPlan.map((item, i) => (
                  <li key={i} className="flex gap-3 text-slate-700 text-sm font-medium">
                    <CheckCircle2 className="h-4 w-4 text-score-green shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid md:grid-cols-2 gap-6 pt-4 mt-4 border-t border-slate-100">
              <div>
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">4. 2-3 Month Outlook</h4>
                <ul className="space-y-2">
                  {clientScript.threeMonthOutlook.map((item, i) => (
                    <li key={i} className="flex gap-3 text-slate-700 text-sm">
                      <Target className="h-4 w-4 text-sky-500 shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">5. Your Commitment</h4>
                <ul className="space-y-2">
                  {clientScript.clientCommitment.map((item, i) => (
                    <li key={i} className="flex gap-3 text-slate-700 text-sm">
                      <span className="text-primary font-bold">{i + 1}.</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

