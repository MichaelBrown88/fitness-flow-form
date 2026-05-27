/**
 * Simplified Client Report — layout orchestration; section config and chrome live under ./client/.
 */

import React, { useMemo, useCallback } from 'react';
import type { FormData } from '@/contexts/FormContext';
import type { ScoreSummary } from '@/lib/scoring';
import { AxisSummaryCard } from './client/sub-components/AxisSummaryCard';
import { useClientReportData } from './client/useClientReportData';
import { useScrollRevealSections } from '@/hooks/useScrollRevealSections';
import { SECTION_IDS, DEFAULT_OPEN } from './client/clientReportSections';
import { type ClientReportSectionContext } from './client/renderClientReportSection';
import {
  ClientReportScrollLayout,
  getActiveReportSectionIds,
} from './client/ClientReportScrollLayout';
import { ReportPillarJumpRow } from './client/sub-components/ReportPillarJumpRow';
import { buildClientOverallSummary } from './client/sub-components/clientPillarSummary';
import { buildProjectedOutlook } from '@/lib/goals/projectedOutlook';
import { ASSESSMENT_OPTIONS } from '@/constants/assessment';
import { CLIENT_REPORT_COPY } from '@/constants/clientReport';

export default function ClientReport({
  scores,
  goals,
  formData,
  bodyComp: _bodyComp,
  previousScores,
  previousFormData,
  standalone = true,
  reportShareToken,
  roadmapShareToken,
  showBaselineNarrative = false,
  organizationId,
  coachActions,
  reportMeta,
}: {
  scores: ScoreSummary;
  goals?: string[];
  formData?: FormData;
  bodyComp?: { timeframeWeeks: string };
  previousScores?: ScoreSummary | null;
  previousFormData?: FormData;
  standalone?: boolean;
  /** Public report token for `/r/:token/roadmap` links. */
  reportShareToken?: string;
  roadmapShareToken?: string;
  showBaselineNarrative?: boolean;
  organizationId?: string;
  coachActions?: {
    onShare?: () => void;
    onSendToClient?: () => void;
    onDownloadPdf?: () => void;
  };
  reportMeta?: {
    orgName?: string;
    coachName?: string;
    assessmentNumber?: number;
  };
}) {
  const {
    safeScores,
    archetype,
    strengths,
    areasForImprovement,
    clientName,
    hasAnyData,
    overallRadarData,
    previousRadarData,
    gapAnalysisData,
    previousGapAnalysisData,
    reportDate,
  } = useClientReportData({ scores, goals, formData, previousScores, previousFormData });

  const { setRef: setSectionRef } = useScrollRevealSections(SECTION_IDS, DEFAULT_OPEN);

  const sectionCtx: ClientReportSectionContext = useMemo(
    () => ({
      safeScores,
      scores,
      previousScores,
      archetype,
      strengths,
      areasForImprovement,
      overallRadarData,
      previousRadarData,
      gapAnalysisData,
      previousGapAnalysisData,
      goals,
      formData,
      previousFormData,
      standalone,
      clientName,
      organizationId,
    }),
    [
      safeScores,
      scores,
      previousScores,
      archetype,
      strengths,
      areasForImprovement,
      overallRadarData,
      previousRadarData,
      gapAnalysisData,
      previousGapAnalysisData,
      goals,
      formData,
      previousFormData,
      standalone,
      clientName,
      organizationId,
    ],
  );

  const activeSectionIds = useMemo(
    () => getActiveReportSectionIds(sectionCtx),
    [sectionCtx],
  );

  const overallNarrative = useMemo(
    () => buildClientOverallSummary(safeScores, previousScores?.overall ?? null),
    [safeScores, previousScores?.overall],
  );

  const priorityStrengths = useMemo(
    () => strengths.map((s) => ({ text: s.strength })),
    [strengths],
  );

  const priorityFocusAreas = useMemo(
    () => areasForImprovement.map((a) => ({ text: a.weakness })),
    [areasForImprovement],
  );

  const projectedOutlook = useMemo(
    () => buildProjectedOutlook(formData, safeScores, goals),
    [formData, safeScores, goals],
  );

  const goalChipLabels = useMemo(() => {
    const ids = goals?.length ? goals : formData?.clientGoals ?? [];
    return ids
      .map((id) => ASSESSMENT_OPTIONS.clientGoals.find((g) => g.value === id)?.label ?? id)
      .filter(Boolean)
      .slice(0, 4);
  }, [goals, formData?.clientGoals]);

  const arcNavToken = reportShareToken ?? roadmapShareToken;

  const scrollToPillar = useCallback((sectionId: string) => {
    const el = document.querySelector(`[data-section-id="${sectionId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  if (!scores || !scores.categories || scores.categories.length === 0 || !hasAnyData) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-semibold mb-2">No assessment data available</p>
        <p>Please complete at least one section of the assessment to generate a report.</p>
      </div>
    );
  }

  const containerClass = standalone
    ? 'min-h-screen bg-muted/50 text-foreground px-3 sm:px-4 md:px-6 lg:px-8 xl:px-12 py-2 sm:py-4 md:py-6 lg:py-8 xl:py-12 overflow-x-hidden'
    : 'w-full text-foreground overflow-x-hidden';

  const contentClass = standalone
    ? 'max-w-[1400px] mx-auto space-y-2 sm:space-y-3 md:space-y-4 lg:space-y-5 xl:space-y-6 w-full min-w-0'
    : 'space-y-2 sm:space-y-3 md:space-y-4 lg:space-y-5 xl:space-y-6 w-full min-w-0';

  return (
    <div className={containerClass}>
      <div className={`${contentClass} overflow-x-hidden`}>
        {safeScores.categories?.length > 0 && (
          <>
            <AxisSummaryCard
              clientName={clientName}
              reportDate={reportDate}
              scores={safeScores}
              previousOverallScore={previousScores?.overall ?? null}
              narrative={overallNarrative}
              archetype={archetype}
              radarData={overallRadarData}
              previousRadarData={previousRadarData}
              priorityStrengths={priorityStrengths}
              priorityFocusAreas={priorityFocusAreas}
              outlookHeadline={projectedOutlook?.headline}
              outlookBullets={projectedOutlook?.bullets}
              outlookHorizons={projectedOutlook?.horizons}
              onPillarSelect={scrollToPillar}
              orgName={reportMeta?.orgName}
              coachName={reportMeta?.coachName}
              assessmentNumber={reportMeta?.assessmentNumber}
              formData={formData}
              goalLabels={standalone ? goalChipLabels : []}
              baselineNarrative={
                standalone && showBaselineNarrative ? CLIENT_REPORT_COPY.baselineNarrative : undefined
              }
              clientFacingRadar={standalone}
              showActions={Boolean(coachActions)}
              onShare={coachActions?.onShare}
              onSendToClient={coachActions?.onSendToClient}
              onDownloadPdf={coachActions?.onDownloadPdf}
            />
            <ReportPillarJumpRow activeSectionIds={activeSectionIds} />
          </>
        )}

        <ClientReportScrollLayout
          sectionCtx={sectionCtx}
          setSectionRef={setSectionRef}
          showPartialAssessmentBanner={standalone}
        />

        {standalone && arcNavToken && (
          <div className="md:hidden flex items-center justify-between rounded-xl border border-border bg-muted/40 px-4 py-3">
            <div className="min-w-0 pr-3">
              <p className="text-sm font-semibold text-foreground">{CLIENT_REPORT_COPY.arcTeaserTitle}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{CLIENT_REPORT_COPY.arcTeaserBody}</p>
            </div>
            <a
              href={`/r/${arcNavToken}/roadmap`}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:opacity-90"
            >
              {CLIENT_REPORT_COPY.arcTeaserCta}
            </a>
          </div>
        )}

        {standalone && arcNavToken && (
          <div className="hidden md:flex items-center justify-between rounded-xl border border-border bg-muted/40 px-5 py-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Your ARC™ is ready</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your coach has published your personalised journey plan.
              </p>
            </div>
            <a
              href={`/r/${arcNavToken}/roadmap`}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90 shrink-0"
            >
              View ARC™
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
