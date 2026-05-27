/**
 * Maps strength assessment strengths/weaknesses (free-text strings from the
 * scoring engine's category.strengths / category.weaknesses arrays) to
 * muscle groups for visualisation on the body diagram.
 *
 * The matching is keyword-based on lowercase text. Adjust patterns as the
 * strength scoring engine refines its label vocabulary.
 */

import type { Muscle } from 'react-body-highlighter';

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

interface StrengthPattern {
  /** Substring (lowercased) to match in the strength/weakness label. */
  match: RegExp;
  muscles: Muscle[];
}

/**
 * Heuristic mapping from strength assessment phrases to implicated muscle
 * groups. Order doesn't matter — all matching entries contribute their
 * muscles. Designed to cover the common Strength pillar labels.
 */
const STRENGTH_PATTERNS: StrengthPattern[] = [
  // Upper body push
  {
    match: /upper body push|bench|push.up|push press|overhead press|shoulder press/,
    muscles: [M.chest, M.frontDeltoids, M.triceps],
  },
  // Upper body pull
  {
    match: /upper body pull|pull.up|chin.up|row|lat pulldown/,
    muscles: [M.upperBack, M.biceps, M.backDeltoids, M.trapezius],
  },
  // Grip / forearm
  {
    match: /grip|forearm|farmer/,
    muscles: [M.forearm],
  },
  // Core stability
  {
    match: /core stability|core|plank|abdominal|abs|midline/,
    muscles: [M.abs, M.obliques, M.lowerBack],
  },
  // Lower body push / squat
  {
    match: /lower body push|squat|leg press|lunge press/,
    muscles: [M.quadriceps, M.gluteal, M.calves],
  },
  // Lower body pull / hinge / posterior chain
  {
    match: /lower body pull|hinge|deadlift|posterior chain|hip thrust|romanian/,
    muscles: [M.hamstring, M.gluteal, M.lowerBack],
  },
  // Single-leg / unilateral lower
  {
    match: /single.leg|unilateral|split squat/,
    muscles: [M.quadriceps, M.gluteal],
  },
  // Muscular endurance — broad, default to a balanced set
  {
    match: /muscular endurance|endurance/,
    muscles: [M.abs, M.upperBack, M.gluteal],
  },
  // Generic "upper body"
  {
    match: /upper body/,
    muscles: [M.chest, M.upperBack, M.frontDeltoids, M.backDeltoids],
  },
  // Generic "lower body"
  {
    match: /lower body|legs?$/,
    muscles: [M.quadriceps, M.hamstring, M.gluteal],
  },
];

function musclesFromLabel(label: string): Muscle[] {
  const lower = label.toLowerCase();
  const out = new Set<Muscle>();
  for (const p of STRENGTH_PATTERNS) {
    if (p.match.test(lower)) {
      for (const m of p.muscles) out.add(m);
    }
  }
  return [...out];
}

/**
 * Convert a category's strengths/weaknesses labels into strong/weak muscle
 * sets. If a muscle appears in both, weak wins — corrective focus takes
 * priority over celebration.
 */
export function deriveStrengthMuscleSets(
  strengths: string[] | undefined,
  weaknesses: string[] | undefined,
): { strong: Muscle[]; weak: Muscle[] } {
  const strong = new Set<Muscle>();
  const weak = new Set<Muscle>();
  for (const s of strengths ?? []) {
    for (const m of musclesFromLabel(s)) strong.add(m);
  }
  for (const w of weaknesses ?? []) {
    for (const m of musclesFromLabel(w)) weak.add(m);
  }
  for (const m of weak) strong.delete(m);
  return { strong: [...strong], weak: [...weak] };
}
