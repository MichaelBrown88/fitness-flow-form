# Remote Assessment Wizard — Design Spec

**Date:** 2026-04-15  
**Status:** Approved  

---

## Overview

Expand the remote client intake link (sent from "New Client" modal) into a full 5-step mobile wizard covering all non-physical aspects of the assessment. The client completes Basic Info, Lifestyle, PAR-Q, and optionally Body Comp and Posture at home. The coach completes physical phases (Cardio, Movement, Strength, etc.) in studio.

The wizard is a thin public-facing shell — it reuses the same constants, labels, options, and components as the in-studio assessment. No field definitions or copy are duplicated.

---

## Step Structure

```
Step 1: Basic Info → Step 2: Lifestyle → Step 3: PAR-Q → Step 4: Body Comp → Step 5: Posture
        (P0)                 (P1)               (P1)          (P2, optional)     (P4, optional)
```

- Progress bar always visible showing step name and position (e.g. "Step 2 of 5 — Lifestyle")
- Back/Next navigation at the bottom of each step
- Steps 4 and 5 each begin with a gate screen: "Do this now" or "Skip — we'll do it in studio"
- Skipping an optional step is not a failure state; it's a first-class choice
- Final step (whichever is last after optional skips) has "Submit" instead of "Next"

### Matching studio phase order

| Remote Step | Studio Phase | Notes |
|---|---|---|
| 1. Basic Info | P0 | Name, email, phone, DOB, gender, height, training history, recent activity |
| 2. Lifestyle | P1 | Activity, sleep, stress, nutrition, hydration, steps, sedentary hours, caffeine, alcohol, medications |
| 3. PAR-Q | P1 | Separated into its own step for mobile UX; question list and logic identical to studio |
| 4. Body Comp | P2 | Optional; scan InBody printout or enter manually |
| 5. Posture | P4 | Optional; existing posture photo capture flow |

---

## UI Fix: Link Display in NewClientModal

The generated link currently renders as a full URL string inside a `font-mono` span, which overflows on mobile. Replace with:
- A short confirmation message: "Share this link with **[Name]** to complete their intake remotely."
- A truncated URL display (non-interactive, just visual context)
- A prominent **Copy link** button (the only action needed)
- The raw URL is no longer directly rendered — just copied to clipboard

---

## Step 1 — Basic Info

**Fields** (from `phaseP0` definitions, labels and options from `ASSESSMENT_LABELS.P0` / `ASSESSMENT_OPTIONS`):
- Full name (text, required) — pre-filled with the name the coach typed when sending the link
- Email (email, required)
- Phone (tel, required)
- Date of birth (date, required)
- Gender (select, required) — drives PAR-Q conditional questions and scoring
- Height in cm (number, required)
- Training history (select, required)
- Recent activity (select, required)

**Validation:** All required fields must be filled before Next is enabled.

---

## Step 2 — Lifestyle

**Fields** (from `phaseP1`, same options as `PublicRemoteLifestyleFields` which already exists):
- Activity level, sleep archetype, stress level, nutrition habits, hydration habits (selects)
- Steps per day, sedentary hours, caffeine cups/day (number inputs)
- Alcohol frequency (select)
- Medications flag + notes (select + conditional text)

`PublicRemoteLifestyleFields` is extended to include the currently missing fields (sedentary hours, caffeine, alcohol, medications). No new component — same file, more fields.

**Validation:** `activityLevel` required; all others optional but shown.

---

## Step 3 — PAR-Q

**Refactor:** `ParQQuestionnaire` currently reads/writes via `useFormContext()`. Lift state out: add `value: Record<string, string>` and `onChange: (patch: Record<string, string>) => void` props. The component uses props when provided, falls back to `useFormContext()` when not (backward compatibility for studio). Question list, logic, and UI are unchanged.

**PAR-Q positive response handling:**
- If the client answers "Yes" to any question, show an inline amber warning banner on the same screen:
  > "One or more of your answers requires medical clearance before starting physical exercise. Please consult your doctor. You can still complete and submit this form — your coach will confirm written clearance is in place before any physical assessments begin."
- The client is NOT blocked from proceeding or submitting
- A flag `parqFlagged: true` is written to the client doc alongside their parq answers so the coach sees it in studio

**Female-specific questions** (parq8–13): shown when `gender === 'female'` — same conditional logic as studio, driven by the `gender` value collected in Step 1.

---

## Step 4 — Body Comp (Optional)

