# Multi-pillar session grouping — design

**Date:** 2026-04-29
**Status:** Approved (Approach B), ready for plan

## Problem

When multiple pillar reassessments are due on the same day for the same client, today's flow forces the coach to submit each pillar separately:

- Agenda renders one row per (client, pillar)
- Starting a pillar fires `handleNewAssessment(category)` with a single category
- Saving fires `savePartialAssessment` once per pillar
- The coach has to click Save → return to client → click Start next → complete → Save again, N times

Coaches batch pillar reassessments in real life (one studio session covers Body Comp + Strength + Lifestyle). The product should match that.

## Goal

Make multi-pillar same-day assessments feel like one assessment:

- One "Start" click for all due-today pillars
- One scrollable form covering all included pillars' fields
- One submit at the end
- Default behavior — no prompt 9/10 times; small "just this one" override is always available

## Non-goals

- Cross-client batching ("3 clients have stuff due today" — separate concern)
- Cross-day session continuation (each session is one calendar day)
- Phase reordering / merging — keep the existing phase sequence; only expand which fields are visible

## Approach (Approach B from brainstorm)

Set-based session, **N snapshots written in one Firestore batch**, sharing a `sessionId`.

The coach UX feels like one assessment. The data model preserves per-pillar history queries (Body Comp over time still works) and per-pillar cadence accounting.

## Data model changes

### `PartialAssessmentSessionRecord` (sessionStorage)

```ts
export type PartialAssessmentSessionRecord = {
  clientName?: string;
  /** @deprecated single-category callers — read `categories` first */
  category?: string;
  /** Multi-pillar session — array of pillar ids */
  categories?: string[];
};
```

Add `readPartialAssessmentCategories(): PartialCategory[]` returning either `categories` if present, or `[category]` if only the legacy field is set, or `[]`.

`writePartialAssessment` accepts both shapes; canonicalizes to `categories` on write.

### `AssessmentSnapshot` (Firestore)

```ts
export type AssessmentSnapshot = {
  // ...existing fields
  /** When set, identifies all snapshots written in the same coaching session */
  sessionId?: string;
  /** When set, lists every pillar covered by the originating session
   *  (the snapshot itself still has its own single `pillar` value) */
  sessionCategories?: string[];
};
```

`sessionId` is a v4 UUID generated at submit time. `sessionCategories` is a denormalized convenience field for "show me everything in that session" queries without joining N docs.

### Profile date updates

Save loop iterates the `categories` array and stamps the corresponding `lastXDate` field for each. `lastAssessmentDate` is set once.

## UX changes

### 1. Reassessment agenda (dashboard)

`useReassessmentQueue.deriveAgenda()` groups by `(clientName, dueDate-as-local-day)`. Same-client same-day pillars become one `AgendaItem` with `pillars: PillarId[]`.

Row UI shows the pillar set as chips:

> **Faisal** — Body Comp + Strength + Lifestyle · due today
> [Start session →]

A small inline "edit" affordance lets coach drop pillars from the set before starting (e.g. de-select Strength). Default = all included.

### 2. Attention card (client overview)

When coach clicks "Start Body Comp" on the Attention card, we check whether other pillars are also **overdue or due today** (`daysFromDue <= 0`) for the same client. Future-due pillars (`daysFromDue > 0`) are NOT auto-included — those stay separate. If at least one sibling is overdue or due today, the click opens the assessment in **multi-pillar mode** with the originating pillar plus all qualifying siblings pre-selected, and the form's first phase shows a small unobtrusive bar:

> Body Comp + Strength + Lifestyle · 3 pillars in this session  [include only Body Comp]

Clicking "include only Body Comp" rewrites the session to single-category and reloads the form filter.

### 3. Assessment form

Partial-category field filter (`PARTIAL_CATEGORY_FIELD_PREFIXES`) accepts an array. A field is rendered/required if it belongs to ANY pillar in the set.

Phase navigation, save-for-later, and prefill flows are otherwise unchanged.

### 4. Submit

One submit button at the end. The save flow:

1. Generates `sessionId = crypto.randomUUID()`
2. Filters the `categories` array down to those that pass `isAssessmentComplete(formData, 'partial-${pillar}')` — i.e. the pillar's required fields are populated. Pillars that don't pass are skipped at write time and stay marked "due"
3. Builds N `AssessmentSnapshot` payloads (one per surviving pillar) with shared `sessionId` + `sessionCategories` + identical timestamp
4. Writes them in a `writeBatch`
5. Updates profile dates for all surviving pillars in one `updateDoc`
6. Fires coach-notes regen **once** for the session (not N times)

## Edge cases

