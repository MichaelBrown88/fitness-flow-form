# Consultation-First Assessment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the first studio session consultation-first: client pre-fills structured intake at home; coach reviews and captures text-based consultation on the client profile; studio assessment runs in a natural physical order (RHR seated → fitness → body comp → strength → movement/posture last); goals are direction-only (chips); numeric targets and timelines are system-generated on the AXIS report—not asked of the client.

**Architecture:** Three data layers on the client record—**intake** (`formData`: structured, report-safe), **consultation** (coach-typed Q&A + prep notes, coach-only), **assessment** (measurements and scores). Studio navigation uses explicit **session steps** (`intake-review` → `consultation` → phased physical battery) plus a new **`STUDIO_FULL_PHASE_ORDER`** for physical phases. P6 is dissolved: goals and conditional training frequency live in the consultation step; `goalLevel*` fields are never collected. Remote `full` scope stays basics + PAR-Q + lifestyle + posture (no goals, no body comp).

**Tech Stack:** React 18 + Vite + TypeScript, Tailwind + shadcn/ui, Firebase Firestore + Cloud Functions v2, existing phase engine (`phaseDefinitions`, `useAssessmentNavigation`), Vitest where tests already exist.

---

## Product decisions (locked)

| Decision | Choice |
|----------|--------|
| Consultation storage | Subcollection `clients/{slug}/consultations/{id}` + `latestConsultationId` on client doc (append per baseline; coach sees latest by default, history expandable) |
| Consultation in AXIS report | **Never** surface raw Q&A |
| Goals | `clientGoals` chips only, captured in **consultation step** (studio), not on remote link |
| Ambition / numeric goal levels | **Do not collect**; `getEffectiveGoalLevels` + new projection copy at report time |
| `trainingExperience` (P6) | **Remove** (duplicate of `trainingHistory`) |
| `trainingFrequency` | Keep; show only when `recentActivity === 'currently-training'` |
| `primaryTrainingStyles` | Show only when `recentActivity === 'currently-training'` (also hide for `stopped-3-months`) |
| P6 phase | **Remove from navigation**; fields redistributed |
| Consultation as `PhaseId` | **No** — use session steps to avoid scoring/radar coupling |
| RHR before treadmill | Split P3 UI: step **Resting HR** then **Fitness test** (same `P3`, two sections with hard gate) |
| Posture at home | Skip/minimize P4 posture capture when `postureRemoteComplete` (or equivalent) is true |

---

## Studio session flow (coach + client)

```text
[Profile — optional before visit]
  Review intake summary + prep notes

[Assessment session]
  1. intake-review     — read-only home answers; tap to edit field
  2. consultation    — text Q&A + confirm clientGoals + conditional trainingFrequency
  3. P3 (section A)  — cardioRestingHr only (seated, relaxed)
  4. P3 (section B)  — test selection + peak/recovery HR
  5. P2              — body composition
  6. P5              — strength
  7. P4              — movement/posture (skip posture views if done remotely)
  8. P7              — results

[P0 + P1 if not already complete from remote]
  — If remote complete: P0/P1 shown only as intake-review (not re-walked).
  — If walk-in: P0/P1 run once before consultation OR merged into intake-review edit mode.
```

**Resume rule:** `remoteIntakeAwaitingStudio` → start session at `intake-review` or `consultation` if intake complete; never at P2/P3.

---

## Consultation question bank

Store in `src/constants/consultation.ts` (coach-facing labels; stable `id` keys).

| id | Prompt (coach sees) |
|----|-------------------|
| `whyNow` | What made you start now / book in? |
| `successInWords` | What would success look like in about 3–4 months? |
| `motivationNotes` | What matters most to you? (health, performance, appearance, event, pain, confidence) |
| `injuryHistory` | Past injuries, surgeries, what still flares |
| `currentLimitations` | Anything hurting today or movements to avoid |
| `occupationTypicalDay` | Work and typical day (desk, manual, shifts) |
| `previousCoaching` | Previous PT/coaching — what worked / didn't |
| `barriers` | Barriers (time, confidence, travel, etc.) |
| `anythingElse` | Anything else we should know |

