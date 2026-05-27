/**
 * Client-facing copy for AXIS report surfaces.
 */

export const CLIENT_REPORT_COPY = {
  targetsUnavailable: "Targets aren't available for this pillar in this assessment.",
  pillarNotAssessed: "This pillar wasn't part of this session.",
  snapshotHeading: 'Snapshot',
  strengthsHeading: 'Strengths',
  focusHeading: 'Focus areas',
  targetsHeading: 'Your targets',
  axisSummaryHeading: 'Summary',
  heroPrioritiesHeading: 'What matters now',
  outlookHeading: 'What you can achieve',
  baselineNarrative: "This is your baseline — next time you'll see what moved.",
  partialAssessmentHeading: 'This session covered',
  goingWell: 'Going well',
  focusNext: 'Focus next',
  pillarsOverviewHeading: 'Your five pillars',
  movementPatterns: 'Movement patterns',
  posture: 'Posture',
  postureTapHint: 'Tap a view for detail',
  arcTeaserTitle: 'Your ARC™ plan',
  arcTeaserBody: 'Your coach is building your journey — open the ARC tab when it is ready.',
  arcTeaserCta: 'Open ARC™',
} as const;

/** Short client-facing pillar names (radar, jumps, sections). */
export const CLIENT_PILLAR_LABELS: Record<string, string> = {
  'Body Composition': 'Body composition',
  'Functional Strength': 'Strength',
  'Metabolic Fitness': 'Cardio',
  'Movement Quality': 'Movement',
  'Lifestyle Factors': 'Lifestyle',
  bodyComp: 'Body composition',
  strength: 'Strength',
  cardio: 'Cardio',
  movementQuality: 'Movement',
  lifestyle: 'Lifestyle',
};

export const CLIENT_METRIC_LABELS: Record<
  string,
  { short: string; hint?: string }
> = {
  vo2: { short: 'Fitness level', hint: 'How well your heart and lungs support effort' },
  rhr: { short: 'Resting heart rate', hint: 'Lower is generally better at rest' },
  hrr: { short: 'Heart recovery', hint: 'How quickly your heart rate drops after effort' },
  bodyWeight: { short: 'Body weight' },
  muscleMass: { short: 'Muscle mass' },
  bodyFat: { short: 'Body fat' },
  endurance: { short: 'Muscular endurance' },
  core: { short: 'Core stability' },
  grip: { short: 'Grip strength' },
};

/** Map radar / full label to scroll anchor section id */
export const FULL_LABEL_TO_SECTION_ID: Record<string, string> = {
  'Body Composition': 'body-comp',
  'Functional Strength': 'strength',
  'Metabolic Fitness': 'cardio',
  'Movement Quality': 'movement-quality',
  'Lifestyle Factors': 'lifestyle',
};

export const SCORING_ID_TO_SECTION_ID: Record<string, string> = {
  bodyComp: 'body-comp',
  strength: 'strength',
  cardio: 'cardio',
  movementQuality: 'movement-quality',
  lifestyle: 'lifestyle',
};
