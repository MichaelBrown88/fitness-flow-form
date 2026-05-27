/**
 * Maps each posture finding to the muscle groups it typically implicates —
 * "tight" (shortened / overactive) and "weak" (lengthened / underactive).
 *
 * Drives the muscle-highlight body diagram in the posture report so a client
 * can see which areas the corrective plan targets. Standard upper-/lower-cross
 * syndrome logic. Refine as the clinical content matures.
 *
 * Muscle names match `react-body-highlighter`'s Muscle type — only those exact
 * strings render on the model.
 */

import type { Muscle } from 'react-body-highlighter';

export interface MuscleImplication {
  tight: Muscle[];
  weak: Muscle[];
}

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
  head: 'head' as Muscle,
  neck: 'neck' as Muscle,
  knees: 'knees' as Muscle,
};

export const FINDING_MUSCLE_MAP: Record<string, MuscleImplication> = {
  // ─── Head / neck ──────────────────────────────────────────────
  forward_head: {
    tight: [M.neck, M.trapezius, M.chest],
    weak: [M.upperBack, M.backDeltoids],
  },
  head_pitch_up: {
    tight: [M.neck, M.trapezius],
    weak: [M.upperBack],
  },

  // ─── Shoulders / upper back ───────────────────────────────────
  rounded_shoulders: {
    tight: [M.chest, M.frontDeltoids],
    weak: [M.upperBack, M.trapezius, M.backDeltoids],
  },
  shoulder_asymmetry: {
    tight: [M.trapezius],
    weak: [M.upperBack],
  },

  // ─── Trunk / spine ────────────────────────────────────────────
  forward_trunk_lean: {
    tight: [M.chest, M.hamstring],
    weak: [M.lowerBack, M.gluteal, M.upperBack],
  },
  spinal_lateral_shift: {
    tight: [M.obliques, M.lowerBack],
    weak: [M.abs, M.obliques],
  },

  // ─── Pelvis ───────────────────────────────────────────────────
  anterior_pelvic_tilt: {
    tight: [M.quadriceps, M.lowerBack],
    weak: [M.abs, M.gluteal, M.hamstring],
  },
  posterior_pelvic_tilt: {
    tight: [M.hamstring, M.abs, M.gluteal],
    weak: [M.lowerBack, M.quadriceps],
  },
  lateral_pelvic_shift: {
    tight: [M.obliques, M.lowerBack],
    weak: [M.gluteal, M.abductors],
  },
  uneven_hip_height: {
    tight: [M.obliques, M.lowerBack],
    weak: [M.gluteal, M.abductors],
  },

  // ─── Knees ────────────────────────────────────────────────────
  left_knee_valgus: {
    tight: [M.adductor],
    weak: [M.gluteal, M.abductors, M.knees],
  },
  right_knee_valgus: {
    tight: [M.adductor],
    weak: [M.gluteal, M.abductors, M.knees],
  },
  left_knee_varus: {
    tight: [M.abductors],
    weak: [M.adductor, M.knees],
  },
  right_knee_varus: {
    tight: [M.abductors],
    weak: [M.adductor, M.knees],
  },

  // ─── Ankles / feet ────────────────────────────────────────────
  ankle_pronation_left: {
    tight: [M.calves],
    weak: [M.calves, M.knees],
  },
  ankle_pronation_right: {
    tight: [M.calves],
    weak: [M.calves, M.knees],
  },
};

/**
 * Returns the deduped tight + weak muscle sets across a list of findings.
 * If a muscle appears as both tight (e.g. for one finding) and weak (for
 * another), tight wins — overactive tissue takes priority in the highlight.
 */
export function combineMuscleImplications(findingIds: string[]): MuscleImplication {
  const tight = new Set<Muscle>();
  const weak = new Set<Muscle>();
  for (const id of findingIds) {
    const impl = FINDING_MUSCLE_MAP[id];
    if (!impl) continue;
    for (const m of impl.tight) tight.add(m);
    for (const m of impl.weak) weak.add(m);
  }
  // Tight wins conflicts
  for (const m of tight) weak.delete(m);
  return { tight: [...tight], weak: [...weak] };
}
