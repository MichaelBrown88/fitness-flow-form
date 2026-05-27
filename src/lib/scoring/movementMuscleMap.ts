/**
 * Maps movement-quality assessment findings (OHS / hinge / lunge / mobility)
 * to muscle groups that are likely tight or weak. Keyword-based on the
 * lower-cased finding text — same pattern as `strengthMuscleMap.ts`.
 */

import type { Muscle } from 'react-body-highlighter';

const M = {
  trapezius: 'trapezius' as Muscle,
  upperBack: 'upper-back' as Muscle,
  lowerBack: 'lower-back' as Muscle,
  chest: 'chest' as Muscle,
  frontDeltoids: 'front-deltoids' as Muscle,
  backDeltoids: 'back-deltoids' as Muscle,
  abs: 'abs' as Muscle,
  obliques: 'obliques' as Muscle,
  adductor: 'adductor' as Muscle,
  abductors: 'abductors' as Muscle,
  hamstring: 'hamstring' as Muscle,
  quadriceps: 'quadriceps' as Muscle,
  calves: 'calves' as Muscle,
  gluteal: 'gluteal' as Muscle,
  neck: 'neck' as Muscle,
  knees: 'knees' as Muscle,
};

interface Pattern {
  match: RegExp;
  tight?: Muscle[];
  weak?: Muscle[];
}

/**
 * Findings → muscles, grouped by typical compensation pattern.
 * Patterns are matched against the lowercased finding text; multiple
 * patterns can fire for one finding and their muscles union.
 */
const PATTERNS: Pattern[] = [
  // ─── Overhead squat ─────────────────────────────────────────────
  { match: /limited squat depth|ankle mobility|ankle dorsiflex/, tight: [M.calves], weak: [M.gluteal] },
  { match: /shoulder mobility|thoracic extension|overhead position/, tight: [M.chest, M.frontDeltoids], weak: [M.upperBack, M.trapezius] },
  { match: /forward lean|excessive forward lean|trunk lean/, tight: [M.chest, M.hamstring], weak: [M.lowerBack, M.gluteal] },
  { match: /knee.*(valgus|caves)/, tight: [M.adductor], weak: [M.gluteal, M.abductors] },
  { match: /knee.*(varus|bows)/, tight: [M.abductors], weak: [M.adductor] },
  { match: /hip shift|lateral hip|hip strength imbalance/, tight: [M.obliques], weak: [M.gluteal, M.abductors] },

  // ─── Hinge ──────────────────────────────────────────────────────
  { match: /limited hip hinge|hamstring flexibility|hip mobility/, tight: [M.hamstring], weak: [M.gluteal] },
  { match: /back rounding|posterior chain|spine stability/, tight: [M.hamstring], weak: [M.lowerBack, M.upperBack, M.abs] },

  // ─── Lunge ──────────────────────────────────────────────────────
  { match: /balance challenges|single.leg stability|proprioception/, weak: [M.gluteal, M.abductors] },

  // ─── Mobility (hip / shoulder / ankle / thoracic / neck) ────────
  { match: /hip flexor/, tight: [M.quadriceps], weak: [M.gluteal] },
  { match: /hip mobility (is moderate|is limited|is poor)/, tight: [M.quadriceps], weak: [M.gluteal] },
  { match: /thoracic|t.spine/, tight: [M.chest], weak: [M.upperBack] },
  { match: /shoulder mobility (is moderate|is limited|is poor)/, tight: [M.chest, M.frontDeltoids], weak: [M.upperBack, M.trapezius] },
  { match: /ankle mobility (is moderate|is limited|is poor)|plantar fascia/, tight: [M.calves], weak: [M.gluteal] },
  { match: /neck mobility|cervical/, tight: [M.neck, M.trapezius], weak: [M.upperBack] },
];

/**
 * Derive tight/weak muscle sets from a list of movement-quality finding
 * strings (typically the `weaknesses` / "focus areas" produced by the
 * MovementPostureMobility scoring). `strengths` (positive findings) are
 * intentionally ignored — movement-quality "strong" is rarely actionable
 * for muscle highlight; the value is in surfacing what to address.
 */
export function deriveMovementMuscleSets(
  weaknesses: string[] | undefined,
): { tight: Muscle[]; weak: Muscle[] } {
  const tight = new Set<Muscle>();
  const weak = new Set<Muscle>();
  for (const w of weaknesses ?? []) {
    const lower = w.toLowerCase();
    for (const p of PATTERNS) {
      if (p.match.test(lower)) {
        for (const m of p.tight ?? []) tight.add(m);
        for (const m of p.weak ?? []) weak.add(m);
      }
    }
  }
  // Tight wins conflicts (overactive tissue is the corrective priority)
  for (const m of tight) weak.delete(m);
  return { tight: [...tight], weak: [...weak] };
}
