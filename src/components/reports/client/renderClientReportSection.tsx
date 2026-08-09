import React from 'react';
import { Scale, Dumbbell, Heart, Zap, Sun } from 'lucide-react';
import type { FormData } from '@/contexts/FormContext';
import type { ScoreCategory, ScoreSummary } from '@/lib/scoring';
import type { RadarData } from '@/lib/reports/radarData';
import type { GapAnalysisData } from '@/components/reports/useGapAnalysisData';
import { getPillarLabel } from '@/constants/pillars';
import { PillarCard } from './sub-components/PillarCard';
import { PillarGapRows } from './sub-components/PillarGapRows';
import { LifestyleTargetsRows } from './sub-components/LifestyleTargetsRows';
import { buildClientPillarSummary } from './sub-components/clientPillarSummary';
import { aggregatePostureFindings } from '@/lib/posture/aggregatePostureInsights';
import { PostureReportBlock } from './sub-components/PostureReportBlock';
import { CLIENT_REPORT_COPY } from '@/constants/clientReport';
import { parseClientGoals, resolvePillarRole, type PillarId } from '@/lib/goals/goalContext';
import type { SectionId } from './clientReportSections';

export interface ClientReportSectionContext {
  safeScores: ScoreSummary;
  scores: ScoreSummary;
  previousScores: ScoreSummary | null | undefined;
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
  organizationId?: string;
}

const ICON_CLASS = 'h-5 w-5';
const MAX_LIST = 3;

function findCategory(scores: ScoreSummary, id: ScoreCategory['id']): ScoreCategory | undefined {
  return scores.categories?.find((c) => c.id === id);
}

function previousScoreFor(prev: ScoreSummary | null | undefined, id: ScoreCategory['id']): number | null {
  return prev?.categories?.find((c) => c.id === id)?.score ?? null;
}

function capList(items: string[], max = MAX_LIST): string[] {
  return items.slice(0, max);
}

function collectPostureImages(formData: FormData): Record<string, string> {
  const postureImages: Record<string, string> = {};
  if (formData.postureImages && typeof formData.postureImages === 'object') {
    Object.entries(formData.postureImages).forEach(([key, value]) => {
      if (value && typeof value === 'string' && (value.startsWith('data:') || value.startsWith('http'))) {
        postureImages[key] = value;
      }
    });
  }
  if (formData.postureImagesStorage && typeof formData.postureImagesStorage === 'object') {
    Object.entries(formData.postureImagesStorage).forEach(([key, value]) => {
      if (
        value &&
        typeof value === 'string' &&
        (value.startsWith('http') || value.startsWith('gs://')) &&
        !postureImages[key]
      ) {
        postureImages[key] = value;
      }
    });
  }
  return postureImages;
}

export function renderClientReportSection(id: SectionId, ctx: ClientReportSectionContext): React.ReactNode {
  const { scores, previousScores, gapAnalysisData, formData } = ctx;

  // Primary-goal pillar shows its target numbers expanded so the debrief needs no extra taps.
  const goalCtx = parseClientGoals(formData);
  const isPrimaryPillar = (pillar: PillarId) => resolvePillarRole(pillar, goalCtx) === 'primary';

  switch (id) {
    case 'body-comp': {
      const cat = findCategory(scores, 'bodyComp');
      if (!cat) return null;
      const prev = previousScoreFor(previousScores, 'bodyComp');
      return (
        <PillarCard
          sectionId={id}
          pillar="bodyComp"
          icon={<Scale className={ICON_CLASS} />}
          title={getPillarLabel('bodyComp', 'full')}
          score={cat.score}
          previousScore={prev}
          summary={buildClientPillarSummary(cat, prev)}
          strengths={capList(cat.strengths ?? [])}
          focusAreas={capList(cat.weaknesses ?? [])}
          targets={<PillarGapRows pillar="body-comp" gap={gapAnalysisData[0]} />}
          defaultTargetsOpen={isPrimaryPillar('bodyComp')}
        />
      );
    }
    case 'strength': {
      const cat = findCategory(scores, 'strength');
      if (!cat) return null;
      const prev = previousScoreFor(previousScores, 'strength');
      return (
        <PillarCard
          sectionId={id}
          pillar="strength"
          icon={<Dumbbell className={ICON_CLASS} />}
          title={getPillarLabel('strength', 'full')}
          score={cat.score}
          previousScore={prev}
          summary={buildClientPillarSummary(cat, prev)}
          strengths={capList(cat.strengths ?? [])}
          focusAreas={capList(cat.weaknesses ?? [])}
          targets={<PillarGapRows pillar="strength" gap={gapAnalysisData[1]} />}
          defaultTargetsOpen={isPrimaryPillar('strength')}
        />
      );
    }
    case 'cardio': {
      const cat = findCategory(scores, 'cardio');
      if (!cat) return null;
      const prev = previousScoreFor(previousScores, 'cardio');
      return (
        <PillarCard
          sectionId={id}
          pillar="cardio"
          icon={<Heart className={ICON_CLASS} />}
          title={getPillarLabel('cardio', 'full')}
          score={cat.score}
          previousScore={prev}
          summary={buildClientPillarSummary(cat, prev)}
          strengths={capList(cat.strengths ?? [])}
          focusAreas={capList(cat.weaknesses ?? [])}
          targets={<PillarGapRows pillar="cardio" gap={gapAnalysisData[2]} />}
          defaultTargetsOpen={isPrimaryPillar('cardio')}
        />
      );
    }
    case 'movement-quality': {
      const cat = findCategory(scores, 'movementQuality');
      if (!cat || !formData) return null;
      const prev = previousScoreFor(previousScores, 'movementQuality');

      const postureFindings = formData.postureAiResults
        ? aggregatePostureFindings(
            formData.postureAiResults as Parameters<typeof aggregatePostureFindings>[0],
          )
        : [];
      const postureImages = collectPostureImages(formData);
      const hasPosture =
        postureFindings.length > 0 &&
        formData.postureAiResults &&
        Object.keys(postureImages).length > 0;

      return (
        <PillarCard
          sectionId={id}
          pillar="movementQuality"
          icon={<Zap className={ICON_CLASS} />}
          title={getPillarLabel('movementQuality', 'full')}
          score={cat.score}
          previousScore={prev}
          summary={buildClientPillarSummary(cat, prev)}
          strengths={capList(cat.strengths ?? [])}
          focusAreas={capList(cat.weaknesses ?? [])}
          graphic={
            hasPosture ? (
              <PostureReportBlock
                findings={postureFindings}
                postureResults={formData.postureAiResults ?? {}}
                postureImages={postureImages}
              />
            ) : undefined
          }
          graphicSectionTitle={CLIENT_REPORT_COPY.postureSnapshotHeading}
        />
      );
    }
    case 'lifestyle': {
      const cat = findCategory(scores, 'lifestyle');
      if (!cat) return null;
      const prev = previousScoreFor(previousScores, 'lifestyle');
      return (
        <PillarCard
          sectionId={id}
          pillar="lifestyle"
          icon={<Sun className={ICON_CLASS} />}
          title={getPillarLabel('lifestyle', 'full')}
          score={cat.score}
          previousScore={prev}
          summary={buildClientPillarSummary(cat, prev)}
          strengths={capList(cat.strengths ?? [], 2)}
          focusAreas={capList(cat.weaknesses ?? [], 2)}
          targets={<LifestyleTargetsRows formData={formData} />}
          defaultTargetsOpen={isPrimaryPillar('lifestyle')}
        />
      );
    }
    default:
      return null;
  }
}
