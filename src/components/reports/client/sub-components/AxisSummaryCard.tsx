import React from 'react';
import { ArrowRight, Download, Share2, TrendingDown, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { RadarData } from '@/lib/reports/radarData';
import OverallRadarPolygon from '@/components/reports/OverallRadarPolygon';
import { ScoreRing } from '@/components/reports/ScoreRing';
import type { ScoreSummary } from '@/lib/scoring';
import type { FormData } from '@/contexts/FormContext';
import { cn } from '@/lib/utils';
import { CLIENT_REPORT_COPY } from '@/constants/clientReport';
import { PillarCardSection } from './PillarCardSection';
import { ReportPriorityChips, type ReportPriorityItem } from './ReportPriorityChips';

interface AxisSummaryCardProps {
  clientName: string;
  reportDate: string;
  scores: ScoreSummary;
  previousOverallScore?: number | null;
  narrative?: string;
  /** Score-derived headline (replaces client archetype badge). */
  scoreHeadline?: string | null;
  radarData: RadarData[];
  previousRadarData?: RadarData[];
  priorityStrengths?: ReportPriorityItem[];
  priorityFocusAreas?: ReportPriorityItem[];
  outlookHeadline?: string;
  outlookBullets?: string[];
  onPillarSelect?: (sectionId: string) => void;
  orgName?: string;
  coachName?: string;
  assessmentNumber?: number;
  formData?: FormData;
  goalLabels?: string[];
  baselineNarrative?: string;
  clientFacingRadar?: boolean;
  showActions?: boolean;
  onDownloadPdf?: () => void;
  onShare?: () => void;
  onSendToClient?: () => void;
}

export const AxisSummaryCard: React.FC<AxisSummaryCardProps> = ({
  clientName,
  reportDate,
  scores,
  previousOverallScore,
  narrative,
  scoreHeadline,
  radarData,
  previousRadarData,
  priorityStrengths = [],
  priorityFocusAreas = [],
  outlookHeadline,
  outlookBullets = [],
  onPillarSelect,
  goalLabels = [],
  baselineNarrative,
  clientFacingRadar = false,
  showActions = false,
  onDownloadPdf,
  onShare,
  onSendToClient,
}) => {
  const overall = scores?.overall ?? 0;
  const scoreDiff = previousOverallScore != null ? overall - previousOverallScore : null;

  const firstName = clientName?.trim().split(/\s+/)[0] || 'client';
  const hasPriorities =
    priorityStrengths.length > 0 || priorityFocusAreas.length > 0;
  const hasOutlook = Boolean(outlookHeadline) || outlookBullets.length > 0;
  const hasRadar = radarData.length > 0;
  const hasLeftContent =
    Boolean(narrative) || Boolean(scoreHeadline) || hasPriorities || hasOutlook;

  return (
    <section className="rounded-2xl bg-card p-6 ring-1 ring-border/60 sm:p-8">
      <header className="flex flex-col gap-5 border-b border-border/50 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {reportDate ? (
            <p className="text-[12px] text-muted-foreground">{reportDate}</p>
          ) : null}
          <h2 className="mt-1 text-2xl font-bold tracking-[-0.02em] text-foreground sm:text-3xl">
            {clientName || 'Assessment summary'}
          </h2>
          {scoreHeadline ? (
            <p className="mt-2 max-w-xl text-sm font-medium leading-snug text-foreground-secondary">
              {scoreHeadline}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-4 sm:gap-5">
          <ScoreRing score={overall} size={112} label="" className="shrink-0" />
          <div className="min-w-0 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-foreground/80">
              AXIS Score™
            </p>
            {baselineNarrative ? (
              <p className="text-[12px] leading-relaxed text-muted-foreground">{baselineNarrative}</p>
            ) : null}
            {goalLabels.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {goalLabels.map((label) => (
                  <span
                    key={label}
                    className="inline-flex rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-[10px] font-semibold text-foreground"
                  >
                    {label}
                  </span>
                ))}
              </div>
            ) : null}
            {scoreDiff !== null && scoreDiff !== 0 ? (
              <p
                className={cn(
                  'inline-flex items-center gap-1 text-[12px] font-semibold tabular-nums',
                  scoreDiff > 0 ? 'text-score-green-fg' : 'text-score-red-fg',
                )}
              >
                {scoreDiff > 0 ? (
                  <TrendingUp className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 shrink-0" />
                )}
                {scoreDiff > 0 ? `+${scoreDiff}` : scoreDiff} vs last time
              </p>
            ) : null}
          </div>
        </div>
      </header>

      <div
        className={cn(
          'mt-5 grid gap-4',
          hasRadar && hasLeftContent && 'lg:grid-cols-2 lg:items-stretch lg:gap-5',
        )}
      >
        {hasLeftContent ? (
          <div className="flex min-h-0 flex-col justify-center gap-4">
            {narrative ? (
              <PillarCardSection title={CLIENT_REPORT_COPY.whereYouAreHeading}>
                <p className="text-sm leading-relaxed text-foreground-secondary">{narrative}</p>
              </PillarCardSection>
            ) : null}

            {hasPriorities ? (
              <PillarCardSection title={CLIENT_REPORT_COPY.heroPrioritiesHeading}>
                <ReportPriorityChips
                  strengths={priorityStrengths}
                  focusAreas={priorityFocusAreas}
                  layout="split"
                />
              </PillarCardSection>
            ) : null}

            {hasOutlook ? (
              <PillarCardSection title={CLIENT_REPORT_COPY.outlookHeading}>
                {outlookHeadline ? (
                  <p className="text-sm leading-relaxed text-foreground-secondary">
                    {outlookHeadline}
                  </p>
                ) : null}
                {outlookBullets.length > 0 ? (
                  <ul
                    className={cn(
                      'list-disc space-y-1 pl-4 text-sm text-foreground-secondary',
                      outlookHeadline && 'mt-2',
                    )}
                  >
                    {outlookBullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}
              </PillarCardSection>
            ) : null}
          </div>
        ) : null}

        {hasRadar ? (
          <PillarCardSection
            title={CLIENT_REPORT_COPY.pillarsOverviewHeading}
            className={cn(
              'flex min-h-[260px] flex-col',
              hasLeftContent && 'lg:min-h-0',
            )}
          >
            <OverallRadarPolygon
              data={radarData}
              previousData={previousRadarData}
              onPillarSelect={onPillarSelect}
              compact
              className="flex-1"
              clientFacingLabels={clientFacingRadar}
            />
          </PillarCardSection>
        ) : null}
      </div>

      {showActions ? (
        <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-border/50 pt-5">
          {onDownloadPdf ? (
            <Button variant="outline" onClick={onDownloadPdf} className="h-10 gap-2 rounded-full">
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          ) : null}
          {onShare ? (
            <Button variant="outline" onClick={onShare} className="h-10 gap-2 rounded-full">
              <Share2 className="h-4 w-4" />
              Share link
            </Button>
          ) : null}
          {onSendToClient ? (
            <Button onClick={onSendToClient} className="h-10 gap-2 rounded-full">
              <ArrowRight className="h-4 w-4" />
              Send to {firstName}
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
};
