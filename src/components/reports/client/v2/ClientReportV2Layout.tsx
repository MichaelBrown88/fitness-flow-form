import React from 'react';
import type { ClientReportModel } from '@/lib/reports/buildClientReportModel';
import { CLIENT_REPORT_COPY } from '@/constants/clientReport';
import { ClientReportHero } from './ClientReportHero';
import { ClientRoadmapSection } from './ClientRoadmapSection';
import { ClientReportPlan } from './ClientReportPlan';
import { PostureFilmstrip } from './PostureFilmstrip';
import { ClientPillarBrief } from './ClientPillarBrief';
import { ClientPartialAssessmentBanner } from '../sub-components/ClientPartialAssessmentBanner';
import type { SectionId } from '../clientReportSections';
import { cn } from '@/lib/utils';

interface ClientReportV2LayoutProps {
  model: ClientReportModel;
  orgName?: string;
  showPartialAssessmentBanner?: boolean;
  baselineNarrative?: string;
  showActions?: boolean;
  onDownloadPdf?: () => void;
  onShare?: () => void;
  onSendToClient?: () => void;
}

const DOCUMENT_SHEET =
  'overflow-hidden rounded-sm border border-border bg-card shadow-[0_1px_3px_hsl(var(--foreground)/0.06)]';

const SECTION_MUTED = 'border-t border-border bg-muted/20 px-6 py-7 sm:px-10 sm:py-8';
const SECTION_DEFAULT = 'border-t border-border bg-card px-6 py-7 sm:px-10 sm:py-8';

export function ClientReportV2Layout({
  model,
  orgName,
  showPartialAssessmentBanner = false,
  baselineNarrative,
  showActions,
  onDownloadPdf,
  onShare,
  onSendToClient,
}: ClientReportV2LayoutProps) {
  const activeSectionIds = model.pillars.map((p) => p.sectionId) as SectionId[];

  return (
    <div className={DOCUMENT_SHEET}>
      <header className="border-b border-border bg-muted/35 px-6 py-5 sm:px-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {CLIENT_REPORT_COPY.v2DocumentTitle}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {CLIENT_REPORT_COPY.v2DocumentSubtitle}
            </p>
          </div>
          {orgName ? (
            <p className="text-right text-[11px] font-medium text-foreground/80">{orgName}</p>
          ) : null}
        </div>
      </header>

      <div className={SECTION_DEFAULT}>
        <ClientReportHero
          clientName={model.clientName}
          reportDate={model.reportDate}
          overall={model.overall}
          previousOverall={model.previousOverall}
          headline={model.headline}
          goalPromise={model.goalPromise}
          welcome={model.welcome}
          focusFirst={model.focusFirst}
          goalLabels={model.goalLabels}
          baselineNarrative={baselineNarrative}
          showActions={showActions}
          onDownloadPdf={onDownloadPdf}
          onShare={onShare}
          onSendToClient={onSendToClient}
          embedded
        />
      </div>

      <div className={SECTION_MUTED}>
        <ClientReportPlan steps={model.planSteps} selfGuidedHabits={model.selfGuidedHabits} embedded />
      </div>

      {model.posture ? (
        <div className={SECTION_DEFAULT}>
          <PostureFilmstrip posture={model.posture} embedded />
        </div>
      ) : null}

      <section className={SECTION_MUTED}>
        {showPartialAssessmentBanner ? (
          <div className="mb-6 rounded-sm border border-border/80 bg-card/80 px-4 py-3">
            <ClientPartialAssessmentBanner activeSectionIds={activeSectionIds} />
          </div>
        ) : null}
        <h2 className="border-b border-border pb-3 text-base font-semibold tracking-[-0.02em] text-foreground">
          {CLIENT_REPORT_COPY.v2PillarsHeading}
        </h2>
        <div className="mt-1 divide-y divide-border rounded-sm border border-border/80 bg-card">
          {model.pillars.map((pillar, index) => (
            <div
              key={pillar.sectionId}
              className={cn(
                'px-4 sm:px-6',
                index % 2 === 1 && 'bg-muted/12',
              )}
            >
              <ClientPillarBrief pillar={pillar} formData={model.formData} />
            </div>
          ))}
        </div>
      </section>

      {model.roadmapCards.length > 0 ? (
        <div className={cn(SECTION_DEFAULT, 'pb-10')}>
          <ClientRoadmapSection cards={model.roadmapCards} target={model.roadmapTarget} embedded />
        </div>
      ) : null}

      <footer className="border-t border-border bg-muted/35 px-6 py-4 text-center sm:px-10">
        <p className="text-[10px] text-muted-foreground">
          {CLIENT_REPORT_COPY.v2DocumentTitle} · For coaching purposes only
        </p>
      </footer>
    </div>
  );
}
