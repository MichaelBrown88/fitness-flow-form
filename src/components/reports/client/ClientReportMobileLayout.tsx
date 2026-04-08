import React, { useState } from 'react';
import {
  MobileReportNav,
  MobileTabTitleBar,
  type MobileTabId,
} from './ClientReportMobileChrome';
import { renderClientReportSection, type ClientReportSectionContext } from './renderClientReportSection';

interface ClientReportMobileLayoutProps {
  sectionCtx: ClientReportSectionContext;
}

export function ClientReportMobileLayout({ sectionCtx }: ClientReportMobileLayoutProps) {
  const [mobileTab, setMobileTab] = useState<MobileTabId>('starting-point');

  return (
    <>
      <MobileTabTitleBar activeTab={mobileTab} />
      <div className="pb-16 space-y-4">
        {renderClientReportSection(mobileTab, sectionCtx)}
      </div>
      <MobileReportNav activeTab={mobileTab} onSelect={setMobileTab} />
    </>
  );
}
