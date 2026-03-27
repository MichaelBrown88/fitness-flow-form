# UX principles audit — One Assess frontend

**Date:** 2025-03-22  
**Method:** Code review of representative routes and components against [UI_UX_STANDARDS.md](./UI_UX_STANDARDS.md), [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md), and the heuristic lenses in the reframed audit plan (consistency/learnability, clarity/hierarchy, feedback/recovery, efficiency/friction, trust/safety, accessibility/comfort).  
**Not performed:** Live browser WCAG tooling, device testing, or user research.

---

## Review framework (locked)

| Lens | Primary questions |
|------|-------------------|
| **Consistency & learnability** | Do similar journeys look and behave the same? Do patterns match user expectations (e.g. public client flows)? |
| **Clarity & hierarchy** | Is the primary action obvious? Is dense information chunked and scannable? |
| **Feedback & recovery** | Idle → loading → success/error for async work? Are errors actionable, not toast-only for critical failures? |
| **Efficiency & friction** | Fewer steps where possible; controls large enough to hit; avoid unnecessary choice overload. |
| **Trust & safety** | Destructive actions confirmed; sensitive flows (GDPR) clear; no silent failures. |
| **Accessibility & comfort** | Status for screen readers, reduced motion, keyboard paths (Radix/shadcn assumed where used). |

**Journey map (zones):**

1. **Coach hub** — `/dashboard/*`  
2. **Coach client & assessment** — `/client/:name/*`, `/assessment`  
3. **Public token** — `/r/:token`, `/r/:token/*`  
4. **Growth** — `/login`, `/onboarding`  
5. **Org admin** — `/org/dashboard/*` (sample: billing)

---

## Findings table

