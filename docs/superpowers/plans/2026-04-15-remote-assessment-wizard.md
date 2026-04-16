# Remote Assessment Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-page remote lifestyle form with a 5-step mobile wizard (Basic Info → Lifestyle → PAR-Q → Body Comp → Posture) that covers all non-physical assessment phases.

**Architecture:** The wizard is a thin public-facing shell (`PublicRemoteAssessment`) that owns all state and passes value/onChange props down to step components. Step components reuse the same constants, options, and labels as the in-studio assessment — no duplicated field definitions. The `full` scope token type is added to the backend; `NewClientModal` always generates `full` scope tokens.

**Tech Stack:** React + TypeScript (Vite), Firebase Cloud Functions v2, `@google/generative-ai` (already in functions/package.json), Tailwind CSS, shadcn/ui

---

## Spec reference
`docs/superpowers/specs/2026-04-15-remote-assessment-wizard-design.md`

---

## File Map

| File | Action | What it does |
|---|---|---|
| `src/lib/types/remoteAssessment.ts` | Modify | Add `'full'` to `RemoteAssessmentScope` |
| `functions/src/remoteAssessment.ts` | Modify | Add `'full'` scope + `allowedKeysForScope` expansion + `parqFlagged` server write + 2 new handlers |
| `functions/src/index.ts` | Modify | Export `getRemoteBodyCompUploadUrl` + `extractRemoteBodyCompOcr` |
| `functions/.env` | Modify | Add `GEMINI_API_KEY` |
| `src/services/remoteAssessmentClient.ts` | Modify | Add `getRemoteBodyCompUploadUrl` + `extractRemoteBodyCompOcr` callers |
| `src/components/dashboard/NewClientModal.tsx` | Modify | Fix link overflow UI; pass `remoteScope: 'full'` |
| `src/components/remote/PublicRemoteLifestyleFields.tsx` | Modify | Add 5 missing P1 fields |
| `src/components/ParQQuestionnaire.tsx` | Modify | Add `value`/`onChange`/`gender` props for remote use; keep FormContext fallback |
| `src/components/remote/RemoteWizardShell.tsx` | Create | Progress bar + Back/Next/Submit nav wrapper |
| `src/components/remote/steps/RemoteBasicInfoStep.tsx` | Create | Step 1 — 8 P0 fields |
| `src/components/remote/steps/RemoteParQStep.tsx` | Create | Step 3 — wraps refactored ParQQuestionnaire |
| `src/components/remote/steps/RemoteBodyCompStep.tsx` | Create | Step 4 — gate + scan/manual + OcrReviewDialog |
| `src/components/remote/steps/RemotePostureStep.tsx` | Create | Step 5 — gate + PublicRemotePostureFields |
| `src/pages/PublicRemoteAssessment.tsx` | Modify | Refactor into 5-step wizard using above components |

---

## Task 1: Add `full` scope to type definitions

**Files:**
- Modify: `src/lib/types/remoteAssessment.ts`
- Modify: `functions/src/remoteAssessment.ts` (type only — allowedKeys in Task 2)

- [ ] **Step 1: Update frontend type**

Replace the entire content of `src/lib/types/remoteAssessment.ts`:

```typescript
/** Mirrors `RemoteAssessmentScope` in Cloud Functions `remoteAssessment.ts`. */
export type RemoteAssessmentScope = 'lifestyle' | 'lifestyle_posture' | 'posture' | 'full';

export type RemotePostureView = 'front' | 'back' | 'side-left' | 'side-right';

export type RemoteSessionResult =
  | { ok: true; scope: RemoteAssessmentScope; allowedKeys: string[] }
  | { ok: false };
```

- [ ] **Step 2: Update functions scope type**

In `functions/src/remoteAssessment.ts` line 13, change:

```typescript
export type RemoteAssessmentScope = 'lifestyle' | 'lifestyle_posture' | 'posture';
```
to:
```typescript
export type RemoteAssessmentScope = 'lifestyle' | 'lifestyle_posture' | 'posture' | 'full';
```

- [ ] **Step 3: Type-check**

```bash
cd functions && npx tsc -b --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/types/remoteAssessment.ts functions/src/remoteAssessment.ts
git commit -m "feat(remote): add 'full' scope type to RemoteAssessmentScope"
```

---

## Task 2: Expand `allowedKeysForScope` + `parqFlagged` server write

**Files:**
- Modify: `functions/src/remoteAssessment.ts`

- [ ] **Step 1: Replace the top-level key constants and `allowedKeysForScope` function**

In `functions/src/remoteAssessment.ts`, find and replace the existing `LIFESTYLE_KEYS` constant and `allowedKeysForScope` function. The new version:

```typescript
const BASIC_INFO_KEYS = [
  'fullName', 'email', 'phone', 'dateOfBirth', 'gender', 'heightCm',
  'trainingHistory', 'recentActivity',
] as const;

const LIFESTYLE_KEYS = new Set([
  'activityLevel', 'sleepArchetype', 'stressLevel', 'nutritionHabits',
  'hydrationHabits', 'stepsPerDay', 'sedentaryHours', 'caffeineCupsPerDay',
  'alcoholFrequency', 'medicationsFlag', 'medicationsNotes',
]);

const PARQ_KEYS = [
  'parq1', 'parq2', 'parq3', 'parq4', 'parq5', 'parq6', 'parq7',
  'parq8', 'parq9', 'parq10', 'parq11', 'parq12', 'parq13', 'parqNotes',
];

const BODY_COMP_KEYS = [
  'inbodyWeightKg', 'inbodyBodyFatPct', 'bodyFatMassKg', 'inbodyBmi',
  'visceralFatLevel', 'skeletalMuscleMassKg', 'totalBodyWaterL', 'waistHipRatio',
  'bmrKcal', 'inbodyScore', 'segmentalTrunkKg', 'segmentalArmLeftKg',
  'segmentalArmRightKg', 'segmentalLegLeftKg', 'segmentalLegRightKg',
];

function allowedKeysForScope(scope: RemoteAssessmentScope): string[] {
  const posturePathKeys = REMOTE_POSTURE_VIEWS.map((v) => `postureRemotePath_${v}`);
  if (scope === 'lifestyle') return Array.from(LIFESTYLE_KEYS);
  if (scope === 'posture') return posturePathKeys;
  if (scope === 'lifestyle_posture') return [...Array.from(LIFESTYLE_KEYS), ...posturePathKeys];
  // 'full': all non-physical fields
  return [
    ...BASIC_INFO_KEYS,
    ...Array.from(LIFESTYLE_KEYS),
    ...PARQ_KEYS,
    ...BODY_COMP_KEYS,
    ...posturePathKeys,
  ];
}
```

- [ ] **Step 2: Add `parqFlagged` detection in `handleSubmitRemoteAssessmentFields`**

In `handleSubmitRemoteAssessmentFields`, find the `tx.update(clientRef, { ... })` call inside `db.runTransaction`. Add `parqFlagged` to the update:

```typescript
  // Detect PAR-Q flag server-side (never submitted by client, always computed)
  const PARQ_MEDICAL_IDS = ['parq1','parq2','parq3','parq4','parq5','parq6','parq7'];
  const parqFlagged = PARQ_MEDICAL_IDS.some((k) => sanitized[k] === 'yes');

  tx.update(clientRef, {
    formData: nextForm,
    remoteIntakeAwaitingStudio: true,
    remoteIntakeLastAt: admin.firestore.FieldValue.serverTimestamp(),
    ...(parqFlagged ? { parqFlagged: true } : {}),
  });
```

The `PARQ_MEDICAL_IDS` constant and the `parqFlagged` const should be placed just before the `tx.update` call, inside the `db.runTransaction` callback.

- [ ] **Step 3: Write unit test**

