# APEX OS — product metrics ingest

One Assess (fitness-flow-form) pushes **aggregate** counters from `system_stats/global_metrics` to **APEX OS** so Rex / CMO / PM see live rollups (`GET /api/product-signals`).

## What gets sent

No user IDs, emails, or PHI — only numeric fields such as:

| `metric_key` | Source field |
|--------------|----------------|
| `oa_mrr_gbp_pence` | `monthlyRecurringRevenueGbpPence` or `monthlyRecurringRevenueFils` |
| `oa_total_orgs` | `totalOrgs` |
| `oa_active_orgs` | `activeOrgs` |
| `oa_trial_orgs` | `trialOrgs` |
| `oa_total_coaches` | `totalCoaches` |
| `oa_total_clients` | `totalClients` |
| `oa_total_assessments` | `totalAssessments` |
| `oa_assessments_this_month` | `assessments_this_month` |
| `oa_ai_costs_mtd_gbp_pence` | `aiCostsMtdGbpPence` |
| `oa_ai_costs_total_gbp_pence` | `totalAiCostsGbpPence` |

## Configure

1. In **Vercel (apex-os)** you already set `PRODUCT_ANALYTICS_INGEST_SECRET`.
2. In **`functions/.env`** (same value):

   ```bash
   APEX_PRODUCT_ANALYTICS_SECRET=paste_the_same_secret_here
   ```

3. Optional override:

   ```bash
   APEX_PRODUCT_ANALYTICS_URL=https://os.one-assess.com/api/product-analytics-ingest
   ```

4. Deploy functions from the machine that has `functions/.env`:

   ```bash
   cd functions && npm run build && cd .. && firebase deploy --only functions:pushApexProductMetricsScheduled,functions:pushApexProductMetricsNow
   ```

   Or full deploy: `firebase deploy --only functions`

## When it runs

- **Scheduled:** `pushApexProductMetricsScheduled` — daily **01:15 UTC** (after `snapshotMetricsHistory` at 01:00).
- **Manual:** callable `pushApexProductMetricsNow` — platform admin only (same pattern as `computePopulationAnalyticsNow`).

## Verify

- [https://os.one-assess.com/api/product-signals](https://os.one-assess.com/api/product-signals) — metrics with `oa_*` keys.
- APEX UI → Rex → Chief strip → Product app line.

Canonical ingest contract: [apex-os `docs/DATA_LAYER.md`](https://github.com/MichaelBrown88/apex-os/blob/main/docs/DATA_LAYER.md).
