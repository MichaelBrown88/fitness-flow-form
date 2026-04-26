/**
 * Simplified Client Report — layout orchestration; section config and chrome live under ./client/.
 */

import React, { useState, useEffect, useMemo } from 'react';
import type { FormData } from '@/contexts/FormContext';
import type { ScoreSummary } from '@/lib/scoring';
import type { CoachPlan } from '@/lib/recommendations';
import { useIsMobile } from '@/hooks/use-mobile';
import { ReportHeader } from './client/sub-components/ReportHeader';
import { ClientInfoBar } from './client/sub-components/ClientInfoBar';
import { AxisSummaryCard } from './client/sub-components/AxisSummaryCard';
import { useClientReportData } from './client/useClientReportData';
import { useScrollRevealSections } from '@/hooks/useScrollRevealSections';
import { SECTION_IDS, DEFAULT_OPEN } from './client/clientReportSections';
import { type ClientReportSectionContext } from './client/renderClientReportSection';
import { ClientReportCoachPane } from './client/ClientReportCoachPane';
import { ClientReportDesktopAccordion } from './client/ClientReportDesktopAccordion';
import { ClientReportMobileLayout } from './client/ClientReportMobileLayout';

export default function ClientReport({
  scores,
  goals,
  formData,
  plan,
  bodyComp: _bodyComp,
  previousScores,
  previousFormData,
  standalone = true,
  roadmapShareToken,
  organizationId,
}: {
  scores: ScoreSummary;
  goals?: string[];
  formData?: FormData;
  plan?: CoachPlan;
  bodyComp?: { timeframeWeeks: string };
  previousScores?: ScoreSummary | null;
  previousFormData?: FormData;
  standalone?: boolean;
  /** When provided, shows a link to the client's published ARC™ */
  roadmapShareToken?: string;
  /** Passed from coach pages to enable re-analysis; omitted on public views. */
  organizationId?: string;
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

  const isMobile = useIsMobile();
  const [activeView, setActiveView] = useState<'client' | 'coach'>(standalone ? 'client' : 'client');

  useEffect(() => {
    if (standalone && activeView === 'coach') {
      setActiveView('client');
    }
  }, [standalone, activeView]);

  const { isOpen: isSectionOpen, toggle: toggleSection, setRef: setSectionRef } = useScrollRevealSections(
    SECTION_IDS,
    DEFAULT_OPEN,
  );

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
        {standalone && (
          <>
            <ReportHeader
              clientName={clientName}
              reportDate={reportDate}
              standalone={standalone}
              activeView={activeView}
              setActiveView={setActiveView}
            />
            <ClientInfoBar formData={formData} />
          </>
        )}

        {/* Kit hero: AXIS Score™ summary card sits above the deeper sections.
            Coach view gets action buttons; client view (standalone) is read-only. */}
        {activeView === 'client' && safeScores.categories?.length > 0 && (
          <AxisSummaryCard
            clientName={clientName}
            reportDate={reportDate}
            scores={safeScores}
            previousOverallScore={previousScores?.overall ?? null}
            narrative={archetype?.description}
            showActions={!standalone}
          />
        )}

        {activeView === 'coach' ? (
          <ClientReportCoachPane plan={plan} scores={scores} formData={formData} />
        ) : isMobile ? (
          <ClientReportMobileLayout sectionCtx={sectionCtx} />
        ) : (
          <ClientReportDesktopAccordion
            isSectionOpen={isSectionOpen}
            toggleSection={toggleSection}
            setSectionRef={setSectionRef}
            sectionCtx={sectionCtx}
          />
        )}

        {standalone && roadmapShareToken && activeView === 'client' && (
          <div className="hidden md:flex items-center justify-between rounded-xl border border-border bg-muted/40 px-5 py-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Your ARC™ is ready</p>
              <p className="text-xs text-muted-foreground mt-0.5">Your coach has published your personalised journey plan.</p>
            </div>
            <a
              href={`/roadmap/${roadmapShareToken}`}
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
