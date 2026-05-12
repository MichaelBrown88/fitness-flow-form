/**
 * Goal-driven target computation for ARC™ trackables.
 *
 * Today, trackable targets are score-based (current 55 → target 70 etc.).
 * That's fine for abstract dimensions like "movement quality", but for
 * quantitative metrics — weight, body-fat %, muscle mass, VO₂max,
 * strength benchmarks — coaches and clients want **real numbers**:
 * "lose 10kg" → "target weight = current − 10".
 *
 * This module reads `goalLevel*` fields from FormData and emits
 * concrete numeric targets that pipe into Trackable.valueTarget.
 *
 * It also exposes an ambition multiplier so score-based targets can
 * scale with stated ambition (e.g. "aggressive-50" strength goal pushes
 * score targets a tier higher than "foundation").
 */

import type { FormData } from '@/contexts/FormContext';
import type { ScoreCategory, ScoreDetail } from '@/lib/scoring/types';

// ─── Ambition multiplier (score-based targets) ───────────────────────

/**
 * Returns a multiplier (typically 0.95 – 1.10) to scale a score-based
 * target up or down for the client's stated ambition. Coach can still
 * override individual targets in the editor.
 */
export function ambitionMultiplier(formData: FormData | undefined): number {
  if (!formData) return 1;
  const goals = new Set(formData.clientGoals ?? []);

  // Aggressive / maximizer signals
  const aggressiveStrength = ['aggressive-50', 'maximize'].includes(formData.goalLevelStrength ?? '');
  const ambitiousStrength = ['ambitious-30-40'].includes(formData.goalLevelStrength ?? '');
  const eliteFitness = formData.goalLevelFitness === 'elite';
  const athleticFitness = formData.goalLevelFitness === 'athletic';
  const shreddedRecomp = formData.goalLevelBodyRecomp === 'shredded';
  const athleticRecomp = formData.goalLevelBodyRecomp === 'athletic';

  // Conservative signals
  const foundationStrength = formData.goalLevelStrength === 'foundation';
  const healthFitness = formData.goalLevelFitness === 'health';
  const generalHealth = goals.has('general-health') && goals.size === 1;

  if (aggressiveStrength || eliteFitness || shreddedRecomp) return 1.10;
  if (ambitiousStrength || athleticFitness || athleticRecomp) return 1.05;
  if (foundationStrength || healthFitness || generalHealth) return 0.95;
  return 1;
}

// ─── Goal target resolver ────────────────────────────────────────────

export interface GoalTarget {
  /** Numeric target value (e.g. 78 kg). */
  valueTarget: number;
  /** Where this target came from — used in coach-facing UI. */
  source: 'goal-weight-loss' | 'goal-muscle' | 'goal-body-recomp' | 'goal-strength' | 'goal-fitness';
  /** Short coach-facing label (e.g. "10kg loss target"). */
  reason: string;
}

interface DetailContext {
  category: ScoreCategory;
  detail: ScoreDetail;
  formData: FormData | undefined;
  /** Optional client gender ("male" / "female") for percentile mapping. */
  gender?: string;
  /** Optional age — used for VO₂max norms. */
  age?: number;
}

/**
 * Returns a numeric target for a given trackable detail when a stated
 * goal applies, else null. The caller fills `Trackable.valueTarget`.
 */
