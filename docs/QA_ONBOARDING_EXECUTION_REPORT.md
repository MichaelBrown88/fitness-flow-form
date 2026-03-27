# Onboarding QA — execution report

**Run date:** 2026-03-27  
**Plan:** Onboarding QA plan (see Cursor plan `onboarding_qa_plan`; plan file not modified per run instructions).  
**Environment:** Local dev (`npm run dev` → Vite on `http://localhost:8081/`). Full Firebase Auth, Firestore, Stripe, and invite tokens were **not** exercised end-to-end in this automated pass.

---

## Pre-gate: `.cursorrules` + docs

| Item | Result | Notes |
|------|--------|--------|
| Multi-tenancy (invite outcomes) | **Manual** | Code path reviewed: `completeOnboarding` sets `profileUpdate.organizationId = inviteOrganizationId` when invite present ([`useOnboarding.ts`](../src/hooks/useOnboarding.ts)). Confirm in Firebase Console on next manual **F1** run. |
| Billing / access | **Manual** | Solo vs gym subscription objects in `completeOnboarding` — confirm org doc after **B1** / **C3** in staging. |
| Public air-gap | **N/A** | Onboarding is coach-authenticated funnel. |
| `docs/UI_UX_STANDARDS.md` | **Manual / partial** | Layout overlay uses `role="status"`, `aria-busy`, `aria-live="polite"` ([`OnboardingLayout.tsx`](../src/components/onboarding/OnboardingLayout.tsx)). Full dark/mobile pass requires manual **I5**. |
| `docs/DESIGN_SYSTEM.md` | **Manual** | Visual smoke not executed in this pass. |

---

## Pre-gate: MCP (reference)

Criteria from UX Laws / UI-UX Pro are covered in **Section I** below; no additional MCP calls in this execution.

---

## A — Entry points and routing

| ID | Result | Evidence |
|----|--------|----------|
| A1 | **Pass (static)** | [`App.tsx`](../src/App.tsx) lines 157–158: `/signup` and `/onboarding` both render `<Onboarding />`. |
| A2 | **Pass (static)** | [`PricingCard.tsx`](../src/components/landing/PricingCard.tsx) links to `/onboarding`; [`Demo.tsx`](../src/pages/Demo.tsx) links to `/onboarding`. |
| A3 | **Pass (static)** | [`Login.tsx`](../src/pages/Login.tsx): `!profile.onboardingCompleted` → `navigate(ROUTES.ONBOARDING)`. [`useDashboardDataOrchestrator.ts`](../src/hooks/dashboard/useDashboardDataOrchestrator.ts): `/dashboard` + incomplete → `/onboarding`. |
| A4 | **Pass (static)** | [`useOnboarding.ts`](../src/hooks/useOnboarding.ts): completed profile/org → `navigate('/dashboard', { replace: true })`. |

**Browser smoke:** Navigated to `http://localhost:8081/onboarding` — URL and document title loaded; accessibility snapshot did not enumerate form content (likely lazy/auth loading). Treat as **inconclusive UI**; repeat with manual QA.

---

## B — Solo happy path

| ID | Result | Notes |
|----|--------|--------|
| B1–B4 | **Manual required** | Needs disposable email, Firebase sign-up, and Firestore verification. |

---

## C — Gym happy path

| ID | Result | Notes |
|----|--------|--------|
| C1–C3 | **Manual required** | Progress logic present in [`getOnboardingProgressState`](../src/types/onboarding.ts). |
| C4 | **Manual + risk** | Stripe checkout uses `profile.organizationId` in [`PackageSelectionStep.tsx`](../src/components/onboarding/PackageSelectionStep.tsx) (`startCheckout`). **Release gate** when Stripe enabled. |

---

## D — Account creation edge cases

| ID | Result | Notes |
|----|--------|--------|
| D1–D5 | **Manual required** | `auth/email-already-in-use` branch and verification send are in [`useOnboarding.ts`](../src/hooks/useOnboarding.ts); UI errors in [`AccountCreationStep.tsx`](../src/components/onboarding/AccountCreationStep.tsx). |

---

## E — Navigation and persistence

