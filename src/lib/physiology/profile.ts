/**
 * Builds a `ClientProfile` (the input shape for `rates.ts`) from the
 * raw FormData captured during assessment. Single source of truth for
 * how we interpret training-experience and training-frequency strings,
 * how we derive age, and how lifestyle scores feed in as drag.
 */

import type { FormData } from '@/contexts/FormContext';
import type { ScoreSummary } from '@/lib/scoring/types';
import type { ClientProfile, Sex, TrainingExperience } from './rates';

export function buildClientProfile(formData: FormData, scores?: ScoreSummary): ClientProfile {
  return {
    sex: parseSex(formData.gender),
    age: parseAge(formData.dateOfBirth),
    bodyWeightKg: parseFloatSafe(formData.inbodyWeightKg) ?? 80,
    bodyFatPct: parseFloatSafe(formData.inbodyBodyFatPct),
    trainingExperience: parseExperience(formData.trainingExperience, formData.trainingHistory),
    trainingFrequency: parseFrequency(formData.trainingFrequency, formData.activityLevel),
    sleepScore: scoreFromCategory(scores, 'lifestyle', 'sleep'),
    stressScore: scoreFromCategory(scores, 'lifestyle', 'stress'),
  };
}

function parseSex(gender: string | undefined): Sex {
  const g = (gender ?? '').toLowerCase();
  if (g.startsWith('m')) return 'male';
  if (g.startsWith('f')) return 'female';
  return 'unknown';
}

function parseAge(dob: string | undefined): number {
  if (!dob) return 35; // safe default; rates degrade gracefully at unknown age
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return 35;
  return Math.max(15, Math.min(90, Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000))));
}

function parseFloatSafe(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const n = parseFloat(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function parseExperience(
  explicit: string | undefined,
  legacyHistory: string | undefined,
): TrainingExperience {
  const e = (explicit ?? '').toLowerCase();
  if (e === 'beginner' || e === 'novice') return 'beginner';
  if (e === 'intermediate') return 'intermediate';
  if (e === 'advanced' || e === 'expert') return 'advanced';

  // Fallback: infer from legacy training-history field.
  const h = (legacyHistory ?? '').toLowerCase();
  if (h.includes('5+') || h.includes('advanced') || h.includes('competitive')) return 'advanced';
  if (h.includes('3+') || h.includes('intermediate') || h.includes('regular')) return 'intermediate';
  return 'beginner';
}

function parseFrequency(
  explicit: string | undefined,
  legacyActivity: string | undefined,
): number {
  const f = (explicit ?? '').trim();
  if (f === '5+' || f === '6' || f === '7') return 5;
  const n = parseInt(f, 10);
  if (Number.isFinite(n) && n >= 0 && n <= 7) return n;

  // Fallback: infer from activity-level slug.
  const a = (legacyActivity ?? '').toLowerCase();
  if (a.includes('sedentary')) return 0;
  if (a.includes('light')) return 1;
  if (a.includes('moderate')) return 3;
  if (a.includes('very')) return 5;
  return 2;
}

function scoreFromCategory(
  scores: ScoreSummary | undefined,
  catId: string,
  detailId: string,
): number | undefined {
  const cat = scores?.categories.find((c) => c.id === catId);
  const detail = cat?.details.find((d) => d.id === detailId);
  return detail?.score;
}
