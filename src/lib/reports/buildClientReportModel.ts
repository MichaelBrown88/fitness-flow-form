import type { ReactNode } from 'react';
import type { FormData } from '@/contexts/FormContext';
import type { ScoreCategory, ScoreSummary } from '@/lib/scoring';
import type { GapAnalysisData } from '@/components/reports/useGapAnalysisData';
import type { PostureFindingRecord, PostureFindingViewId } from '@/lib/types/postureFindings';
import type { PostureAnalysisResult } from '@/lib/ai/postureAnalysis';
import { ASSESSMENT_OPTIONS } from '@/constants/assessment';
import type { SectionId } from '@/components/reports/client/clientReportSections';
import { SECTION_IDS, SECTION_META, scoringIdForSection } from '@/components/reports/client/clientReportSections';
import {
  buildClientPillarSummary,
  buildClientPriorityFallbacks,
} from '@/components/reports/client/sub-components/clientPillarSummary';
import { buildClientScoreHeadline } from '@/lib/reports/clientScoreHeadline';
import { buildClientProgressionRows } from '@/lib/reports/clientProgressionRows';
import type { ClientReportProgressionRow } from '@/lib/reports/clientProgressionRows';
import { buildClientGoalPhases } from '@/lib/reports/clientGoalPhases';
import { buildClientProfile } from '@/lib/physiology/profile';
import { weeklyWeightLossKg } from '@/lib/physiology/rates';
import { safeParse } from '@/lib/utils/numbers';
import { mergeEffectiveGoalLevels } from '@/lib/goals/systemGoalTargets';
import {
  GOAL_BUILD_MUSCLE,
  GOAL_BUILD_STRENGTH,
  GOAL_IMPROVE_FITNESS,
  GOAL_WEIGHT_LOSS,
  parseClientGoals,
  resolvePillarRole,
  type ClientGoalContext,
  type PillarId,
  type PillarRole,
} from '@/lib/goals/goalContext';
import {
  aggregatePostureFindings,
  buildFocusBullets,
  sortFindingsForDisplay,
} from '@/lib/posture/aggregatePostureInsights';
import {
  buildLifestyleNarrative,
  buildMovementNarrative,
  type ClientPillarNarrativeItem,
} from '@/lib/reports/clientPillarNarratives';
import { sanitizeClientReportCopy } from '@/lib/reports/sanitizeClientReportCopy';

export type ClientPillarContentMode = 'progression' | 'narrative';

export interface ClientReportMetricChip {
  label: string;
  value: string;
}

export interface ClientReportPillarModel {
  sectionId: SectionId;
  scoringId: ScoreCategory['id'];
  title: string;
  shortTitle: string;
  icon: ReactNode;
  score: number;
  previousScore: number | null;
  summary: string;
  goingWell: string[];
  focusNext: string[];
  metrics: ClientReportMetricChip[];
  progressionRows: ClientReportProgressionRow[];
  contentMode: ClientPillarContentMode;
  narrativeIntro: string | null;
  narrativeItems: ClientPillarNarrativeItem[];
  goalTieIn: string | null;
  pillarRole: PillarRole;
}

export interface ClientReportPlanStep {
  title: string;
  body: string;
}

export interface ClientReportPostureModel {
  findings: PostureFindingRecord[];
  postureResults: Partial<Record<PostureFindingViewId, PostureAnalysisResult>>;
  images: Record<string, string>;
  headline: string;
  summaryLines: string[];
  focusBullets: string[];
}

export interface ClientReportModel {
  clientName: string;
  reportDate: string;
  overall: number;
  previousOverall: number | null;
  headline: string | null;
  /** Goal-led promise — primary message for the client. */
  goalPromise: string;
  welcome: string;
  goingWell: string[];
  focusNext: string[];
  primaryGoalLabel: string | null;
  primaryGoalId: string | null;
  planSteps: ClientReportPlanStep[];
  pillars: ClientReportPillarModel[];
  posture: ClientReportPostureModel | null;
}

export interface BuildClientReportModelInput {
  scores: ScoreSummary;
  formData?: FormData;
  goals?: string[];
  previousScores?: ScoreSummary | null;
  gapAnalysisData: GapAnalysisData[];
  clientName: string;
  reportDate: string;
}

