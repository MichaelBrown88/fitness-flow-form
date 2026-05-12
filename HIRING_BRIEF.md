# Hiring Brief — UI/UX Polish + Flow QA Pass

**Role:** Senior product engineer, contract, fixed-bid
**Goal:** Take a complete, working SaaS product from "founder-built and clunky in places" to "ready to put in front of trusted beta testers"
**Engagement model:** 1-day paid audit → fixed-price polish bid → optional add-ons
**Posted:** 2026-04-25
**Contact:** michael@one-assess.com

---

## 1. The Product (60-second context)

**One Assess** is an AI-powered fitness assessment platform for UK personal trainers and small studios.

A coach uses it to run an 8-phase assessment with a client (PAR-Q, body composition, movement, posture, strength, lifestyle, results, programme), generate a professional report with radar charts and gap analysis, build a personalised roadmap, and deliver everything to the client through a phone-friendly portal. The differentiator is on-device AI posture analysis using MediaPipe in the browser — zero per-scan cost — paired with a clinical-depth assessment engine.

It's multi-tenant (solo coaches and multi-coach studios), Stripe-billed (£39–289/mo capacity tiers), live on Firebase with real Stripe keys, with around 30 Cloud Functions and a public PWA-installable client portal at `/r/:token`.

The full product vision lives in `NORTH_STAR.md` in the repo. Read it before bidding.

---

## 2. The Job

The application is **functionally complete** for a v1 launch. Auth, onboarding, multi-tenant data, the assessment flow, posture capture, body-comp OCR, reports, sharing, roadmap, AI assistant, billing, GDPR erasure, the org admin view, the client PWA — all built and wired up.

**What it isn't yet:** polished. Flows feel clunky in places. The interaction design is uneven. Some journeys have rough edges that I can feel but can't find quickly enough on my own. I've taken it as far as a solo founder can.

I want a **senior product engineer with strong UI/UX taste** to do a comprehensive polish pass across the entire app and a flow-QA sweep, so it's ready to hand to coach friends I trust for genuine beta testing.

### What "polish" means here

- **Flow audit:** walk every major user journey and identify where it stutters, surprises, or asks the user to think
- **Interaction polish:** spacing, hierarchy, motion, focus states, loading states, empty states, error states, keyboard handling, tap targets
- **Visual consistency:** the design system has had several recent overhauls (jewel teal → monochrome tokens, button/card refresh, sidebar refresh) — sweep for stragglers and inconsistencies
- **Responsive verification:** the app must work on desktop, tablet (iPad both orientations), and phone — confirm and fix where it doesn't
- **Glaring-bug fixes:** any bug encountered during the audit that would embarrass me in front of a trusted tester gets fixed in scope; deeper issues get logged for me

### What it does NOT mean (out of scope)

These are **not** part of the polish bid. Quote them as add-ons (see §6) or leave them — I'll handle them separately or later.

