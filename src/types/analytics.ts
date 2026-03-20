/**
 * Analytics Types
 *
 * Types for the platform Data Intelligence tab — population analytics,
 * milestone tracking, and progressive tier unlocks.
 */

// ---------------------------------------------------------------------------
// Core building blocks
// ---------------------------------------------------------------------------

export interface ScoreDistributionBucket {
  range: '0-20' | '20-40' | '40-60' | '60-80' | '80-100';
  count: number;
  pct: number; // 0–100
}

export interface CorrelationFinding {
  varA: string;
  varB: string;
  labelA: string;
  labelB: string;
  r: number;
  n: number;
  direction: 'positive' | 'negative';
  strength: 'strong' | 'moderate' | 'weak';
  highGroupMeanB: number;
  lowGroupMeanB: number;
  diffPct: number;
}

export type PillarKey = 'overall' | 'bodyComp' | 'cardio' | 'strength' | 'movementQuality' | 'lifestyle';

// ---------------------------------------------------------------------------
// Milestone / Reminder System
// ---------------------------------------------------------------------------

export const ANALYTICS_TIER_ORDER = [
  'descriptive',
  'descriptive_live',
  'correlational',
  'cohort',
  'ml_clustering',
  'injury_risk',
  'population_report',
] as const;

export type AnalyticsTier = (typeof ANALYTICS_TIER_ORDER)[number];

export interface TierDefinition {
  tier: AnalyticsTier;
  threshold: number;
  label: string;
  description: string;
  preview: string; // teaser text shown when locked
}

export const TIER_DEFINITIONS: TierDefinition[] = [
  {
    tier: 'descriptive',
    threshold: 0,
    label: 'Descriptive Analytics',
    description: 'Score distribution charts and population profile cards are live.',
    preview: 'Score distributions, goal breakdown, and lifestyle snapshot are ready to use from the first assessment.',
  },
  {
    tier: 'descriptive_live',
    threshold: 10,
    label: 'Live Population Data',
    description: 'Charts now reflect real data across your client population.',
    preview: 'Reach 10 scored assessments and all charts switch from empty states to live population data.',
  },
  {
    tier: 'correlational',
    threshold: 50,
    label: 'Correlational Analysis',
    description: 'Pearson correlations across lifestyle and pillar pairs — strongest relationships surface as plain-English findings each time you compute.',
    preview: 'At 50 assessments you can start discovering non-obvious relationships — e.g. does high stress predict low cardio scores?',
  },
  {
    tier: 'cohort',
    threshold: 100,
    label: 'Cohort Retention Analysis',
    description: 'Organisation cohort tables showing which signup-month cohorts are still active at 30/60/90 days.',
    preview: 'At 100 assessments across multiple orgs, cohort survival curves reveal which behaviours predict long-term retention.',
  },
  {
    tier: 'ml_clustering',
    threshold: 200,
    label: 'ML Archetype Clustering',
    description: 'K-means clustering replaces rule-based archetypes with data-driven client profiles.',
    preview: 'At 200 assessments the data tells you how many natural client groupings actually exist — usually 5–8 empirical archetypes.',
  },
  {
    tier: 'injury_risk',
    threshold: 500,
    label: 'Injury Risk Model',
    description: 'Logistic regression classifier predicting injury risk from movement quality and bilateral asymmetry.',
    preview: 'At 500 assessments you have enough signal to train a model that flags high-risk clients before injury occurs.',
  },
  {
    tier: 'population_report',
    threshold: 1000,
    label: 'Population Health Report',
    description: 'Publishable anonymised report: normative data, clinical pattern prevalence, and outcome benchmarks.',
    preview: 'At 1 000 assessments you hold a genuinely novel dataset — prevalence of compensation patterns, VO₂max norms, and more.',
  },
];

// ---------------------------------------------------------------------------
// Firestore documents
// ---------------------------------------------------------------------------

export interface MilestonesDoc {
  totalScoredAssessments: number;
  unlockedTiers: AnalyticsTier[];
  lastComputedAt: Date;
  seenByAdminAt?: Date;
}

export interface LongitudinalInsights {
  /** Number of unique clients with 2+ sessions (the sample for this analysis) */
  clientCount: number;
  /** Mean (latestScore − firstScore) across all multi-session clients */
  avgScoreImprovement: number;
  /** Clients whose overall score improved by ≥5 points */
  clientsImproved: number;
  /** Clients whose overall score stayed within ±5 points */
  clientsStable: number;
  /** Clients whose overall score declined by ≥5 points */
  clientsDeclined: number;
  /** Per-pillar mean improvement — pillarId → avg delta (positive = improved) */
  pillarImprovements: Record<string, number>;
}

/** Per-org stats stored inside the population doc */
export interface OrgBreakdownEntry {
  name: string;
  clientCount: number;
  avgScore: number;
  totalSessions: number;
  avgImprovement: number | null;
}

export interface PopulationAnalytics {
  computedAt: Date;
  totalScoredAssessments: number;
  /** Total unique clients across all organisations — promoted to top-level for easy access */
  uniqueClientCount?: number;

  scoreDistributions: Record<PillarKey, ScoreDistributionBucket[]>;

  /** Goal → count (multi-select, so total can exceed session count) */
  goalDistribution: Record<string, number>;

