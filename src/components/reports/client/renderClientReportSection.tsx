import React from 'react';
import { Scale, Dumbbell, Heart, Zap, Sun } from 'lucide-react';
import type { FormData } from '@/contexts/FormContext';
import type { ScoreCategory, ScoreSummary } from '@/lib/scoring';
import type { RadarData } from '@/lib/reports/radarData';
import type { GapAnalysisData } from '@/components/reports/useGapAnalysisData';
import { getPillarLabel } from '@/constants/pillars';
import { MovementPostureMobility } from '@/components/reports/MovementPostureMobility';
import { MuscleMap } from '@/components/reports/MuscleMap';
import { PillarCard } from './sub-components/PillarCard';
import { PillarGapRows } from './sub-components/PillarGapRows';
import { LifestyleFactorsCard } from './sub-components/LifestyleFactorsCard';
import { LifestyleTargetsRows } from './sub-components/LifestyleTargetsRows';
import { buildClientPillarSummary } from './sub-components/clientPillarSummary';
import { deriveStrengthMuscleSets } from '@/lib/scoring/strengthMuscleMap';
import { MetabolicHealthGraphic } from '@/components/reports/MetabolicHealthGraphic';
import { BodyCompositionGraphic } from '@/components/reports/BodyCompositionGraphic';
import { aggregatePostureFindings } from '@/lib/posture/aggregatePostureInsights';
import { MovementPatternsBlock } from './sub-components/MovementPatternsBlock';
import { PostureReportBlock } from './sub-components/PostureReportBlock';
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
  const { scores, previousScores, gapAnalysisData, formData, standalone, organizationId } = ctx;

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
          graphic={
            <BodyCompositionGraphic
              weightKg={formData?.inbodyWeightKg}
              bodyFatPct={formData?.inbodyBodyFatPct}
              bodyFatMassKg={formData?.bodyFatMassKg}
              skeletalMuscleMassKg={formData?.skeletalMuscleMassKg}
              visceralFatLevel={formData?.visceralFatLevel}
              bmi={formData?.inbodyBmi}
            />
          }
          targets={<PillarGapRows pillar="body-comp" gap={gapAnalysisData[0]} />}
        />
      );
    }
    case 'strength': {
      const cat = findCategory(scores, 'strength');
      if (!cat) return null;
      const prev = previousScoreFor(previousScores, 'strength');
      const { strong, weak } = deriveStrengthMuscleSets(cat.strengths, cat.weaknesses);
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
          graphic={
            strong.length > 0 || weak.length > 0 ? (
              <MuscleMap strong={strong} weak={weak} title="Muscle groups in focus" />
            ) : null
          }
          targets={<PillarGapRows pillar="strength" gap={gapAnalysisData[1]} />}
        />
      );
    }
    case 'cardio': {
      const cat = findCategory(scores, 'cardio');
      if (!cat) return null;
      const prev = previousScoreFor(previousScores, 'cardio');
      const metrics: Array<{ label: string; value: string }> = [];
      const restingHr = formData?.cardioRestingHr;
      const peakHr = formData?.cardioPeakHr;
      const vo2 = formData?.cardioVo2MaxEstimate;
      const recoveryHr = formData?.cardioPost1MinHr;
      if (restingHr) metrics.push({ label: 'Resting HR', value: `${restingHr} bpm` });
      if (vo2) metrics.push({ label: 'VO₂ max est.', value: `${vo2} ml/kg/min` });
      if (peakHr) metrics.push({ label: 'Peak HR', value: `${peakHr} bpm` });
      if (recoveryHr) metrics.push({ label: '1-min recovery', value: `${recoveryHr} bpm` });
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
          graphic={<MetabolicHealthGraphic score={cat.score} metrics={metrics} />}
          targets={<PillarGapRows pillar="cardio" gap={gapAnalysisData[2]} />}
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
            <div className="space-y-8">
              <MovementPatternsBlock>
                <MovementPostureMobility
                  formData={formData}
                  scores={scores}
                  standalone={standalone}
                  hideHeader
                  previousFormData={ctx.previousFormData}
                  organizationId={standalone ? undefined : organizationId}
                  mode="movement"
                />
              </MovementPatternsBlock>
              {hasPosture ? (
                <PostureReportBlock
                  findings={postureFindings}
                  postureResults={formData.postureAiResults ?? {}}
                  postureImages={postureImages}
                />
              ) : null}
            </div>
          }
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
          graphic={<LifestyleFactorsCard formData={formData} />}
          targets={<LifestyleTargetsRows formData={formData} />}
        />
      );
    }
    default:
      return null;
  }
}
