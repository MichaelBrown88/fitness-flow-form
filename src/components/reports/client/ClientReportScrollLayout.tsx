import React from 'react';
import { SECTION_IDS, type SectionId } from './clientReportSections';
import {
  renderClientReportSection,
  type ClientReportSectionContext,
} from './renderClientReportSection';
import { ClientPartialAssessmentBanner } from './sub-components/ClientPartialAssessmentBanner';

interface ClientReportScrollLayoutProps {
  sectionCtx: ClientReportSectionContext;
  setSectionRef?: (id: SectionId) => (el: HTMLElement | null) => void;
  showPartialAssessmentBanner?: boolean;
}

/**
 * Single-scroll pillar stack (mobile + desktop). Replaces five-tab mobile nav.
 */
export function getActiveReportSectionIds(sectionCtx: ClientReportSectionContext): SectionId[] {
  return SECTION_IDS.filter((id) => renderClientReportSection(id, sectionCtx) != null);
}

export function ClientReportScrollLayout({
  sectionCtx,
  setSectionRef,
  showPartialAssessmentBanner = false,
}: ClientReportScrollLayoutProps) {
  const activeIds = getActiveReportSectionIds(sectionCtx);

  return (
    <div className="space-y-4 pb-4">
      {showPartialAssessmentBanner ? (
        <ClientPartialAssessmentBanner activeSectionIds={activeIds} />
      ) : null}
      {SECTION_IDS.map((id) => {
        const node = renderClientReportSection(id, sectionCtx);
        if (!node) return null;
        return (
          <div
            key={id}
            ref={setSectionRef?.(id)}
            data-section-id={id}
            className="scroll-mt-24"
          >
            {node}
          </div>
        );
      })}
    </div>
  );
}
