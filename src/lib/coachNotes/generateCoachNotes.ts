/**
 * Generate coach notes from assessment data.
 *
 * Walks the assessment findings, classifies severity, looks up the
 * intervention library, computes realistic outcome timelines via the
 * physiological-rates module, and emits a `CoachNotesDoc`.
 *
 * Designed to be idempotent within a pillar: regenerating coach notes
 * for the same pillar twice produces the same findings (modulo new
 * assessment data). Coach-edited fields survive regeneration via the
 * `mergePillarPreservingOverrides` helper.
 */

import { Timestamp } from 'firebase/firestore';
import type { FormData } from '@/contexts/FormContext';
import type { ScoreCategory, ScoreSummary } from '@/lib/scoring/types';
import { buildClientProfile } from '@/lib/physiology/profile';
import {
  postureCorrectionWeeks,
  weeklyWeightLossKg,
  monthlyMuscleGainKg,
  vo2max8WeekGainPct,
  type ClientProfile,
} from '@/lib/physiology/rates';
import {
  INTERVENTION_LIBRARY,
  lookupIntervention,
  type FindingId,
  type FindingSeverity,
  type LibraryEntry,
} from './interventionLibrary';
import type {
  CoachFinding,
  CoachNotesDoc,
  PillarId,
  PillarNotes,
} from './types';
import { COACH_NOTES_SCHEMA_VERSION } from './types';

interface GenerateInput {
  clientSlug: string;
  organizationId: string;
  formData: FormData;
  scores: ScoreSummary;
  assessmentId?: string;
}

/**
 * Build a fresh CoachNotesDoc from assessment data. When merging into
 * an existing doc, callers should pass the existing doc through
 * `mergeCoachNotes` to preserve coach-written `coachNote` fields and
 * `acknowledged` / `status` transitions.
 */
export function generateCoachNotes(input: GenerateInput): CoachNotesDoc {
  const { clientSlug, organizationId, formData, scores, assessmentId } = input;
  const profile = buildClientProfile(formData, scores);
  const now = Timestamp.now();

  const pillars: Partial<Record<PillarId, PillarNotes>> = {};

  for (const pillar of [
    'movementQuality',
    'bodyComp',
    'strength',
    'cardio',
    'lifestyle',
  ] as PillarId[]) {
    const findings = generateFindingsForPillar(pillar, scores, formData, profile, now);
    if (findings.length > 0) {
      pillars[pillar] = {
        pillar,
        lastAssessedAt: now,
        sourceAssessmentId: assessmentId,
        findings,
      };
    }
  }

  return {
    clientSlug,
    organizationId,
    generatedAt: now,
    updatedAt: now,
    pillars,
    schemaVersion: COACH_NOTES_SCHEMA_VERSION,
  };
}

/**
 * Merge a freshly-generated doc into an existing one. Preserves:
 *  - coachNote (free-form text the coach wrote)
 *  - acknowledged
 *  - status transitions when the underlying finding still exists
 *  - coachOverview
 *
 * Pillars not present in `next` keep their existing findings (so a
 * cardio-only reassessment doesn't blow away movement findings).
 */
export function mergeCoachNotes(
  existing: CoachNotesDoc | null,
  next: CoachNotesDoc,
): CoachNotesDoc {
  if (!existing) return next;

  const mergedPillars: CoachNotesDoc['pillars'] = { ...existing.pillars };

  for (const pillar of Object.keys(next.pillars) as PillarId[]) {
    const incoming = next.pillars[pillar];
    if (!incoming) continue;
    const previous = existing.pillars[pillar];
    mergedPillars[pillar] = mergePillarPreservingOverrides(previous, incoming);
  }

  return {
    ...next,
    pillars: mergedPillars,
    coachOverview: existing.coachOverview ?? next.coachOverview,
    generatedAt: existing.generatedAt,
    updatedAt: next.updatedAt,
  };
}

