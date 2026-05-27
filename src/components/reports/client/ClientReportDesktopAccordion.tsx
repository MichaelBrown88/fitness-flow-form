import React from 'react';
import type { SectionId } from './clientReportSections';
import { ClientReportScrollLayout } from './ClientReportScrollLayout';
import type { ClientReportSectionContext } from './renderClientReportSection';

interface ClientReportDesktopAccordionProps {
  setSectionRef: (id: SectionId) => (el: HTMLElement | null) => void;
  sectionCtx: ClientReportSectionContext;
}

/**
 * Desktop: all pillar sections expanded in document order.
 */
export function ClientReportDesktopAccordion({
  setSectionRef,
  sectionCtx,
}: ClientReportDesktopAccordionProps) {
  return <ClientReportScrollLayout sectionCtx={sectionCtx} setSectionRef={setSectionRef} />;
}