| Case | Behavior |
|---|---|
| Coach starts multi-pillar session, fills only one pillar's fields, submits | Save only that pillar's snapshot. Other pillars remain "due". Toast: "Body Comp saved. Strength still due." |
| Coach uses "Save for later" mid-session | Draft persists with `categories` array intact. Reopening continues the session. |
| Coach clicks "include only Body Comp" mid-session | Session storage rewritten to single-category. Form re-filters. Other pillars stay due. |
| Existing single-category callers (legacy code paths) | Continue to work. `categories: [c]` is canonical; `category` is derived for legacy reads. |
| Existing snapshots without `sessionId` | Stay as-is. Per-pillar history queries work unchanged. |
| Pillar in set has no required fields filled by submit time | Skipped at write time. Coach gets a toast naming any skipped pillars. |
| Coach starts a session, navigates away, comes back next day | Draft's `updatedAt` is older than today; can resume but the agenda row for today no longer auto-includes pillars that are now due since (recomputed on read). |

## Files affected (rough scope, for plan)

**New / extended:**
- `src/lib/assessment/assessmentSessionStorage.ts` — `categories` field + accessor
- `src/services/assessmentHistory.ts` — `AssessmentSnapshot.sessionId`/`sessionCategories`
- `src/services/coachAssessments.ts` — `saveMultiPillarAssessment(sessionId, categories, formData, …)` writing N snapshots in one batch

**Modified:**
- `src/hooks/useAssessmentSave.ts` — branch when `categories.length > 1`
- `src/hooks/useClientDetail.ts` — `handleNewAssessment(categories?: PillarId[])`
- `src/hooks/useReassessmentQueue.ts` — `deriveAgenda()` groups by client+day, `AgendaItem.pillars: PillarId[]`
- `src/pages/client/ClientOverview.tsx` — Attention "Start X" detects siblings, the in-form pill UI
- `src/components/dashboard/...` — agenda row UI for grouped pillars (chips + start)
- `src/lib/assessmentCompleteness.ts` (or wherever `PARTIAL_CATEGORY_FIELD_PREFIXES` is consumed) — accept array

## Migration

No Firestore migration required. New fields are additive; old snapshots and old session records continue to work.

## Open questions

- "Active pillars" on the client profile is `['bodycomp', 'strength', 'fitness', 'lifestyle']` by default. Should `posture` ever be auto-included if it's overdue? **Decision**: yes — agenda groups by what's actually due, regardless of `activePillars` defaults.
- If a client has only one pillar due today, the agenda still shows a single-pillar row (no chip set). Multi-pillar mode is gated on `pillars.length > 1`.

## Initiation surfaces and rescheduling

### Where a coach starts an assessment (5 surfaces today)

| Surface | Path | Multi-pillar behaviour |
|---|---|---|
| **Today / agenda** | `DashboardWork.tsx` | Primary — groups by `(client, day)`, one row per session |
| **Calendar View** | `CalendarView.tsx` | Already supports drag-drop reschedule via `setDueDateOverride` |
| **Client Overview → Attention card** | `ClientOverview.tsx` | Ad-hoc — auto-includes overdue / due-today siblings |
| **Client Overview → Quick Actions "+ New Assessment"** | — | Free-form, picker — does not auto-group |
| **Sidebar "+ New assessment"** | `CoachWorkspaceSidebar.tsx` | Free-form, global — does not auto-group |

The two recommended **default flows** are:
1. **Schedule-driven**: Today/agenda → combined session row → one click starts the multi-pillar session
2. **Ad-hoc with client present**: Client Overview → Attention card → "Start session" with all overdue/due-today pillars pre-included

### Cross-client safety (hard guarantee)

Agenda grouping key is `(clientName, day)`. Two clients with same-day pillars become **two** agenda items. Sessions are scoped to one client — this is enforced at the data layer (the session writes go under `clients/{clientSlug}/sessions/...`) so cross-client mixing is structurally impossible.

### Reschedule a single pillar out of a multi-pillar group

Grouping is a UX convenience, not a data lock. Coach can split a session at three points, all reusing the existing `setDueDateOverride(clientName, orgId, pillar, newDate)` API:

1. **Calendar View (already works)** — drag the Fitness chip off May 5 onto May 7. Backed by `CalendarView.tsx:134`. May 5 row becomes Strength + Lifestyle on next read.
2. **Agenda row** — small "..." menu on each pillar chip → "Move to another date" → date picker. Row re-renders without that chip.
3. **Inside the session bar** (in-form) — the "3 pillars in this session" pill at the top of phase 1 has each pillar as a chip → tap → "Remove from this session" + optional "Reschedule for…". The pillar drops out of the form filter immediately. If reschedule chosen, `setDueDateOverride` is called.

If a pillar is dropped mid-session, its formData stays in the merged state but no snapshot is written for it — the `isAssessmentComplete(formData, 'partial-${pillar}')` filter at submit decides which pillars actually save (per the existing spec).

### "Move out" UX details

- Date-picker options: "Tomorrow", "+3 days", "Next week", "Custom date" (chip selectors + date input fallback). No drag handles needed inside the form/agenda — that's what Calendar View is for.
- After reschedule, agenda + Attention card refresh on next read (their hooks subscribe to client profile + retestSchedule changes).
