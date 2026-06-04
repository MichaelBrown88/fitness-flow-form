import React from 'react';
import { cn } from '@/lib/utils';

export type ClientReportCalloutVariant = 'intro' | 'takeaway' | 'positive' | 'focus';

const VARIANT_CLASS: Record<ClientReportCalloutVariant, string> = {
  intro: 'border-l-foreground/25 bg-muted/35 text-foreground',
  takeaway: 'border-l-brand-accent bg-brand-accent/8 text-foreground',
  positive: 'border-l-score-green bg-score-green/10 text-foreground',
  focus: 'border-l-score-amber bg-score-amber/10 text-foreground',
};

interface ClientReportCalloutProps {
  variant?: ClientReportCalloutVariant;
  label?: string;
  children: React.ReactNode;
  className?: string;
}

export function ClientReportCallout({
  variant = 'takeaway',
  label,
  children,
  className,
}: ClientReportCalloutProps) {
  return (
    <div
      className={cn(
        'border-l-[3px] px-3.5 py-2.5 sm:px-4 sm:py-3',
        VARIANT_CLASS[variant],
        className,
      )}
    >
      {label ? (
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </p>
      ) : null}
      <div className={cn('text-sm leading-relaxed', label ? 'mt-1.5' : '')}>{children}</div>
    </div>
  );
}