Plus: `prepNotes` (coach-only, editable before visit).

Structured fields on same step (not free text): `clientGoals` (multiselect), `trainingFrequency` (conditional), optional `goalDeadline` (date, coach sets if client mentions event).

---

## Field / phase changes

### Remove from all client-facing UI
- `goalLevelWeightLoss`, `goalLevelMuscle`, `goalLevelBodyRecomp`, `goalLevelStrength`, `goalLevelFitness` — leave on `FormData` for backward compat; always use `getEffectiveGoalLevels` defaults when empty.
- `trainingExperience` — remove from `phaseP6.ts` and constants labels if unused.

### P6 (`phaseP6.ts`)
- **Delete phase from `phaseDefinitions`** and `DEFAULT_FULL_PHASE_IDS`.
- Move `clientGoals`, `goalDeadline` to consultation session UI.
- Move `trainingFrequency` to consultation UI (conditional).

### P0 (`phaseP0.ts`)
- Tighten `primaryTrainingStyles` conditional: `recentActivity === 'currently-training'` only.
- Consider moving `trainingHistory` to consultation only for **remote-complete** clients (optional polish); minimum: keep on P0 for walk-ins.

### Remote (`remoteIntakeFlow.ts`, `functions/src/remoteAssessment.ts`)
- Confirm `full` scope **excludes** `clientGoals`, all `goalLevel*`, `trainingFrequency`, body comp keys.
- Do **not** add consultation fields to remote (studio-only).

### Report (new narrative block)
- Add `src/lib/goals/projectedOutlook.ts` — inputs: primary goal, `trainingHistory`, weight/BF%/SMM, RHR/test outputs.
- Surface in client report hero or lifestyle/body-comp pillar via `useClientReportData` — client-safe copy in `src/constants/clientReport.ts` (e.g. `outlookHeading`, template strings).
- Copy pattern: “Based on your baseline, over the next **12–16 weeks** realistic progress could include …” — no kg promises unless consultation notes are used in **coach SIGNAL only** (out of scope for v1).

---

## File map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/constants/consultation.ts` | Create | Question ids, labels, prep notes label |
| `src/lib/consultation/types.ts` | Create | `ConsultationDoc`, `ConsultationAnswers` |
| `src/lib/database/paths.ts` | Modify | `consultations` subcollection path helper |
| `src/services/consultation.ts` | Create | CRUD: get latest, list, save, append |
| `firestore.rules` | Modify | Coach org-scoped read/write on consultations |
| `src/components/client/ConsultationPanel.tsx` | Create | Text Q&A + goals + conditional frequency |
| `src/components/client/IntakeReviewSummary.tsx` | Create | Read-only P0/P1/PAR-Q/posture summary |
| `src/components/client/ConsultationTab.tsx` | Create | Profile tab: prep + panel + history |
| `src/pages/client/ClientDetailLayout.tsx` | Modify | Add Consultation tab route |
| `src/constants/routes.ts` | Modify | Client consultation sub-route if needed |
| `src/lib/assessment/studioSessionSteps.ts` | Create | Step enum + ordering + resume resolver |
| `src/lib/types/assessmentPlan.ts` | Modify | `STUDIO_FULL_PHASE_ORDER`, remove P6 from default full |
| `src/lib/phases/index.ts` | Modify | Remove `phaseP6` from `phaseDefinitions` |
| `src/lib/phases/phaseP6.ts` | Delete or keep exported empty stub | Avoid breaking imports — prefer delete + fix imports |
| `src/lib/phases/phaseP0.ts` | Modify | Conditional training styles |
| `src/lib/phases/phaseP3.ts` | Modify | Two sections: `resting-hr`, `fitness-test`; gate hint on RHR |
| `src/hooks/useAssessmentNavigation.ts` | Modify | Session steps before phases; P3 section order; skip P4 posture if remote |
| `src/components/assessment/AssessmentShell.tsx` (or equivalent) | Modify | Render step headers: Intake review / Consultation |
| `src/hooks/useClientDetail.ts` | Modify | `startStudioAssessment` resume at correct step |
| `src/pages/client/ClientOverview.tsx` | Modify | CTA: “Review intake & consultation” vs “Continue assessment” |
| `src/lib/goals/projectedOutlook.ts` | Create | Deterministic outlook sentences |
| `src/components/reports/client/…` | Modify | Outlook section in report layout |
| `src/lib/remote/remoteIntakeFlow.ts` | Modify | Conditional training screens on remote if we add frequency later — **v1: omit** |
| `functions/src/remoteAssessment.ts` | Modify | Verify allowed keys whitelist |
| `src/lib/assessment/baselineSession.ts` | Modify | Plan without P6; studio step state in session storage |
| `src/lib/assessment/assessmentSessionStorage.ts` | Modify | Persist `studioStep`, `consultationComplete` |
| `AGENTS.md` | Modify | Consultation-first flow, coach-only consultation, goal projection |

