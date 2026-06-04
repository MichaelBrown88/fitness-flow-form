import React from 'react';
import type { ClientReportPlanStep } from '@/lib/reports/buildClientReportModel';
import { CLIENT_REPORT_COPY } from '@/constants/clientReport';
import { cn } from '@/lib/utils';

interface ClientReportPlanProps {
  steps: ClientReportPlanStep[];
  embedded?: boolean;
}

export function ClientReportPlan({ steps, embedded = false }: ClientReportPlanProps) {
  if (steps.length === 0) return null;

  return (
    <section className={cn(embedded ? '' : 'rounded-sm border border-border bg-card px-6 py-7 sm:px-10')}>
      <h2 className="text-base font-semibold tracking-[-0.02em] text-foreground">
        {CLIENT_REPORT_COPY.v2PlanHeading}
      </h2>
      <ol className="mt-5 divide-y divide-border">
        {steps.map((step, index) => (
          <li key={step.title} className="flex gap-4 py-4 first:pt-0 last:pb-0">
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center border border-border bg-muted/40 text-[12px] font-semibold text-foreground tabular-nums"
              aria-hidden
            >
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{step.title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-foreground-secondary">
                {step.body}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