export function buildClientReportModel(input: BuildClientReportModelInput): ClientReportModel {
  const { scores, formData, goals, previousScores, gapAnalysisData, clientName, reportDate } =
    input;

  const overall = Math.round(scores.overall ?? 0);
  const previousOverall = previousScores?.overall ?? null;

  const goalCtx = parseClientGoals(formData, goals);
  const goalIds = goalCtx.allGoals;
  const primaryGoalLabel =
    ASSESSMENT_OPTIONS.clientGoals.find((g) => g.value === goalIds[0])?.label ?? null;
  const primaryGoalId = goalIds[0] ?? null;

  const goalPromise = sanitizeClientReportCopy(
    buildGoalPromise(formData, scores, goals, goalCtx),
  );
  const headlineRaw = buildGoalAlignedSubheadline(scores, goalCtx);
  const headline = headlineRaw ? sanitizeClientReportCopy(headlineRaw) : null;
  const welcome = buildWelcomeParagraph(scores, previousOverall, goalPromise);

  const strengths = buildHeroList(scores, 'strength', goalCtx).map(sanitizeClientReportCopy);
  const focusNext = buildHeroList(scores, 'focus', goalCtx).map(sanitizeClientReportCopy);

  const planSteps = buildClientGoalPhases(formData, scores, goals);

  const pillars = sortPillarsByGoalRole(
    SECTION_IDS.map((sectionId) =>
      buildPillarModel(sectionId, scores, previousScores, gapAnalysisData, formData, goalCtx, goals),
    ).filter((p): p is ClientReportPillarModel => p != null),
    goalCtx,
  );

  const posture = buildPostureModel(formData);

  return {
    clientName,
    reportDate,
    overall,
    previousOverall,
    headline,
    goalPromise,
    welcome,
    goingWell: strengths,
    focusNext,
    primaryGoalLabel,
    primaryGoalId,
    planSteps,
    pillars,
    posture,
  };
}

function buildGoalPromise(
  formData: FormData | undefined,
  scores: ScoreSummary,
  goals: string[] | undefined,
  goalCtx: ClientGoalContext,
): string {
  const label =
    ASSESSMENT_OPTIONS.clientGoals.find((g) => g.value === goalCtx.primaryGoal)?.label ??
    'your goals';

  if (formData && goalCtx.primaryGoal === GOAL_WEIGHT_LOSS) {
    const profile = buildClientProfile(formData, scores);
    const { levels } = mergeEffectiveGoalLevels(formData, goals, scores);
    const levelWL = levels.goalLevelWeightLoss;
    let targetKg = 5;
    if (levelWL.includes('kg')) {
      targetKg = safeParse(levelWL.replace('kg', '')) || 5;
    } else {
      targetKg = (profile.bodyWeightKg * (safeParse(levelWL) || 10)) / 100;
    }
    const rate = weeklyWeightLossKg(profile, targetKg);
    const kg4 = (rate.rate * 16).toFixed(1);
    const kg12 = Math.min(rate.rate * 52, profile.bodyWeightKg * 0.28).toFixed(1);
    return `Your plan is built for ${label.toLowerCase()} at about ${rate.rate.toFixed(2)} kg per week — roughly ${kg4} kg in four months and up to ~${kg12} kg in a year while we protect muscle and strength.`;
  }

  if (formData && goalCtx.primaryGoal === GOAL_BUILD_MUSCLE) {
    return `Your plan prioritises ${label.toLowerCase()} — progressive training and nutrition so lean mass and strength move up steadily over the next 4–12 months.`;
  }

  if (formData && goalCtx.primaryGoal === GOAL_IMPROVE_FITNESS) {
    return `Your plan prioritises ${label.toLowerCase()} — we\'ll build your aerobic base, then layer intensity so heart, lungs, and recovery scores climb through the year.`;
  }

  if (formData && goalCtx.primaryGoal === GOAL_BUILD_STRENGTH) {
    return `Your plan prioritises ${label.toLowerCase()} — technique first, then load and volume so the numbers in your strength pillar keep climbing.`;
  }

  return `We\'ll build a clear plan around ${label.toLowerCase()} — steady, coached progress you can see in the tables below.`;
}

function buildGoalAlignedSubheadline(
  scores: ScoreSummary,
  goalCtx: ClientGoalContext,
): string | null {
  const assessed = (scores.categories ?? []).filter((c) => c.assessed);
  const strength = assessed.find((c) => c.id === 'strength');
  const bodyComp = assessed.find((c) => c.id === 'bodyComp');
  const movement = assessed.find((c) => c.id === 'movementQuality');

  if (goalCtx.primaryGoal === GOAL_WEIGHT_LOSS) {
    if (strength && strength.score >= 80) {
      return 'You have a strong training base — we\'ll use it to hold muscle while body composition does the heavy lifting.';
    }
    if (bodyComp && bodyComp.score < 60) {
      return 'Body composition is the main lever; everything else supports sustainable fat loss.';
    }
    return 'Nutrition, steps, and strength training work together — the progression table shows the pace we\'re aiming for.';
  }

  if (goalCtx.primaryGoal === GOAL_BUILD_MUSCLE && movement && movement.score >= 85) {
    return 'Movement quality is already solid — we can push volume and load with confidence.';
  }

  return buildClientScoreHeadline(scores);
}

