/**
 * Client AXIS report — v2 calm debrief when standalone; legacy scroll stack for coach embed.
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
import {
  buildClientOverallSummary,
  buildClientPriorityFallbacks,
} from './client/sub-components/clientPillarSummary';
import { buildClientScoreHeadline } from '@/lib/reports/clientScoreHeadline';
import { buildClientReportModel } from '@/lib/reports/buildClientReportModel';
import { ClientReportV2Layout } from './client/v2/ClientReportV2Layout';
import { ClientRoadmapSection } from './client/v2/ClientRoadmapSection';
import { CLIENT_REPORT_COPY } from '@/constants/clientReport';

export default function ClientReport({
  scores,
  goals,
  formData,
  bodyComp: _bodyComp,
  previousScores,
  previousFormData,
  standalone = true,
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

  const reportModel = useMemo(
    () =>
      buildClientReportModel({
        scores: safeScores,
        formData,
        goals,
        previousScores,
        gapAnalysisData,
        clientName,
        reportDate,
      }),
    [
      safeScores,
      formData,
      goals,
      previousScores,
      gapAnalysisData,
      clientName,
      reportDate,
    ],
  );

  const { setRef: setSectionRef } = useScrollRevealSections(SECTION_IDS, DEFAULT_OPEN);

  const sectionCtx: ClientReportSectionContext = useMemo(
    () => ({
      safeScores,
      scores,
      previousScores,
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

  const priorityStrengths = useMemo(() => {
    const fromCategories = strengths.map((s) => ({
      text: s.category ? `${s.category}: ${s.strength}` : s.strength,
    }));
    if (fromCategories.length > 0) return fromCategories;
    return buildClientPriorityFallbacks(safeScores).strengths.map((text) => ({ text }));
  }, [strengths, safeScores]);

  const priorityFocusAreas = useMemo(() => {
    const fromCategories = areasForImprovement.map((a) => ({
      text: a.category ? `${a.category}: ${a.weakness}` : a.weakness,
    }));
    if (fromCategories.length > 0) return fromCategories;
    return buildClientPriorityFallbacks(safeScores).focusAreas.map((text) => ({ text }));
  }, [areasForImprovement, safeScores]);

  const scoreHeadline = useMemo(
    () => buildClientScoreHeadline(safeScores),
    [safeScores],
  );

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
    ? 'min-h-screen bg-muted/40 text-foreground px-3 py-6 sm:px-5 sm:py-8 md:px-6 lg:px-8 overflow-x-hidden'
    : 'w-full text-foreground overflow-x-hidden';

  const contentClass = standalone
    ? 'mx-auto w-full min-w-0 max-w-5xl'
    : 'space-y-2 sm:space-y-3 md:space-y-4 lg:space-y-5 xl:space-y-6 w-full min-w-0';

  const baselineNarrative =
    standalone && showBaselineNarrative ? CLIENT_REPORT_COPY.baselineNarrative : undefined;

  return (
    <div className={containerClass}>
      <div className={`${contentClass} overflow-x-hidden`}>
        {standalone ? (
          <ClientReportV2Layout
            model={reportModel}
            orgName={reportMeta?.orgName}
            showPartialAssessmentBanner
            baselineNarrative={baselineNarrative}
            showActions={Boolean(coachActions)}
            onShare={coachActions?.onShare}
            onSendToClient={coachActions?.onSendToClient}
            onDownloadPdf={coachActions?.onDownloadPdf}
          />
        ) : (
          safeScores.categories?.length > 0 && (
            <>
              <AxisSummaryCard
                clientName={clientName}
                reportDate={reportDate}
                scores={safeScores}
                previousOverallScore={previousScores?.overall ?? null}
                narrative={overallNarrative}
                scoreHeadline={scoreHeadline}
                radarData={overallRadarData}
                previousRadarData={previousRadarData}
                priorityStrengths={priorityStrengths}
                priorityFocusAreas={priorityFocusAreas}
                onPillarSelect={scrollToPillar}
                orgName={reportMeta?.orgName}
                coachName={reportMeta?.coachName}
                assessmentNumber={reportMeta?.assessmentNumber}
                formData={formData}
                goalLabels={reportModel.goalLabels}
                goalPromise={reportModel.goalPromise}
                clientFacingRadar={false}
                showActions={Boolean(coachActions)}
                onShare={coachActions?.onShare}
                onSendToClient={coachActions?.onSendToClient}
                onDownloadPdf={coachActions?.onDownloadPdf}
              />
              <ReportPillarJumpRow activeSectionIds={activeSectionIds} />
            </>
          )
        )}

        {!standalone && (
          <>
            <ClientReportScrollLayout
              sectionCtx={sectionCtx}
              setSectionRef={setSectionRef}
              showPartialAssessmentBanner={false}
            />
            {reportModel.roadmapCards.length > 0 && (
              <div className="mt-4">
                <ClientRoadmapSection
                  cards={reportModel.roadmapCards}
                  target={reportModel.roadmapTarget}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