| ID | Zone | Principle(s) | Observation | Evidence (route + file) | Suggested improvement | Severity |
|----|------|--------------|-------------|-------------------------|----------------------|----------|
| **PRIN-01** | Coach hub | Consistency; dark mode | Coach `AppShell` uses fixed light chrome (`bg-slate-50`, `text-slate-900`, `bg-white` header) while public `AppShell` uses semantic tokens (`bg-background`, `bg-card`, `border-border`). Same product, two visual/semantic systems. | `/dashboard/*` — [src/components/layout/AppShell.tsx](src/components/layout/AppShell.tsx) (`mode === 'coach'` branch vs `mode === 'public'`) | Align coach shell with token-based surfaces so light/dark and org branding behave predictably; treat as one layout system with mode flags, not two palettes. | High |
| **PRIN-02** | Coach hub | Consistency; dark mode | Main dashboard content wrapper is hardcoded `bg-white` inside a slate page background, reinforcing light-only assumptions. | `/dashboard` — [src/pages/dashboard/DashboardLayout.tsx](src/pages/dashboard/DashboardLayout.tsx) (main card `className="bg-white rounded-2xl..."`) | Use `bg-card` / `bg-background` (or equivalent semantic surface) so the hub matches theme and dark mode rules in UI_UX_STANDARDS. | Medium |
| **PRIN-03** | Coach hub | Feedback; goal gradient | Getting started checklist never receives a real `hasSharedReport` signal — it is always `false` in layout. Coaches cannot complete the “Share their report” step in the checklist UI even after sharing. | `/dashboard` — [src/pages/dashboard/DashboardLayout.tsx](src/pages/dashboard/DashboardLayout.tsx) (`hasSharedReport={false}`), [src/components/dashboard/GettingStartedChecklist.tsx](src/components/dashboard/GettingStartedChecklist.tsx) | Derive `hasSharedReport` from org/analytics or a lightweight flag (e.g. any client with an active share link), or remove/replace the step until data exists. | High |
| **PRIN-04** | Coach hub | Learnability (Jakob); user control | Primary CTA “New Assessment” duplicates a pattern that may diverge from default `Button` / token styling (`bg-slate-900`), which can fight brand gradient elsewhere. | `/dashboard` — [src/pages/dashboard/DashboardLayout.tsx](src/pages/dashboard/DashboardLayout.tsx) | Use the standard primary button variant (or documented CTA token) so the main action matches the rest of the app and scales with custom branding. | Low |
| **PRIN-05** | Coach hub | Feedback; accessibility | Dashboard initial load is a centered spinner with no `role="status"` / `aria-busy` / `sr-only` text; copy is generic. | `/dashboard` — [src/pages/dashboard/DashboardLayout.tsx](src/pages/dashboard/DashboardLayout.tsx) (loading branch) | Mirror [PublicRoadmapViewer.tsx](src/pages/PublicRoadmapViewer.tsx): polite live region, `aria-busy`, concise visible + sr-only loading message; prefer `motion-safe:` for spin animation. | Medium |
| **PRIN-06** | Global | Feedback; accessibility | Route-level `Suspense` fallback uses light-only greys, generic “Loading experience...”, spinner without live region. First paint for lazy routes may be invisible to some assistive tech. | All lazy routes — [src/App.tsx](src/App.tsx) | Token-based background/text; add status semantics and clearer copy (“Loading One Assess…” or route-aware if feasible); respect reduced motion. | Medium |
| **PRIN-07** | Global | Feedback | `InstallPrompt` uses `Suspense` with `fallback={null}` — possible layout shift or late pop-in for PWA install affordance. | [src/App.tsx](src/App.tsx) | Use a minimal stable placeholder (zero-height reserved slot or tiny skeleton) so late load does not jump the layout. | Low |
| **PRIN-08** | Public token | Consistency; trust | Public report loading and secondary states mix `animate-spin`, `text-slate-*`, and light-only cards; inconsistent with token-first public shell. | `/r/:token` — [src/pages/PublicReportViewer.tsx](src/pages/PublicReportViewer.tsx) (`loading`, `!plan`, error card) | Standardize on `text-muted-foreground` / `bg-card` / `border-border`; add skeleton + `aria-busy` for long loads; use `motion-safe:animate-spin` on `Loader2`. | Medium |
| **PRIN-09** | Public token | Feedback; trust | GDPR export (`exportClientData`) on failure only logs — no inline error, toast, or retry hint. User may think export succeeded. | `/r/:token` — [src/pages/PublicReportViewer.tsx](src/pages/PublicReportViewer.tsx) (`handleExportData` catch) | Set user-visible error state (inline under button or toast) + “Try again”; keep a success path explicit if you add confirmation. | High |
| **PRIN-10** | Public token | Accessibility | Report body fades with `opacity` during version transitions without an announced “loading” or “updating” state for screen readers. | `/r/:token` — [src/pages/PublicReportViewer.tsx](src/pages/PublicReportViewer.tsx) (`isTransitioning`, `Suspense` around `ClientReport`) | Tie transition to `aria-busy` on a wrapping region or short `aria-live` polite message when version changes. | Medium |
| **PRIN-11** | Public token | Clarity; consistency | “What changed” banner and pre-session CTA use distinct illustration styles (indigo/violet gradient vs amber card). Works visually but adds cognitive noise next to token-based shell. | `/r/:token` — [src/pages/PublicReportViewer.tsx](src/pages/PublicReportViewer.tsx) | Map to semantic “info” / “warning” tokens (or a single callout component) so urgency and meaning are consistent app-wide. | Low |
| **PRIN-12** | Public token | Efficiency (Fitts); clarity | GDPR links and export control use `text-[11px]` and small icons — hard to tap and read on mobile for legally significant actions. | `/r/:token` — [src/pages/PublicReportViewer.tsx](src/pages/PublicReportViewer.tsx) (footer actions) | Bump to at least body-sm with comfortable tap targets (~44px min hit area); keep legal clarity. | Medium |
| **PRIN-13** | Public token | Consistency; navigation | `RequestErasure` renders full-page slate/white layout **without** `AppShell`, so clients lose shared header/footer, branding, and “back to report” affordance present on other `/r/:token/*` flows. | `/r/:token/erasure` — [src/pages/RequestErasure.tsx](src/pages/RequestErasure.tsx) | Wrap with `AppShell` `mode="public"` + `showClientNav` / `shareToken` like check-ins and roadmap; add link back to `/r/:token`. | High |
| **PRIN-14** | Public token | Learnability (Jakob) | Authenticated achievements page uses `navigate(-1)` for back when not token-scoped — unpredictable with deep links, new tabs, or external entry. | `/achievements` — [src/pages/Achievements.tsx](src/pages/Achievements.tsx) (`handleBack`) | Navigate to a fixed route (e.g. `ROUTES.DASHBOARD`) or documented parent. | Medium |
| **PRIN-15** | Public token | Consistency | Token-scoped achievements loading uses `motion-safe:animate-spin`; coach loading branch mixes `animate-spin` and `motion-safe:animate-spin` on the same icon (redundant / inconsistent). | `/r/:token/achievements`, `/achievements` — [src/pages/Achievements.tsx](src/pages/Achievements.tsx) | Use one pattern: `Loader2` + `motion-safe:animate-spin` only (or global CSS for reduced motion). | Low |
| **PRIN-16** | Client & assessment | Cognitive load | Client detail exposes many tabs (Overview, report, roadmap, achievements, history, settings). Appropriate for power users but dense; mobile horizontal scroll can hide items (verify in browser). | `/client/:name/*` — [src/pages/client/ClientDetailLayout.tsx](src/pages/client/ClientDetailLayout.tsx) | Consider progressive disclosure (group “Client” vs “Admin” tabs) or a “More” overflow on small screens; usability-test tab discoverability. | Medium |
| **PRIN-17** | Client & assessment | Trust | Destructive flows (delete assessment, remove snapshot) use Radix `Dialog` with clear copy and destructive styling — aligns with standards. | `/dashboard` — [src/components/dashboard/sub-components/DashboardDialogs.tsx](src/components/dashboard/sub-components/DashboardDialogs.tsx) | Keep pattern; reuse for other destructive actions for consistency. | — (positive) |
| **PRIN-18** | Client & assessment | Feedback | History dialog empty state is minimal (“No assessment history found.”) with no next step. | `/dashboard` — [src/components/dashboard/sub-components/DashboardDialogs.tsx](src/components/dashboard/sub-components/DashboardDialogs.tsx) | Add primary suggestion: “Run an assessment” / link to client assessment entry. | Low |
| **PRIN-19** | Growth | Dark mode; feedback | Onboarding initial load uses `bg-white` and pulse text; saving state uses slate spinner — same light-only risk as coach dashboard. | `/onboarding` — [src/pages/Onboarding.tsx](src/pages/Onboarding.tsx) | Token backgrounds and semantic text; accessible loading region for save steps. | Medium |
| **PRIN-20** | Growth | Clarity | Login surfaces Firebase error strings to users — sometimes technical. | `/login` — [src/pages/Login.tsx](src/pages/Login.tsx) | Map known codes to short coach-friendly copy + “try again” / reset password path; log technical detail only in logger. | Low |
| **PRIN-21** | Org admin | Clarity | Org billing page is compact cards (`PlanStatusCard`, seats, upgrade CTA) — appropriate density; ensure trial/expired states explain **next step** in plain language (verify in `PlanStatusCard` copy in a follow-up read). | `/org/dashboard/billing` — [src/pages/org/OrgBilling.tsx](src/pages/org/OrgBilling.tsx) | If any state is status-only without CTA, add explicit “Pay now” / “Contact support” per UI_UX_STANDARDS recoverable errors. | Low (verify) |

