import React from 'react';
import { ArrowRight, Download, Share2, TrendingDown, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScoreRing } from '@/components/reports/ScoreRing';
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
  goingWell: string[];
  focusNext: string[];
  primaryGoalLabel: string | null;
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
  goingWell,
  focusNext,
  primaryGoalLabel,
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
      <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h1 className="text-2xl font-semibold tracking-[-0.03em] text-foreground sm:text-[1.75rem]">
              {clientName || 'Your assessment'}
            </h1>
            {reportDate ? (
              <p className="text-[12px] font-medium tabular-nums text-muted-foreground">
                {reportDate}
              </p>
            ) : null}
          </div>

          {primaryGoalLabel ? (
            <div className="mt-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {CLIENT_REPORT_COPY.v2PrimaryGoalPrefix}
              </p>
              <p className="mt-1 text-lg font-semibold tracking-[-0.02em] text-foreground">
                {primaryGoalLabel}
              </p>
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
        </div>

        <div className="flex shrink-0 flex-col items-center border border-border bg-muted/30 px-5 py-4">
          <ScoreRing score={overall} size={96} label="AXIS Score™" />
          {scoreDiff !== null && scoreDiff !== 0 ? (
            <p
              className={cn(
                'mt-2 inline-flex items-center gap-1 text-[11px] font-semibold tabular-nums',
                scoreDiff > 0 ? 'text-score-green-fg' : 'text-score-red-fg',
              )}
            >
              {scoreDiff > 0 ? (
                <TrendingUp className="h-3.5 w-3.5 shrink-0" aria-hidden />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 shrink-0" aria-hidden />
              )}
              {scoreDiff > 0 ? `+${scoreDiff}` : scoreDiff} vs last time
            </p>
          ) : null}
        </div>
      </header>

      {(goingWell.length > 0 || focusNext.length > 0) && (
        <div className="mt-8 border-t border-border pt-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {CLIENT_REPORT_COPY.v2FindingsHeading}
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {goingWell.length > 0 ? (
              <div className="rounded-sm border border-score-green/25 bg-score-green/8 px-4 py-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-score-green-fg">
                  {CLIENT_REPORT_COPY.goingWell}
                </p>
                <ul className="mt-2.5 space-y-2 text-sm leading-relaxed text-foreground-secondary">
                  {goingWell.map((line) => (
                    <li key={line}>{sanitizeClientReportCopy(line)}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {focusNext.length > 0 ? (
              <div className="rounded-sm border border-score-amber/30 bg-score-amber/10 px-4 py-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground/80">
                  {CLIENT_REPORT_COPY.focusNext}
                </p>
                <ul className="mt-2.5 space-y-2 text-sm leading-relaxed text-foreground-secondary">
                  {focusNext.map((line) => (
                    <li key={line}>{sanitizeClientReportCopy(line)}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
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
