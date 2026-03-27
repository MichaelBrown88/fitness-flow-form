# Public vs authenticated routes

Derived from [`src/App.tsx`](../src/App.tsx). Use when adding routes to keep the public air-gap (see `.cursorrules`).

## Fully public (no `RequireAuth`)

| Path pattern | Page | Data access notes |
|--------------|------|-------------------|
| `/`, `/pricing` | `Landing` | Marketing only |
| `/login`, `/signout`, `/signup` (→ onboarding) | Auth flows | Auth APIs only |
| `/terms`, `/privacy`, `/cookies` | Legal | Static |
| `/about`, `/contact`, `/blog`, `/demo` | Marketing | Static / public APIs |
| `/onboarding`, `/try` | Onboarding, `SandboxTrial` | Creates session as designed |
| `/r/:token` | `PublicReportViewer` | Token-scoped public Firestore paths |
| `/r/:token/roadmap` | `PublicRoadmapViewer` | Token / shareToken scoped |
| `/r/:token/achievements` | `Achievements` | Uses `useTokenAchievements(token)` — not coach UID scope |
| `/r/:token/lifestyle` | `PublicLifestyleCheckin` | Token scoped |
| `/r/:token/erasure` | `RequestErasure` | Token scoped |
| `/r/:token/pre-session` | `PublicPreSessionCheckin` | Token scoped |
| `/companion/:sessionId` | `Companion` | Session id gate (not Firebase auth); verify server/session rules |
| `/admin/login`, `/admin/setup`, `/admin`, `/admin/organizations/:orgId` | Platform admin | Separate platform auth pattern |

## Authenticated coach/org (`RequireAuth` or layout guard)

| Area | Notes |
|------|--------|
| `/dashboard/*`, `/assessment`, `/coach/*`, `/client/*`, `/settings`, `/compare`, `/org/*`, `/billing/*`, `/subscribe` | Coach/org data under `organizations/{orgId}` |
| `/achievements` (no token) | `useAchievements()` — coach UID scoped |

## Checks before merge

- [ ] New `/r/:token/*` routes use token-scoped hooks or public collections only.
- [ ] No import of coach-only dashboards into public pages.
- [ ] Public pages do not render PII from org collections without token gate.