export function resolveGoalTarget(ctx: DetailContext): GoalTarget | null {
  const { category, detail, formData } = ctx;
  if (!formData) return null;
  const value = typeof detail.value === 'number' ? detail.value : parseFloat(String(detail.value ?? ''));
  if (Number.isNaN(value) || value <= 0) return null;

  // ─── Body composition ──────────────────────────────────────────
  if (category.id === 'bodyComp') {
    // Weight loss → target weight
    if ((detail.id === 'weight' || detail.label?.toLowerCase().includes('weight')) && formData.goalLevelWeightLoss) {
      const target = applyWeightLossGoal(value, formData.goalLevelWeightLoss);
      if (target != null) return { valueTarget: target, source: 'goal-weight-loss', reason: weightLossReason(formData.goalLevelWeightLoss) };
    }
    // Muscle mass → target muscle mass
    if ((detail.id === 'muscle' || detail.label?.toLowerCase().includes('muscle')) && formData.goalLevelMuscle) {
      const gain = parseFloat(formData.goalLevelMuscle);
      if (!Number.isNaN(gain) && gain > 0) {
        return { valueTarget: round(value + gain, 1), source: 'goal-muscle', reason: `+${gain}kg muscle goal` };
      }
    }
    // Body fat % → target via body-recomp tier
    if ((detail.id === 'fat' || detail.label?.toLowerCase().includes('fat')) && formData.goalLevelBodyRecomp) {
      const target = bodyFatTargetFromTier(formData.goalLevelBodyRecomp, formData.gender);
      if (target != null) return { valueTarget: target, source: 'goal-body-recomp', reason: `${capitalise(formData.goalLevelBodyRecomp)} body comp` };
    }
  }

  // ─── Strength ──────────────────────────────────────────────────
  if (category.id === 'strength' && formData.goalLevelStrength) {
    const pct = strengthPctImprovement(formData.goalLevelStrength);
    if (pct != null) {
      return {
        valueTarget: round(value * (1 + pct / 100), 1),
        source: 'goal-strength',
        reason: `${pct}% strength gain target`,
      };
    }
  }

  // ─── Cardio (VO₂max) ──────────────────────────────────────────
  if (category.id === 'cardio' && (detail.id === 'vo2' || detail.label?.toLowerCase().includes('vo')) && formData.goalLevelFitness) {
    const target = vo2TargetFromTier(formData.goalLevelFitness, formData.gender, ctx.age);
    if (target != null) return { valueTarget: target, source: 'goal-fitness', reason: `${capitalise(formData.goalLevelFitness)} fitness tier` };
  }

  return null;
}

// ─── Per-goal-type helpers ───────────────────────────────────────────

function applyWeightLossGoal(currentWeight: number, level: string): number | null {
  // "5", "10", "15" → percentage; "5kg", "10kg", "15kg" → absolute
  const m = level.match(/^(\d+)(kg)?$/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (m[2]?.toLowerCase() === 'kg') return round(currentWeight - n, 1);
  return round(currentWeight * (1 - n / 100), 1);
}

function weightLossReason(level: string): string {
  const m = level.match(/^(\d+)(kg)?$/i);
  if (!m) return 'weight loss goal';
  return m[2] ? `${m[1]}kg loss target` : `${m[1]}% loss target`;
}

function bodyFatTargetFromTier(tier: string, gender?: string): number | null {
  const isFemale = (gender ?? '').toLowerCase().startsWith('f');
  const targets: Record<string, { male: number; female: number }> = {
    healthy:  { male: 18, female: 25 },
    fit:      { male: 15, female: 22 },
    athletic: { male: 12, female: 19 },
    shredded: { male: 9,  female: 15 },
  };
  const row = targets[tier];
  if (!row) return null;
  return isFemale ? row.female : row.male;
}

function strengthPctImprovement(level: string): number | null {
  // Mid-points of each tier in the constants:
  //   foundation     → 5
  //   modest-10-15   → 12
  //   solid-20-25    → 22
  //   ambitious-30-40→ 35
  //   aggressive-50  → 50
  //   maximize       → 75
  const map: Record<string, number> = {
    foundation: 5,
    'modest-10-15': 12,
    'solid-20-25': 22,
    'ambitious-30-40': 35,
    'aggressive-50': 50,
    maximize: 75,
  };
  return map[level] ?? null;
}

function vo2TargetFromTier(tier: string, gender?: string, age?: number): number | null {
  // Rough VO₂max norms (ml/kg/min) by percentile, age-30 male baseline.
  // Real implementation should use the existing clinical-data norms.
  const isFemale = (gender ?? '').toLowerCase().startsWith('f');
  const ageAdjust = age != null && age > 30 ? Math.max(0, (age - 30) * 0.4) : 0;
  const base: Record<string, { male: number; female: number }> = {
    health:   { male: 36, female: 30 }, // 50th
    active:   { male: 44, female: 38 }, // 75th
    athletic: { male: 52, female: 45 }, // 85th
    elite:    { male: 60, female: 53 }, // 95th
  };
  const row = base[tier];
  if (!row) return null;
  const target = (isFemale ? row.female : row.male) - ageAdjust;
  return round(target, 1);
}

// ─── Utils ───────────────────────────────────────────────────────────

function round(n: number, d: number): number {
  const p = Math.pow(10, d);
  return Math.round(n * p) / p;
}

function capitalise(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