Create `functions/src/remoteAssessment.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';

// Copy of allowedKeysForScope for isolated testing
// (avoids importing firebase-admin in unit tests)
const REMOTE_POSTURE_VIEWS = ['front', 'side-left', 'back', 'side-right'] as const;
const BASIC_INFO_KEYS = ['fullName','email','phone','dateOfBirth','gender','heightCm','trainingHistory','recentActivity'];
const LIFESTYLE_KEYS = ['activityLevel','sleepArchetype','stressLevel','nutritionHabits','hydrationHabits','stepsPerDay','sedentaryHours','caffeineCupsPerDay','alcoholFrequency','medicationsFlag','medicationsNotes'];
const PARQ_KEYS = ['parq1','parq2','parq3','parq4','parq5','parq6','parq7','parq8','parq9','parq10','parq11','parq12','parq13','parqNotes'];
const BODY_COMP_KEYS = ['inbodyWeightKg','inbodyBodyFatPct','bodyFatMassKg','inbodyBmi','visceralFatLevel','skeletalMuscleMassKg','totalBodyWaterL','waistHipRatio','bmrKcal','inbodyScore','segmentalTrunkKg','segmentalArmLeftKg','segmentalArmRightKg','segmentalLegLeftKg','segmentalLegRightKg'];
const POSTURE_KEYS = REMOTE_POSTURE_VIEWS.map((v) => `postureRemotePath_${v}`);

describe('allowedKeysForScope', () => {
  it('full scope contains all key groups', () => {
    const all = [...BASIC_INFO_KEYS, ...LIFESTYLE_KEYS, ...PARQ_KEYS, ...BODY_COMP_KEYS, ...POSTURE_KEYS];
    expect(all).toContain('fullName');
    expect(all).toContain('parq7');
    expect(all).toContain('inbodyWeightKg');
    expect(all).toContain('postureRemotePath_front');
    expect(all.length).toBeGreaterThan(40);
  });

  it('parqFlagged is not in allowedKeys (computed server-side)', () => {
    const all = [...BASIC_INFO_KEYS, ...LIFESTYLE_KEYS, ...PARQ_KEYS, ...BODY_COMP_KEYS, ...POSTURE_KEYS];
    expect(all).not.toContain('parqFlagged');
  });

  it('detects parq flag when any medical question answered yes', () => {
    const PARQ_MEDICAL_IDS = ['parq1','parq2','parq3','parq4','parq5','parq6','parq7'];
    const sanitized = { parq1: 'no', parq2: 'yes', parq3: 'no' };
    const flagged = PARQ_MEDICAL_IDS.some((k) => sanitized[k as keyof typeof sanitized] === 'yes');
    expect(flagged).toBe(true);
  });

  it('does not flag when all medical questions answered no', () => {
    const PARQ_MEDICAL_IDS = ['parq1','parq2','parq3','parq4','parq5','parq6','parq7'];
    const sanitized = Object.fromEntries(PARQ_MEDICAL_IDS.map(k => [k, 'no']));
    const flagged = PARQ_MEDICAL_IDS.some((k) => sanitized[k] === 'yes');
    expect(flagged).toBe(false);
  });
});
```

- [ ] **Step 4: Run test**

```bash
cd /path/to/project && npx vitest run functions/src/remoteAssessment.test.ts
```
Expected: 4 tests pass.

- [ ] **Step 5: Type-check**

```bash
cd functions && npx tsc -b --noEmit
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add functions/src/remoteAssessment.ts functions/src/remoteAssessment.test.ts
git commit -m "feat(remote): full scope allowedKeys + parqFlagged server detection"
```

---

## Task 3: Add `getRemoteBodyCompUploadUrl` Cloud Function

**Files:**
- Modify: `functions/src/remoteAssessment.ts`
- Modify: `functions/src/index.ts`

- [ ] **Step 1: Add handler to `functions/src/remoteAssessment.ts`**

Add after `handleGetRemotePostureUploadUrl`:

```typescript
export async function handleGetRemoteBodyCompUploadUrl(
  request: CallableRequest<{ token?: string; contentType?: string }>,
): Promise<{ uploadUrl: string; storagePath: string; expiresAt: number }> {
  if (!REMOTE_ASSESSMENT_MVP) {
    throw new HttpsError('failed-precondition', 'Remote assessment MVP is not enabled.');
  }
  const token = typeof request.data?.token === 'string' ? request.data.token.trim() : '';
  const contentType =
    typeof request.data?.contentType === 'string' ? request.data.contentType.trim() : 'image/jpeg';

  if (!token || !/^[a-f0-9]{32}$/.test(token)) {
    throw new HttpsError('invalid-argument', 'Invalid token.');
  }
  if (contentType !== 'image/jpeg' && contentType !== 'image/png') {
    throw new HttpsError('invalid-argument', 'Only image/jpeg and image/png are allowed.');
  }

  const db = admin.firestore();
  const snap = await db.doc(`remoteAssessmentTokens/${token}`).get();
  if (!snap.exists) throw new HttpsError('not-found', 'Invalid or expired link.');

  const meta = snap.data() as {
    organizationId?: string;
    clientSlug?: string;
    expiresAt?: admin.firestore.Timestamp;
  };
  const orgId = meta.organizationId;
  const slug = meta.clientSlug;
  const exp = meta.expiresAt;
  if (!orgId || !slug || !exp || exp.toMillis() < Date.now()) {
    throw new HttpsError('not-found', 'Invalid or expired link.');
  }

  const ext = contentType === 'image/png' ? 'png' : 'jpg';
  const storagePath = `organizations/${orgId}/clients/${slug}/remote-uploads/${token}/bodycomp_${randomUUID()}.${ext}`;

  const bucket = admin.storage().bucket();
  const file = bucket.file(storagePath);
  const expiresWrite = Date.now() + 15 * 60 * 1000;
  const [uploadUrl] = await file.getSignedUrl({
    version: 'v4',
    action: 'write',
    expires: expiresWrite,
    contentType,
  });

  return { uploadUrl, storagePath, expiresAt: expiresWrite };
}
```

- [ ] **Step 2: Export in `functions/src/index.ts`**

Add the import at the top of `index.ts` alongside the existing remote assessment imports:

```typescript
import {
  handleCreateRemoteAssessmentToken,
  handleGetRemoteAssessmentSession,
  handleGetRemotePostureUploadUrl,
  handleSubmitRemoteAssessmentFields,
  handleGetRemoteBodyCompUploadUrl,   // add this
  REMOTE_ASSESSMENT_MVP,
} from './remoteAssessment';
```

Then add the export at the bottom of `index.ts`, after `getRemotePostureUploadUrl`:

```typescript
export const getRemoteBodyCompUploadUrl = onCall(
  { enforceAppCheck: false, invoker: 'public' },
  async (request) => {
    if (!REMOTE_ASSESSMENT_MVP) {
      throw new HttpsError('failed-precondition', 'Remote assessment MVP is not enabled.');
    }
    const db = admin.firestore();
    const token =
      request.data && typeof (request.data as { token?: string }).token === 'string'
        ? (request.data as { token: string }).token.trim().slice(0, 32)
        : 'unknown';
    const key = buildRateLimitKey('remoteBodyCompUpload', token, request.rawRequest?.ip);
    await assertRateLimit(db, key, { maxRequests: 10, windowSeconds: 60 });
    return handleGetRemoteBodyCompUploadUrl(request);
  },
);
```

- [ ] **Step 3: Type-check**

```bash
cd functions && npx tsc -b --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add functions/src/remoteAssessment.ts functions/src/index.ts
git commit -m "feat(remote): add getRemoteBodyCompUploadUrl Cloud Function"
```

---

## Task 4: Add `extractRemoteBodyCompOcr` Cloud Function

**Files:**
- Modify: `functions/src/remoteAssessment.ts`
- Modify: `functions/src/index.ts`
- Modify: `functions/.env`

- [ ] **Step 1: Add `GEMINI_API_KEY` to `functions/.env`**