function buildWelcomeParagraph(
  scores: ScoreSummary,
  _previousOverall: number | null,
  _goalPromise: string,
): string {
  const assessed = (scores.categories ?? []).filter((c) => c.assessed).length;
  return `Today\'s assessment gives us a baseline across ${assessed} areas. The numbers below show where you are now — your coach will use them to keep you on track toward your goal.`;
}

const PILLAR_ROLE_ORDER: Record<PillarRole, number> = {
  primary: 0,
  secondary: 1,
  supporting: 2,
  'off-path': 3,
};

function sortPillarsByGoalRole(
  pillars: ClientReportPillarModel[],
  goalCtx: ClientGoalContext,
): ClientReportPillarModel[] {
  return [...pillars].sort(
    (a, b) => PILLAR_ROLE_ORDER[a.pillarRole] - PILLAR_ROLE_ORDER[b.pillarRole],
  );
}

function buildHeroList(
  scores: ScoreSummary,
  kind: 'strength' | 'focus',
  goalCtx: ClientGoalContext,
): string[] {
  const assessed = [...(scores.categories ?? [])].filter((c) => c.assessed);
  assessed.sort(
    (a, b) => pillarRoleRank(resolvePillarRole(a.id, goalCtx)) - pillarRoleRank(resolvePillarRole(b.id, goalCtx)),
  );

  const items: string[] = [];
  for (const cat of assessed) {
    const role = resolvePillarRole(cat.id, goalCtx);
    if (kind === 'focus' && role === 'off-path') continue;
    if (kind === 'focus' && cat.id === 'lifestyle' && goalCtx.primaryGoal === GOAL_WEIGHT_LOSS) {
      continue;
    }
    const list = kind === 'strength' ? cat.strengths : cat.weaknesses;
    for (const line of list ?? []) {
      if (line && items.length < 2) items.push(line);
    }
  }

  if (items.length > 0) return items.slice(0, 2);

  const fallbacks = buildClientPriorityFallbacks(scores);
  const fb = kind === 'strength' ? fallbacks.strengths : fallbacks.focusAreas;
  return fb.slice(0, 2);
}

function pillarRoleRank(role: PillarRole): number {
  return PILLAR_ROLE_ORDER[role];
}

function buildPillarModel(
  sectionId: SectionId,
  scores: ScoreSummary,
  previousScores: ScoreSummary | null | undefined,
  gapAnalysisData: GapAnalysisData[],
  formData: FormData | undefined,
  goalCtx: ClientGoalContext,
  goals: string[] | undefined,
): ClientReportPillarModel | null {
  const scoringId = scoringIdForSection(sectionId);
  const cat = scores.categories?.find((c) => c.id === scoringId);
  if (!cat?.assessed) return null;

  const meta = SECTION_META[sectionId];
  const prev = previousScores?.categories?.find((c) => c.id === scoringId)?.score ?? null;
  const pillarRole = resolvePillarRole(scoringId, goalCtx);

  const gapIndex =
    sectionId === 'body-comp' ? 0 : sectionId === 'strength' ? 1 : sectionId === 'cardio' ? 2 : -1;

  const isNarrativePillar =
    sectionId === 'movement-quality' || sectionId === 'lifestyle';
  const movementNarrative =
    sectionId === 'movement-quality'
      ? buildMovementNarrative(formData, cat)
      : null;
  const lifestyleNarrative =
    sectionId === 'lifestyle' ? buildLifestyleNarrative(formData, cat) : null;
  const narrative = movementNarrative ?? lifestyleNarrative;

  return {
    sectionId,
    scoringId,
    title: meta.title,
    shortTitle: meta.shortTitle,
    icon: meta.icon,
    score: Math.round(cat.score ?? 0),
    previousScore: prev != null ? Math.round(prev) : null,
    summary: sanitizeClientReportCopy(buildClientPillarSummary(cat, prev)),
    goingWell: (cat.strengths ?? []).slice(0, 2).map(sanitizeClientReportCopy),
    focusNext: (cat.weaknesses ?? []).slice(0, 2).map(sanitizeClientReportCopy),
    metrics:
      sectionId === 'lifestyle'
        ? extractLifestyleMetrics(formData)
        : gapIndex >= 0
          ? extractGapMetrics(sectionId, gapAnalysisData[gapIndex])
          : [],
    progressionRows: isNarrativePillar
      ? []
      : buildClientProgressionRows(
          sectionId,
          gapAnalysisData,
          formData,
          cat,
          scores,
          goals,
        ),
    contentMode: isNarrativePillar ? 'narrative' : 'progression',
    narrativeIntro: narrative?.intro ?? null,
    narrativeItems: narrative?.items ?? [],
    goalTieIn: buildPillarGoalTieIn(scoringId, pillarRole, goalCtx),
    pillarRole,
  };
}

