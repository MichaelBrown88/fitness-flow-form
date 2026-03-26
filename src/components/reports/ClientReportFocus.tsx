/**
 * ClientReport Focus Component
 * Displays "What We'll Focus On" section with findings, why it matters, and action plan
 */

import React from 'react';
import { Target as TargetIcon, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { CoachPlan } from '@/lib/recommendations';

interface ClientReportFocusProps {
  clientScript?: CoachPlan['clientScript'];
}

export function ClientReportFocus({ clientScript }: ClientReportFocusProps) {
  if (!clientScript) return null;

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground">What We'll Focus On</h2>
        <p className="text-sm text-muted-foreground italic">"Removing the brakes to put the pedal to the metal on your goals."</p>
      </div>

      <div className="grid gap-6">
        {/* The Plot: Findings */}
        <div className="bg-card rounded-3xl border border-border p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-brand-light flex items-center justify-center">
              <TargetIcon className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-foreground">1. Your Starting Point</h3>
          </div>
          <ul className="space-y-4">
            {clientScript.findings.map((finding: string, i: number) => (
              <li key={i} className="flex gap-4 items-start">
                <span className="h-6 w-6 rounded-full bg-brand-light text-primary flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                  {i + 1}
                </span>
                <p className="text-foreground leading-relaxed font-medium">{finding}</p>
              </li>
            ))}
          </ul>
        </div>

        {/* The Stakes: Why it Matters */}
        <div className="bg-foreground rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <TargetIcon className="h-32 w-32" />
          </div>
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-card/10 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-primary/60" />
              </div>
              <h3 className="text-xl font-bold">2. Why This Matters</h3>
            </div>
            <div className="space-y-4">
              {clientScript.whyItMatters.map((stake: string, i: number) => (
                <p key={i} className="text-white/80/90 leading-relaxed italic border-l-2 pl-4" style={{ borderLeftColor: 'hsl(var(--gradient-from))' }}>
                  {stake}
                </p>
              ))}
            </div>
          </div>
        </div>

        {/* The Strategy: Action Plan */}
        <div className="bg-card rounded-3xl border border-border p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-light flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-gradient-dark" />
            </div>
            <h3 className="text-xl font-bold text-foreground">3. Our Strategy</h3>
          </div>
          <div className="grid gap-4">
            {clientScript.actionPlan.map((action: string, i: number) => (
              <div key={i} className="p-4 rounded-2xl bg-muted border border-border flex gap-4 items-center">
                <div className="h-2 w-2 rounded-full bg-score-green shrink-0" />
                <p className="text-foreground font-bold">{action}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

