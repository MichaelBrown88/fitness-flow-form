/**
 * Population Analytics
 *
 * Scans all assessment sessions via a paginated collection-group query on the
 * 'sessions' collection (1 000 docs per page), computes population-level statistics,
 * and writes two pre-computed docs:
 *
 *   platform_analytics/population  — chart data for the Data Intelligence tab
 *   platform_analytics/milestones  — tier unlock state + badge signal
 *
 * Session document structure (organizations/{orgId}/clients/{slug}/sessions/{id}):
 * {
 *   overallScore: number,           // top-level
 *   formData: FormData,             // all raw form fields
 *   organizationId: string,
 *   schemaVersion: 2,
 *   scoresSummary?: {
 *     overall: number,
 *     categories: { id, score, weaknesses }[]
 *   }
 * }
 *
 * Safe to run as a nightly scheduled function or an on-demand callable.
 * PREREQUISITE: firestore.indexes.json must include a COLLECTION_GROUP index
 * on 'sessions' deployed before this function runs.
 */

import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

/**
 * One row of numeric data per scored session, used for Pearson correlation.
 * Lifestyle fields are ordinal-encoded so they can be correlated with scores.
 * Undefined means the field wasn't present in that session's formData.
 */
interface CorrRow {
  overall: number;
  bodyComp?: number;
  cardio?: number;
  strength?: number;
  movementQuality?: number;
  lifestyle?: number;
  /** 1=very-low 2=low 3=moderate 4=high */
  stress?: number;
  /** 1=poor 2=fair 3=good 4=excellent */
  sleep?: number;
  /** 1=beginner 2=intermediate 3=advanced */
  training?: number;
  /** 1=poor 2=fair 3=good 4=excellent */
  nutrition?: number;
  /** 1=poor 2=fair 3=good 4=excellent */
  hydration?: number;
  /** 1=sedentary 2=lightly-active 3=moderately-active 4=very-active 5=extremely-active */
  activityLevel?: number;
  /** 0=no pain, 1=pain reported */
  pain?: number;
  /** 1=never 2=occasionally 3=weekly 4=daily */
  alcohol?: number;
  /** Age in years */
  age?: number;
  /** BMI from InBody scan */
  bmi?: number;
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
  /** Mean of varB for sessions where varA is in the upper half */
  highGroupMeanB: number;
  /** Mean of varB for sessions where varA is in the lower half */
  lowGroupMeanB: number;
  /** % difference between groups — sign matches direction */
  diffPct: number;
}

interface ScoreDistributionBucket {
  range: '0-20' | '20-40' | '40-60' | '60-80' | '80-100';
  count: number;
  pct: number;
}

type PillarKey = 'overall' | 'bodyComp' | 'cardio' | 'strength' | 'movementQuality' | 'lifestyle';

const SCORE_RANGES: ScoreDistributionBucket['range'][] = ['0-20', '20-40', '40-60', '60-80', '80-100'];

const TIER_THRESHOLDS: Record<string, number> = {
  descriptive: 0,
  descriptive_live: 10,
  correlational: 50,
  cohort: 100,
  ml_clustering: 200,
  injury_risk: 500,
  population_report: 1000,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDb() {
  return admin.firestore();
}

function rangeBucket(score: number): ScoreDistributionBucket['range'] {
  if (score < 20) return '0-20';
  if (score < 40) return '20-40';
  if (score < 60) return '40-60';
  if (score < 80) return '60-80';
  return '80-100';
}

function emptyBuckets(): ScoreDistributionBucket[] {
  return SCORE_RANGES.map(r => ({ range: r, count: 0, pct: 0 }));
}

function normaliseBuckets(
  buckets: ScoreDistributionBucket[],
  total: number,
): ScoreDistributionBucket[] {
  return buckets.map(b => ({
    ...b,
    pct: total > 0 ? Math.round((b.count / total) * 100) : 0,
  }));
}

function incrementKey(map: Record<string, number>, key: string | undefined): void {
  if (!key) return;
  map[key] = (map[key] ?? 0) + 1;
}

function calculateAge(dateOfBirth: unknown): number | null {
  if (typeof dateOfBirth !== 'string' || !dateOfBirth) return null;
  const birth = new Date(dateOfBirth);
  if (isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age > 10 && age < 120 ? age : null;
}

function ageBucket(age: number): string {
  if (age < 30) return '18-29';
  if (age < 40) return '30-39';
  if (age < 50) return '40-49';
  if (age < 60) return '50-59';
  return '60+';
}

// ---------------------------------------------------------------------------
// Correlation helpers
// ---------------------------------------------------------------------------

const STRESS_ENCODE:   Record<string, number> = { 'very-low': 1, 'low': 2, 'moderate': 3, 'high': 4 };
const SLEEP_ENCODE:    Record<string, number> = { 'poor': 1, 'fair': 2, 'good': 3, 'excellent': 4 };
const TRAIN_ENCODE:    Record<string, number> = { 'beginner': 1, 'intermediate': 2, 'advanced': 3 };
const NUTR_ENCODE:     Record<string, number> = { 'poor': 1, 'fair': 2, 'good': 3, 'excellent': 4 };
const HYDRATION_ENCODE:Record<string, number> = { 'poor': 1, 'fair': 2, 'good': 3, 'excellent': 4 };
const ACTIVITY_ENCODE: Record<string, number> = {
  'sedentary': 1, 'lightly-active': 2, 'moderately-active': 3, 'very-active': 4, 'extremely-active': 5,
};
const ALCOHOL_ENCODE:  Record<string, number> = { 'never': 1, 'occasionally': 2, 'weekly': 3, 'daily': 4 };

const VAR_LABELS: Record<string, string> = {
  overall: 'Overall Score',
  bodyComp: 'Body Composition',
  cardio: 'Cardio Score',
  strength: 'Strength Score',
  movementQuality: 'Movement Quality',
  lifestyle: 'Lifestyle Score',
  stress: 'Stress Level',
  sleep: 'Sleep Quality',
  training: 'Training Experience',
  nutrition: 'Nutrition Quality',
  hydration: 'Hydration Quality',
  activityLevel: 'Activity Level',
  pain: 'Movement Pain',
  alcohol: 'Alcohol Frequency',
  age: 'Age',
  bmi: 'BMI',
};

type CorrKey = keyof CorrRow;

const CORR_PAIRS: [CorrKey, CorrKey][] = [
  // Stress vs all pillars
  ['stress', 'overall'],
  ['stress', 'cardio'],
  ['stress', 'lifestyle'],
  ['stress', 'movementQuality'],
  ['stress', 'bodyComp'],
  ['stress', 'strength'],
  // Sleep vs all pillars
  ['sleep', 'overall'],
  ['sleep', 'cardio'],
  ['sleep', 'lifestyle'],
  ['sleep', 'strength'],
  ['sleep', 'bodyComp'],
  // Nutrition vs relevant pillars
  ['nutrition', 'overall'],
  ['nutrition', 'bodyComp'],
  ['nutrition', 'lifestyle'],
  // Training experience vs performance pillars
  ['training', 'overall'],
  ['training', 'strength'],
  ['training', 'cardio'],
  ['training', 'movementQuality'],
  // Pain vs movement
  ['pain', 'movementQuality'],
  ['pain', 'overall'],
  ['pain', 'strength'],
  // Hydration and activity level
  ['hydration', 'overall'],
  ['hydration', 'lifestyle'],
  ['activityLevel', 'overall'],
  ['activityLevel', 'cardio'],
  ['activityLevel', 'lifestyle'],
  // Alcohol
  ['alcohol', 'overall'],
  ['alcohol', 'lifestyle'],
  ['alcohol', 'bodyComp'],
  // Age vs scores (clinically significant)
  ['age', 'overall'],
  ['age', 'bodyComp'],
  ['age', 'cardio'],
  ['age', 'strength'],
  // BMI vs body comp (InBody clients)
  ['bmi', 'bodyComp'],
  ['bmi', 'overall'],
  // Pillar cross-correlations
  ['cardio', 'bodyComp'],
  ['cardio', 'lifestyle'],
  ['cardio', 'strength'],
  ['cardio', 'movementQuality'],
  ['strength', 'movementQuality'],
  ['bodyComp', 'lifestyle'],
];

function pearson(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n < 5) return null;
  const mx = xs.reduce((s, x) => s + x, 0) / n;
  const my = ys.reduce((s, y) => s + y, 0) / n;
  let num = 0, dxSq = 0, dySq = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx, dy = ys[i] - my;
    num += dx * dy;
    dxSq += dx * dx;
    dySq += dy * dy;
  }
  const denom = Math.sqrt(dxSq * dySq);
  if (denom === 0) return null;
  return Math.round((num / denom) * 1000) / 1000;
}

