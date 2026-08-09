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
import type { ReportPriorityItem } from './ReportPriorityChips';

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
  onPillarSelect?: (sectionId: string) => void;
  orgName?: string;
  coachName?: string;
  assessmentNumber?: number;
  formData?: FormData;
  goalLabels?: string[];
  /** Goal-led promise sentence — opens the summary so goals come before findings. */
  goalPromise?: string;
  baselineNarrative?: string;
  clientFacingRadar?: boolean;
  showActions?: boolean;
  onDownloadPdf?: () => void;
  onShare?: () => void;
  onSendToClient?: () => void;
}

/** "Body Composition: Body fat within healthy range" → "Body fat within healthy range". */
function stripCategoryPrefix(text: string): string {
  const idx = text.indexOf(': ');
  return idx > 0 ? text.slice(idx + 2) : text;
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function joinNaturally(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

function ensurePeriod(text: string): string {
  const trimmed = text.trim();
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

/**
 * Composes the hero into a 3–4 sentence at-a-glance paragraph:
 * goal-led position → current finding → strengths → focus areas.
 */
function buildAtAGlance(
  goalPromise: string | undefined,
  narrative: string | undefined,
  strengths: ReportPriorityItem[],
  focusAreas: ReportPriorityItem[],
): string {
  const sentences: string[] = [];
  if (goalPromise) sentences.push(ensurePeriod(goalPromise));
  if (narrative) sentences.push(ensurePeriod(narrative));

  const strengthBits = strengths
    .slice(0, 2)
    .map((s) => lowerFirst(stripCategoryPrefix(s.text)));
  if (strengthBits.length > 0) {
    sentences.push(`${CLIENT_REPORT_COPY.goingWell}: ${joinNaturally(strengthBits)}.`);
  }

  const focusBits = focusAreas
    .slice(0, 2)
    .map((s) => lowerFirst(stripCategoryPrefix(s.text)));
  if (focusBits.length > 0) {
    sentences.push(`${CLIENT_REPORT_COPY.focusNext}: ${joinNaturally(focusBits)}.`);
  }

  return sentences.join(' ');
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
  onPillarSelect,
  goalLabels = [],
  goalPromise,
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
  const hasRadar = radarData.length > 0;
  const atAGlance = buildAtAGlance(
    goalPromise,
    narrative,
    priorityStrengths,
    priorityFocusAreas,
  );

  return (
    <section className="rounded-2xl bg-card p-6 ring-1 ring-border/60 sm:p-8">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
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
          {goalLabels.length > 0 ? (
            <div className="mt-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {CLIENT_REPORT_COPY.v2PrimaryGoalPrefix}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {goalLabels.map((label) => (
                  <span
                    key={label}
                    className="inline-flex rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-[11px] font-semibold text-foreground"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
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

      {hasRadar ? (
        <OverallRadarPolygon
          data={radarData}
          previousData={previousRadarData}
          onPillarSelect={onPillarSelect}
          compact
          className="mt-2"
          clientFacingLabels={clientFacingRadar}
          overallScore={scores.overall}
        />
      ) : null}

      {atAGlance ? (
        <PillarCardSection
          title={CLIENT_REPORT_COPY.heroSummaryHeading}
          className={hasRadar ? 'mt-2' : 'mt-5'}
        >
          <p className="max-w-[78ch] text-sm leading-relaxed text-foreground-secondary">
            {atAGlance}
          </p>
        </PillarCardSection>
      ) : null}

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