function buildPillarGoalTieIn(
  pillar: PillarId,
  role: PillarRole,
  goalCtx: ClientGoalContext,
): string | null {
  const goalLabel =
    ASSESSMENT_OPTIONS.clientGoals.find((g) => g.value === goalCtx.primaryGoal)?.label ??
    'your goal';

  if (role === 'primary') {
    return `This is central to ${goalLabel.toLowerCase()} — expect the biggest shifts here.`;
  }
  if (role === 'secondary') {
    return `Supports ${goalLabel.toLowerCase()} — we\'ll train this in service of your main target.`;
  }
  if (role === 'supporting' && pillar === 'lifestyle') {
    if (goalCtx.primaryGoal === GOAL_WEIGHT_LOSS) {
      return `Habits that make fat loss easier — kept simple so ${goalLabel.toLowerCase()} stays the focus.`;
    }
    return `Lifestyle habits that back your ${goalLabel.toLowerCase()} plan.`;
  }
  if (role === 'off-path') {
    return null;
  }
  return null;
}

function extractGapMetrics(
  sectionId: 'body-comp' | 'strength' | 'cardio',
  gap?: GapAnalysisData,
): ClientReportMetricChip[] {
  if (!gap) return [];

  if (sectionId === 'body-comp' && gap.bodyCompGaps) {
    const g = gap.bodyCompGaps;
    return [
      { label: 'Body fat', value: `${g.fat.current.toFixed(1)}%` },
      { label: 'Muscle', value: `${g.muscle.current.toFixed(1)} kg` },
    ].filter((m) => m.value && !m.value.includes('NaN'));
  }

  if (sectionId === 'cardio' && gap.cardioGaps) {
    const g = gap.cardioGaps;
    const chips: ClientReportMetricChip[] = [];
    if (g.vo2.current > 0) {
      chips.push({ label: 'Fitness level', value: `${g.vo2.current.toFixed(1)} ml/kg/min` });
    }
    if (g.rhr.current > 0) {
      chips.push({ label: 'Resting HR', value: `${Math.round(g.rhr.current)} bpm` });
    }
    return chips.slice(0, 2);
  }

  if (sectionId === 'strength' && gap.functionalGaps) {
    const g = gap.functionalGaps;
    return [
      { label: 'Endurance', value: `${Math.round(g.endurance.current)} reps` },
      { label: 'Core', value: `${Math.round(g.core.current)} sec` },
    ];
  }

  return [];
}

function extractLifestyleMetrics(formData?: FormData): ClientReportMetricChip[] {
  if (!formData) return [];
  const chips: ClientReportMetricChip[] = [];
  const steps = parseFloat(formData.stepsPerDay || '0');
  if (steps > 0) {
    chips.push({ label: 'Daily steps', value: steps >= 1000 ? `${Math.round(steps / 100) / 10}k` : String(steps) });
  }
  const stress = (formData.stressLevel || '').trim();
  if (stress) {
    chips.push({ label: 'Stress', value: stress.charAt(0).toUpperCase() + stress.slice(1) });
  }
  return chips.slice(0, 2);
}

function buildPostureModel(formData?: FormData): ClientReportPostureModel | null {
  if (!formData?.postureAiResults) return null;

  const findings = aggregatePostureFindings(
    formData.postureAiResults as Parameters<typeof aggregatePostureFindings>[0],
  );
  const images = collectPostureImages(formData);
  if (Object.keys(images).length === 0) return null;

  const notable = findings.filter((f) => f.severity !== 'aligned');
  const sorted = sortFindingsForDisplay(notable);
  const headline =
    notable.length === 0
      ? 'Your scan shows balanced alignment across the views we captured.'
      : notable.length === 1
        ? `One area to refine: ${sorted[0]?.name ?? 'posture'}.`
        : `${notable.length} areas to refine — see the summary below and tap each view on your scan.`;

  const summaryLines = sorted.slice(0, 5).map((f) => {
    const meaning = sanitizeClientReportCopy(f.whatItMeans?.trim() ?? '');
    const name = sanitizeClientReportCopy(f.name);
    return meaning ? `${name}: ${meaning}` : name;
  });

  return {
    findings,
    postureResults: formData.postureAiResults ?? {},
    images,
    headline,
    summaryLines,
    focusBullets: buildFocusBullets(notable, 4),
  };
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

function severityRank(severity: 'low' | 'medium' | 'high'): number {
  if (severity === 'high') return 3;
  if (severity === 'medium') return 2;
  return 1;
}