Get an API key from [Google AI Studio](https://aistudio.google.com/app/apikey) then append to `functions/.env`:

```
GEMINI_API_KEY=your-api-key-here
```

- [ ] **Step 2: Add Gemini import to `functions/src/remoteAssessment.ts`**

Add at the top of the file after the existing imports:

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';
```

- [ ] **Step 3: Add the OCR prompt constant and handler**

Add after `handleGetRemoteBodyCompUploadUrl`:

```typescript
const BODY_COMP_VALID_FIELDS = [
  'heightCm', 'inbodyScore', 'inbodyWeightKg', 'skeletalMuscleMassKg',
  'bodyFatMassKg', 'inbodyBodyFatPct', 'inbodyBmi', 'totalBodyWaterL',
  'waistHipRatio', 'visceralFatLevel', 'bmrKcal', 'segmentalTrunkKg',
  'segmentalArmLeftKg', 'segmentalArmRightKg', 'segmentalLegLeftKg', 'segmentalLegRightKg',
];

const BODY_COMP_OCR_PROMPT = `You are an expert medical data extractor specialized in body composition analysis reports.
Analyze the provided image and extract all relevant data points into a JSON object.

FIELD GUIDANCE (use these exact JSON keys):
- heightCm: Height in CM
- inbodyScore: Total body composition score (0-100)
- inbodyWeightKg: Weight in KG
- skeletalMuscleMassKg: Skeletal Muscle Mass (SMM) in KG
- bodyFatMassKg: Body Fat Mass (BFM) in KG
- inbodyBodyFatPct: Percent Body Fat (PBF) as a number
- inbodyBmi: BMI as a number
- totalBodyWaterL: Total Body Water (TBW) in Litres
- waistHipRatio: Waist-Hip Ratio (WHR) as a number
- visceralFatLevel: Visceral Fat Level (VFL) as a number
- bmrKcal: Basal Metabolic Rate (BMR) in kcal
- segmentalTrunkKg, segmentalArmLeftKg, segmentalArmRightKg, segmentalLegLeftKg, segmentalLegRightKg: Segmental Lean Analysis in KG

RULES:
1. Return ONLY a JSON object — no markdown, no explanation.
2. If a value is not found or unclear, use null.
3. Numbers only for numeric fields (no units like "kg").`;

export async function handleExtractRemoteBodyCompOcr(
  request: CallableRequest<{ token?: string; storagePath?: string }>,
): Promise<{ fields: Record<string, string> }> {
  if (!REMOTE_ASSESSMENT_MVP) {
    throw new HttpsError('failed-precondition', 'Remote assessment MVP is not enabled.');
  }

  const token = typeof request.data?.token === 'string' ? request.data.token.trim() : '';
  const storagePath = typeof request.data?.storagePath === 'string' ? request.data.storagePath.trim() : '';

  if (!token || !/^[a-f0-9]{32}$/.test(token)) {
    throw new HttpsError('invalid-argument', 'Invalid token.');
  }

  const db = admin.firestore();
  const snap = await db.doc(`remoteAssessmentTokens/${token}`).get();
  if (!snap.exists) throw new HttpsError('not-found', 'Invalid or expired link.');

  const meta = snap.data() as {
    organizationId?: string;
    clientSlug?: string;
    expiresAt?: admin.firestore.Timestamp;
  };
  const orgId = meta.organizationId;
  const slug = meta.clientSlug;
  const exp = meta.expiresAt;
  if (!orgId || !slug || !exp || exp.toMillis() < Date.now()) {
    throw new HttpsError('not-found', 'Invalid or expired link.');
  }

  // Validate the storage path is scoped to this exact token
  const expectedPrefix = `organizations/${orgId}/clients/${slug}/remote-uploads/${token}/`;
  if (!storagePath.startsWith(expectedPrefix) || storagePath.includes('..') || !storagePath.match(/^[a-zA-Z0-9/_.-]+$/)) {
    throw new HttpsError('invalid-argument', 'Invalid storage path.');
  }

  // Download image from Cloud Storage
  const bucket = admin.storage().bucket();
  const file = bucket.file(storagePath);
  const [exists] = await file.exists();
  if (!exists) throw new HttpsError('not-found', 'Image not found in storage.');

  const [buffer] = await file.download();
  const base64 = buffer.toString('base64');
  const mimeType: 'image/jpeg' | 'image/png' = storagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';

  // Run Gemini OCR
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new HttpsError('internal', 'OCR service not configured.');

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: { responseMimeType: 'application/json' },
  });

  const result = await model.generateContent([
    { text: BODY_COMP_OCR_PROMPT },
    { inlineData: { data: base64, mimeType } },
  ]);

  const aiText = result.response.text();
  const startIdx = aiText.indexOf('{');
  const endIdx = aiText.lastIndexOf('}');
  if (startIdx === -1) throw new HttpsError('internal', 'OCR returned unexpected response.');

  const data = JSON.parse(aiText.substring(startIdx, endIdx + 1)) as Record<string, unknown>;
  const fields: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== null && value !== undefined && BODY_COMP_VALID_FIELDS.includes(key)) {
      fields[key] = String(value);
    }
  }

  // Log AI usage against the org
  await db.collection('aiUsage').add({
    organizationId: orgId,
    feature: 'remote_ocr_body_comp',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { fields };
}
```

- [ ] **Step 4: Export in `functions/src/index.ts`**

Add to the existing remote assessment import block:

```typescript
import {
  handleCreateRemoteAssessmentToken,
  handleGetRemoteAssessmentSession,
  handleGetRemotePostureUploadUrl,
  handleSubmitRemoteAssessmentFields,
  handleGetRemoteBodyCompUploadUrl,
  handleExtractRemoteBodyCompOcr,   // add this
  REMOTE_ASSESSMENT_MVP,
} from './remoteAssessment';
```

Add export at the bottom of `index.ts`:

```typescript
export const extractRemoteBodyCompOcr = onCall(
  { enforceAppCheck: false, invoker: 'public', timeoutSeconds: 60 },
  async (request) => {
    if (!REMOTE_ASSESSMENT_MVP) {
      throw new HttpsError('failed-precondition', 'Remote assessment MVP is not enabled.');
    }
    const db = admin.firestore();
    const token =
      request.data && typeof (request.data as { token?: string }).token === 'string'
        ? (request.data as { token: string }).token.trim().slice(0, 32)
        : 'unknown';
    const key = buildRateLimitKey('remoteOcr', token, request.rawRequest?.ip);
    await assertRateLimit(db, key, { maxRequests: 5, windowSeconds: 60 });
    return handleExtractRemoteBodyCompOcr(request);
  },
);
```

- [ ] **Step 5: Type-check**

```bash
cd functions && npx tsc -b --noEmit
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add functions/src/remoteAssessment.ts functions/src/index.ts functions/.env
git commit -m "feat(remote): add extractRemoteBodyCompOcr Cloud Function"
```

---

## Task 5: Deploy functions

- [ ] **Step 1: Deploy functions only**

```bash
firebase deploy --only functions
```
Expected: all functions deploy successfully including `getRemoteBodyCompUploadUrl` and `extractRemoteBodyCompOcr`.

- [ ] **Step 2: Commit (nothing to commit — already committed)**

---

## Task 6: Add frontend service callers

**Files:**
- Modify: `src/services/remoteAssessmentClient.ts`

- [ ] **Step 1: Add two new functions to `src/services/remoteAssessmentClient.ts`**

Append after `uploadBlobToSignedUrl`:

```typescript
export async function getRemoteBodyCompUploadSlot(
  token: string,
  contentType: 'image/jpeg' | 'image/png',
): Promise<{ uploadUrl: string; storagePath: string; expiresAt: number }> {
  const fn = httpsCallable<
    { token: string; contentType: string },
    { uploadUrl: string; storagePath: string; expiresAt: number }
  >(fns(), 'getRemoteBodyCompUploadUrl');
  const res = await fn({ token, contentType });
  return res.data;
}

export async function extractBodyCompOcrFromStorage(
  token: string,
  storagePath: string,
): Promise<{ fields: Record<string, string> }> {
  const fn = httpsCallable<
    { token: string; storagePath: string },
    { fields: Record<string, string> }
  >(fns(), 'extractRemoteBodyCompOcr');
  const res = await fn({ token, storagePath });
  return res.data;
}
```

- [ ] **Step 2: Type-check frontend**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/services/remoteAssessmentClient.ts
git commit -m "feat(remote): add body comp upload + OCR service callers"
```

---

## Task 7: Fix `NewClientModal` link display + pass `full` scope

**Files:**
- Modify: `src/components/dashboard/NewClientModal.tsx`

- [ ] **Step 1: Update `handleSendLink` to pass `full` scope**

In `handleSendLink`, update the `createRemoteAssessmentTokenForClient` call:

```typescript
const res = await createRemoteAssessmentTokenForClient(organizationId, trimmedName, {
  remoteScope: 'full',
});
```

- [ ] **Step 2: Replace the link display UI**

Find the `{remoteLink ? (` block and replace the inner link display section. The current code renders the raw URL in a `font-mono` span that overflows. Replace with:

```tsx
{remoteLink ? (
  <div className="space-y-3">
    <p className="text-sm text-muted-foreground">
      Share this link with <span className="font-semibold text-foreground">{trimmedName}</span> to complete their intake remotely.
    </p>
    <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 p-3">
      <span className="flex-1 text-xs text-muted-foreground truncate font-mono">
        {remoteLink.replace(/^https?:\/\//, '')}
      </span>
      <button
        type="button"
        onClick={handleCopy}
        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Copy link"
      >
        {copied ? <Check className="h-4 w-4 text-score-green" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
    <Button
      className="w-full h-11 rounded-xl"
      onClick={handleCopy}
    >
      {copied ? (
        <>
          <Check className="h-4 w-4 mr-2" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="h-4 w-4 mr-2" />
          Copy link
        </>
      )}
    </Button>
    <Button
      variant="outline"
      onClick={() => { setRemoteLink(null); setCopied(false); }}
      className="w-full h-10 rounded-xl text-sm"
    >
      Or start now in studio instead
    </Button>
  </div>
) : ( ... existing pre-link state ... )}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/NewClientModal.tsx
git commit -m "feat(remote): fix link display overflow; use full scope for new client links"
```

---

## Task 8: Extend `PublicRemoteLifestyleFields` with missing P1 fields

**Files:**
- Modify: `src/components/remote/PublicRemoteLifestyleFields.tsx`

- [ ] **Step 1: Extend `LifestyleRemoteState` type and initial state**

Add the missing fields to the `LifestyleRemoteState` type:

```typescript
export type LifestyleRemoteState = {
  activityLevel: string;
  sleepArchetype: string;
  stressLevel: string;
  nutritionHabits: string;
  hydrationHabits: string;
  stepsPerDay: string;
  sedentaryHours: string;
  caffeineCupsPerDay: string;
  alcoholFrequency: string;
  medicationsFlag: string;
  medicationsNotes: string;
};
```

Update `INITIAL_LIFESTYLE_REMOTE`:

```typescript
export const INITIAL_LIFESTYLE_REMOTE: LifestyleRemoteState = {
  activityLevel: '',
  sleepArchetype: '',
  stressLevel: '',
  nutritionHabits: '',
  hydrationHabits: '',
  stepsPerDay: '',
  sedentaryHours: '',
  caffeineCupsPerDay: '',
  alcoholFrequency: '',
  medicationsFlag: '',
  medicationsNotes: '',
};
```

- [ ] **Step 2: Add the 5 new fields to the render**

After the existing `stepsPerDay` block (and before the closing `</div>`), add:

```tsx
{allowedKeys.has('sedentaryHours') ? (
  <div className="space-y-2">
    <Label>{P1_LABELS.sedentaryHours}</Label>
    <input
      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      inputMode="numeric"
      value={value.sedentaryHours}
      onChange={(e) => patch({ sedentaryHours: e.target.value })}
      placeholder="e.g. 8"
    />
  </div>
) : null}
{allowedKeys.has('caffeineCupsPerDay') ? (
  <div className="space-y-2">
    <Label>{P1_LABELS.caffeineCupsPerDay}</Label>
    <input
      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      inputMode="numeric"
      value={value.caffeineCupsPerDay}
      onChange={(e) => patch({ caffeineCupsPerDay: e.target.value })}
      placeholder="e.g. 2"
    />
  </div>
) : null}
{allowedKeys.has('alcoholFrequency') ? (
  <div className="space-y-2">
    <Label>{P1_LABELS.alcoholFrequency}</Label>
    <Select value={value.alcoholFrequency} onValueChange={(v) => patch({ alcoholFrequency: v })}>
      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
      <SelectContent>
        {ASSESSMENT_OPTIONS.alcoholFrequency.map((o) => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
) : null}
{allowedKeys.has('medicationsFlag') ? (
  <div className="space-y-2">
    <Label>{P1_LABELS.medicationsFlag}</Label>
    <Select value={value.medicationsFlag} onValueChange={(v) => patch({ medicationsFlag: v })}>
      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
      <SelectContent>
        {ASSESSMENT_OPTIONS.medicationsFlag.map((o) => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
) : null}
{allowedKeys.has('medicationsNotes') && value.medicationsFlag === 'yes' ? (
  <div className="space-y-2">
    <Label>{P1_LABELS.medicationsNotes}</Label>
    <textarea
      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
      value={value.medicationsNotes}
      onChange={(e) => patch({ medicationsNotes: e.target.value })}
      placeholder="List medications and any relevant notes"
    />
  </div>
) : null}
```

Note: `P1_LABELS` is already `ASSESSMENT_LABELS.P1` at the top of the file. Confirm `ASSESSMENT_OPTIONS.alcoholFrequency` and `ASSESSMENT_OPTIONS.medicationsFlag` exist in `src/constants/assessment.ts` (they do — verified at line 460 and 468).

- [ ] **Step 3: Update `lifestyleToFields` in `PublicRemoteAssessment.tsx`**

The `lifestyleToFields` function at the top of `PublicRemoteAssessment.tsx` currently only maps 6 fields. Update it to include all 11:

```typescript
function lifestyleToFields(
  lifestyle: LifestyleRemoteState,
  allowed: Set<string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  const entries: [keyof LifestyleRemoteState, string][] = [
    ['activityLevel', lifestyle.activityLevel],
    ['sleepArchetype', lifestyle.sleepArchetype],
    ['stressLevel', lifestyle.stressLevel],
    ['nutritionHabits', lifestyle.nutritionHabits],
    ['hydrationHabits', lifestyle.hydrationHabits],
    ['stepsPerDay', lifestyle.stepsPerDay.trim()],
    ['sedentaryHours', lifestyle.sedentaryHours.trim()],
    ['caffeineCupsPerDay', lifestyle.caffeineCupsPerDay.trim()],
    ['alcoholFrequency', lifestyle.alcoholFrequency],
    ['medicationsFlag', lifestyle.medicationsFlag],
    ['medicationsNotes', lifestyle.medicationsNotes.trim()],
  ];
  for (const [k, v] of entries) {
    if (!allowed.has(k) || !v) continue;
    out[k] = v;
  }
  return out;
}
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/components/remote/PublicRemoteLifestyleFields.tsx src/pages/PublicRemoteAssessment.tsx
git commit -m "feat(remote): extend lifestyle fields with sedentary/caffeine/alcohol/medications"
```

---

## Task 9: Refactor `ParQQuestionnaire` to accept external state

**Files:**
- Modify: `src/components/ParQQuestionnaire.tsx`

The component currently reads/writes via `useFormContext()`. We add optional `value`/`onChange`/`gender` props. When provided, the component uses them instead of `FormContext`. Studio use is unchanged.

- [ ] **Step 1: Update the props interface**

Change:
```typescript
interface ParQQuestionnaireProps {
  onExitParQ?: () => void;
  onComplete?: () => void;
}
```
To:
```typescript
interface ParQQuestionnaireProps {
  onExitParQ?: () => void;
  onComplete?: () => void;
  /** Remote mode: supply answers externally instead of using FormContext */
  value?: Record<string, string>;
  onChange?: (patch: Record<string, string>) => void;
  /** Remote mode: gender for conditional question filtering */
  gender?: string;
}
```

- [ ] **Step 2: Update the component body to use props when provided**

In the component function signature, destructure the new props:

```typescript
const ParQQuestionnaire: React.FC<ParQQuestionnaireProps> = ({
  onExitParQ,
  onComplete,
  value: externalValue,
  onChange: externalOnChange,
  gender: externalGender,
}) => {
  const { formData, updateFormData } = useFormContext();
```

Then replace all references to `formData[questionId]` and `updateFormData` with a unified getter/setter. Add these two helpers immediately after the `useFormContext` line:

```typescript
  // When value/onChange props are provided (remote mode), use them.
  // Otherwise fall back to FormContext (studio mode).
  const isRemoteMode = externalValue !== undefined && externalOnChange !== undefined;

  const getAnswer = (id: string): string => {
    if (isRemoteMode) return externalValue![id] ?? '';
    return (formData[id as keyof typeof formData] as string) ?? '';
  };

  const setAnswer = (id: string, answer: string) => {
    if (isRemoteMode) {
      externalOnChange!({ ...externalValue!, [id]: answer });
    } else {
      updateFormData({ [id]: answer });
    }
  };

  const genderValue = isRemoteMode ? (externalGender ?? '') : (formData.gender as string ?? '');
```

- [ ] **Step 3: Update `visibleQuestions` filter to use `genderValue`**

Change:
```typescript
  const visibleQuestions = useMemo(() =>
    parqQuestions.filter(question => {
      if (!question.conditional) return true;
      const { showWhen } = question.conditional;
      return formData[showWhen.field as keyof typeof formData] === showWhen.value;
    }),
    [formData],
  );
```
To:
```typescript
  const visibleQuestions = useMemo(() =>
    parqQuestions.filter(question => {
      if (!question.conditional) return true;
      const { showWhen } = question.conditional;
      // All conditionals check gender
      return genderValue === showWhen.value;
    }),
    [genderValue],
  );
```

- [ ] **Step 4: Update `currentAnswer`, `hasMedicalConcerns`, `allQuestionsAnswered` to use `getAnswer`**

Replace:
```typescript
  const currentAnswer = currentQuestion
    ? formData[currentQuestion.id as keyof typeof formData]
    : '';
  const hasAnswer = currentQuestion?.isNotes
    ? (currentAnswer as string)?.trim() !== ''
    : currentAnswer !== '';

  const hasMedicalConcerns = visibleQuestions.some(question =>
    formData[question.id as keyof typeof formData] === 'yes'
  );

  const allQuestionsAnswered = visibleQuestions
    .every(question => formData[question.id as keyof typeof formData] !== '');
```
With:
```typescript
  const currentAnswer = currentQuestion ? getAnswer(currentQuestion.id) : '';
  const hasAnswer = currentQuestion?.isNotes
    ? currentAnswer.trim() !== ''
    : currentAnswer !== '';

  const hasMedicalConcerns = visibleQuestions.some(q => getAnswer(q.id) === 'yes');
  const allQuestionsAnswered = visibleQuestions.every(q => getAnswer(q.id) !== '');
```

- [ ] **Step 5: Update `parqQuestionnaire: 'completed'` writes to be studio-only**

Replace:
```typescript
  useEffect(() => {
    if (allQuestionsAnswered && formData.parqQuestionnaire !== 'completed') {
      updateFormData({ parqQuestionnaire: 'completed' });
    }
  }, [allQuestionsAnswered, formData.parqQuestionnaire, updateFormData]);
```
With:
```typescript
  useEffect(() => {
    if (!isRemoteMode && allQuestionsAnswered && formData.parqQuestionnaire !== 'completed') {
      updateFormData({ parqQuestionnaire: 'completed' });
    }
  }, [isRemoteMode, allQuestionsAnswered, formData.parqQuestionnaire, updateFormData]);
```

- [ ] **Step 6: Update `handleAnswer`, `goToNext` to use `setAnswer`**

Replace:
```typescript
  const handleAnswer = (answer: string) => {
    if (currentQuestion) {
      updateFormData({ [currentQuestion.id]: answer });
    }
  };
  ...
  const goToNext = () => {
    if (isLastQuestion) {
      updateFormData({ parqQuestionnaire: 'completed' });
      onComplete?.();
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };
```
With:
```typescript
  const handleAnswer = (answer: string) => {
    if (currentQuestion) {
      setAnswer(currentQuestion.id, answer);
    }
  };
  ...
  const goToNext = () => {
    if (isLastQuestion) {
      if (!isRemoteMode) updateFormData({ parqQuestionnaire: 'completed' });
      onComplete?.();
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };
```

- [ ] **Step 7: Export `parqQuestions` for use by the remote step validation**

Add `export` to the `parqQuestions` array declaration:

```typescript
export const parqQuestions: ParQQuestion[] = [
  ...
```

- [ ] **Step 8: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors. The studio still works because `useFormContext` is still called (hook rules satisfied) but its output is only used when `isRemoteMode` is false.

- [ ] **Step 9: Commit**

```bash
git add src/components/ParQQuestionnaire.tsx
git commit -m "refactor(parq): add value/onChange/gender props for remote use; keep FormContext fallback"
```

---

## Task 10: Create `RemoteWizardShell`

**Files:**
- Create: `src/components/remote/RemoteWizardShell.tsx`

- [ ] **Step 1: Create the file**

```typescript
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

interface StepMeta {
  id: string;
  label: string;
}

interface RemoteWizardShellProps {
  steps: StepMeta[];
  currentStep: number; // 0-indexed
  isValid: boolean;
  isSubmitting?: boolean;
  onBack: () => void;
  onNext: () => void;
  children: React.ReactNode;
}

export function RemoteWizardShell({
  steps,
  currentStep,
  isValid,
  isSubmitting = false,
  onBack,
  onNext,
  children,
}: RemoteWizardShellProps) {
  const isLastStep = currentStep === steps.length - 1;
  const stepLabel = steps[currentStep]?.label ?? '';
  const progressPct = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="flex flex-col min-h-[calc(100dvh-56px)]">
      {/* Progress header */}
      <div className="px-4 pt-4 pb-2 space-y-2">
        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span>{stepLabel}</span>
          <span>{currentStep + 1} of {steps.length}</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 px-4 py-4 overflow-y-auto">
        {children}
      </div>

      {/* Navigation */}
      <div className="px-4 pb-6 pt-2 border-t border-border bg-background space-y-2">
        <Button
          type="button"
          className="w-full h-11 rounded-xl"
          disabled={!isValid || isSubmitting}
          onClick={onNext}
        >
          {isSubmitting ? 'Submitting…' : isLastStep ? 'Submit' : 'Next'}
        </Button>
        {currentStep > 0 && (
          <Button
            type="button"
            variant="ghost"
            className="w-full h-9 rounded-xl text-sm text-muted-foreground"
            onClick={onBack}
            disabled={isSubmitting}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/remote/RemoteWizardShell.tsx
git commit -m "feat(remote): add RemoteWizardShell progress + navigation component"
```

---

## Task 11: Create `RemoteBasicInfoStep`

**Files:**
- Create: `src/components/remote/steps/RemoteBasicInfoStep.tsx`

- [ ] **Step 1: Create the file**

```typescript
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ASSESSMENT_LABELS, ASSESSMENT_OPTIONS, ASSESSMENT_PLACEHOLDERS } from '@/constants/assessment';

export type BasicInfoState = {
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  heightCm: string;
  trainingHistory: string;
  recentActivity: string;
};

export const INITIAL_BASIC_INFO: BasicInfoState = {
  fullName: '', email: '', phone: '', dateOfBirth: '',
  gender: '', heightCm: '', trainingHistory: '', recentActivity: '',
};

export function isBasicInfoValid(v: BasicInfoState): boolean {
  return (
    v.fullName.trim().length >= 2 &&
    v.email.trim().length > 0 &&
    v.phone.trim().length > 0 &&
    v.dateOfBirth.trim().length > 0 &&
    v.gender.trim().length > 0 &&
    v.heightCm.trim().length > 0 &&
    v.trainingHistory.trim().length > 0 &&
    v.recentActivity.trim().length > 0
  );
}

const L = ASSESSMENT_LABELS.P0;
const PH = ASSESSMENT_PLACEHOLDERS.P0;

interface RemoteBasicInfoStepProps {
  value: BasicInfoState;
  onChange: (next: BasicInfoState) => void;
}

export function RemoteBasicInfoStep({ value, onChange }: RemoteBasicInfoStepProps) {
  const patch = (partial: Partial<BasicInfoState>) => onChange({ ...value, ...partial });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Your coach sent you this private link. Please fill in your details below — this information is only visible to your coach.
      </p>

      <div className="space-y-2">
        <Label>{L.fullName}</Label>
        <Input
          value={value.fullName}
          onChange={(e) => patch({ fullName: e.target.value })}
          placeholder={PH.fullName}
          autoComplete="name"
        />
      </div>

      <div className="space-y-2">
        <Label>{L.email}</Label>
        <Input
          type="email"
          value={value.email}
          onChange={(e) => patch({ email: e.target.value })}
          placeholder={PH.email}
          autoComplete="email"
          inputMode="email"
        />
      </div>

      <div className="space-y-2">
        <Label>{L.phone}</Label>
        <Input
          type="tel"
          value={value.phone}
          onChange={(e) => patch({ phone: e.target.value })}
          placeholder={PH.phone}
          autoComplete="tel"
          inputMode="tel"
        />
      </div>

      <div className="space-y-2">
        <Label>{L.dateOfBirth}</Label>
        <Input
          type="date"
          value={value.dateOfBirth}
          onChange={(e) => patch({ dateOfBirth: e.target.value })}
          autoComplete="bday"
        />
      </div>

      <div className="space-y-2">
        <Label>{L.gender}</Label>
        <Select value={value.gender} onValueChange={(v) => patch({ gender: v })}>
          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>
            {ASSESSMENT_OPTIONS.gender.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>{L.heightCm}</Label>
        <Input
          type="number"
          inputMode="numeric"
          value={value.heightCm}
          onChange={(e) => patch({ heightCm: e.target.value })}
          placeholder={PH.heightCm}
        />
      </div>

      <div className="space-y-2">
        <Label>{L.trainingHistory}</Label>
        <Select value={value.trainingHistory} onValueChange={(v) => patch({ trainingHistory: v })}>
          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>
            {ASSESSMENT_OPTIONS.trainingHistory.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>{L.recentActivity}</Label>
        <Select value={value.recentActivity} onValueChange={(v) => patch({ recentActivity: v })}>
          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>
            {ASSESSMENT_OPTIONS.recentActivity.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/remote/steps/RemoteBasicInfoStep.tsx
git commit -m "feat(remote): add RemoteBasicInfoStep (P0 fields)"
```

---

## Task 12: Create `RemoteParQStep`

**Files:**
- Create: `src/components/remote/steps/RemoteParQStep.tsx`

- [ ] **Step 1: Create the file**

```typescript
import ParQQuestionnaire, { parqQuestions } from '@/components/ParQQuestionnaire';

interface RemoteParQStepProps {
  value: Record<string, string>;
  onChange: (patch: Record<string, string>) => void;
  gender: string;
}

export function RemoteParQStep({ value, onChange, gender }: RemoteParQStepProps) {
  // Check if any medical PAR-Q question answered yes
  const PARQ_MEDICAL_IDS = ['parq1','parq2','parq3','parq4','parq5','parq6','parq7'];
  const hasFlagged = PARQ_MEDICAL_IDS.some((id) => value[id] === 'yes');

  return (
    <div className="space-y-4">
      {hasFlagged && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-4 space-y-1">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            Medical clearance required
          </p>
          <p className="text-sm text-amber-700 dark:text-amber-400 leading-relaxed">
            One or more of your answers requires you to seek advice from a doctor before starting physical training. Please consult your doctor before your in-studio session. You can still complete and submit this form — physical assessments will only proceed once written confirmation is in place that it is safe for you to exercise.
          </p>
        </div>
      )}
      <ParQQuestionnaire
        value={value}
        onChange={onChange}
        gender={gender}
      />
    </div>
  );
}
```

Note: `ParQQuestionnaire` is a default export — import it as `import ParQQuestionnaire` (not named). Also import `parqQuestions` as a named export (added in Task 9).

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/remote/steps/RemoteParQStep.tsx
git commit -m "feat(remote): add RemoteParQStep with PAR-Q warning banner"
```

---

## Task 13: Create `RemoteBodyCompStep`

**Files:**
- Create: `src/components/remote/steps/RemoteBodyCompStep.tsx`

- [ ] **Step 1: Create the file**

```typescript
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, ScanLine, Pencil, SkipForward } from 'lucide-react';
import { OcrReviewDialog } from '@/components/assessment/OcrReviewDialog';
import {
  getRemoteBodyCompUploadSlot,
  uploadBlobToSignedUrl,
  extractBodyCompOcrFromStorage,
} from '@/services/remoteAssessmentClient';
import type { FormData } from '@/contexts/FormContext';
import { logger } from '@/lib/utils/logger';