### Tests
| File | Action |
|------|--------|
| `src/lib/assessment/studioSessionSteps.test.ts` | Create | Resume + order |
| `src/lib/goals/projectedOutlook.test.ts` | Create | Outlook copy for each primary goal |
| `src/lib/phases/phaseP0.test.ts` or existing field conditional tests | Modify | Training style visibility |

---

## Firestore schema

```typescript
// clients/{orgId}/clients/{slug}
{
  latestConsultationId?: string;
  remoteIntakeAwaitingStudio?: boolean;
  remoteIntakePending?: boolean;
  // formData unchanged — intake + assessment merge
}

// clients/{orgId}/clients/{slug}/consultations/{consultationId}
{
  organizationId: string;
  clientSlug: string;
  coachUid: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  prepNotes: string;
  answers: Record<ConsultationQuestionId, string>;
  clientGoals: string[];
  trainingFrequency?: string;
  goalDeadline?: string; // ISO date optional
  assessmentId?: string; // link when created during a session
}
```

**Security:** `organizationId` on doc; rules match existing client coach/admin patterns; deny client PWA read on `consultations`.

---

## Task 1: Constants and types

**Files:**
- Create: `src/constants/consultation.ts`
- Create: `src/lib/consultation/types.ts`

- [ ] **Step 1:** Define `CONSULTATION_QUESTIONS` array `{ id, label, placeholder? }` and `ConsultationQuestionId` union.
- [ ] **Step 2:** Define `ConsultationDoc` interface matching Firestore schema above.
- [ ] **Step 3:** Run `npx tsc --noEmit`.

---

## Task 2: Firestore paths, service, rules

**Files:**
- Modify: `src/lib/database/paths.ts`
- Create: `src/services/consultation.ts`
- Modify: `firestore.rules`

- [ ] **Step 1:** Add `ORGANIZATION.clients.consultations.collection(orgId, slug)` path helper.
- [ ] **Step 2:** Implement `getLatestConsultation`, `saveConsultation`, `listConsultations` with `organizationId` validation and `limit(20)` on list.
- [ ] **Step 3:** Rules: coach with client access can read/write consultations; deny if `request.auth` is client token path.
- [ ] **Step 4:** Emulator rules test or manual note in PR test plan.
- [ ] **Step 5:** `npx tsc --noEmit`.

---

## Task 3: Consultation UI (profile)

**Files:**
- Create: `src/components/client/IntakeReviewSummary.tsx`
- Create: `src/components/client/ConsultationPanel.tsx`
- Create: `src/pages/client/ClientConsultationTab.tsx`
- Modify: `src/pages/client/ClientDetailLayout.tsx`
- Modify: `src/constants/routes.ts` (if tab route needed)

- [ ] **Step 1:** `IntakeReviewSummary` — sections: About, PAR-Q flags, Lifestyle, Posture at home; use `ASSESSMENT_OPTIONS` labels for display values.
- [ ] **Step 2:** `ConsultationPanel` — maps questions to textareas; debounced save; `clientGoals` multiselect; `trainingFrequency` only if `formData.recentActivity === 'currently-training'`.
- [ ] **Step 3:** Tab shows prep notes at top, panel, “History” collapsed list from `listConsultations`.
- [ ] **Step 4:** Wire tab in client detail nav (label: **Consultation**).
- [ ] **Step 5:** Manual QA: open client with `remoteIntakeAwaitingStudio`, see intake summary.

