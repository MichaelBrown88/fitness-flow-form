import React from 'react';
import { SECTION_IDS, type SectionId } from './clientReportSections';
import { renderClientReportSection, type ClientReportSectionContext } from './renderClientReportSection';

interface ClientReportDesktopAccordionProps {
  /** Kept for prop-compat; pillar cards no longer collapse, so these are unused. */
  isSectionOpen?: (id: SectionId) => boolean;
  toggleSection?: (id: SectionId) => void;
  setSectionRef: (id: SectionId) => (el: HTMLElement | null) => void;
  sectionCtx: ClientReportSectionContext;
}

/**
 * Renders the five pillar cards stacked, in pillar order. Each card is
 * always-expanded — the prior collapsible chrome is gone now that the
 * card itself carries the petal-badge / score / summary / strengths /
 * focus / detail header.
 */
export function ClientReportDesktopAccordion({
  setSectionRef,
  sectionCtx,
}: ClientReportDesktopAccordionProps) {
  return (
    <>
      {SECTION_IDS.map((id) => {
        const node = renderClientReportSection(id, sectionCtx);
        if (!node) return null;
        return (
          <div key={id} ref={setSectionRef(id)} data-section-id={id}>
            {node}
          </div>
        );
      })}
    </>
  );
}
