import React from 'react';
import { SECTION_IDS } from './clientReportSections';
import { ClientReportCollapsibleSection } from './ClientReportCollapsibleSection';
import { renderClientReportSection, type ClientReportSectionContext } from './renderClientReportSection';
import type { SectionId } from './clientReportSections';

interface ClientReportDesktopAccordionProps {
  isSectionOpen: (id: SectionId) => boolean;
  toggleSection: (id: SectionId) => void;
  setSectionRef: (id: SectionId) => (el: HTMLElement | null) => void;
  sectionCtx: ClientReportSectionContext;
}

export function ClientReportDesktopAccordion({
  isSectionOpen,
  toggleSection,
  setSectionRef,
  sectionCtx,
}: ClientReportDesktopAccordionProps) {
  return (
    <>
      {SECTION_IDS.map((id) => (
        <ClientReportCollapsibleSection
          key={id}
          id={id}
          open={isSectionOpen(id)}
          onToggle={toggleSection}
          sectionRef={setSectionRef(id)}
        >
          {renderClientReportSection(id, sectionCtx)}
        </ClientReportCollapsibleSection>
      ))}
    </>
  );
}