function groupSplit(xs: number[], ys: number[]): { highGroupMeanB: number; lowGroupMeanB: number; diffPct: number } | null {
  if (xs.length < 4) return null;

  // Sort a copy of (x, y) pairs so we can split on rank rather than median value.
  // Splitting on the median VALUE causes an empty lower group when all x values are equal.
  // Splitting on rank (lower 50% by index vs upper 50%) always gives two non-empty groups.
  const pairs = xs.map((x, i) => ({ x, y: ys[i] })).sort((a, b) => a.x - b.x);
  const mid = Math.floor(pairs.length / 2);
  const lowPairs  = pairs.slice(0, mid);
  const highPairs = pairs.slice(mid);

  if (lowPairs.length === 0 || highPairs.length === 0) return null;

  const highMean = highPairs.reduce((s, p) => s + p.y, 0) / highPairs.length;
  const lowMean  = lowPairs.reduce((s, p)  => s + p.y, 0) / lowPairs.length;

  // If the two groups have essentially the same mean, don't emit a finding —
  // it would just say "100% higher vs 0" which is meaningless noise.
  if (Math.abs(highMean - lowMean) < 1) return null;

  const base = Math.abs(lowMean) > 0 ? lowMean : highMean;
  const diffPct = base !== 0 ? Math.round(((highMean - lowMean) / Math.abs(base)) * 100) : 0;
  return {
    highGroupMeanB: Math.round(highMean * 10) / 10,
    lowGroupMeanB:  Math.round(lowMean  * 10) / 10,
    diffPct,
  };
}

/**
 * Derive clinical pattern flags directly from formData + category scores.
 * This mirrors the conditions in synthesisGenerator.ts but runs server-side
 * without needing to import the frontend scoring modules.
 */
function deriveClinicalPatterns(
  formData: Record<string, unknown>,
  catMap: Record<string, number>,
  patterns: Record<string, number>,
): void {
  const cardio = catMap['cardio'] ?? 0;
  const strength = catMap['strength'] ?? 0;
  const movement = catMap['movementQuality'] ?? 0;
  const lifestyle = catMap['lifestyle'] ?? 0;
  const bodyComp = catMap['bodyComp'] ?? 0;

  const visceral = Number(formData.visceralFatLevel ?? 0);
  const sleep = formData.sleepArchetype as string | undefined;
  const stress = formData.stressLevel as string | undefined;
  const recentActivity = formData.recentActivity as string | undefined;
  const trainingHist = formData.trainingHistory as string | undefined;
  const primaryGoal = Array.isArray(formData.clientGoals)
    ? String(formData.clientGoals[0] ?? '')
    : String(formData.clientGoals ?? '');

  // Risk patterns
  if (visceral >= 12 && cardio < 50) incrementKey(patterns, 'metabolic_risk');
  if (strength > 70 && movement < 50) incrementKey(patterns, 'structural_injury_risk');
  if ((sleep === 'poor') && (stress === 'high')) incrementKey(patterns, 'systemic_recovery_crisis');
  if (bodyComp < 50 && strength < 50) incrementKey(patterns, 'structural_integrity_needed');

  // Opportunity patterns
  if (strength >= 85 && cardio >= 85) incrementKey(patterns, 'hybrid_athlete');
  if (movement >= 80 && strength >= 80) incrementKey(patterns, 'structural_mastery');
  if (lifestyle >= 80 && bodyComp >= 80) incrementKey(patterns, 'metabolic_resilience');
  if (recentActivity === 'stopped-6-months') incrementKey(patterns, 'structural_durability');
  if (trainingHist === 'beginner' && primaryGoal !== 'general-health') {
    incrementKey(patterns, 'rapid_adaptive_potential');
  }
}