**Gate screen:**
> "Do you have recent InBody or body composition results?"  
> [Scan my results] [Enter manually] [Skip — we'll do it in studio]

Skipping shows: "No problem — your coach will take your body composition measurements in studio."

**Scan path:**
1. Client taps "Scan my results"
2. File input (camera capture on mobile) — client photographs their InBody printout
3. Image uploaded via signed URL from new `getRemoteBodyCompUploadUrl(token)` Cloud Function
4. Client calls new `extractRemoteBodyCompOcr(token, storagePath)` Cloud Function
5. Function runs Gemini vision server-side, returns extracted fields
6. Existing `OcrReviewDialog` shown — client reviews/edits values
7. On confirm, values submitted as part of final form submission

**Manual path:**
- Renders the same fields as `OcrReviewDialog` but as a plain form (no OCR prefill)
- Client types values directly

**Why server-side OCR:** The remote page is public (no Firebase Auth). Running OCR server-side via a token-validated Cloud Function avoids auth requirements and correctly charges AI credits to the coach's org, not the client.

---

## Step 5 — Posture (Optional)

**Gate screen:**
> "Your coach has invited you to take posture photos as part of your assessment."  
> [Take photos now] [Skip — we'll do it in studio]

Skipping shows: "No problem — posture photos will be taken with your coach in studio."

**Photo capture:** Existing `PublicRemotePostureFields` component — no changes needed.

**Consent:** Existing consent checkbox flow kept as-is before showing the capture UI.

---

## Backend Changes

### Scope additions (`functions/src/remoteAssessment.ts`)

Add `'full'` to `RemoteAssessmentScope`:
```typescript
export type RemoteAssessmentScope = 'lifestyle' | 'lifestyle_posture' | 'posture' | 'full';
```

`allowedKeysForScope('full')` returns the union of all key groups:
- Basic info: `fullName`, `email`, `phone`, `dateOfBirth`, `gender`, `heightCm`, `trainingHistory`, `recentActivity`
- Lifestyle: `activityLevel`, `sleepArchetype`, `stressLevel`, `nutritionHabits`, `hydrationHabits`, `stepsPerDay`, `sedentaryHours`, `caffeineCupsPerDay`, `alcoholFrequency`, `medicationsFlag`, `medicationsNotes`
- PAR-Q: `parq1`–`parq13`, `parqNotes`
- Body comp: `inbodyWeightKg`, `inbodyBodyFatPct`, `bodyFatMassKg`, `inbodyBmi`, `visceralFatLevel`, `skeletalMuscleMassKg`, `totalBodyWaterL`, `waistHipRatio`, `bmrKcal`, `inbodyScore`, `segmentalTrunkKg`, `segmentalArmLeftKg`, `segmentalArmRightKg`, `segmentalLegLeftKg`, `segmentalLegRightKg`
- Posture paths: `postureRemotePath_front`, `postureRemotePath_back`, `postureRemotePath_side-left`, `postureRemotePath_side-right`

Old scopes (`lifestyle`, `posture`, `lifestyle_posture`) unchanged for backward compatibility.

### New Cloud Functions

**`getRemoteBodyCompUploadUrl(token, contentType)`**  
- Pattern: identical to `getRemotePostureUploadUrl` but for body comp images  
- Returns `{ uploadUrl, storagePath, expiresAt }`  
- Storage path: `organizations/{orgId}/clients/{slug}/remote-uploads/{token}/bodycomp_{uuid}.jpg`

**`extractRemoteBodyCompOcr(token, storagePath)`**  
- Validates token (same pattern as all remote functions)  
- Validates `storagePath` starts with the correct token-scoped prefix  
- Runs Gemini vision on the uploaded image via Admin SDK  
- Returns `{ fields: Record<string, string> }` — same shape as `OcrResult.fields`  
- Logs AI usage against the org that owns the token  

### `NewClientModal` scope change

`createRemoteAssessmentTokenForClient` called with `remoteScope: 'full'` (was defaulting to `'lifestyle'`).

### `parqFlagged` write

`submitRemoteAssessmentFields` inspects submitted fields server-side: if any of `parq1`–`parq7` equals `'yes'`, it adds `parqFlagged: true` to the client doc update. This field is never in `allowedKeys` — the client cannot submit it directly; it is always computed from parq answers.

---

## File Changes Summary

| File | Change |
|---|---|
| `src/components/dashboard/NewClientModal.tsx` | Fix link display; pass `remoteScope: 'full'` |
| `src/components/remote/PublicRemoteLifestyleFields.tsx` | Add missing P1 fields (sedentary, caffeine, alcohol, medications) |
| `src/components/ParQQuestionnaire.tsx` | Add `value`/`onChange` props; keep `useFormContext` fallback |
| `src/pages/PublicRemoteAssessment.tsx` | Refactor into 5-step wizard using `RemoteWizardShell` |
| `src/components/remote/RemoteWizardShell.tsx` | **New** — progress bar + Back/Next navigation |
| `src/components/remote/steps/RemoteBasicInfoStep.tsx` | **New** — Basic info form using P0 field definitions |
| `src/components/remote/steps/RemoteParQStep.tsx` | **New** — Wraps refactored `ParQQuestionnaire` with PAR-Q warning banner |
| `src/components/remote/steps/RemoteBodyCompStep.tsx` | **New** — Gate screen + scan/manual paths + reuses `OcrReviewDialog` |
| `src/components/remote/steps/RemotePostureStep.tsx` | **New** — Gate screen + wraps existing `PublicRemotePostureFields` |
| `src/lib/types/remoteAssessment.ts` | Add `'full'` to `RemoteAssessmentScope` |
| `src/services/remoteAssessmentClient.ts` | Add `getRemoteBodyCompUploadUrl`, `extractRemoteBodyCompOcr` callers |
| `functions/src/remoteAssessment.ts` | Add `'full'` scope; add `getRemoteBodyCompUploadUrl`; add `extractRemoteBodyCompOcr` |
| `functions/src/index.ts` | Export two new Cloud Functions |

---

## What Is Not In Scope

- Goals / training targets — complex multi-select, handled in studio conversation
- Cardio, movement, strength phases — physical, studio-only
- Coach-side changes to how remote data appears in studio — existing `remoteIntakeAwaitingStudio` flag already triggers the coach's review flow