  /** Synthesis pattern title (slug) → count */
  clinicalPatterns: Record<string, number>;

  lifestyleProfile: {
    sleep: Record<string, number>;
    stress: Record<string, number>;
    nutrition?: Record<string, number>;
    hydration?: Record<string, number>;
    activity?: Record<string, number>;
    alcohol?: Record<string, number>;
  };

  /** 'beginner' | 'intermediate' | 'advanced' → count */
  trainingHistory: Record<string, number>;

  /** Clients reporting pain in at least one movement test */
  painReported: number;

  /** Per-movement pain counts — additive to painReported total */
  painByMovement?: { ohs: number; hinge: number; lunge: number };

  /** BMI bucket → count (InBody method only, with NaN guards) */
  bmiDistribution?: Record<string, number>;

  /** Body fat % bucket → count (InBody method only) */
  bodyFatDistribution?: Record<string, number>;

  /** Visceral fat level bucket → count (InBody method only) */
  visceralFatDistribution?: Record<string, number>;

  /** Age bucket → unique client count (e.g. '18-29': 12, '30-39': 24) */
  ageDistribution: Record<string, number>;

  /** Normalised gender key → unique client count (e.g. 'male': 30, 'female': 25) */
  genderDistribution: Record<string, number>;

  /** 'YYYY-MM' → session count — monthly assessment volume for trend chart */
  monthlyAssessmentVolume: Record<string, number>;

  /** 'YYYY-MM' → mean overall score (scored sessions only) — for score trend chart */
  monthlyAverageScores?: Record<string, number>;

  /** Pearson correlation findings across lifestyle and pillar variable pairs */
  correlationFindings?: CorrelationFinding[];

  /** Assessment type breakdown and per-client frequency */
  assessmentPatterns?: {
    fullCount: number;
    partialCount: number;
    /** Sessions with no recognisable type field */
    untypedCount: number;
    /** fullCount + partialCount + untypedCount */
    totalSnapshotCount: number;
    /** Which pillars are being partially updated most — e.g. 'bodycomp': 12 */
    partialByPillar: Record<string, number>;
    uniqueClientCount: number;
    avgSessionsPerClient: number;
    /** Null when fewer than 2 sessions exist per any client */
    avgDaysBetweenSessions: number | null;
  };

  /** Improvement tracking — only present when ≥2 clients have 2+ sessions */
  longitudinalInsights?: LongitudinalInsights;

  /** Per-organisation breakdown — orgId → stats */
  orgBreakdown?: Record<string, OrgBreakdownEntry>;

  // ── New fields (outcome intelligence + engagement) ──────────────────────

  /** Outcome funnel — clients with 2+ sessions grouped by improvement delta and engagement depth */
  outcomeFunnel?: OutcomeFunnel;

  /** Avg score by engagement tier (clients grouped by session count) */
  engagementCohorts?: EngagementCohort[];

  /** Platform data quality and retention signals */
  dataCompleteness?: DataCompleteness;

  /** ISO date string of the earliest session on the platform */
  earliestSessionDate?: string;
}

// ---------------------------------------------------------------------------
// Outcome Intelligence types
// ---------------------------------------------------------------------------

export interface OutcomeBucket {
  /** Clients whose overall score improved by ≥5 points */
  improved: number;
  /** Clients whose overall score stayed within ±5 points */
  stable: number;
  /** Clients whose overall score declined by ≥5 points */
  declined: number;
  total: number;
  /** Mean (latestScore − firstScore) across all clients in this bucket */
  avgImprovement: number;
}

export interface OutcomeFunnel {
  /** Aggregate across all multi-session clients */
  overall: OutcomeBucket;
  /** Broken down by how many sessions the client has had */
  byEngagement: {
    '2-3': OutcomeBucket;
    '4-6': OutcomeBucket;
    '7+': OutcomeBucket;
  };
}

export interface EngagementCohort {
  /** Human-readable bracket label: '1 session', '2–3', '4–6', '7+' */
  label: string;
  /** Raw bracket key for sorting */
  bracket: '1' | '2-3' | '4-6' | '7+';
  count: number;
  avgScore: number;
  /** Null for the '1 session' tier — no longitudinal data */
  avgImprovement: number | null;
}

export interface DataCompleteness {
  /** % of sessions where all 5 pillars returned score > 0 */
  pct5Pillars: number;
  /** % of clients with dateOfBirth on file */
  pctWithDOB: number;
  /** % of clients with at least one goal stated */
  pctWithGoals: number;
  /** % of unique clients who have returned for a 2nd session */
  returnRate: number;
}

// ---------------------------------------------------------------------------
// Derived / chart-ready shapes used by the hook
// ---------------------------------------------------------------------------

export interface PillarDistributionChartData {
  pillar: PillarKey;
  label: string;
  buckets: ScoreDistributionBucket[];
}

export interface GoalChartEntry {
  name: string;
  value: number;
}

export interface PatternChartEntry {
  pattern: string;
  count: number;
  pct: number;
}

export interface MilestoneProgress {
  currentCount: number;
  nextTier: TierDefinition | null;
  progressPct: number; // toward next tier threshold
  unlockedTiers: AnalyticsTier[];
  hasNewUnlocks: boolean; // tiers unlocked since seenByAdminAt
}