- Backend feature work or Cloud Function changes (read-only Firestore queries are fine; no schema changes, no new functions)
- Refactoring the 6 files >1,000 LOC (deferred to a separate engagement)
- Writing automated test coverage beyond what already exists
- App Check enforcement flip (I'll do this myself before launch)
- Phase 4 privacy banner wiring (separate add-on if you want)
- Phase 5 org admin AI context wiring (separate add-on if you want)
- Posture feedback library copy replacement (I'll supply approved strings; wiring them in could be an add-on)
- Legal / regulatory / compliance work (handled externally — see `LAUNCH_CHECKLIST.md` items L1–L8)
- Marketing site rewrites or branding changes — visual polish on existing pages only

---

## 3. Definition of Done

The polish pass is **complete** when:

1. Every checkbox under **Phase 1** and **Phase 2** of `TEST_PLAN.md` passes when you run it on Chrome desktop (latest)
2. Every checkbox under **Phase 3.6** (full assessment flow on iPad landscape) passes on a real iPad — I can supply remote access or you simulate via DevTools, your call
3. The **client PWA** (`/r/:token`) loads, installs, and renders correctly on at least one iOS device (Safari) and one Android device (Chrome). Phase 4 of `TEST_PLAN.md`.
4. You hand me a **polish report** (markdown, in repo): list of every issue you found, what you fixed, what you intentionally left, and why. This is the artifact I take into the trusted-tester phase so I know where to direct attention.
5. I can hand my iPad to a coach friend, give them a brief, and not feel a need to apologise pre-emptively for anything.

**Explicitly not required for done:**
- Zero bugs (real users will surface bugs no audit catches)
- 100% TEST_PLAN coverage of in-person hardware items beyond Phase 3.6
- Production deploy (I'll handle the `firebase deploy`)
- Anything in §2's out-of-scope list

---

## 4. Tech Stack & Codebase

| | |
|---|---|
| **Frontend** | React 19, Vite 7, TypeScript (strict, zero `any` in current code), Tailwind 4, shadcn/ui + Radix primitives, TanStack Query 5, React Router 6, PWA via `vite-plugin-pwa` |
| **Backend** | Firebase — Firestore, Cloud Functions (TypeScript, ~30 modules), Hosting, Storage, Auth |
| **AI / vision** | MediaPipe Tasks Vision (browser, on-device pose), Claude API (narrative), Gemini Live (posture framing guide) |
| **Other** | Stripe (live keys, capacity-tier billing), Sentry, Resend (email), Recharts |
| **Codebase size** | ~700 `.ts`/`.tsx` files, ~118,500 LOC across `src/` and `functions/src/` |
| **Code hygiene** | 0 `: any` usages, 0 `TODO`/`FIXME` comments, ~10 `console.log` (intentional, in logger files). The code is disciplined. |
| **Tests** | 10 test files. The primary QA mechanism is the manual `TEST_PLAN.md` — that is what you will be running. |
| **Repo** | Private. GitHub access provided after you accept the trial day. |
| **Branching** | `develop` is current working branch; `main` is production. |

### Key documents to read before bidding

These are in the repo root and `docs/`. Skim them before quoting.

- `NORTH_STAR.md` — product vision, customer, business model, architecture principles
- `LAUNCH_CHECKLIST.md` — the launch-blocker list (most items are out of scope for you)
- `TEST_PLAN.md` — the manual QA checklist that defines "done" for this engagement
- `DESIGN.md` and `docs/DESIGN_SYSTEM.md` — current design system reference
- `docs/UI_UX_FINDINGS_REGISTER.md` and `docs/UI_UX_STANDARDS.md` — prior UI/UX audit notes
- `CLAUDE.md` — deploy coupling rules (you will not be deploying, but read so you understand)

---

## 5. The Engagement — Two Stages

### Stage 1: Paid Trial Day (£300–500, fixed)

Before either of us commits to the full bid, I want to see how you think.

**Deliverable** (1 working day, your timezone):
1. Spin the app up locally, walk every major flow on desktop and at least one mobile viewport
2. Write a markdown report: top 15–25 polish issues you'd fix, ranked by impact, with a sentence each on what you'd do and roughly how long it would take
3. A 30-minute call to walk through it

**What I'm assessing:**
- Did you find issues I haven't already seen?
- Is your taste calibrated to where I want this product to go?
- Is your written communication clean? (We'll work async.)
- Does your audit suggest you understand the product, not just the code?

If yes → we go to Stage 2. If no → I pay you in full for the day, you keep the report, no awkwardness.

### Stage 2: Polish Bid (fixed-price, fixed-timeline)

Based on your trial-day report, you propose a fixed price and a fixed delivery date for the polish pass as defined in §2 and §3.

**Expectations:**
- Fixed price, milestone-based payment (50% on start, 50% on done — happy to discuss)
- Async-first communication (Loom + GitHub PRs + a weekly 30-min sync)
- I'm in **Kuwait (GMT+3)**; your timezone is fine as long as we have a reliable async rhythm
- All work in feature branches, PR'd to `develop`, I review and merge

---

## 6. Optional Add-Ons (quote separately)

Independent line items you can quote alongside the polish bid. I may pick none, some, or all — depending on price and how the engagement is going.

| Add-on | What it is |
|---|---|
| **Phase 4 wiring** | Mount the existing `PrivacyNoticeBanner` component on the `/r/:token` route; verify session-storage flag works first-load only. See `LAUNCH_CHECKLIST.md` Phase 4. |
| **Phase 5 wiring** | Verify `retentionSummary` + `coachMetrics` reach the assistant prompt for non-coaching org admins; fix the wiring if not. See `LAUNCH_CHECKLIST.md` Phase 5. |
| **App Check smoke-test + flip** | Run a full prod-build smoke test of signup/checkout, confirm reCAPTCHA works end-to-end, then flip `enforceAppCheck: false → true` across all Cloud Functions. Single deploy. See `LAUNCH_CHECKLIST.md` items 1–2. |
| **Posture copy wiring** | I supply approved non-diagnostic strings; you replace the placeholder copy in `src/constants/postureFeedbackLibrary.ts`. See `LAUNCH_CHECKLIST.md` item 5. |
| **Sentry release tracking** | Uncomment release line in `src/main.tsx`, set `VITE_APP_VERSION` build flow, verify releases land in Sentry. See `LAUNCH_CHECKLIST.md` items 3 + 6. |
| **30-day post-launch warranty** | Within 30 days of launch, fix any bug that traces to your polish-pass changes, free. New issues quoted hourly. |

---

## 7. Hiring Profile — Who I'm Looking For

You're a strong fit if:
- You ship product, not just code. You can tell me what's wrong with a flow without me pointing.
- You've worked in React + TypeScript + Tailwind + shadcn/Radix at production scale, recently
- You've shipped Firebase apps before (you don't need to be a Firebase architect — read-only Firestore queries during the audit are sufficient)
- You have public examples of polish work — preferably SaaS dashboards or multi-step flows
- You write clearly. (My team is async-first.)
- UK English / UK PT market familiarity is a bonus, not required

You're a poor fit if:
- You only want greenfield work
- You need detailed tickets to start (I expect you to find the issues, not be handed them)
- You'd rather refactor than polish

---

## 8. How to Apply

Send me an email at **michael@one-assess.com** with:

1. **2–3 sentences** on why this matches what you do
2. **Two links** to past work where you did a polish/audit pass on someone else's product
3. **One question** about the brief that surprises me (filters for whether you actually read it)
4. **Your day rate** for the trial day (£) and your **earliest start date**

I'll reply within 3 working days. If we're a fit, the trial day starts the following week.

---

*Last updated: 2026-04-25.*
