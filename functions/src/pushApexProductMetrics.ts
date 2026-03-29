/**
 * Push aggregate platform metrics from Firestore to APEX OS Supabase ingest.
 * No user-level data — reads system_stats/global_metrics only.
 *
 * Env (functions/.env for deploy, or Google Cloud env):
 *   APEX_PRODUCT_ANALYTICS_SECRET — Bearer token (same as Vercel PRODUCT_ANALYTICS_INGEST_SECRET)
 *   APEX_PRODUCT_ANALYTICS_URL — optional, default https://os.one-assess.com/api/product-analytics-ingest
 */

import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';

const DEFAULT_INGEST_URL = 'https://os.one-assess.com/api/product-analytics-ingest';

function num(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

export type PushApexProductMetricsResult = {
  pushed: boolean;
  reason?: string;
  metricsCount?: number;
  status?: number;
};

/**
 * Read global_metrics and POST numeric aggregates to apex-os.
 */
export async function pushApexProductMetricsFromFirestore(): Promise<PushApexProductMetricsResult> {
  const secret = (process.env.APEX_PRODUCT_ANALYTICS_SECRET || '').trim();
  const url = (process.env.APEX_PRODUCT_ANALYTICS_URL || DEFAULT_INGEST_URL).trim();

  if (!secret) {
    logger.info('[ApexIngest] APEX_PRODUCT_ANALYTICS_SECRET unset — skip (set secret to enable)');
    return { pushed: false, reason: 'no_secret' };
  }

  const db = admin.firestore();
  const snap = await db.doc('system_stats/global_metrics').get();

  if (!snap.exists) {
    logger.warn('[ApexIngest] system_stats/global_metrics missing — skip');
    return { pushed: false, reason: 'no_global_metrics' };
  }

  const s = snap.data() ?? {};

  const mrrGbpPence = num(
    s.monthlyRecurringRevenueGbpPence ?? s.monthlyRecurringRevenueFils,
  );

  const metrics = [
    { metric_key: 'oa_mrr_gbp_pence', value_numeric: mrrGbpPence },
    { metric_key: 'oa_total_orgs', value_numeric: num(s.totalOrgs) },
    { metric_key: 'oa_active_orgs', value_numeric: num(s.activeOrgs) },
    { metric_key: 'oa_trial_orgs', value_numeric: num(s.trialOrgs) },
    { metric_key: 'oa_total_coaches', value_numeric: num(s.totalCoaches) },
    { metric_key: 'oa_total_clients', value_numeric: num(s.totalClients) },
    { metric_key: 'oa_total_assessments', value_numeric: num(s.totalAssessments) },
    {
      metric_key: 'oa_assessments_this_month',
      value_numeric: num(s.assessments_this_month),
    },
    {
      metric_key: 'oa_ai_costs_mtd_gbp_pence',
      value_numeric: num(s.aiCostsMtdGbpPence),
    },
    {
      metric_key: 'oa_ai_costs_total_gbp_pence',
      value_numeric: num(s.totalAiCostsGbpPence),
    },
  ];

  const capturedAt = new Date().toISOString();
  const body = {
    schema_version: 1,
    source: 'firestore_rollup',
    metrics: metrics.map((m) => ({
      ...m,
      captured_at: capturedAt,
    })),
  };

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    logger.error('[ApexIngest] fetch failed', err);
    return { pushed: false, reason: 'fetch_error' };
  }

  const text = await res.text();
  if (!res.ok) {
    logger.error('[ApexIngest] HTTP error', { status: res.status, body: text.slice(0, 800) });
    return { pushed: false, reason: `http_${res.status}`, status: res.status };
  }

  logger.info('[ApexIngest] pushed', { metricsCount: metrics.length, response: text.slice(0, 200) });
  return { pushed: true, metricsCount: metrics.length, status: res.status };
}
