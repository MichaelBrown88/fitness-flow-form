/**
 * Compact excerpts from assessment FormData for the coach assistant (token-safe).
 * Full form lives in Firestore; dashboard ClientGroup summaries omit most fields.
 */

import type { PostureAnalysisResult } from '@/lib/ai/postureAnalysis';
import type { FormData } from '@/types/assessmentForm';

const MAX_JSON_CHARS = 14_000;

function trunc(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1))}…`;
}

function pick(
  fd: FormData,
  key: keyof FormData,
  maxLen: number,
): string | undefined {
  const v = fd[key];
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  if (!t) return undefined;
  return trunc(t, maxLen);
}

function pickArr(fd: FormData, key: keyof FormData, maxLen: number): string | undefined {
  const v = fd[key];
  if (!Array.isArray(v) || v.length === 0) return undefined;
  const joined = v.map((x) => String(x).trim()).filter(Boolean).join(', ');
  if (!joined) return undefined;
  return trunc(joined, maxLen);
}

function compactPostureView(res: PostureAnalysisResult): Record<string, unknown> {
  const slice = (d: { status?: string; description?: string } | undefined, descMax: number) =>
    d
      ? {
          status: d.status,
          description: d.description ? trunc(d.description, descMax) : undefined,
        }
      : undefined;

  return {
    forward_head: res.forward_head
      ? {
          status: res.forward_head.status,
          deviation_degrees: res.forward_head.deviation_degrees,
          description: trunc(res.forward_head.description, 360),
        }
      : undefined,
    shoulder_alignment: res.shoulder_alignment
      ? {
          status: res.shoulder_alignment.status,
          rounded_forward: res.shoulder_alignment.rounded_forward,
          description: trunc(res.shoulder_alignment.description, 360),
        }
      : undefined,
    kyphosis: slice(res.kyphosis, 280),
    lordosis: slice(res.lordosis, 280),
    pelvic_tilt: res.pelvic_tilt
      ? {
          status: res.pelvic_tilt.status,
          description: trunc(res.pelvic_tilt.description, 280),
        }
      : undefined,
    head_alignment: res.head_alignment
      ? {
          status: res.head_alignment.status,
          description: trunc(res.head_alignment.description, 220),
        }
      : undefined,
    lateral_head_position: res.lateral_head_position
      ? {
          status: res.lateral_head_position.status,
          description: trunc(res.lateral_head_position.description, 220),
        }
      : undefined,
  };
}

function compactPostureAiResults(
  raw: Record<string, PostureAnalysisResult> | null,
): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object') return null;
  const out: Record<string, unknown> = {};
  for (const [view, res] of Object.entries(raw)) {
    if (res && typeof res === 'object') {
      out[view] = compactPostureView(res);
    }
  }
  return Object.keys(out).length > 0 ? out : null;
}

/**
 * Human-readable assessment fields for the LLM (no images, no raw landmarks).
 */
export function extractFormDataExcerptForAssistant(formData: FormData): Record<string, unknown> {
  const fd = formData;
  const excerpt: Record<string, unknown> = {
    profile: {
      clientGoals: fd.clientGoals?.length ? fd.clientGoals.map((g) => trunc(g, 200)) : undefined,
      heightCm: pick(fd, 'heightCm', 32),
      weightLossTargetKg: pick(fd, 'weightLossTargetKg', 32),
      muscleGainTargetKg: pick(fd, 'muscleGainTargetKg', 32),
      activityLevel: pick(fd, 'activityLevel', 120),
      trainingHistory: pick(fd, 'trainingHistory', 400),
      recentActivity: pick(fd, 'recentActivity', 400),
      primaryTrainingStyles: fd.primaryTrainingStyles?.length ? fd.primaryTrainingStyles : undefined,
      sleepArchetype: pick(fd, 'sleepArchetype', 80),
      stressLevel: pick(fd, 'stressLevel', 80),
      nutritionHabits: pick(fd, 'nutritionHabits', 280),
      hydrationHabits: pick(fd, 'hydrationHabits', 200),
      stepsPerDay: pick(fd, 'stepsPerDay', 40),
      sedentaryHours: pick(fd, 'sedentaryHours', 40),
    },
    bodyComposition: {
      inbodyWeightKg: pick(fd, 'inbodyWeightKg', 24),
      inbodyBodyFatPct: pick(fd, 'inbodyBodyFatPct', 24),
      inbodyBmi: pick(fd, 'inbodyBmi', 24),
      waistCm: pick(fd, 'waistCm', 24),
      hipsCm: pick(fd, 'hipsCm', 24),
      waistHipRatio: pick(fd, 'waistHipRatio', 24),
      skeletalMuscleMassKg: pick(fd, 'skeletalMuscleMassKg', 24),
    },
    postureManual: {
      postureSeverity: pick(fd, 'postureSeverity', 80),
      postureForwardHead: pick(fd, 'postureForwardHead', 120),
      postureRoundedShoulders: pick(fd, 'postureRoundedShoulders', 120),
      postureHeadOverall: pickArr(fd, 'postureHeadOverall', 200),
      postureShouldersOverall: pickArr(fd, 'postureShouldersOverall', 200),
      postureBackOverall: pickArr(fd, 'postureBackOverall', 200),
      postureHipsOverall: pickArr(fd, 'postureHipsOverall', 200),
      postureKneesOverall: pickArr(fd, 'postureKneesOverall', 200),
    },
    postureAiByView: compactPostureAiResults(fd.postureAiResults),
    movement: {
      ohsKneeAlignment: pick(fd, 'ohsKneeAlignment', 120),
      ohsHeelBehavior: pick(fd, 'ohsHeelBehavior', 120),
      ohsLumbarControl: pick(fd, 'ohsLumbarControl', 120),
      ohsShoulderMobility: pick(fd, 'ohsShoulderMobility', 120),
      ohsSquatDepth: pick(fd, 'ohsSquatDepth', 120),
      ohsNotes: pick(fd, 'ohsNotes', 400),
      hingeQuality: pick(fd, 'hingeQuality', 120),
      hingeDepth: pick(fd, 'hingeDepth', 120),
      hingeNotes: pick(fd, 'hingeNotes', 400),
      lungeLeftKneeAlignment: pick(fd, 'lungeLeftKneeAlignment', 120),
      lungeRightKneeAlignment: pick(fd, 'lungeRightKneeAlignment', 120),
      lungeTestNotes: pick(fd, 'lungeTestNotes', 400),
      shoulderMobilityReach: pick(fd, 'shoulderMobilityReach', 120),
      mobilityHip: pick(fd, 'mobilityHip', 120),
      mobilityShoulder: pick(fd, 'mobilityShoulder', 120),
      mobilityAnkleLeft: pick(fd, 'mobilityAnkleLeft', 120),
      mobilityAnkleRight: pick(fd, 'mobilityAnkleRight', 120),
      modifiedThomasResult: pick(fd, 'modifiedThomasResult', 160),
      movementNotes: pick(fd, 'movementNotes', 500),
      pushupTest: pick(fd, 'pushupTest', 120),
      squatTest: pick(fd, 'squatTest', 120),
    },
    core: {
      plankHoldSeconds: pick(fd, 'plankHoldSeconds', 24),
      plankDurationSeconds: pick(fd, 'plankDurationSeconds', 24),
      singleLegStanceLeftGrade: pick(fd, 'singleLegStanceLeftGrade', 40),
      singleLegStanceRightGrade: pick(fd, 'singleLegStanceRightGrade', 40),
    },
    cardio: {
      cardioRestingHr: pick(fd, 'cardioRestingHr', 24),
      cardioVo2MaxEstimate: pick(fd, 'cardioVo2MaxEstimate', 40),
      cardioNotes: pick(fd, 'cardioNotes', 400),
    },
    strength: {
      pushupMaxReps: pick(fd, 'pushupMaxReps', 24),
      squatsOneMinuteReps: pick(fd, 'squatsOneMinuteReps', 24),
      gripLeftKg: pick(fd, 'gripLeftKg', 24),
      gripRightKg: pick(fd, 'gripRightKg', 24),
      chairStandReps: pick(fd, 'chairStandReps', 24),
    },
    healthFlags: {
      medicationsFlag: pick(fd, 'medicationsFlag', 80),
      medicationsNotes: pick(fd, 'medicationsNotes', 400),
      parqFlagged: (['parq1','parq2','parq3','parq4','parq5','parq6','parq7','parq8','parq9','parq10','parq11','parq12','parq13'] as const)
        .some((k) => fd[k] === 'yes'),
      parqNotes: pick(fd, 'parqNotes', 400),
    },
    coachNarrative: {
      coachReport: pick(fd, 'coachReport', 2_000),
      clientReport: pick(fd, 'clientReport', 900),
    },
  };

  let json = JSON.stringify(excerpt);
  if (json.length <= MAX_JSON_CHARS) return excerpt;

  const shrink: Record<string, unknown> = { ...excerpt, coachNarrative: { coachReport: undefined as string | undefined, clientReport: undefined as string | undefined } };
  json = JSON.stringify(shrink);
  if (json.length <= MAX_JSON_CHARS) return shrink;

  const noAi: Record<string, unknown> = { ...shrink, postureAiByView: null };
  json = JSON.stringify(noAi);
  if (json.length <= MAX_JSON_CHARS) return noAi;

  return {
    note: 'Assessment excerpt truncated for size; prioritize scores in parent payload.',
    profile: shrink.profile,
    movement: { movementNotes: pick(fd, 'movementNotes', 500), ohsNotes: pick(fd, 'ohsNotes', 300) },
    coachNarrativeCoachReportSnippet: pick(fd, 'coachReport', 1_200),
  };
}
