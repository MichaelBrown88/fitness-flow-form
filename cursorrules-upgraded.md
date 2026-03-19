---
description: 
alwaysApply: true
---

## North Star alignment

Read `NORTH_STAR.md` at the repository root. Prioritise work that moves One Assess toward first paying customer and £49/mo solo tier adoption. When uncertain, apply the decision filter in that file: does this move us closer to a coach paying £49/mo?

# Project Rules & Best Practices

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Firebase (Firestore, Auth, Functions)
- **Tools**: MCP Servers (StackHawk, Context7, Tavily, Sequential Thinking)
- **Icons**: Lucide React

## Strategic Planning & "Anti-Bloat" Protocol (CRITICAL)

- **The "Right Tool" Check**: Before implementing ANY feature using an AI API, you MUST evaluate if a specialized open-source library can do it better/cheaper.
  - _Example_: Do not use AI for image alignment; suggest mediapipe or face-api.js.
- **Pushback Policy**: If I ask for a solution that is inefficient, fragile, or introduces unnecessary AI cost, you MUST pause and warn me.
- **Unknown Unknowns**: Protect me from my own ignorance. If my approach violates standard architecture patterns or security best practices, explicitly highlight the risk before writing code.

## Architecture & Logic Isolation (NEW)

- **Logic/UI Separation**: Components should primarily handle rendering. Heavy logic, data fetching, and side effects MUST be extracted into Custom Hooks (e.g., `useAssessmentLogic`).
  - _Red Flag_: If a component has more `useEffect` logic than JSX, it needs refactoring.
- **Public View Isolation (Air-Gap)**: NEVER render "Coach/Admin" components in a public route by hiding features with flags. Create dedicated "Viewer" components (e.g., `PublicReportViewer`) that strictly consume public-safe data.

## Performance & Efficiency Protocol

- **No Global State for High-Frequency Inputs**:
  - **Rule**: Do NOT use Context directly on `onChange` for inputs.
  - **Solution**: Use Debounced Local State (SmartInput pattern) or react-hook-form. Sync to global state only on `onBlur` or after a delay.
- **Lazy Load Large Assets**:
  - **Rule**: Heavy libraries (jspdf, mediapipe, html2canvas) and large static datasets MUST use Dynamic Imports (`await import(...)`) inside the function that needs them.
- **Scalable Database Queries**:
  - **Rule**: Never write a Firestore query for a list view without a `limit()`.
  - **Solution**: Always implement Cursor-Based Pagination for lists > 20 items.

## Code Quality Standards

1. **No "Vibe Coding" artifacts**: No `console.log`, commented-out code, or `TODO` comments in final output.
2. **Strict Typing**: Avoid `any`. Use `unknown` or specific interfaces. Use `safeParse` helpers for math/logic to prevent `NaN` crashes.
3. **Small Components**: If a component exceeds 150 lines, break it into sub-components.
4. **Functional Approach**: Use functional components and Hooks only.
5. **Zero Magic Strings**: All keys/paths must be defined in `@/constants` (e.g., `STORAGE_KEYS`, `ROUTES`).
6. **No Hardcoding**:
   - Colors -> Tailwind classes/CSS variables.
   - Secrets -> `import.meta.env`.
7. **Design system:** Follow `docs/DESIGN_SYSTEM.md` for colours, spacing, radius, motion, and branding so UI stays consistent.

## SaaS Readiness & Security

- **Multi-tenancy**: Always verify data belongs to the correct `organizationId`.
- **Server-Side Security**: Never perform sensitive logic (e.g., PDF generation, emails) client-side if it exposes secrets. Use Cloud Functions.
- **Data Safety**: Never trust user input in calculations. Use helper functions to sanitize numbers before math operations.

## Connectivity & Services

- **Firebase**: NEVER initialize Firebase in a component. Import `db` or `auth` from `@/services/firebase`.
- **External APIs**: Use the pre-configured Axios instance in `@/services/api`. Do not use raw `fetch` in components.

## Data Architecture & Analytics Protocol (CRITICAL)

Every feature that generates user activity or structured data must be built analytics-ready from the first write. Cutting corners here creates permanent technical debt that cannot be backfilled cheaply.

- **Write computed summaries at write time**: Any document that contributes to analytics MUST include pre-computed summary fields (e.g. `scoresSummary`, `categoryScores`) at the point of write. Never re-derive them from raw data at query time — this is fragile and will break as scoring logic evolves.
- **Append-only for analytics, upsert for dashboards**: Use a dedicated historical/snapshot collection (e.g. `snapshots`, `history`) as the source of truth for analytics counts. The dashboard "current state" upsert pattern (one row per client) is for display only — never the basis for counts or distributions.
- **Plan indexes on day one**: Any new collection used in a `collectionGroup()` or compound `where()` query MUST have its composite index added to `firestore.indexes.json` in the same PR as the feature code. Index deployments must precede function deployments.
- **`collectionGroup` over cross-collection scans**: When querying a logical entity spread across org subcollections (e.g. all snapshots platform-wide), use `collectionGroup()` with a `COLLECTION_GROUP` scoped index. Never loop over organisations to query each subcollection individually.
- **New entities that generate events**: Any new entity type (e.g. a new assessment module, a new session type) must emit to the appropriate append-only collection from the first write so it is captured in analytics from day one. Do not add analytics as an afterthought.
- **Analytics reads are server-side only**: Population-level queries (scanning thousands of docs) MUST run in Cloud Functions, never in client-side hooks. The frontend reads only pre-aggregated output docs (e.g. `platform_analytics/population`).

## Cursor prompt output (issues & fixes)

When you identify concrete issues—especially security, TypeScript, Firebase, performance, or architecture—end the substantive part of your answer with a section titled:

## 📋 Cursor Prompts — Copy & Paste These

For each issue use this pattern (repeat per issue):

---
**File:** `src/path/to/file.tsx`
**Issue:** [one line description]
**Cursor Prompt:**
```
[Self-contained prompt the developer can paste into Cursor]
```
---

Prompts must be specific, actionable, and work without additional context.