// ---------------------------------------------------------------------------
// Main computation
// ---------------------------------------------------------------------------

export async function runPopulationAnalytics(): Promise<void> {
  const db = getDb();

  logger.info('[PopulationAnalytics] Starting computation');

  // --- 0. Load the set of valid organisation IDs ---
  // Only snapshots/clients from these orgs are included. This prevents orphaned
  // legacy orgs (test data, development stubs, deleted organisations whose subcollection
  // data was never purged) from contaminating platform-level metrics.
  const orgsSnap = await db.collection('organizations').select().get();
  const validOrgIds = new Set(orgsSnap.docs.map(d => d.id));
  logger.info(`[PopulationAnalytics] Valid orgs: ${validOrgIds.size} (${[...validOrgIds].join(', ')})`);

  // --- 1. Fetch all snapshots via paginated collection group query ---
  // Paginated in batches of 1 000 to avoid the hard Firestore limit and support
  // platforms with large datasets. Sorted in memory post-fetch for determinism
  // (an ORDER BY would require a deployed COLLECTION_GROUP index on the sort field).
  const BATCH = 1000;
  const allSnapshotDocs: admin.firestore.QueryDocumentSnapshot[] = [];
  let lastDoc: admin.firestore.QueryDocumentSnapshot | undefined;
  do {
    const q = lastDoc
      ? db.collectionGroup('sessions').orderBy(admin.firestore.FieldPath.documentId()).startAfter(lastDoc).limit(BATCH)
      : db.collectionGroup('sessions').orderBy(admin.firestore.FieldPath.documentId()).limit(BATCH);
    const page = await q.get();
    // Only keep sessions whose path is organizations/{validOrgId}/clients/{slug}/sessions/{id}
    for (const doc of page.docs) {
      const parts = doc.ref.path.split('/');
      // Expect: organizations / {orgId} / clients / {slug} / sessions / {id}
      if (parts.length === 6 && parts[0] === 'organizations' && parts[2] === 'clients' && parts[4] === 'sessions') {
        if (validOrgIds.has(parts[1])) {
          allSnapshotDocs.push(doc);
        }
      }
    }
    lastDoc = page.docs[page.docs.length - 1];
    if (page.size < BATCH) break;
  } while (true);

  logger.info(`[PopulationAnalytics] Accepted ${allSnapshotDocs.length} assessment sessions from ${validOrgIds.size} valid org(s)`);

  // ─────────────────────────────────────────────────────────────────────────────
  // ARCHITECTURE NOTE (v2 schema)
  // ─────────────────────────────────────────────────────────────────────────────
  // The client document (organizations/{orgId}/clients/{slug}) is the single source
  // of truth for every client's current state. It is created on the first assessment
  // and updated by every subsequent assessment save.
  //
  // Sessions (clients/{slug}/sessions/{id}) are immutable, append-only assessment
  // events. They serve as the historical record.
  //
  // Analytics data flow:
  //   Client docs (collectionGroup 'clients') → score distributions, demographics,
  //                     lifestyle, goals, clinical patterns, correlation rows (one per client)
  //   Sessions (collectionGroup 'sessions')   → event counts, monthly volume,
  //                     assessment type breakdown, longitudinal first-score anchoring
  // ─────────────────────────────────────────────────────────────────────────────

  // --- 2. Read live client docs (PRIMARY source of truth) ---
  // Path: organizations/{orgId}/clients/{clientSlug}
  // One document per client, always reflects the current composite state.

  interface ClientRecord {
    orgId: string;
    slug: string;
    gender: string | null;
    dateOfBirth: unknown;
    latestScore: number;
    latestScoresSummary?: { categories?: { id: string; score: number }[] };
    formData: Record<string, unknown>;
    // Filled in during snapshot pass for longitudinal analysis
    firstScore: number;
    firstTimestamp: number;
    firstScoresSummary?: { categories?: { id: string; score: number }[] };
    snapshotTimestamps: Date[];
  }

  const clientMap = new Map<string, ClientRecord>();

  const goalDistribution: Record<string, number> = {};
  const clinicalPatterns: Record<string, number> = {};
  const sleepProfile: Record<string, number> = {};
  const stressProfile: Record<string, number> = {};
  const nutritionProfile: Record<string, number> = {};
  const hydrationProfile: Record<string, number> = {};
  const activityProfile: Record<string, number> = {};
  const alcoholProfile: Record<string, number> = {};
  const trainingHistoryMap: Record<string, number> = {};
  const monthlyVolume: Record<string, number> = {};
  const monthlyScoreAccum: Record<string, { sum: number; count: number }> = {};
  const partialByPillar: Record<string, number> = {};
  const bmiDistribution: Record<string, number> = {};
  const bodyFatDistribution: Record<string, number> = {};
  const visceralFatDistribution: Record<string, number> = {};
  const corrRows: CorrRow[] = [];
  let painReported = 0;
  let painOhs = 0;
  let painHinge = 0;
  let painLunge = 0;
  let scoredCount = 0;  // total scored assessment EVENTS (from snapshots) — for milestone tracking
  let fullCount = 0;
  let partialCount = 0;

  // Fetch all client docs across valid orgs
  const liveAssessmentsSnap = await db.collectionGroup('clients').limit(5000).get();
  for (const doc of liveAssessmentsSnap.docs) {
    const parts = doc.ref.path.split('/');
    // Expect: organizations / {orgId} / clients / {clientSlug}  (4 parts)
    if (parts.length !== 4 || parts[0] !== 'organizations' || parts[2] !== 'clients') continue;
    const orgId = parts[1];
    if (!validOrgIds.has(orgId)) continue;

    const data = doc.data() as Record<string, unknown>;
    const overallScore = typeof data.overallScore === 'number' ? data.overallScore : 0;
    if (overallScore <= 0) continue; // skip unscored stubs

    const formData = (data.formData ?? {}) as Record<string, unknown>;
    const scoresSummary = data.scoresSummary as { categories?: { id: string; score: number }[] } | undefined;
    const gender = typeof formData.gender === 'string' && formData.gender ? formData.gender.toLowerCase() : null;

    // clientKey: orgId::docId (doc ID is the client slug in the assessments collection)
    const clientKey = `${orgId}::${doc.id}`;
    clientMap.set(clientKey, {
      orgId, slug: doc.id,
      gender,
      dateOfBirth: formData.dateOfBirth ?? null,
      latestScore: overallScore,
      latestScoresSummary: scoresSummary,
      formData,
      firstScore: overallScore,      // will be overwritten if an earlier snapshot exists
      firstTimestamp: Date.now(),    // will be overwritten to earliest snapshot timestamp
      firstScoresSummary: scoresSummary,
      snapshotTimestamps: [],
    });

    // ── Population distributions (one row per client, current state) ──
    const fGoals = formData.clientGoals;
    const allGoals: string[] = Array.isArray(fGoals)
      ? fGoals.map(String).filter(Boolean)
      : typeof fGoals === 'string' && fGoals ? [fGoals] : [];
    for (const g of allGoals) incrementKey(goalDistribution, g);

    incrementKey(sleepProfile,      typeof formData.sleepArchetype   === 'string' ? formData.sleepArchetype   : undefined);
    incrementKey(stressProfile,     typeof formData.stressLevel      === 'string' ? formData.stressLevel      : undefined);
    incrementKey(nutritionProfile,  typeof formData.nutritionHabits  === 'string' ? formData.nutritionHabits  : undefined);
    incrementKey(hydrationProfile,  typeof formData.hydrationHabits  === 'string' ? formData.hydrationHabits  : undefined);
    incrementKey(activityProfile,   typeof formData.activityLevel    === 'string' ? formData.activityLevel    : undefined);
    incrementKey(alcoholProfile,    typeof formData.alcoholFrequency === 'string' ? formData.alcoholFrequency : undefined);
    incrementKey(trainingHistoryMap, typeof formData.trainingHistory === 'string' ? formData.trainingHistory  : undefined);

    const ohsPain   = formData.ohsHasPain   === true || formData.ohsHasPain   === 'yes';
    const hingePain = formData.hingeHasPain === true || formData.hingeHasPain === 'yes';
    const lungePain = formData.lungeHasPain === true || formData.lungeHasPain === 'yes';
    const hasPain   = ohsPain || hingePain || lungePain;
    if (hasPain)    painReported++;
    if (ohsPain)    painOhs++;
    if (hingePain)  painHinge++;
    if (lungePain)  painLunge++;

    const bmiRaw = parseFloat(typeof formData.inbodyBmi         === 'string' ? formData.inbodyBmi         : '');
    const bfRaw  = parseFloat(typeof formData.inbodyBodyFatPct  === 'string' ? formData.inbodyBodyFatPct  : '');
    const vfRaw  = parseFloat(typeof formData.visceralFatLevel  === 'string' ? formData.visceralFatLevel  : '');
    if (!isNaN(bmiRaw) && bmiRaw > 0) {
      incrementKey(bmiDistribution, bmiRaw < 18.5 ? '<18.5' : bmiRaw < 25 ? '18.5-25' : bmiRaw < 30 ? '25-30' : '30+');
    }
    if (!isNaN(bfRaw) && bfRaw > 0) {
      incrementKey(bodyFatDistribution, bfRaw < 15 ? '<15%' : bfRaw < 20 ? '15-20%' : bfRaw < 25 ? '20-25%' : bfRaw < 30 ? '25-30%' : bfRaw < 35 ? '30-35%' : '35%+');
    }
    if (!isNaN(vfRaw) && vfRaw > 0) {
      incrementKey(visceralFatDistribution, vfRaw < 5 ? '1-4' : vfRaw < 10 ? '5-9' : vfRaw < 15 ? '10-14' : '15+');
    }

    // Build correlation row (one per client, current state data)
    const corrRow: CorrRow = { overall: overallScore };
    for (const cat of scoresSummary?.categories ?? []) {
      if (['bodyComp','cardio','strength','movementQuality','lifestyle'].includes(cat.id)) {
        (corrRow as unknown as Record<string, number>)[cat.id] = cat.score;
      }
    }
    const stressStr = typeof formData.stressLevel      === 'string' ? formData.stressLevel      : '';
    const sleepStr  = typeof formData.sleepArchetype   === 'string' ? formData.sleepArchetype   : '';
    const trainStr  = typeof formData.trainingHistory  === 'string' ? formData.trainingHistory  : '';
    const nutrStr   = typeof formData.nutritionHabits  === 'string' ? formData.nutritionHabits  : '';
    const hydrStr   = typeof formData.hydrationHabits  === 'string' ? formData.hydrationHabits  : '';
    const activStr  = typeof formData.activityLevel    === 'string' ? formData.activityLevel    : '';
    const alcStr    = typeof formData.alcoholFrequency === 'string' ? formData.alcoholFrequency : '';
    if (STRESS_ENCODE[stressStr]   !== undefined) corrRow.stress        = STRESS_ENCODE[stressStr];
    if (SLEEP_ENCODE[sleepStr]     !== undefined) corrRow.sleep         = SLEEP_ENCODE[sleepStr];
    if (TRAIN_ENCODE[trainStr]     !== undefined) corrRow.training      = TRAIN_ENCODE[trainStr];
    if (NUTR_ENCODE[nutrStr]       !== undefined) corrRow.nutrition     = NUTR_ENCODE[nutrStr];
    if (HYDRATION_ENCODE[hydrStr]  !== undefined) corrRow.hydration     = HYDRATION_ENCODE[hydrStr];
    if (ACTIVITY_ENCODE[activStr]  !== undefined) corrRow.activityLevel = ACTIVITY_ENCODE[activStr];
    if (ALCOHOL_ENCODE[alcStr]     !== undefined) corrRow.alcohol       = ALCOHOL_ENCODE[alcStr];
    corrRow.pain = hasPain ? 1 : 0;
    const ageVal = calculateAge(formData.dateOfBirth);
    if (ageVal !== null) corrRow.age = ageVal;
    if (!isNaN(bmiRaw) && bmiRaw > 0) corrRow.bmi = bmiRaw;
    corrRows.push(corrRow);
  }

  logger.info(`[PopulationAnalytics] ${clientMap.size} clients with live assessment data`);

  // --- 3. Snapshot pass (SECONDARY source — historical events only) ---
  // Snapshots are used for:
  //   a) Total session event counts (milestone tracking)
  //   b) Monthly session volume chart
  //   c) Assessment type breakdown (full vs partial)
  //   d) Longitudinal first-score anchoring per client
  //   e) Monthly average score trend (per session event)

  // Sort ascending by timestamp so "first" snapshot per client is deterministic
  const sortedDocs = [...allSnapshotDocs].sort((a, b) => {
    const aMs = (a.data().timestamp as admin.firestore.Timestamp | undefined)?.toMillis() ?? 0;
    const bMs = (b.data().timestamp as admin.firestore.Timestamp | undefined)?.toMillis() ?? 0;
    return aMs !== bMs ? aMs - bMs : (a.id < b.id ? -1 : 1);
  });

  for (const docSnap of sortedDocs) {
    const data = docSnap.data() as Record<string, unknown>;
    const parts = docSnap.ref.path.split('/');
    // parts: organizations / {orgId} / clients / {slug} / sessions / {id}
    const orgId  = parts[1];
    const slug   = parts[3]; // clients document ID = client slug

    const ts = data.timestamp as admin.firestore.Timestamp | undefined;
    const sessionDate = ts?.toDate ? ts.toDate() : null;
    const sessionMs   = sessionDate ? sessionDate.getTime() : 0;
    const overallScore = typeof data.overallScore === 'number' ? data.overallScore : 0;
    const snapshotType = typeof data.type === 'string' ? data.type : '';
    const scoresSummary = data.scoresSummary as { categories?: { id: string; score: number }[] } | undefined;

    // Assessment type counts (session events)
    if (snapshotType === 'full' || snapshotType === 'full-assessment' ||
        snapshotType === 'monthly' || snapshotType === 'manual') {
      fullCount++;
    } else if (snapshotType.startsWith('partial-')) {
      partialCount++;
      incrementKey(partialByPillar, snapshotType.replace('partial-', ''));
    }

    // Monthly session volume
    if (sessionDate) {
      const monthKey = `${sessionDate.getFullYear()}-${String(sessionDate.getMonth() + 1).padStart(2, '0')}`;
      incrementKey(monthlyVolume, monthKey);
    }

    if (overallScore <= 0) continue;
    scoredCount++; // counts assessment EVENTS for milestone tracking

    // Monthly average score trend (per session event)
    if (sessionDate) {
      const monthKey = `${sessionDate.getFullYear()}-${String(sessionDate.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyScoreAccum[monthKey]) monthlyScoreAccum[monthKey] = { sum: 0, count: 0 };
      monthlyScoreAccum[monthKey].sum += overallScore;
      monthlyScoreAccum[monthKey].count += 1;
    }

    // Longitudinal anchoring: find the earliest snapshot per client to establish firstScore
    // The clientKey must match either by exact slug or by slug variant (name formatting)
    const clientKey = `${orgId}::${slug}`;
    const record = clientMap.get(clientKey);
    if (record && sessionMs > 0) {
      record.snapshotTimestamps.push(sessionDate!);
      if (sessionMs < record.firstTimestamp) {
        record.firstTimestamp     = sessionMs;
        record.firstScore         = overallScore;
        record.firstScoresSummary = scoresSummary;
      }
    }
  }

  // --- 3c. Post-loop: build distributions and demographics from live client data ---
  // Each client appears exactly once (from their live assessment doc).
  const distributions: Record<PillarKey, ScoreDistributionBucket[]> = {
    overall: emptyBuckets(),
    bodyComp: emptyBuckets(),
    cardio: emptyBuckets(),
    strength: emptyBuckets(),
    movementQuality: emptyBuckets(),
    lifestyle: emptyBuckets(),
  };
  const ageDistribution: Record<string, number> = {};
  const genderDistribution: Record<string, number> = {};

  for (const record of clientMap.values()) {
    // Demographics (per unique client, regardless of score)
    if (record.gender) incrementKey(genderDistribution, record.gender);
    const age = calculateAge(record.dateOfBirth);
    if (age !== null) incrementKey(ageDistribution, ageBucket(age));

    // Distributions and clinical patterns only for clients with a scored snapshot
    if (record.latestScore <= 0) continue;
    const ob = distributions.overall.find(b => b.range === rangeBucket(record.latestScore));
    if (ob) ob.count++;
    for (const cat of record.latestScoresSummary?.categories ?? []) {
      const pillar = cat.id as PillarKey;
      if (pillar in distributions && typeof cat.score === 'number') {
        const b = distributions[pillar].find(bk => bk.range === rangeBucket(cat.score));
        if (b) b.count++;
      }
    }

    // Clinical patterns — per unique client using their latest session's scores + form fields.
    // Moving this here (vs. per-session) ensures a client with 7 sessions contributes exactly
    // one pattern trigger, giving accurate population prevalence percentages.
    const clientCatMap: Record<string, number> = {};
    for (const cat of record.latestScoresSummary?.categories ?? []) {
      clientCatMap[cat.id] = cat.score;
    }
    deriveClinicalPatterns(record.formData, clientCatMap, clinicalPatterns);
  }

  // --- 3d. Longitudinal improvement tracking ---
  // Only for clients with at least 2 sessions so there's a meaningful before/after.
  type PillarKey6 = 'bodyComp' | 'cardio' | 'strength' | 'movementQuality' | 'lifestyle';
  const pillarImprovements: Record<PillarKey6, { total: number; count: number }> = {
    bodyComp: { total: 0, count: 0 },
    cardio: { total: 0, count: 0 },
    strength: { total: 0, count: 0 },
    movementQuality: { total: 0, count: 0 },
    lifestyle: { total: 0, count: 0 },
  };
  let totalScoreImprovement = 0;
  let longitudinalClientCount = 0;
  let clientsImproved = 0;
  let clientsStable = 0;
  let clientsDeclined = 0;

  for (const record of clientMap.values()) {
    if (record.snapshotTimestamps.length < 2) continue;
    if (record.firstScore <= 0 || record.latestScore <= 0) continue;
    if (record.firstTimestamp === Date.now()) continue; // no snapshot found, no longitudinal data

    const delta = record.latestScore - record.firstScore;
    totalScoreImprovement += delta;
    longitudinalClientCount++;

    if (delta >= 5) clientsImproved++;
    else if (delta <= -5) clientsDeclined++;
    else clientsStable++;

    // Per-pillar improvement
    const firstCats = record.firstScoresSummary?.categories ?? [];
    const latestCats = record.latestScoresSummary?.categories ?? [];
    for (const firstCat of firstCats) {
      const latestCat = latestCats.find(c => c.id === firstCat.id);
      if (!latestCat) continue;
      const pid = firstCat.id as PillarKey6;
      if (pid in pillarImprovements) {
        pillarImprovements[pid].total += latestCat.score - firstCat.score;
        pillarImprovements[pid].count++;
      }
    }
  }

  const longitudinalInsights = longitudinalClientCount >= 2 ? {
    clientCount: longitudinalClientCount,
    avgScoreImprovement: Math.round((totalScoreImprovement / longitudinalClientCount) * 10) / 10,
    clientsImproved,
    clientsStable,
    clientsDeclined,
    pillarImprovements: Object.fromEntries(
      Object.entries(pillarImprovements)
        .filter(([, v]) => v.count > 0)
        .map(([k, v]) => [k, Math.round((v.total / v.count) * 10) / 10])
    ) as Record<string, number>,
  } : null;

  logger.info(`[PopulationAnalytics] Longitudinal: ${longitudinalClientCount} clients with 2+ sessions`);

  // --- 3e. Per-organisation breakdown ---
  // Group clientMap by orgId (extracted from clientKey format '{orgId}::{slug}').
  // Computes: client count, avg score, total sessions, avg improvement per org.
  const orgAccumulators = new Map<string, {
    clientCount: number;
    totalScore: number;
    scoredClients: number;
    totalSessions: number;
    totalImprovement: number;
    improvementCount: number;
  }>();

  for (const [clientKey, record] of clientMap.entries()) {
    const orgId = clientKey.split('::')[0];
    if (!orgId) continue;
    if (!orgAccumulators.has(orgId)) {
      orgAccumulators.set(orgId, { clientCount: 0, totalScore: 0, scoredClients: 0, totalSessions: 0, totalImprovement: 0, improvementCount: 0 });
    }
    const acc = orgAccumulators.get(orgId)!;
    acc.clientCount++;
    acc.totalSessions += record.snapshotTimestamps.length;
    if (record.latestScore > 0) {
      acc.totalScore += record.latestScore;
      acc.scoredClients++;
    }
    const hasLongitudinal = record.snapshotTimestamps.length >= 2 &&
      record.firstScore > 0 &&
      record.latestScore > 0 &&
      record.firstTimestamp !== Date.now();
    if (hasLongitudinal) {
      acc.totalImprovement += record.latestScore - record.firstScore;
      acc.improvementCount++;
    }
  }

  // Fetch org display names — one read per org, batched via Promise.all
  const orgIds = [...orgAccumulators.keys()];
  const orgNames: Record<string, string> = {};
  await Promise.all(orgIds.map(async (orgId) => {
    try {
      const orgDoc = await db.doc(`organizations/${orgId}`).get();
      if (orgDoc.exists) {
        const orgData = orgDoc.data() as Record<string, unknown>;
        orgNames[orgId] = typeof orgData.name === 'string' && orgData.name ? orgData.name : orgId;
      } else {
        orgNames[orgId] = orgId;
      }
    } catch {
      orgNames[orgId] = orgId;
    }
  }));

  const orgBreakdown: Record<string, {
    name: string;
    clientCount: number;
    avgScore: number;
    totalSessions: number;
    avgImprovement: number | null;
  }> = {};
  for (const [orgId, acc] of orgAccumulators.entries()) {
    orgBreakdown[orgId] = {
      name: orgNames[orgId] ?? orgId,
      clientCount: acc.clientCount,
      avgScore: acc.scoredClients > 0 ? Math.round((acc.totalScore / acc.scoredClients) * 10) / 10 : 0,
      totalSessions: acc.totalSessions,
      avgImprovement: acc.improvementCount > 0
        ? Math.round((acc.totalImprovement / acc.improvementCount) * 10) / 10
        : null,
    };
  }
  logger.info(`[PopulationAnalytics] Org breakdown computed for ${orgIds.length} organisations`);

  // --- 3f. Compute per-client session frequency ---
  const uniqueClientCount = clientMap.size;
  // Total session events in the DB — includes 'monthly'/'manual' types and any untyped docs.
  // fullCount + partialCount is also available for the type breakdown.
  const totalSnapshotCount = allSnapshotDocs.length;
  const avgSessionsPerClient = uniqueClientCount > 0
    ? Math.round((totalSnapshotCount / uniqueClientCount) * 10) / 10
    : 0;

  // Average days between consecutive sessions per client (sessions ordered chronologically)
  const dayGaps: number[] = [];
  for (const { snapshotTimestamps } of clientMap.values()) {
    if (snapshotTimestamps.length < 2) continue;
    const sorted = [...snapshotTimestamps].sort((a, b) => a.getTime() - b.getTime());
    for (let i = 1; i < sorted.length; i++) {
      const days = (sorted[i].getTime() - sorted[i - 1].getTime()) / (1000 * 60 * 60 * 24);
      dayGaps.push(Math.round(days));
    }
  }
  const avgDaysBetweenSessions = dayGaps.length > 0
    ? Math.round(dayGaps.reduce((s, d) => s + d, 0) / dayGaps.length)
    : null;

  // --- 3g. Pearson correlation across meaningful variable pairs ---
  const correlationFindings: CorrelationFinding[] = [];

  for (const [keyA, keyB] of CORR_PAIRS) {
    const paired: [number, number][] = [];
    for (const row of corrRows) {
      const a = row[keyA];
      const b = row[keyB];
      if (typeof a === 'number' && typeof b === 'number') {
        paired.push([a, b]);
      }
    }
    if (paired.length < 20) continue;

    const xs = paired.map(p => p[0]);
    const ys = paired.map(p => p[1]);
    const r  = pearson(xs, ys);
    if (r === null) continue;

    const absR = Math.abs(r);
    if (absR < 0.2) continue; // below meaningful threshold

    const strength: CorrelationFinding['strength'] =
      absR >= 0.5 ? 'strong' : absR >= 0.3 ? 'moderate' : 'weak';
    const direction: CorrelationFinding['direction'] = r >= 0 ? 'positive' : 'negative';
    const split = groupSplit(xs, ys);
    // Skip this finding if groupSplit returned null (empty group or near-identical means)
    if (!split) continue;
    const { highGroupMeanB, lowGroupMeanB, diffPct } = split;

    correlationFindings.push({
      varA: keyA, varB: keyB,
      labelA: VAR_LABELS[keyA] ?? keyA,
      labelB: VAR_LABELS[keyB] ?? keyB,
      r, n: paired.length,
      direction, strength,
      highGroupMeanB, lowGroupMeanB, diffPct,
    });
  }

  // Sort strongest first, cap at 12 stored findings
  correlationFindings.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
  const topCorrelations = correlationFindings.slice(0, 12);
  logger.info(`[PopulationAnalytics] ${topCorrelations.length} correlation findings computed`);

  // --- 4. Normalise bucket percentages ---
  const pillars = Object.keys(distributions) as PillarKey[];
  for (const pillar of pillars) {
    const total = distributions[pillar].reduce((s, b) => s + b.count, 0);
    distributions[pillar] = normaliseBuckets(distributions[pillar], total);
  }

  // --- 5. Determine unlocked tiers ---
  const unlockedTiers = Object.entries(TIER_THRESHOLDS)
    .filter(([, threshold]) => scoredCount >= threshold)
    .map(([tier]) => tier);

  // Derive monthly average score map (YYYY-MM → rounded avg score)
  const monthlyAverageScores: Record<string, number> = {};
  for (const [month, { sum, count }] of Object.entries(monthlyScoreAccum)) {
    if (count > 0) monthlyAverageScores[month] = Math.round((sum / count) * 10) / 10;
  }

  // --- 3h. Outcome funnel — clients grouped by engagement depth ───────────────
  // For each client with 2+ sessions, compute first→latest delta and place them
  // into an engagement bracket. This builds the core "does more engagement = better
  // outcomes?" proof point.

  function emptyBucket(): {
    improved: number; stable: number; declined: number; total: number; totalDelta: number;
  } {
    return { improved: 0, stable: 0, declined: 0, total: 0, totalDelta: 0 };
  }

  const funnelOverall    = emptyBucket();
  const funnel23         = emptyBucket();
  const funnel46         = emptyBucket();
  const funnel7plus      = emptyBucket();

  for (const record of clientMap.values()) {
    const sessCount = record.snapshotTimestamps.length;
    if (sessCount < 2) continue;
    if (record.firstScore <= 0 || record.latestScore <= 0) continue;
    if (record.firstTimestamp === Date.now()) continue;

    const delta = record.latestScore - record.firstScore;
    const bucket = delta >= 5 ? 'improved' : delta <= -5 ? 'declined' : 'stable';

    for (const b of [funnelOverall, sessCount <= 3 ? funnel23 : sessCount <= 6 ? funnel46 : funnel7plus]) {
      b[bucket]++;
      b.total++;
      b.totalDelta += delta;
    }
  }

  function finaliseBucket(b: ReturnType<typeof emptyBucket>) {
    return {
      improved: b.improved, stable: b.stable, declined: b.declined, total: b.total,
      avgImprovement: b.total > 0 ? Math.round((b.totalDelta / b.total) * 10) / 10 : 0,
    };
  }

  const outcomeFunnel = {
    overall: finaliseBucket(funnelOverall),
    byEngagement: {
      '2-3': finaliseBucket(funnel23),
      '4-6': finaliseBucket(funnel46),
      '7+':  finaliseBucket(funnel7plus),
    },
  };

  // --- 3i. Engagement cohorts — avg score by session count bracket ─────────────
  // Groups ALL clients (including single-session) to show the score trajectory.
  const cohort1   = { count: 0, totalScore: 0, totalDelta: 0, deltaCount: 0 };
  const cohort23  = { count: 0, totalScore: 0, totalDelta: 0, deltaCount: 0 };
  const cohort46  = { count: 0, totalScore: 0, totalDelta: 0, deltaCount: 0 };
  const cohort7p  = { count: 0, totalScore: 0, totalDelta: 0, deltaCount: 0 };

  for (const record of clientMap.values()) {
    if (record.latestScore <= 0) continue;
    const sessCount = record.snapshotTimestamps.length || 1;
    const cohort = sessCount === 1 ? cohort1 : sessCount <= 3 ? cohort23 : sessCount <= 6 ? cohort46 : cohort7p;
    cohort.count++;
    cohort.totalScore += record.latestScore;
    if (sessCount >= 2 && record.firstScore > 0 && record.firstTimestamp !== Date.now()) {
      cohort.totalDelta += record.latestScore - record.firstScore;
      cohort.deltaCount++;
    }
  }

  const engagementCohorts = [
    { label: '1 session',  bracket: '1',   ...cohort1 },
    { label: '2–3 sessions', bracket: '2-3', ...cohort23 },
    { label: '4–6 sessions', bracket: '4-6', ...cohort46 },
    { label: '7+ sessions',  bracket: '7+',  ...cohort7p },
  ].map(c => ({
    label: c.label,
    bracket: c.bracket,
    count: c.count,
    avgScore: c.count > 0 ? Math.round((c.totalScore / c.count) * 10) / 10 : 0,
    avgImprovement: c.deltaCount > 0
      ? Math.round((c.totalDelta / c.deltaCount) * 10) / 10
      : null,
  }));

  // --- 3j. Data completeness & return rate ────────────────────────────────────
  let sessions5Pillars = 0;
  for (const docSnap of sortedDocs) {
    const data = docSnap.data() as Record<string, unknown>;
    if ((data.overallScore as number) <= 0) continue;
    const ss = data.scoresSummary as { categories?: { id: string; score: number }[] } | undefined;
    const pillarIds = ss?.categories?.filter(c => c.score > 0).map(c => c.id) ?? [];
    const has5 = ['bodyComp','cardio','strength','movementQuality','lifestyle']
      .every(p => pillarIds.includes(p));
    if (has5) sessions5Pillars++;
  }

  let clientsWithDOB = 0;
  let clientsWithGoals = 0;
  let returnClients = 0;
  let earliestSessionDate = '';

  for (const record of clientMap.values()) {
    if (record.dateOfBirth) clientsWithDOB++;
    const goals = record.formData.clientGoals;
    if (Array.isArray(goals) ? goals.length > 0 : !!goals) clientsWithGoals++;
    if (record.snapshotTimestamps.length >= 2) returnClients++;
  }

  // Find the earliest session timestamp across all snapshot docs
  for (const docSnap of sortedDocs) {
    const data = docSnap.data() as Record<string, unknown>;
    const ts = data.timestamp as admin.firestore.Timestamp | undefined;
    if (ts?.toDate) {
      const iso = ts.toDate().toISOString().slice(0, 10);
      if (!earliestSessionDate || iso < earliestSessionDate) earliestSessionDate = iso;
    }
  }

  const totalScoredSessions = sortedDocs.filter(d => {
    const data = d.data() as Record<string, unknown>;
    return typeof data.overallScore === 'number' && data.overallScore > 0;
  }).length;

  const dataCompleteness = {
    pct5Pillars: totalScoredSessions > 0
      ? Math.round((sessions5Pillars / totalScoredSessions) * 100)
      : 0,
    pctWithDOB: uniqueClientCount > 0
      ? Math.round((clientsWithDOB / uniqueClientCount) * 100)
      : 0,
    pctWithGoals: uniqueClientCount > 0
      ? Math.round((clientsWithGoals / uniqueClientCount) * 100)
      : 0,
    returnRate: uniqueClientCount > 0
      ? Math.round((returnClients / uniqueClientCount) * 100)
      : 0,
  };

  logger.info(`[PopulationAnalytics] Outcome funnel: ${outcomeFunnel.overall.total} longitudinal clients`);
  logger.info(`[PopulationAnalytics] Return rate: ${dataCompleteness.returnRate}%`);

  // --- 6. Write platform_analytics/population ---
  const populationDoc = {
    computedAt: admin.firestore.FieldValue.serverTimestamp(),
    totalScoredAssessments: scoredCount,
    uniqueClientCount,
    scoreDistributions: distributions,
    goalDistribution,
    clinicalPatterns,
    lifestyleProfile: {
      sleep: sleepProfile,
      stress: stressProfile,
      nutrition: nutritionProfile,
      hydration: hydrationProfile,
      activity: activityProfile,
      alcohol: alcoholProfile,
    },
    trainingHistory: trainingHistoryMap,
    painReported,
    painByMovement: { ohs: painOhs, hinge: painHinge, lunge: painLunge },
    bmiDistribution,
    bodyFatDistribution,
    visceralFatDistribution,
    ageDistribution,
    genderDistribution,
    monthlyAssessmentVolume: monthlyVolume,
    monthlyAverageScores,
    assessmentPatterns: {
      fullCount,
      partialCount,
      untypedCount: totalSnapshotCount - fullCount - partialCount,
      totalSnapshotCount,
      partialByPillar,
      uniqueClientCount,
      avgSessionsPerClient,
      avgDaysBetweenSessions,
    },
    correlationFindings: topCorrelations,
    orgBreakdown,
    ...(longitudinalInsights ? { longitudinalInsights } : {}),
    outcomeFunnel,
    engagementCohorts,
    dataCompleteness,
    ...(earliestSessionDate ? { earliestSessionDate } : {}),
  };

  await db.doc('platform_analytics/population').set(populationDoc);
  logger.info(`[PopulationAnalytics] Written population doc (${scoredCount} scored assessments)`);

  // --- 7. Write platform_analytics/milestones (preserve seenByAdminAt) ---
  const milestonesRef = db.doc('platform_analytics/milestones');
  const existing = await milestonesRef.get();
  const seenByAdminAt = existing.exists
    ? existing.data()?.seenByAdminAt ?? null
    : null;

  await milestonesRef.set({
    totalScoredAssessments: scoredCount,
    unlockedTiers,
    lastComputedAt: admin.firestore.FieldValue.serverTimestamp(),
    ...(seenByAdminAt !== null ? { seenByAdminAt } : {}),
  });

  logger.info(`[PopulationAnalytics] Milestones written. Unlocked: ${unlockedTiers.join(', ')}`);
}
