/**
 * Maps body-composition assessment findings to body regions for visualisation
 * on the body diagram. Highlights areas the category flags as priorities or
 * strengths — e.g. "Lower body underdeveloped" → highlight legs.
 *
 * Different intent from posture/strength maps: here we're showing
 * *distribution and balance*, not "tight vs weak". We use:
 *   - `weak` → blue: regions under-developed or carrying excess fat
 *   - `strong` → green: regions well-developed for the client's level
 */

import type { Muscle } from 'react-body-highlighter';
import type { FormData } from '@/contexts/FormContext';

const M = {
  trapezius: 'trapezius' as Muscle,
  upperBack: 'upper-back' as Muscle,
  lowerBack: 'lower-back' as Muscle,
  chest: 'chest' as Muscle,
  biceps: 'biceps' as Muscle,
  triceps: 'triceps' as Muscle,
  forearm: 'forearm' as Muscle,
  frontDeltoids: 'front-deltoids' as Muscle,
  backDeltoids: 'back-deltoids' as Muscle,
  abs: 'abs' as Muscle,
  obliques: 'obliques' as Muscle,
  hamstring: 'hamstring' as Muscle,
  quadriceps: 'quadriceps' as Muscle,
  calves: 'calves' as Muscle,
  gluteal: 'gluteal' as Muscle,
};

const REGIONS = {
  trunk: [M.chest, M.abs, M.obliques, M.upperBack, M.lowerBack],
  upperBody: [M.chest, M.upperBack, M.frontDeltoids, M.backDeltoids, M.biceps, M.triceps, M.forearm, M.trapezius],
  lowerBody: [M.quadriceps, M.hamstring, M.gluteal, M.calves],
  core: [M.abs, M.obliques, M.lowerBack],
  arms: [M.biceps, M.triceps, M.forearm, M.frontDeltoids],
};

interface Pattern {
  match: RegExp;
  region: Muscle[];
}

const PATTERNS: Pattern[] = [
  { match: /trunk|torso|midsection|core/, region: REGIONS.trunk },
  { match: /upper body|arms?|chest|shoulders?/, region: REGIONS.upperBody },
  { match: /lower body|legs?|hips? and legs/, region: REGIONS.lowerBody },
  { match: /visceral fat|abdominal fat|belly fat/, region: REGIONS.core },
  // "Muscle mass" without further specifier — flag the whole body via major groups
  { match: /muscle mass|lean mass|lean body/, region: [...REGIONS.upperBody, ...REGIONS.lowerBody, ...REGIONS.core] },
];

function regionFromLabel(label: string): Muscle[] {
  const lower = label.toLowerCase();
  const out = new Set<Muscle>();
  for (const p of PATTERNS) {
    if (p.match.test(lower)) {
      for (const m of p.region) out.add(m);
    }
  }
  return [...out];
}

/**
 * Side-to-side imbalance check from segmental composition fields. If left
 * vs right differs by >SIDE_IMBALANCE_THRESHOLD relative to the average,
 * the side region is flagged weak.
 */
const SIDE_IMBALANCE_THRESHOLD = 0.08; // 8% relative diff

function parseNum(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function imbalanced(a: number | null, b: number | null): boolean {
  if (a == null || b == null) return false;
  const avg = (a + b) / 2;
  if (avg <= 0) return false;
  return Math.abs(a - b) / avg >= SIDE_IMBALANCE_THRESHOLD;
}

export function deriveBodyCompMuscleSets(
  strengths: string[] | undefined,
  weaknesses: string[] | undefined,
  formData: FormData | undefined,
): { strong: Muscle[]; weak: Muscle[] } {
  const strong = new Set<Muscle>();
  const weak = new Set<Muscle>();

  for (const s of strengths ?? []) {
    for (const m of regionFromLabel(s)) strong.add(m);
  }
  for (const w of weaknesses ?? []) {
    for (const m of regionFromLabel(w)) weak.add(m);
  }

  // Segmental side-to-side imbalances (legs / arms) → flag the affected region weak
  if (formData) {
    const legL = parseNum((formData as unknown as Record<string, unknown>).segmentalLegLeftKg);
    const legR = parseNum((formData as unknown as Record<string, unknown>).segmentalLegRightKg);
    if (imbalanced(legL, legR)) {
      for (const m of REGIONS.lowerBody) weak.add(m);
    }
    const armL = parseNum((formData as unknown as Record<string, unknown>).segmentalArmLeftKg);
    const armR = parseNum((formData as unknown as Record<string, unknown>).segmentalArmRightKg);
    if (imbalanced(armL, armR)) {
      for (const m of REGIONS.arms) weak.add(m);
    }
  }

  // Weak wins conflicts (priority is on the corrective signal)
  for (const m of weak) strong.delete(m);
  return { strong: [...strong], weak: [...weak] };
}
