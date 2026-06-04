import React from 'react';
import type { ClientPillarNarrativeItem } from '@/lib/reports/clientPillarNarratives';
import { CLIENT_REPORT_COPY } from '@/constants/clientReport';
import { sanitizeClientReportCopy } from '@/lib/reports/sanitizeClientReportCopy';
import { ClientReportCallout } from './ClientReportCallout';
import { cn } from '@/lib/utils';

interface ClientPillarNarrativeProps {
  heading: string;
  intro: string | null;
  items: ClientPillarNarrativeItem[];
  className?: string;
}

export function ClientPillarNarrative({
  heading,
  intro,
  items,
  className,
}: ClientPillarNarrativeProps) {
  if (items.length === 0 && !intro) {
    return (
      <p className="text-sm text-muted-foreground">{CLIENT_REPORT_COPY.targetsUnavailable}</p>
    );
  }

  return (
    <div className={cn('mt-5', className)}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {heading}
      </p>
      {intro ? (
        <ClientReportCallout variant="intro" className="mt-3">
          {sanitizeClientReportCopy(intro)}
        </ClientReportCallout>
      ) : null}
      <ul className={cn('space-y-3', intro ? 'mt-4' : 'mt-3')}>
        {items.map((item) => (
          <li
            key={`${item.label}-${item.observation.slice(0, 24)}`}
            className="rounded-sm border border-border/70 bg-muted/20 px-3 py-3 sm:px-4"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/80">
              {sanitizeClientReportCopy(item.label)}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-foreground-secondary">
              {sanitizeClientReportCopy(item.observation)}
            </p>
            {item.direction ? (
              <ClientReportCallout variant="takeaway" label={CLIENT_REPORT_COPY.v2TakeawayLabel} className="mt-3">
                {sanitizeClientReportCopy(item.direction)}
              </ClientReportCallout>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
