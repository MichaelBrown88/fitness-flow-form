# Platform Operations

Canonical platform data model and maintenance workflow for One Assess.

## Canonical Data

- Business data lives under `organizations/{orgId}/...`
- AI usage lives in `ai_usage_logs` (coaches append via validated client `create`; Admin SDK bypasses rules for platform jobs; no client update/delete)
- Dashboard aggregates live in `system_stats/global_metrics`
- Historical metrics live in `platform/metrics/history/{date}`
- Product activity lives in `platform_activity_feed`
- Admin/security audit events live in `platform_audit_logs`

## Supported Admin Toolkit

Only the following permanent tools are supported after cutover:

- `window.auditCanonicalData()`
- `window.normalizeAIUsageLogs()`
- `window.rebuildPlatformActivityFeed()`
- `window.reconcilePlatformData()`
- `window.rebuildPlatformMetricsHistory(days?)`
- `window.verifyPlatformCutover()`
- `window.createRollbackCheckpoint(orgId?)`
- `window.runPlatformCutover({ dryRun, orgId, historyDays })`

## Cutover Workflow

1. Freeze writes.
2. Run `window.createRollbackCheckpoint()`.
3. Run `window.runPlatformCutover({ dryRun: true })`.
4. Review migration/audit output.
5. Run `window.runPlatformCutover({ dryRun: false })`.
6. Run `window.verifyPlatformCutover()`.
7. Delete legacy Firestore `coaches/*` only after verification passes.

## Ongoing Maintenance

- Use `window.reconcilePlatformData()` if aggregate metrics drift.
- Use `window.rebuildPlatformMetricsHistory()` if historical charts need to be rebuilt.
- Do not add new one-off migration or backfill scripts to the runtime app.
- New AI-backed features must log exactly one canonical AI usage event per billable invocation.
