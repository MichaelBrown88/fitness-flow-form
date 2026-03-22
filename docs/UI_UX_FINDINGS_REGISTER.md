# UI/UX findings register (MCP-led discovery)

Living log. Remediation references these IDs. Do not treat as exhaustive.

## Zone: Public token routes (`/r/:token*`)

| ID | Source | Severity | Area | Summary |
|----|--------|----------|------|---------|
| FR-PUBLIC-ROADMAP-01..09 | Prior audit | — | Roadmap | **Remediated** (PublicRoadmapViewer, RoadmapClientView, ClientJourneyPhase, TrackableBar, AppShell public) |
| FR-PUBLIC-REPORT-01 | Code review | Low | PublicReportViewer | `usePublicReport` handles missing token (sets error + loading false); pattern OK vs roadmap |
| FR-PUBLIC-ACHIEVE-01 | Grep | Medium | Achievements.tsx | **Partially remediated:** heading/subtext/loaders use `text-foreground` / `text-muted-foreground` / `motion-safe:animate-spin` |
| FR-PUBLIC-CHECKIN-01 | Code review | Low | PublicLifestyleCheckin | Hardcoded `emerald-*` success state; public shell inconsistency until AppShell fixed |

## Zone: Marketing / auth / legal

| ID | Source | Severity | Area | Summary |
|----|--------|----------|------|---------|
| FR-MKT-01 | Grep sample | Medium | RequireAuth / App Suspense | `slate-*` loading UIs in App.tsx |
| FR-MKT-02 | Policy | — | Landing/Login | Full pass deferred; grep shows widespread `slate-*` in pages (separate remediation batches) |

## Zone: Coach dashboard + client

| ID | Source | Severity | Area | Summary |
|----|--------|----------|------|---------|
| FR-COACH-01 | Grep | Medium | ClientAchievementsTab, ClientDetail | `zinc-900` / `slate-*` mixed with tokens |

## Zone: Assessment + companion + settings

| ID | Source | Severity | Area | Summary |
|----|--------|----------|------|---------|
| FR-ASMT-01 | Policy | — | Index / Companion | Deferred deep pass; token violations likely in large surfaces |

## Zone: Org + platform admin

| ID | Source | Severity | Area | Summary |
|----|--------|----------|------|---------|
| FR-ORG-01 | Policy | — | OrgAdminLayout | Deferred; follow cross-cutting token pass |

## Zone: Cross-cutting

| ID | Source | Severity | Area | Summary |
|----|--------|----------|------|---------|
| FR-X-01 | Grep | High | AppShell public | Hardcoded slate/light-only (remediate with roadmap batch) |
| FR-X-02 | Grep | Medium | `src/` | Hundreds of `slate-|zinc-|indigo-|violet-` usages; systematic ESLint/stylelint per DESIGN_SYSTEM optional follow-up |

## Prioritization

1. **P0:** FR-PUBLIC-ROADMAP-\*, FR-X-01 (public client experience + shell)
2. **P1:** FR-PUBLIC-ACHIEVE-01, FR-MKT-01, FR-COACH-01 (token consistency)
3. **P2:** FR-X-02 app-wide lint; remaining zones deep audit