| ID | Result | Notes |
|----|--------|--------|
| E1 | **Pass (static)** | `handleBack` in [`useOnboarding.ts`](../src/hooks/useOnboarding.ts) decrements steps; gym step 5 → 4. |
| E2 | **Pass (static)** | `saveSession` / `loadSession` with [`STORAGE_KEYS.ONBOARDING_SESSION`](../src/constants/storageKeys.ts). |
| E3 | **Manual** | Sign out clears `sessionStorage` and `window.location.href = '/'` in [`OnboardingLayout.tsx`](../src/components/onboarding/OnboardingLayout.tsx). |
| E4 | **Pass (static)** | Logged-in user on identity: `handleIdentityNext` sets step 1. |

---

## F — Invite flow

| ID | Result | Notes |
|----|--------|--------|
| F1 | **Manual required** | Valid token → `setInviteOrganizationId`; completion updates profile + invitation status ([`useOnboarding.ts`](../src/hooks/useOnboarding.ts)). |
| F2 | **Pass (static)** | `if (!inviteOrganizationId)` guards org `setDoc` merge; invite path skips org subscription/DPA merge from client. |
| F3 | **Documented behaviour** | Invalid/expired/missing invite: effect returns with **no user-visible error** (only `logger.warn` on fetch failure). **Matches plan item to file a bug if product wants surfaced errors.** |
| F4 | **Manual + critical** | Same as **C4** for invitee on gym path with Stripe — verify checkout org and billing side effects in staging. |

---

## G — Cross-device

| ID | Result |
|----|--------|
| G1 | **Documented** | `sessionStorage` is per-tab/device; expected limitation. |

---

## I — Standards + MCP spot checks

| ID | Result | Notes |
|----|--------|--------|
| I1 | **Manual** | Copy mismatch risk: sidebar “verify email” vs non-blocking verification — confirm in product review. |
| I2 | **Partial** | `blockingOverlay` + `submitting` / `completingSetup` patterns present in code; full idle→loading→error needs manual clicks. |
| I3 | **Partial** | `accountError`, `planError`, `completionError` / `checkoutError` rendered inline in step components. |
| I4 | **Manual** | VoiceOver/keyboard pass not run. |
| I5 | **Manual** | Dark + mobile pass not run. |
| I6 | **Partial** | Identity/Account steps use labels + primary buttons in source; not validated on device. |

---

## H — Regression smoke

| Command | Result |
|---------|--------|
| `npm run typecheck` | **FAIL** — existing project errors (e.g. `useGapAnalysisData.ts` `targetBF`, `pdfExport` modules, `RoadmapBuilder`, `clientProfiles`, `ClientSettings`). **Unrelated to onboarding.** |
| `npm run test:ci` | **FAIL** — *No test files found* (Vitest `include` pattern matches nothing). |

**Action:** Fix TS errors and/or add `*.test.ts(x)` before relying on **H** as a release gate; or scope **H** to onboarding-only checks once added.

---

## Sign-off (template)

| Section | Status | Tester | Date | Tickets |
|---------|--------|--------|------|---------|
| A | Static pass (+ browser inconclusive) | Agent run | 2026-03-27 | — |
| B | Not run (manual) | — | — | — |
| C | Not run (manual); C4 gate open | — | — | — |
| D | Not run (manual) | — | — | — |
| E | Static pass (+ E3 manual) | Agent run | 2026-03-27 | — |
| F | F2 static pass; F1/F4 manual; F3 documented | Agent run | 2026-03-27 | Consider ticket for F3 UX |
| G | Documented | — | — | — |
| I | Partial / manual | — | — | — |
| H | Fail (repo-wide) | Agent run | 2026-03-27 | — |

**Release recommendation:** Do **not** treat this agent run as full QA sign-off. Complete **B–D, C4/F4, I1–I6** in staging with real accounts; resolve or waive **H** per team policy.

---

## Follow-up tickets (suggested)

1. **F3:** Surface invalid/expired invite in UI (banner or step 0) instead of silent no-op.
2. **F4/C4:** Confirm Stripe checkout `organizationId` for invite accept path (shell org vs target org).
3. **H:** Restore green `tsc` and/or add minimal Vitest/Playwright for onboarding routes.
