/**
 * CoachReport Internal Notes Component
 * Displays what client is doing well and areas to address
 */

import React from 'react';
import { CheckCircle2, AlertCircle, ClipboardList } from 'lucide-react';
import type { CoachPlan } from '@/lib/recommendations';

interface CoachReportInternalNotesProps {
  plan: CoachPlan;
}

export function CoachReportInternalNotes({ plan }: CoachReportInternalNotesProps) {
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-slate-800 p-2 rounded-lg">
          <ClipboardList className="h-5 w-5 text-white" />
        </div>
        <h3 className="text-xl font-bold text-slate-900">Internal Coaching Notes</h3>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-6">
          <h4 className="text-emerald-800 font-bold mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            What they're doing well
          </h4>
          <ul className="space-y-3">
            {plan.internalNotes.doingWell.map((note, i) => (
              <li key={i} className="text-emerald-900 text-sm flex gap-2">
                <span className="font-bold">•</span>
                {note}
              </li>
            ))}
            {plan.internalNotes.doingWell.length === 0 && (
              <li className="text-emerald-600 text-sm italic">Standard baseline.</li>
            )}
          </ul>
        </div>

        <div className="bg-rose-50 rounded-2xl border border-rose-100 p-6">
          <h4 className="text-rose-800 font-bold mb-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Areas to address
          </h4>
          <ul className="space-y-3">
            {plan.keyIssues.map((issue, i) => (
              <li key={`issue-${i}`} className="text-rose-900 text-sm font-bold flex gap-2">
                <span className="text-rose-500">!</span>
                {issue}
              </li>
            ))}
            {plan.internalNotes.needsAttention.map((note, i) => (
              <li
                key={`note-${i}`}
                className="text-rose-900 text-sm flex gap-2 border-t border-rose-100/50 pt-2 first:border-t-0 first:pt-0"
              >
                <span className="font-bold">•</span>
                {note}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

