import React from 'react';
import { ArrowRight, Download, Share2, TrendingDown, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CLIENT_REPORT_COPY } from '@/constants/clientReport';
import { sanitizeClientReportCopy } from '@/lib/reports/sanitizeClientReportCopy';
import { ClientReportCallout } from './ClientReportCallout';
import { cn } from '@/lib/utils';

export interface ClientReportHeroProps {
  clientName: string;
  reportDate: string;
  overall: number;
  previousOverall: number | null;
  headline: string | null;
  goalPromise: string;
  welcome: string;
  /** Goal-weighted priority list — "Where to focus first". */
  focusFirst: string[];
  goalLabels: string[];
  baselineNarrative?: string;
  showActions?: boolean;
  onDownloadPdf?: () => void;
  onShare?: () => void;
  onSendToClient?: () => void;
  embedded?: boolean;
}

export function ClientReportHero({
  clientName,
  reportDate,
  overall,
  previousOverall,
  headline,
  goalPromise,
  welcome,
  focusFirst,
  goalLabels,
  baselineNarrative,
  showActions = false,
  onDownloadPdf,
  onShare,
  onSendToClient,
  embedded = false,
}: ClientReportHeroProps) {
  const firstName = clientName?.trim().split(/\s+/)[0] || 'client';
  const scoreDiff =
    previousOverall != null && previousOverall > 0 ? overall - previousOverall : null;

  return (
    <section className={cn(embedded ? '' : 'rounded-sm border border-border bg-card px-6 py-7 sm:px-10 sm:py-8')}>
      <header>
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h1 className="text-2xl font-semibold tracking-[-0.03em] text-foreground sm:text-[1.75rem]">
            {clientName || 'Your assessment'}
          </h1>
          {reportDate ? (
            <p className="text-[12px] font-medium tabular-nums text-muted-foreground">
              {reportDate}
            </p>
          ) : null}
          {/* Score demoted to a small inline stat — goals lead the hero */}
          <p className="ml-auto inline-flex items-baseline gap-2 text-[12px] font-medium text-muted-foreground">
            <span>AXIS Score™</span>
            <span className="text-base font-semibold tabular-nums text-foreground">{overall}</span>
            {scoreDiff !== null && scoreDiff !== 0 ? (
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 text-[11px] font-semibold tabular-nums',
                  scoreDiff > 0 ? 'text-score-green-fg' : 'text-score-red-fg',
                )}
              >
                {scoreDiff > 0 ? (
                  <TrendingUp className="h-3 w-3 shrink-0" aria-hidden />
                ) : (
                  <TrendingDown className="h-3 w-3 shrink-0" aria-hidden />
                )}
                {scoreDiff > 0 ? `+${scoreDiff}` : scoreDiff}
              </span>
            ) : null}
          </p>
        </div>

        {goalLabels.length > 0 ? (
          <div className="mt-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {CLIENT_REPORT_COPY.v2PrimaryGoalPrefix}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {goalLabels.map((label) => (
                <span
                  key={label}
                  className="inline-flex items-center rounded-full border border-border bg-muted/40 px-3 py-1 text-[13px] font-medium text-foreground"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <ClientReportCallout variant="takeaway" className="mt-5">
          {sanitizeClientReportCopy(goalPromise)}
        </ClientReportCallout>

        {headline ? (
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {sanitizeClientReportCopy(headline)}
          </p>
        ) : null}

        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-foreground-secondary">
          {sanitizeClientReportCopy(welcome)}
        </p>

        {baselineNarrative ? (
          <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
            {sanitizeClientReportCopy(baselineNarrative)}
          </p>
        ) : null}
      </header>

      {focusFirst.length > 0 && (
        <div className="mt-8 border-t border-border pt-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {CLIENT_REPORT_COPY.v2FindingsHeading}
          </p>
          <ol className="mt-4 space-y-3">
            {focusFirst.map((line, index) => (
              <li key={line} className="flex items-start gap-3">
                <span
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-score-amber/40 bg-score-amber/10 text-[12px] font-semibold tabular-nums text-foreground"
                  aria-hidden
                >
                  {index + 1}
                </span>
                <p className="text-sm leading-relaxed text-foreground-secondary">
                  {sanitizeClientReportCopy(line)}
                </p>
              </li>
            ))}
          </ol>
        </div>
      )}

      {showActions ? (
        <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-border pt-5">
          {onDownloadPdf ? (
            <Button variant="outline" onClick={onDownloadPdf} className="h-9 gap-2 rounded-md text-sm">
              <Download className="h-4 w-4" aria-hidden />
              Download PDF
            </Button>
          ) : null}
          {onShare ? (
            <Button variant="outline" onClick={onShare} className="h-9 gap-2 rounded-md text-sm">
              <Share2 className="h-4 w-4" aria-hidden />
              Share link
            </Button>
          ) : null}
          {onSendToClient ? (
            <Button onClick={onSendToClient} className="h-9 gap-2 rounded-md text-sm">
              <ArrowRight className="h-4 w-4" aria-hidden />
              Send to {firstName}
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
