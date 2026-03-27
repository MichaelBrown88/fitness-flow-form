import React from 'react';
import type { FormData } from '@/contexts/FormContext';
import type { ScoreSummary } from '@/lib/scoring';
import type { RadarData } from '@/components/reports/OverallRadarChart';
import type { GapAnalysisData } from '@/components/reports/useGapAnalysisData';
import { LifestyleFactorsBar } from '@/components/reports/LifestyleFactorsBar';
import { MovementPostureMobility } from '@/components/reports/MovementPostureMobility';
import { StartingPointSection } from '@/components/reports/client/sub-components/StartingPointSection';
import { GapAnalysisSection } from '@/components/reports/client/sub-components/GapAnalysisSection';
import { StrengthsFocusSection } from '@/components/reports/client/sub-components/StrengthsFocusSection';
import { DestinationSection } from '@/components/reports/client/sub-components/DestinationSection';
import { ActionPlanCTA } from '@/components/reports/client/ClientReportMobileChrome';
import type { SectionId } from './clientReportSections';

export interface ClientReportSectionContext {
  safeScores: ScoreSummary;
  scores: ScoreSummary;
  previousScores: ScoreSummary | null | undefined;
  archetype: { name: string; description: string };
  strengths: Array<{ category: string; strength: string; score: number }>;
  areasForImprovement: Array<{ category: string; weakness: string; score: number }>;
  overallRadarData: RadarData[];
  previousRadarData: RadarData[] | undefined;
  gapAnalysisData: GapAnalysisData[];
  previousGapAnalysisData: GapAnalysisData[] | undefined;
  goals: string[] | undefined;
  formData: FormData | undefined;
  previousFormData: FormData | undefined;
  standalone: boolean;
  clientName: string;
}

export function renderClientReportSection(id: SectionId, ctx: ClientReportSectionContext): React.ReactNode {
  switch (id) {
    case 'starting-point':
      return (
        <StartingPointSection
          scores={ctx.safeScores}
          previousOverallScore={ctx.previousScores?.overall ?? null}
          archetype={ctx.archetype}
          overallRadarData={ctx.overallRadarData}
          previousRadarData={ctx.previousRadarData}
          hideHeader
        />
      );
    case 'gap-analysis':
      return (
        <GapAnalysisSection
          gapAnalysisData={ctx.gapAnalysisData}
          previousGapAnalysisData={ctx.previousGapAnalysisData}
          goals={ctx.goals}
          formData={ctx.formData}
          hideHeader
        />
      );
    case 'strengths-focus':
      return (
        <StrengthsFocusSection strengths={ctx.strengths} areasForImprovement={ctx.areasForImprovement} />
      );
    case 'lifestyle':
      return <LifestyleFactorsBar formData={ctx.formData} previousFormData={ctx.previousFormData} />;
    case 'movement':
      return (
        <MovementPostureMobility
          formData={ctx.formData}
          scores={ctx.scores}
          standalone={ctx.standalone}
          hideHeader
          previousFormData={ctx.previousFormData}
        />
      );
    case 'destination':
      return <DestinationSection goals={ctx.goals} formData={ctx.formData} hideHeader />;
    case 'action-plan':
      return <ActionPlanCTA clientName={ctx.clientName} standalone={ctx.standalone} />;
    default:
      return null;
  }
}