function mergePillarPreservingOverrides(
  previous: PillarNotes | undefined,
  incoming: PillarNotes,
): PillarNotes {
  if (!previous) return incoming;
  const previousById = new Map(previous.findings.map((f) => [f.id, f]));
  const incomingIds = new Set(incoming.findings.map((f) => f.id));

  // Carry forward coach-authored overrides on findings that still exist.
  const merged: CoachFinding[] = incoming.findings.map((next) => {
    const prev = previousById.get(next.id);
    if (!prev) return next;
    return {
      ...next,
      coachNote: prev.coachNote ?? next.coachNote,
      acknowledged: prev.acknowledged ?? next.acknowledged,
      // If coach explicitly resolved/monitoring, keep that status.
      status: prev.status === 'resolved' || prev.status === 'monitoring' ? prev.status : next.status,
      resolvedAt: prev.resolvedAt ?? next.resolvedAt,
      createdAt: prev.createdAt,
    };
  });

  // Findings that disappeared from the new generation become "resolved".
  for (const prev of previous.findings) {
    if (incomingIds.has(prev.id)) continue;
    if (prev.status === 'resolved') {
      merged.push(prev);
      continue;
    }
    merged.push({
      ...prev,
      status: 'resolved',
      resolvedAt: incoming.lastAssessedAt,
    });
  }

  return {
    ...incoming,
    findings: merged,
  };
}

// ─── Per-pillar finding generation ──────────────────────────────────

function generateFindingsForPillar(
  pillar: PillarId,
  scores: ScoreSummary,
  formData: FormData,
  profile: ClientProfile,
  now: Timestamp,
): CoachFinding[] {
  const cat = scores.categories.find((c) => c.id === pillar);
  if (!cat) return [];

  const findings: CoachFinding[] = [];
  if (pillar === 'movementQuality') {
    findings.push(...buildMovementFindings(cat, formData, profile, now));
  } else if (pillar === 'bodyComp') {
    findings.push(...buildBodyCompFindings(cat, formData, profile, now));
  } else if (pillar === 'cardio') {
    findings.push(...buildCardioFindings(cat, formData, profile, now));
  } else if (pillar === 'lifestyle') {
    findings.push(...buildLifestyleFindings(cat, formData, profile, now));
  }
  return findings;
}

// ─── Movement quality ───────────────────────────────────────────────

function buildMovementFindings(
  cat: ScoreCategory,
  formData: FormData,
  profile: ClientProfile,
  now: Timestamp,
): CoachFinding[] {
  const findings: CoachFinding[] = [];

  // Forward head posture — derived from posture analysis fields.
  const fhSeverity = postureSeverityFromForm(formData);
  if (fhSeverity) {
    const entry = lookupIntervention('forward-head-posture', fhSeverity);
    if (entry) {
      const weeks = postureCorrectionWeeks(profile, fhSeverity).weeks;
      findings.push(buildFinding({
        id: `move-fh-${fhSeverity}`,
        pillar: 'movementQuality',
        libraryFindingId: 'forward-head-posture',
        severity: fhSeverity,
        entry,
        outcomeOverride: `Expected ${fhSeverity === 'severe' ? '~60%' : fhSeverity === 'moderate' ? '~50%' : '~50%'} correction in ~${weeks} weeks at this client's training frequency.`,
        now,
      }));
    }
  }

  // Rounded shoulders.
  const rsSeverity = roundedShouldersSeverity(formData);
  if (rsSeverity) {
    const entry = lookupIntervention('rounded-shoulders', rsSeverity);
    if (entry) {
      findings.push(buildFinding({
        id: `move-rs-${rsSeverity}`,
        pillar: 'movementQuality',
        libraryFindingId: 'rounded-shoulders',
        severity: rsSeverity,
        entry,
        now,
      }));
    }
  }

  // Limited shoulder mobility (from overhead-squat assessment).
  const ohsShoulder = (formData.ohsShoulderMobility ?? '').toLowerCase();
  if (ohsShoulder && ohsShoulder !== 'full-range' && ohsShoulder !== 'unassessed') {
    const sev: FindingSeverity = ohsShoulder.includes('limited') || ohsShoulder.includes('falls') ? 'severe' : 'moderate';
    const entry = lookupIntervention('limited-shoulder-mobility', sev);
    if (entry) {
      findings.push(buildFinding({
        id: `move-shoulder-${sev}`,
        pillar: 'movementQuality',
        libraryFindingId: 'limited-shoulder-mobility',
        severity: sev,
        entry,
        measurements: [{ label: 'OHS shoulder', value: prettyOhsValue(ohsShoulder) }],
        now,
      }));
    }
  }

  // Ankle mobility (inferred from heel-rise / squat behaviour).
  const heel = (formData.ohsHeelBehavior ?? '').toLowerCase();
  if (heel && (heel.includes('rises') || heel.includes('lifts'))) {
    const entry = lookupIntervention('limited-ankle-dorsiflexion', 'moderate');
    if (entry) {
      findings.push(buildFinding({
        id: 'move-ankle-moderate',
        pillar: 'movementQuality',
        libraryFindingId: 'limited-ankle-dorsiflexion',
        severity: 'moderate',
        entry,
        measurements: [{ label: 'OHS heel behavior', value: prettyOhsValue(heel) }],
        now,
      }));
    }
  }

  return findings;
}

