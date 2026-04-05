# V1 launch hardening checklist

Use this with the architecture audit: it tracks what “done” means for handoff to another senior team.

## Security & tenancy

- [ ] Every new Firestore query uses `organizationId` (or token → org resolution on server) and `limit()`.
- [ ] Public routes (`/r/*`, remote assessment, companion) never mount coach-only components or read org paths without rules-safe data.
- [ ] Stripe: subscription state is server-verified; webhooks are source of truth for entitlements.
- [ ] Firestore rules changes run through the emulator before deploy.

## Assessment lifecycle (highest UX risk)

- [ ] Single documented model: **context + session draft + Firestore draft** — when each wins, and what “Start fresh” clears.
- [ ] Resume / discard copy tested after refresh, new tab, and slower network (cloud draft offer).
- [ ] Partial assessment and edit modes do not clobber full assessments.

## Data model

- [ ] Deprecated fields: either migrated, read-compat only, or removed with a written decision per field.
- [ ] Legacy `organizations/{orgId}/assessments` usage: confirm read-only tooling vs live writes.
- [ ] New `collectionGroup` queries ship with `firestore.indexes.json` entries.

## Dashboard & shell

- [ ] `DashboardLayout` responsibilities stay bounded; new features prefer new hooks or route-level components.
- [ ] Loading and empty states for clients, work, team, artifacts.
- [ ] **Workspace shell (`/dashboard`, `/dashboard/artifacts`):** top header hides org logo and account dropdown (`hideCoachBrandAndUser`). Coaches reach **Settings, billing, sign out, Team (when shown)** via the **profile chip** (floating footer on non-workspace dashboard tabs, or **sidebar footer** on assistant/artifacts). **Team** and **Artifacts** also appear in the **center workspace pills** next to Assistant / Clients / Work.
- [ ] **Quick navigation:** coaches can open the command palette with **⌘K** (macOS) or **Ctrl+K** (Windows/Linux), or tap **Search** in the assistant sidebar, to jump to a client.

## Billing

- [ ] Coach-facing story for `/billing` vs `/org/dashboard/billing` is clear in product copy (see `BILLING_NAV_COPY` on both pages).
- [ ] Webhook idempotency and failed-payment paths verified in staging.

## Quality bar

- [ ] `npm run typecheck` and `npm run lint` clean.
- [ ] `npm run test:ci` green (expand tests around scoring, saves, and billing helpers over time).
- [ ] Error boundaries: route-level recovery works; camera keeps custom fallback via class boundary.

## Ops

- [ ] Critical Cloud Functions listed with triggers and failure impact (email, Stripe, reminders).
- [ ] Monitoring/alerts for function errors and webhook delivery (as appropriate for your plan).

---

*Incremental refactors landed in-repo: draft recovery extracted to `usePhaseFormDraftRecovery` + `AssessmentDraftRecoveryBanners`, app shell uses `ui/ErrorBoundary`, Vitest smoke tests for paths, numbers, assessment completeness.*