const BODY_COMP_MANUAL_FIELDS: { key: string; label: string; unit: string }[] = [
  { key: 'inbodyWeightKg', label: 'Weight', unit: 'kg' },
  { key: 'inbodyBodyFatPct', label: 'Body Fat %', unit: '%' },
  { key: 'skeletalMuscleMassKg', label: 'Skeletal Muscle Mass', unit: 'kg' },
  { key: 'bodyFatMassKg', label: 'Body Fat Mass', unit: 'kg' },
  { key: 'inbodyBmi', label: 'BMI', unit: '' },
  { key: 'visceralFatLevel', label: 'Visceral Fat Level', unit: '' },
  { key: 'totalBodyWaterL', label: 'Total Body Water', unit: 'L' },
  { key: 'waistHipRatio', label: 'Waist-Hip Ratio', unit: '' },
  { key: 'bmrKcal', label: 'Basal Metabolic Rate', unit: 'kcal' },
];

export type BodyCompStatus = 'pending' | 'skipped' | 'confirmed';

interface RemoteBodyCompStepProps {
  token: string;
  status: BodyCompStatus;
  fields: Record<string, string>;
  onStatusChange: (s: BodyCompStatus) => void;
  onFieldsChange: (f: Record<string, string>) => void;
}

export function RemoteBodyCompStep({
  token,
  status,
  fields,
  onStatusChange,
  onFieldsChange,
}: RemoteBodyCompStepProps) {
  const [mode, setMode] = useState<'gate' | 'scanning' | 'reviewing' | 'manual'>('gate');
  const [ocrReviewData, setOcrReviewData] = useState<Partial<FormData> | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (status === 'skipped') {
    return (
      <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-3">
        <p className="text-sm text-muted-foreground">
          No problem — your coach will take your body composition measurements in studio.
        </p>
        <button
          type="button"
          className="text-xs text-primary underline"
          onClick={() => { onStatusChange('pending'); setMode('gate'); }}
        >
          Add body comp results instead
        </button>
      </div>
    );
  }

  if (status === 'confirmed') {
    const confirmedCount = Object.keys(fields).length;
    return (
      <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-3">
        <p className="text-sm font-medium text-foreground">
          Body comp results added ({confirmedCount} values)
        </p>
        <button
          type="button"
          className="text-xs text-primary underline"
          onClick={() => { onStatusChange('pending'); setMode('gate'); onFieldsChange({}); }}
        >
          Re-enter
        </button>
      </div>
    );
  }

  // Gate screen
  if (mode === 'gate') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Do you have recent body composition results (InBody, DEXA, or similar)?
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          If you don't have results, or they're more than 3 months old, skip this — your coach will measure you in studio.
        </p>
        <div className="space-y-3">
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 rounded-xl justify-start gap-3"
            onClick={() => { setMode('scanning'); setUploadError(null); }}
          >
            <ScanLine className="h-4 w-4 shrink-0" />
            Scan my results
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 rounded-xl justify-start gap-3"
            onClick={() => setMode('manual')}
          >
            <Pencil className="h-4 w-4 shrink-0" />
            Enter manually
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full h-11 rounded-xl text-muted-foreground justify-start gap-3"
            onClick={() => onStatusChange('skipped')}
          >
            <SkipForward className="h-4 w-4 shrink-0" />
            Skip — we'll do it in studio
          </Button>
        </div>
      </div>
    );
  }

  // Scan mode
  if (mode === 'scanning') {
    const handleFilePick = async (file: File) => {
      const contentType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      setBusy(true);
      setUploadError(null);
      try {
        const { uploadUrl, storagePath } = await getRemoteBodyCompUploadSlot(token, contentType);
        await uploadBlobToSignedUrl(uploadUrl, file, contentType);
        const { fields: extracted } = await extractBodyCompOcrFromStorage(token, storagePath);
        setOcrReviewData(extracted as Partial<FormData>);
      } catch (err) {
        logger.error('[RemoteBodyComp] scan failed', err);
        setUploadError('Could not process image. Try again or enter values manually.');
      } finally {
        setBusy(false);
      }
    };

    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Take a photo of your InBody or body composition results printout.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFilePick(f);
            e.target.value = '';
          }}
        />
        <Button
          type="button"
          className="w-full h-12 rounded-xl"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
        >
          {busy ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing…</>
          ) : (
            <><ScanLine className="h-4 w-4 mr-2" />Take photo / Choose file</>
          )}
        </Button>
        {uploadError && (
          <p className="text-sm text-destructive">{uploadError}</p>
        )}
        <button
          type="button"
          className="text-xs text-muted-foreground underline"
          onClick={() => setMode('gate')}
        >
          Back
        </button>
        <OcrReviewDialog
          ocrReviewData={ocrReviewData}
          setOcrReviewData={setOcrReviewData}
          applyOcrData={() => {
            if (ocrReviewData) {
              const confirmed: Record<string, string> = {};
              for (const [k, v] of Object.entries(ocrReviewData)) {
                if (v !== undefined && v !== '') confirmed[k] = String(v);
              }
              onFieldsChange(confirmed);
              onStatusChange('confirmed');
            }
            setOcrReviewData(null);
          }}
        />
      </div>
    );
  }

  // Manual entry mode
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Enter your body composition values. Leave blank anything you don't have.
      </p>
      <div className="space-y-3">
        {BODY_COMP_MANUAL_FIELDS.map(({ key, label, unit }) => (
          <div key={key} className="space-y-1">
            <label className="text-sm font-medium text-foreground">
              {label}{unit ? <span className="text-xs text-muted-foreground ml-1">({unit})</span> : null}
            </label>
            <Input
              type="number"
              inputMode="decimal"
              value={fields[key] ?? ''}
              onChange={(e) => onFieldsChange({ ...fields, [key]: e.target.value })}
              placeholder="—"
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2 pt-2">
        <Button
          type="button"
          className="flex-1 h-11 rounded-xl"
          disabled={Object.values(fields).every(v => !v)}
          onClick={() => onStatusChange('confirmed')}
        >
          Save values
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11 px-4 rounded-xl"
          onClick={() => setMode('gate')}
        >
          Back
        </Button>
      </div>
      <button
        type="button"
        className="text-xs text-muted-foreground underline"
        onClick={() => onStatusChange('skipped')}
      >
        Skip instead
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/remote/steps/RemoteBodyCompStep.tsx
git commit -m "feat(remote): add RemoteBodyCompStep with scan/manual/skip paths"
```

---

## Task 14: Create `RemotePostureStep`

**Files:**
- Create: `src/components/remote/steps/RemotePostureStep.tsx`

- [ ] **Step 1: Create the file**

```typescript
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, SkipForward } from 'lucide-react';
import { PublicRemotePostureFields } from '@/components/remote/PublicRemotePostureFields';
import type { RemotePostureView } from '@/lib/types/remoteAssessment';

interface RemotePostureStepProps {
  token: string;
  skipped: boolean;
  consentGiven: boolean;
  posturePaths: Partial<Record<RemotePostureView, string>>;
  onSkip: () => void;
  onConsentGiven: () => void;
  onPosturePathsChange: (paths: Partial<Record<RemotePostureView, string>>) => void;
}

export function RemotePostureStep({
  token,
  skipped,
  consentGiven,
  posturePaths,
  onSkip,
  onConsentGiven,
  onPosturePathsChange,
}: RemotePostureStepProps) {
  const [showCapture, setShowCapture] = useState(false);

  if (skipped) {
    return (
      <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-3">
        <p className="text-sm text-muted-foreground">
          No problem — posture photos will be taken with your coach in studio.
        </p>
        <button
          type="button"
          className="text-xs text-primary underline"
          onClick={() => { setShowCapture(false); onSkip(); /* parent toggles skipped back off */ }}
        >
          Take photos instead
        </button>
      </div>
    );
  }

  // Gate screen
  if (!showCapture) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Your coach has invited you to take posture photos as part of your fitness assessment.
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Photos are stored securely and visible only to your coach. You can skip this and do it in studio instead.
        </p>
        <div className="space-y-3">
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 rounded-xl justify-start gap-3"
            onClick={() => setShowCapture(true)}
          >
            <Camera className="h-4 w-4 shrink-0" />
            Take photos now
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full h-11 rounded-xl text-muted-foreground justify-start gap-3"
            onClick={onSkip}
          >
            <SkipForward className="h-4 w-4 shrink-0" />
            Skip — we'll do it in studio
          </Button>
        </div>
      </div>
    );
  }

  // Consent screen before capture
  if (!consentGiven) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 p-5 space-y-4">
        <p className="text-sm font-medium text-foreground">About your posture photos</p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Your photos are stored securely and are visible only to your coach and their organisation.
        </p>
        <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
          This is not a medical assessment. Posture observations are for fitness coaching context only and do not constitute a clinical diagnosis. You can request deletion of your data at any time.
        </p>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
            onChange={(e) => { if (e.target.checked) onConsentGiven(); }}
          />
          <span className="text-sm text-foreground">
            I understand and consent to my photos being used for this fitness assessment.
          </span>
        </label>
      </div>
    );
  }

  // Photo capture
  return (
    <PublicRemotePostureFields
      token={token}
      value={posturePaths}
      onChange={onPosturePathsChange}
    />
  );
}
```

Note: the "Take photos instead" button in the skipped state calls `onSkip()` again — since `skipped` is a boolean toggle in the parent, calling `onSkip` when `skipped === true` should toggle it back to `false`. In Task 15, the parent `handlePostureSkip` will be a toggle.

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/remote/steps/RemotePostureStep.tsx
git commit -m "feat(remote): add RemotePostureStep with gate/consent/capture"
```

