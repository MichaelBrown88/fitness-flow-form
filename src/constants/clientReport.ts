/**
 * Client-facing copy for AXIS report surfaces.
 */

export const CLIENT_REPORT_COPY = {
  targetsUnavailable: "Targets aren't available for this pillar in this assessment.",
  pillarNotAssessed: "This pillar wasn't part of this session.",
  snapshotHeading: 'Snapshot',
  /** Client pillars are text-first; only posture scan photos use the snapshot slot when present. */
  postureSnapshotHeading: 'Your posture scan',
  strengthsHeading: 'Strengths',
  focusHeading: 'Focus areas',
  targetsHeading: 'Your targets',
  targetsDetailsToggle: 'Show target numbers',
  targetsDetailsHide: 'Hide target numbers',
  axisSummaryHeading: 'Your story',
  whereYouAreHeading: 'Where you are',
  heroPrioritiesHeading: 'What matters now',
  strengthsSnapshotHeading: "What's going well",
  focusSnapshotHeading: 'What to work on',
  outlookHeading: 'Where we\'re heading',
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
  /** V2 client report — calm debrief layout */
  v2HeroWelcomeFallback:
    'Your coach has a clear picture of where you are today — and a plan to help you reach your goals.',
  v2PlanHeading: 'Your path forward',
  v2PillarsHeading: 'Your pillars',
  v2PostureHeading: 'Your posture scan',
  v2PostureSubheading: 'Tap a view to see detail on your scan.',
  v2PrimaryGoalPrefix: 'Your goal',
  v2FindingsHeading: 'What we measured',
  v2ProgressionHeading: 'Your progression',
  v2MovementStoryHeading: 'Movement screen',
  v2LifestyleStoryHeading: 'Daily habits & recovery',
  v2NarrativePlanHeading: 'What we\'re building toward',
  v2TakeawayLabel: 'Takeaway',
  v2PostureWhatItMeans: 'What this means',
  v2PostureWhatWeDo: 'What we\'ll work on',
  v2DocumentTitle: 'AXIS Assessment Report',
  v2DocumentSubtitle: 'Personal health & performance summary',
  progressionMetricCol: 'Metric',
  progressionNowCol: 'Now',
  progressionFourMonthCol: '4 months',
  progressionOneYearCol: '1 year',
  postureFindingsHeading: 'What we found',
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