function prettyOhsValue(raw: string): string {
  return raw.replace(/[-_]/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

// ─── Body composition ───────────────────────────────────────────────

function buildBodyCompFindings(
  cat: ScoreCategory,
  formData: FormData,
  profile: ClientProfile,
  now: Timestamp,
): CoachFinding[] {
  const findings: CoachFinding[] = [];

  const goals = formData.clientGoals ?? [];
  const wantsLoss = goals.includes('weight-loss') || goals.includes('body-recomposition');
  const wantsMuscle = goals.includes('build-muscle') || goals.includes('body-recomposition');

  if (wantsLoss && formData.goalLevelWeightLoss) {
    const targetKg = parseLossTarget(formData.goalLevelWeightLoss, profile.bodyWeightKg);
    if (targetKg && targetKg > 0) {
      const sev: FindingSeverity =
        profile.bodyFatPct != null && profile.bodyFatPct >= 30
          ? 'severe'
          : profile.bodyFatPct != null && profile.bodyFatPct >= 22
            ? 'moderate'
            : 'mild';
      const entry = lookupIntervention('weight-loss-target', sev);
      if (entry) {
        const rate = weeklyWeightLossKg(profile, targetKg);
        findings.push(buildFinding({
          id: `body-loss-${sev}`,
          pillar: 'bodyComp',
          libraryFindingId: 'weight-loss-target',
          severity: sev,
          entry,
          outcomeOverride: `~${rate.rate}kg/week sustainable rate → ~${rate.weeks} weeks to hit the ${targetKg}kg target.`,
          measurements: [
            { label: 'Current weight', value: `${profile.bodyWeightKg}kg` },
            ...(profile.bodyFatPct != null ? [{ label: 'Body fat', value: `${profile.bodyFatPct}%` }] : []),
            { label: 'Loss target', value: `${targetKg}kg` },
          ],
          now,
        }));
      }
    }
  }

  if (wantsMuscle && formData.goalLevelMuscle) {
    const targetGain = parseFloat(formData.goalLevelMuscle);
    if (Number.isFinite(targetGain) && targetGain > 0) {
      const entry = lookupIntervention('muscle-building-target', 'moderate');
      if (entry) {
        const rate = monthlyMuscleGainKg(profile, { concurrentFatLoss: wantsLoss });
        const weeks = rate.rate > 0 ? Math.ceil((targetGain / rate.rate) * 4.33) : 0;
        findings.push(buildFinding({
          id: 'body-muscle-moderate',
          pillar: 'bodyComp',
          libraryFindingId: 'muscle-building-target',
          severity: 'moderate',
          entry,
          outcomeOverride: `~${rate.rate}kg/month projected gain (${profile.trainingExperience} trainee, ${profile.trainingFrequency}x/week${wantsLoss ? ', concurrent fat loss' : ''}) → ~${weeks} weeks to hit the ${targetGain}kg target.`,
          measurements: [
            { label: 'Goal', value: `+${targetGain}kg muscle` },
            { label: 'Training experience', value: profile.trainingExperience },
            { label: 'Training frequency', value: `${profile.trainingFrequency}x/week` },
          ],
          now,
        }));
      }
    }
  }

  return findings;
}

// ─── Cardio ─────────────────────────────────────────────────────────

function buildCardioFindings(
  cat: ScoreCategory,
  formData: FormData,
  profile: ClientProfile,
  now: Timestamp,
): CoachFinding[] {
  const findings: CoachFinding[] = [];
  const vo2 = parseFloatSafe(formData.cardioVo2MaxEstimate);
  if (vo2 != null) {
    const sev: FindingSeverity = vo2 < 30 ? 'severe' : vo2 < 40 ? 'moderate' : null as unknown as FindingSeverity;
    if (sev) {
      const entry = lookupIntervention('low-vo2max', sev);
      if (entry) {
        const rate = vo2max8WeekGainPct(profile, vo2);
        findings.push(buildFinding({
          id: `cardio-vo2-${sev}`,
          pillar: 'cardio',
          libraryFindingId: 'low-vo2max',
          severity: sev,
          entry,
          outcomeOverride: `~${rate.rate}% gain projected over 8 weeks at ${profile.trainingFrequency}x/week training.`,
          measurements: [{ label: 'VO₂max', value: `${vo2} ml/kg/min` }],
          now,
        }));
      }
    }
  }
  return findings;
}

// ─── Lifestyle ──────────────────────────────────────────────────────

function buildLifestyleFindings(
  cat: ScoreCategory,
  formData: FormData,
  profile: ClientProfile,
  now: Timestamp,
): CoachFinding[] {
  const findings: CoachFinding[] = [];

  // Sleep deficit
  const sleepDetail = cat.details.find((d) => d.id === 'sleep');
  if (sleepDetail && sleepDetail.score < 70) {
    const sev: FindingSeverity = sleepDetail.score < 40 ? 'severe' : 'moderate';
    const entry = lookupIntervention('sleep-deficit', sev);
    if (entry) {
      findings.push(buildFinding({
        id: `lifestyle-sleep-${sev}`,
        pillar: 'lifestyle',
        libraryFindingId: 'sleep-deficit',
        severity: sev,
        entry,
        measurements: [{ label: 'Sleep score', value: `${sleepDetail.score}/100` }],
        now,
      }));
    }
  }

  // High stress
  const stressDetail = cat.details.find((d) => d.id === 'stress');
  if (stressDetail && stressDetail.score < 60) {
    const sev: FindingSeverity = stressDetail.score < 35 ? 'severe' : 'moderate';
    const entry = lookupIntervention('high-stress', sev);
    if (entry) {
      findings.push(buildFinding({
        id: `lifestyle-stress-${sev}`,
        pillar: 'lifestyle',
        libraryFindingId: 'high-stress',
        severity: sev,
        entry,
        measurements: [{ label: 'Stress score', value: `${stressDetail.score}/100` }],
        now,
      }));
    }
  }

  return findings;
}

// ─── Helpers ────────────────────────────────────────────────────────

function buildFinding(args: {
  id: string;
  pillar: PillarId;
  libraryFindingId: FindingId | null;
  severity: FindingSeverity;
  entry: LibraryEntry;
  measurements?: { label: string; value: string }[];
  outcomeOverride?: string;
  now: Timestamp;
}): CoachFinding {
  const { id, pillar, libraryFindingId, severity, entry, measurements, outcomeOverride, now } = args;
  return {
    id,
    pillar,
    libraryFindingId,
    severity,
    finding: entry.finding,
    diagnosis: entry.diagnosis,
    measurements,
    prescription: entry.prescription,
    minimumDose: entry.minimumDose,
    expectedOutcome: outcomeOverride ?? entry.expectedOutcome,
    reassessmentCadence: entry.reassessmentCadence,
    contraindications: entry.contraindications,
    confidence: entry.confidence,
    references: entry.references,
    source: 'auto',
    status: 'active',
    createdAt: now,
    lastGeneratedAt: now,
  };
}

function parseFloatSafe(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : undefined;
}

function parseLossTarget(level: string, currentWeight: number): number | null {
  const m = level.match(/^(\d+)(kg)?$/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (m[2]?.toLowerCase() === 'kg') return n;
  return Math.round((currentWeight * n) / 100);
}

function postureSeverityFromForm(formData: FormData): FindingSeverity | null {
  const v = (formData.postureForwardHead ?? '').toLowerCase();
  if (!v || v === 'neutral' || v === 'none') return null;
  if (v.includes('severe')) return 'severe';
  if (v.includes('moderate') || v.includes('forward')) return 'moderate';
  if (v.includes('mild') || v.includes('slight')) return 'mild';
  // Fallback to the global postureSeverity field.
  const overall = (formData.postureSeverity ?? '').toLowerCase();
  if (overall.includes('severe')) return 'severe';
  if (overall.includes('moderate')) return 'moderate';
  if (overall.includes('mild')) return 'mild';
  return null;
}

function roundedShouldersSeverity(formData: FormData): FindingSeverity | null {
  const v = (formData.postureRoundedShoulders ?? '').toLowerCase();
  if (!v || v === 'neutral' || v === 'none') return null;
  if (v.includes('severe')) return 'severe';
  if (v.includes('moderate') || v.includes('rounded')) return 'moderate';
  if (v.includes('mild') || v.includes('slight')) return 'mild';
  return null;
}

// Suppress unused-import warnings for the enum constants we're reserving for future use.
void INTERVENTION_LIBRARY;