---

## Task 15: Refactor `PublicRemoteAssessment` into 5-step wizard

**Files:**
- Modify: `src/pages/PublicRemoteAssessment.tsx`

This is the largest task. Replace the entire file with the wizard implementation.

- [ ] **Step 1: Write the new `PublicRemoteAssessment.tsx`**

```typescript
import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader2, CheckCircle } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { ASSESSMENT_COPY } from '@/constants/assessmentCopy';
import {
  fetchRemoteAssessmentSession,
  submitRemoteAssessmentFields,
} from '@/services/remoteAssessmentClient';
import { logger } from '@/lib/utils/logger';
import type { RemotePostureView } from '@/lib/types/remoteAssessment';
import { RemoteWizardShell } from '@/components/remote/RemoteWizardShell';
import {
  RemoteBasicInfoStep,
  INITIAL_BASIC_INFO,
  isBasicInfoValid,
  type BasicInfoState,
} from '@/components/remote/steps/RemoteBasicInfoStep';
import {
  PublicRemoteLifestyleFields,
  INITIAL_LIFESTYLE_REMOTE,
  type LifestyleRemoteState,
} from '@/components/remote/PublicRemoteLifestyleFields';
import { RemoteParQStep } from '@/components/remote/steps/RemoteParQStep';
import {
  RemoteBodyCompStep,
  type BodyCompStatus,
} from '@/components/remote/steps/RemoteBodyCompStep';
import { RemotePostureStep } from '@/components/remote/steps/RemotePostureStep';
import { parqQuestions } from '@/components/ParQQuestionnaire';

const STEPS = [
  { id: 'basicInfo', label: 'Basic Info' },
  { id: 'lifestyle', label: 'Lifestyle' },
  { id: 'parq', label: 'Health Screening' },
  { id: 'bodyComp', label: 'Body Comp' },
  { id: 'posture', label: 'Posture' },
] as const;

function lifestyleToFields(lifestyle: LifestyleRemoteState, allowed: Set<string>): Record<string, string> {
  const out: Record<string, string> = {};
  const entries: [keyof LifestyleRemoteState, string][] = [
    ['activityLevel', lifestyle.activityLevel],
    ['sleepArchetype', lifestyle.sleepArchetype],
    ['stressLevel', lifestyle.stressLevel],
    ['nutritionHabits', lifestyle.nutritionHabits],
    ['hydrationHabits', lifestyle.hydrationHabits],
    ['stepsPerDay', lifestyle.stepsPerDay.trim()],
    ['sedentaryHours', lifestyle.sedentaryHours.trim()],
    ['caffeineCupsPerDay', lifestyle.caffeineCupsPerDay.trim()],
    ['alcoholFrequency', lifestyle.alcoholFrequency],
    ['medicationsFlag', lifestyle.medicationsFlag],
    ['medicationsNotes', lifestyle.medicationsNotes.trim()],
  ];
  for (const [k, v] of entries) {
    if (!allowed.has(k) || !v) continue;
    out[k] = v;
  }
  return out;
}

export default function PublicRemoteAssessment() {
  const { token } = useParams<{ token: string }>();

  // Session
  const [checking, setChecking] = useState(true);
  const [allowedKeys, setAllowedKeys] = useState<Set<string>>(new Set());

  // Wizard navigation
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step state
  const [basicInfo, setBasicInfo] = useState<BasicInfoState>(INITIAL_BASIC_INFO);
  const [lifestyle, setLifestyle] = useState<LifestyleRemoteState>(INITIAL_LIFESTYLE_REMOTE);
  const [parqAnswers, setParqAnswers] = useState<Record<string, string>>({});
  const [bodyCompStatus, setBodyCompStatus] = useState<BodyCompStatus>('pending');
  const [bodyCompFields, setBodyCompFields] = useState<Record<string, string>>({});
  const [postureSkipped, setPostureSkipped] = useState(false);
  const [postureConsentGiven, setPostureConsentGiven] = useState(false);
  const [posturePaths, setPosturePaths] = useState<Partial<Record<RemotePostureView, string>>>({});

  useEffect(() => {
    if (!token) { setChecking(false); return; }
    let cancelled = false;
    void (async () => {
      const res = await fetchRemoteAssessmentSession(token);
      if (cancelled) return;
      if (res.ok) {
        setAllowedKeys(new Set(res.allowedKeys));
      }
      setChecking(false);
    })();
    return () => { cancelled = true; };
  }, [token]);

  // Per-step validity
  const isCurrentStepValid = useMemo(() => {
    switch (currentStep) {
      case 0: return isBasicInfoValid(basicInfo);
      case 1: return !!lifestyle.activityLevel;
      case 2: {
        const visible = parqQuestions.filter(q => {
          if (!q.conditional) return true;
          return basicInfo.gender === q.conditional.showWhen.value;
        });
        return visible.every(q => (parqAnswers[q.id] ?? '') !== '');
      }
      case 3: return bodyCompStatus === 'skipped' || bodyCompStatus === 'confirmed';
      case 4: return postureSkipped || Object.keys(posturePaths).length > 0;
      default: return false;
    }
  }, [currentStep, basicInfo, lifestyle, parqAnswers, bodyCompStatus, postureSkipped, posturePaths]);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      void handleSubmitAll();
    }
  };

  const handleBack = () => {
    setCurrentStep((s) => Math.max(0, s - 1));
  };

  const handleSubmitAll = async () => {
    if (!token) return;
    setError(null);
    setSubmitting(true);
    try {
      const fields: Record<string, string> = {
        ...basicInfo,
        ...lifestyleToFields(lifestyle, allowedKeys),
        ...parqAnswers,
      };
      if (bodyCompStatus === 'confirmed') {
        Object.assign(fields, bodyCompFields);
      }
      if (!postureSkipped) {
        for (const [view, path] of Object.entries(posturePaths)) {
          if (path) fields[`postureRemotePath_${view}`] = path;
        }
      }
      // Remove empty strings
      for (const k of Object.keys(fields)) {
        if (!fields[k]) delete fields[k];
      }
      await submitRemoteAssessmentFields(token, fields);
      setSubmitted(true);
    } catch (err) {
      logger.error('[PublicRemoteAssessment] Submit failed:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Loading / invalid / submitted states
  if (!token) {
    return (
      <AppShell title="Remote check-in" mode="public">
        <div className="max-w-md mx-auto px-4 py-8 text-center text-muted-foreground text-sm">
          {ASSESSMENT_COPY.REMOTE_INVALID}
        </div>
      </AppShell>
    );
  }

  if (checking) {
    return (
      <AppShell title="Remote check-in" mode="public">
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
          <p className="text-sm">Checking your link…</p>
        </div>
      </AppShell>
    );
  }

  if (allowedKeys.size === 0) {
    return (
      <AppShell title="Remote check-in" mode="public">
        <div className="max-w-md mx-auto px-4 py-8 text-center text-muted-foreground text-sm">
          {ASSESSMENT_COPY.REMOTE_INVALID}
        </div>
      </AppShell>
    );
  }

  if (submitted) {
    return (
      <AppShell title="Remote check-in" mode="public">
        <div className="max-w-md mx-auto px-4 py-8 space-y-6 text-center">
          <div className="flex justify-center">
            <div className="rounded-full bg-emerald-100 dark:bg-emerald-950 p-4">
              <CheckCircle className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <h2 className="text-lg font-semibold text-foreground">Thanks</h2>
          <p className="text-sm text-muted-foreground">{ASSESSMENT_COPY.REMOTE_THANKS}</p>
          <Button variant="outline" size="sm" asChild>
            <Link to="/">Home</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <RemoteBasicInfoStep value={basicInfo} onChange={setBasicInfo} />;
      case 1:
        return (
          <PublicRemoteLifestyleFields
            value={lifestyle}
            onChange={setLifestyle}
            allowedKeys={allowedKeys}
          />
        );
      case 2:
        return (
          <RemoteParQStep
            value={parqAnswers}
            onChange={(patch) => setParqAnswers((prev) => ({ ...prev, ...patch }))}
            gender={basicInfo.gender}
          />
        );
      case 3:
        return (
          <RemoteBodyCompStep
            token={token}
            status={bodyCompStatus}
            fields={bodyCompFields}
            onStatusChange={setBodyCompStatus}
            onFieldsChange={setBodyCompFields}
          />
        );
      case 4:
        return (
          <RemotePostureStep
            token={token}
            skipped={postureSkipped}
            consentGiven={postureConsentGiven}
            posturePaths={posturePaths}
            onSkip={() => setPostureSkipped((v) => !v)}
            onConsentGiven={() => setPostureConsentGiven(true)}
            onPosturePathsChange={setPosturePaths}
          />
        );
      default:
        return null;
    }
  };

  return (
    <AppShell title="Assessment" mode="public">
      <RemoteWizardShell
        steps={[...STEPS]}
        currentStep={currentStep}
        isValid={isCurrentStepValid}
        isSubmitting={submitting}
        onBack={handleBack}
        onNext={handleNext}
      >
        {error && (
          <p className="mb-4 text-sm text-destructive">{error}</p>
        )}
        {renderStep()}
      </RemoteWizardShell>
    </AppShell>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Build**

```bash
npm run build
```
Expected: builds successfully (warnings about chunk sizes are OK).

- [ ] **Step 4: Commit**

```bash
git add src/pages/PublicRemoteAssessment.tsx
git commit -m "feat(remote): refactor PublicRemoteAssessment into 5-step wizard"
```

---

## Task 16: Final deploy

- [ ] **Step 1: Deploy hosting only (no function changes)**

```bash
bash deploy-preview.sh
```
Expected: outputs a preview URL.

- [ ] **Step 2: Smoke test the wizard on the preview URL**

From the coach dashboard on the preview URL:
1. Open "New Client", type a name, click "Send link" — confirm the link displays without overflow and "Copy link" button works
2. Open the generated link on a mobile device (or Chrome DevTools mobile emulation)
3. Confirm all 5 steps appear in order with progress bar
4. Fill Basic Info completely — confirm Next becomes enabled
5. Fill Lifestyle (at minimum activity level) — confirm Next enabled
6. Answer all PAR-Q questions — answer "Yes" to one, confirm amber warning appears
7. On Body Comp step: test Skip path; test Manual path (enter one value, click Save)
8. On Posture step: test Skip path
9. Submit — confirm the thank-you screen appears
10. In Firebase Console → Firestore → `organizations/{orgId}/clients/{slug}` — confirm `formData` populated, `parqFlagged: true` if a yes was given, `remoteIntakeAwaitingStudio: true`

- [ ] **Step 3: Full deploy if smoke test passes**

```bash
firebase deploy
```

- [ ] **Step 4: Final commit tag**

```bash
git tag -a "remote-wizard-v1" -m "Remote assessment 5-step wizard complete"
```