---

## Cross-cutting themes

1. **Two visual systems (coach vs public)** — Public routes increasingly use tokens; coach shell and many dashboard surfaces still use raw `slate`/`white`. This is a **consistency and dark-mode** problem, not only a cleanup task.  
2. **Loading and transitions** — Strong pattern exists in [PublicRoadmapViewer.tsx](src/pages/PublicRoadmapViewer.tsx); route Suspense, dashboard boot, public report, and version transitions should converge on that model where content is important.  
3. **Silent failures** — GDPR export is the clearest **trust** violation; any similar `catch` + log-only patterns should be grepped in a future implementation pass.  
4. **Checklist honesty** — `hasSharedReport={false}` undermines **goal-gradient** and checklist credibility; fix data wiring or change the UX promise.

---

## Manual verification checklist (post-implementation)

- Keyboard: tab through dashboard dialogs, public report version control, erasure form.  
- Screen reader: loading states for dashboard, `/r/:token`, roadmap.  
- Reduced motion: OS setting + spinners/transitions.  
- Mobile: tap targets for GDPR footer, pre-session CTA, client tab bar.  
- Dark mode: coach dashboard, onboarding, public report error states.

---

## Appendix A — UX Laws MCP (`ux_full_audit`)

A composite excerpt (coach shell + dashboard card + public loading + silent export + standalone erasure) was submitted to `ux_full_audit` (`platform: web-react`, focus: heuristic, cognitive, design). The tool returned a **100% aggregate score**.

**Interpretation:** Automated audits on partial snippets are **not reliable as a pass/fail gate**. Use MCP output as a secondary prompt for discussion, not as evidence of compliance. Principle-based findings in the table above are grounded in file review and your own [UI_UX_STANDARDS.md](./UI_UX_STANDARDS.md).

---

## Appendix B — Relationship to `UI_UX_FINDINGS_REGISTER.md`

This document is the **principles audit** deliverable (`PRIN-*`). Existing register rows (e.g. FR-MKT-01, FR-X-01, FR-PUBLIC-CHECKIN-01) can be **linked** to `PRIN-*` when implementation work begins; no requirement to duplicate rows until you triage.

---

## Next steps (out of scope for this doc)

After you review and prioritize `PRIN-*` items, implement in small PRs (navigation/trust fixes first, then loading/a11y, then broad token alignment). Update [UI_UX_FINDINGS_REGISTER.md](./UI_UX_FINDINGS_REGISTER.md) when items ship.

### Remediation batch (shipped in repo)

The following `PRIN-*` items have corresponding code changes: **01–02** (coach `AppShell` + dashboard main card tokens), **03** (`hasSharedReport` from client profile `shareToken` via `listClientSchedules` / `ClientGroup`), **04–05** (primary `Button` default variant; dashboard loading `role="status"` / `aria-busy` / `motion-safe` spinner), **06–07** (route `Suspense` loader tokens + a11y; non-null `InstallPrompt` suspense fallback), **08–12** (`PublicReportViewer` loaders, export error state, GDPR control sizing, muted “what changed” callout, transition `aria-busy`), **13** (`RequestErasure` wrapped in public `AppShell` + back links), **14–15** (achievements back → `ROUTES.DASHBOARD`; coach loader spin pattern), **18** (history dialog empty state CTA to assessment), **19–20** (onboarding loading/saving tokens + a11y; login Firebase error mapping via `mapFirebaseAuthError`). **16** (client tabs density) and **21** (`PlanStatusCard` CTAs) remain for a follow-up pass.
