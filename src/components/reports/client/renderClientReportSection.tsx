import React from 'react';
import { Scale, Dumbbell, Heart, Zap, Sun } from 'lucide-react';
import type { FormData } from '@/contexts/FormContext';
import type { ScoreCategory, ScoreSummary } from '@/lib/scoring';
import type { RadarData } from '@/components/reports/OverallRadarChart';
import type { GapAnalysisData } from '@/components/reports/useGapAnalysisData';
import { MovementPostureMobility } from '@/components/reports/MovementPostureMobility';
import { PillarCard } from './sub-components/PillarCard';
import { PillarGapRows } from './sub-components/PillarGapRows';
import { LifestyleFactorsCard } from './sub-components/LifestyleFactorsCard';
import { buildPillarSummary } from './sub-components/coachSummaryText';
import type { SectionId } from './clientReportSections';

export interface ClientReportSectionContext {
  safeScores: ScoreSummary;
  scores: ScoreSummary;
  previousScores: ScoreSummary | null | undefined;
  archetype: { name: string; description: string };
  /** @deprecated Global strengths list — superseded by per-pillar strengths inside PillarCard. */
  strengths: Array<{ category: string; strength: string; score: number }>;
  /** @deprecated Global focus list — superseded by per-pillar weaknesses inside PillarCard. */
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
  /** Only set on coach pages — omitted on public/standalone views. */
  organizationId?: string;
}

const ICON_CLASS = 'h-5 w-5';

function findCategory(scores: ScoreSummary, id: ScoreCategory['id']): ScoreCategory | undefined {
  return scores.categories?.find((c) => c.id === id);
}

function previousScoreFor(prev: ScoreSummary | null | undefined, id: ScoreCategory['id']): number | null {
  return prev?.categories?.find((c) => c.id === id)?.score ?? null;
}

export function renderClientReportSection(id: SectionId, ctx: ClientReportSectionContext): React.ReactNode {
  const { scores, previousScores, gapAnalysisData, formData, standalone, organizationId } = ctx;

  switch (id) {
    case 'body-comp': {
      const cat = findCategory(scores, 'bodyComp');
      if (!cat) return null;
      const prev = previousScoreFor(previousScores, 'bodyComp');
      return (
        <PillarCard
          pillar="bodyComp"
          icon={<Scale className={ICON_CLASS} />}
          title="Body Composition"
          score={cat.score}
          previousScore={prev}
          summary={buildPillarSummary(cat, prev)}
          strengths={cat.strengths ?? []}
          focusAreas={cat.weaknesses ?? []}
          detailEyebrow="Gap analysis"
        >
          <PillarGapRows pillar="body-comp" gap={gapAnalysisData[0]} />
        </PillarCard>
      );
    }
    case 'strength': {
      const cat = findCategory(scores, 'strength');
      if (!cat) return null;
      const prev = previousScoreFor(previousScores, 'strength');
      return (
        <PillarCard
          pillar="strength"
          icon={<Dumbbell className={ICON_CLASS} />}
          title="Functional Strength"
          score={cat.score}
          previousScore={prev}
          summary={buildPillarSummary(cat, prev)}
          strengths={cat.strengths ?? []}
          focusAreas={cat.weaknesses ?? []}
          detailEyebrow="Gap analysis"
        >
          <PillarGapRows pillar="strength" gap={gapAnalysisData[1]} />
        </PillarCard>
      );
    }
    case 'cardio': {
      const cat = findCategory(scores, 'cardio');
      if (!cat) return null;
      const prev = previousScoreFor(previousScores, 'cardio');
      return (
        <PillarCard
          pillar="cardio"
          icon={<Heart className={ICON_CLASS} />}
          title="Metabolic Fitness"
          score={cat.score}
          previousScore={prev}
          summary={buildPillarSummary(cat, prev)}
          strengths={cat.strengths ?? []}
          focusAreas={cat.weaknesses ?? []}
          detailEyebrow="Gap analysis"
        >
          <PillarGapRows pillar="cardio" gap={gapAnalysisData[2]} />
        </PillarCard>
      );
    }
    case 'movement-quality': {
      const cat = findCategory(scores, 'movementQuality');
      if (!cat) return null;
      const prev = previousScoreFor(previousScores, 'movementQuality');
      return (
        <PillarCard
          pillar="movementQuality"
          icon={<Zap className={ICON_CLASS} />}
          title="Movement Quality"
          score={cat.score}
          previousScore={prev}
          summary={buildPillarSummary(cat, prev)}
          strengths={cat.strengths ?? []}
          focusAreas={cat.weaknesses ?? []}
          detailEyebrow="Posture, mobility & movement screens"
        >
          <MovementPostureMobility
            formData={formData}
            scores={scores}
            standalone={standalone}
            hideHeader
            previousFormData={ctx.previousFormData}
            organizationId={organizationId}
          />
        </PillarCard>
      );
    }
    case 'lifestyle': {
      const cat = findCategory(scores, 'lifestyle');
      if (!cat) return null;
      const prev = previousScoreFor(previousScores, 'lifestyle');
      return (
        <PillarCard
          pillar="lifestyle"
          icon={<Sun className={ICON_CLASS} />}
          title="Lifestyle Factors"
          score={cat.score}
          previousScore={prev}
          summary={buildPillarSummary(cat, prev)}
          strengths={cat.strengths ?? []}
          focusAreas={cat.weaknesses ?? []}
          detailEyebrow="Lifestyle factors"
        >
          <LifestyleFactorsCard formData={formData} />
        </PillarCard>
      );
    }
    case 'starting-point':
      // Removed — the global Strengths & Focus section is gone. Each
      // pillar surfaces its own strengths/focus inside PillarCard.
      return null;
    default:
      return null;
  }
}
