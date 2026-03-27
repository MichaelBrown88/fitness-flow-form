import React, { useState } from 'react';
import type { FormData } from '@/contexts/FormContext';
import type { ScoreSummary } from '@/lib/scoring';
import { LifestyleFactorsBar } from '@/components/reports/LifestyleFactorsBar';
import { MovementPostureMobility } from '@/components/reports/MovementPostureMobility';
import { StrengthsFocusSection } from '@/components/reports/client/sub-components/StrengthsFocusSection';
import { DestinationSection } from '@/components/reports/client/sub-components/DestinationSection';
import {
  MobileReportNav,
  MobileTabTitleBar,
  ActionPlanCTA,
  type MobileTabId,
} from './ClientReportMobileChrome';
import { renderClientReportSection, type ClientReportSectionContext } from './renderClientReportSection';

interface ClientReportMobileLayoutProps {
  scores: ScoreSummary;
  formData: FormData | undefined;
  previousFormData: FormData | undefined;
  standalone: boolean;
  strengths: ClientReportSectionContext['strengths'];
  areasForImprovement: ClientReportSectionContext['areasForImprovement'];
  goals: string[] | undefined;
  clientName: string;
  sectionCtx: ClientReportSectionContext;
}

export function ClientReportMobileLayout({
  scores,
  formData,
  previousFormData,
  standalone,
  strengths,
  areasForImprovement,
  goals,
  clientName,
  sectionCtx,
}: ClientReportMobileLayoutProps) {
  const [mobileTab, setMobileTab] = useState<MobileTabId>('overview');

  return (
    <>
      <MobileTabTitleBar activeTab={mobileTab} />
      <div className="pb-16 space-y-4">
        {mobileTab === 'overview' && (
          <>
            {renderClientReportSection('starting-point', sectionCtx)}
            <LifestyleFactorsBar formData={formData} previousFormData={previousFormData} />
          </>
        )}
        {mobileTab === 'analysis' && (
          <>
            {renderClientReportSection('gap-analysis', sectionCtx)}
            <StrengthsFocusSection strengths={strengths} areasForImprovement={areasForImprovement} />
          </>
        )}
        {mobileTab === 'movement' && (
          <MovementPostureMobility
            formData={formData}
            scores={scores}
            standalone={standalone}
            hideHeader
            previousFormData={previousFormData}
          />
        )}
        {mobileTab === 'plan' && (
          <>
            <DestinationSection goals={goals} formData={formData} hideHeader />
            <ActionPlanCTA clientName={clientName} standalone={standalone} />
          </>
        )}
      </div>
      <MobileReportNav activeTab={mobileTab} onSelect={setMobileTab} />
    </>
  );
}