---

## Task 4: Studio session steps (navigation spine)

**Files:**
- Create: `src/lib/assessment/studioSessionSteps.ts`
- Create: `src/lib/assessment/studioSessionSteps.test.ts`
- Modify: `src/lib/assessment/assessmentSessionStorage.ts`
- Modify: `src/lib/types/assessmentPlan.ts`

- [ ] **Step 1:** Define `StudioSessionStep = 'intake-review' | 'consultation' | 'phase'`.
- [ ] **Step 2:** `STUDIO_FULL_PHASE_ORDER: PhaseId[] = ['P3','P2','P5','P4','P7']` for physical-only after consultation; P0/P1 handled via intake-review when incomplete.
- [ ] **Step 3:** `resolveInitialStudioStep(formData, flags)` → remote complete skips to `consultation` if P0/P1 done else `intake-review`.
- [ ] **Step 4:** Persist `studioStep` + `consultationComplete` in session storage.
- [ ] **Step 5:** Unit tests for resume scenarios (pending remote, walk-in, mid-assessment).
- [ ] **Step 6:** Update `DEFAULT_FULL_PHASE_IDS` to exclude P6; update `SESSION_FOCUS_TEMPLATES.full` accordingly.

---

## Task 5: Assessment shell — intake review & consultation steps

**Files:**
- Modify: assessment shell / navigation hook (locate via `useAssessmentNavigation`, `AssessmentForm` or `FormLayout`)
- Modify: `src/hooks/useClientDetail.ts`
- Modify: `src/pages/client/ClientOverview.tsx`

- [ ] **Step 1:** Before phase nav, render `intake-review` step with `IntakeReviewSummary` + “Continue to consultation”.
- [ ] **Step 2:** Render `consultation` step embedding `ConsultationPanel`; on save set `consultationComplete` + sync to Firestore subcollection; “Start physical assessment” → first phase in `STUDIO_FULL_PHASE_ORDER`.
- [ ] **Step 3:** `handleFinishAssessment` / new session: use `resolveInitialStudioStep`.
- [ ] **Step 4:** Overview banner: “Intake ready — review consultation” → links to tab or starts session at consultation.
- [ ] **Step 5:** Clear `remoteIntakeAwaitingStudio` on full assessment save (existing behavior — verify).

---

## Task 6: P3 split — resting HR gate

**Files:**
- Modify: `src/lib/phases/phaseP3.ts`
- Modify: `src/hooks/useAssessmentNavigation.ts`
- Modify: `src/constants/assessment.ts` (`PHASE_GATE_HINTS.P3`, section titles)

- [ ] **Step 1:** Split sections: `resting-hr` (only `cardioRestingHr`), `fitness-test` (test + peak + recovery).
- [ ] **Step 2:** Navigation: cannot enter `fitness-test` until `cardioRestingHr` valid (reuse existing required-field validation).
- [ ] **Step 3:** Gate hint copy: seated, quiet 5 minutes before test section.
- [ ] **Step 4:** Manual QA: new session cannot jump to treadmill fields without RHR.

---

## Task 7: Remove P6; redistribute fields

**Files:**
- Modify: `src/lib/phases/index.ts`
- Modify: `src/lib/phases/phaseP6.ts` (remove from registry)
- Modify: any imports of `phaseP6`
- Modify: `src/constants/assessment.ts` (deprecate P6 labels or repurpose under consultation)

- [ ] **Step 1:** Remove `phaseP6` from `phaseDefinitions`.
- [ ] **Step 2:** Grep `P6` / `phaseP6` / `trainingExperience` — fix navigation, wizards, analytics that assume P6 exists.
- [ ] **Step 3:** Ensure `clientGoals` still persist on `formData` when consultation saves (write-through to assessment `formData` + consultation doc).
- [ ] **Step 4:** `npx tsc --noEmit`.

---

## Task 8: P0 conditionals + remote whitelist

**Files:**
- Modify: `src/lib/phases/phaseP0.ts`
- Modify: `src/lib/remote/remoteIntakeFlow.ts` (if training styles added to remote — only when currently training)
- Modify: `functions/src/remoteAssessment.ts`

