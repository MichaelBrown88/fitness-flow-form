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
  /** Only set on coach pages — omitted on public/standalone views to prevent useAuth coupling. */
  organizationId?: string;
}

export function renderClientReportSection(id: SectionId, ctx: ClientReportSectionContext): React.ReactNode {
  switch (id) {
    case 'starting-point':
      return (
        <div className="space-y-4 sm:space-y-5 md:space-y-6">
          <StartingPointSection
            scores={ctx.safeScores}
            previousOverallScore={ctx.previousScores?.overall ?? null}
            archetype={ctx.archetype}
            overallRadarData={ctx.overallRadarData}
            previousRadarData={ctx.previousRadarData}
            hideHeader
          />
          <StrengthsFocusSection strengths={ctx.strengths} areasForImprovement={ctx.areasForImprovement} />
        </div>
      );
    case 'body-comp':
      return (
        <GapAnalysisSection
          gapAnalysisData={ctx.gapAnalysisData}
          previousGapAnalysisData={ctx.previousGapAnalysisData}
          formData={ctx.formData}
          singlePillar="body-comp"
          hideHeader
        />
      );
    case 'strength':
      return (
        <GapAnalysisSection
          gapAnalysisData={ctx.gapAnalysisData}
          previousGapAnalysisData={ctx.previousGapAnalysisData}
          formData={ctx.formData}
          singlePillar="strength"
          hideHeader
        />
      );
    case 'cardio':
      return (
        <GapAnalysisSection
          gapAnalysisData={ctx.gapAnalysisData}
          previousGapAnalysisData={ctx.previousGapAnalysisData}
          formData={ctx.formData}
          singlePillar="cardio"
          hideHeader
        />
      );
    case 'movement-quality':
      return (
        <MovementPostureMobility
          formData={ctx.formData}
          scores={ctx.scores}
          standalone={ctx.standalone}
          hideHeader
          previousFormData={ctx.previousFormData}
          organizationId={ctx.organizationId}
        />
      );
    case 'lifestyle':
      return <LifestyleFactorsBar formData={ctx.formData} previousFormData={ctx.previousFormData} />;
    default:
      return null;
  }
}