- [ ] **Step 1:** `primaryTrainingStyles` conditional: `showWhen: { field: 'recentActivity', value: 'currently-training' }`.
- [ ] **Step 2:** Remote: do not add goals; verify `allowedKeysForScope('full')` excludes goals and goalLevel keys.
- [ ] **Step 3:** Optional: add `primaryTrainingStyles` to remote only when client selects currently-training (future screen) — **v1 skip** if not already on remote.

---

## Task 9: P4 skip posture when remote complete

**Files:**
- Modify: `src/hooks/useAssessmentNavigation.ts`
- Modify: posture section in `phaseP4` or posture block component

- [ ] **Step 1:** Detect `postureRemotePath_*` or existing `postureRemoteComplete` flag on formData/client.
- [ ] **Step 2:** Skip posture capture sections; still allow movement patterns.
- [ ] **Step 3:** Manual QA: remote posture client → studio skips re-capture.

---

## Task 10: Projected outlook on AXIS report

**Files:**
- Create: `src/lib/goals/projectedOutlook.ts`
- Create: `src/lib/goals/projectedOutlook.test.ts`
- Modify: `src/components/reports/client/useClientReportData.ts`
- Modify: report layout component (hero or dedicated strip)
- Modify: `src/constants/clientReport.ts`

- [ ] **Step 1:** `buildProjectedOutlook(formData, scores)` returns `{ headline, bullets, horizonWeeks }` per primary goal using existing rates from `useClientReportData` / `achievableLandmarks` (no new client inputs).
- [ ] **Step 2:** Tests: weight-loss, build-muscle, improve-fitness, general-health produce non-empty copy.
- [ ] **Step 3:** Render on client report; ensure public report viewer uses same helper (air-gap: no consultation text).
- [ ] **Step 4:** Do not display `goalLevel*` labels anywhere client-facing.

---

## Task 11: Analytics and demo data

**Files:**
- Modify: `functions/src/populationAnalytics.ts` (if P6 phase id assumed)
- Modify: `src/lib/demoGenerator.ts`

- [ ] **Step 1:** Stop writing `goalLevel*` in demo generator (optional cleanup).
- [ ] **Step 2:** Analytics: primary goal from `clientGoals` only.
- [ ] **Step 3:** `npx tsc --noEmit` root + functions.

---

## Task 12: Documentation and AGENTS.md

**Files:**
- Modify: `AGENTS.md`

- [ ] **Step 1:** Document consultation-first studio order, coach-only consultation, no ambition pickers, report projections.
- [ ] **Step 2:** Note coupled deploy if `firestore.rules` changed → `firebase deploy` not hosting-only preview.

---

## Verification checklist

- [ ] `npx tsc --noEmit` (root)
- [ ] `cd functions && npx tsc -b --noEmit`
- [ ] Targeted tests: `studioSessionSteps.test.ts`, `projectedOutlook.test.ts`
- [ ] Manual: send remote link → client completes → coach profile Consultation tab shows intake
- [ ] Manual: start studio → intake-review → consultation → RHR → test → body comp; no P6 in sidebar
- [ ] Manual: walk-in → P0/P1 → consultation → physical order
- [ ] Manual: client report shows outlook text, not consultation answers
- [ ] `npm run deploy:preview` after substantive UI (paste channel URL in PR)

---

## Out of scope (v1)

- AI summarisation of consultation into SIGNAL
- Client PWA access to consultation
- Moving `trainingHistory` off remote entirely
- Re-adding body comp to remote link
- Full Firestore migration of legacy assessments missing consultation docs

---

## Suggested implementation order

1. Tasks 1–2 (data layer)  
2. Task 3 (profile tab — usable before session work)  
3. Tasks 4–5 (session steps + shell)  
4. Tasks 6–9 (physical flow polish)  
5. Task 7 (P6 removal — can parallel with 5 after consultation captures goals)  
6. Tasks 10–12 (report + cleanup)

---

## Execute

When ready to implement, run:

```text
Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.
```

Use subagent-driven-development or executing-plans skill task-by-task.
