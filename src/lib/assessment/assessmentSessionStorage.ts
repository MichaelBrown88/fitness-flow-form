/**
 * Centralized sessionStorage reads/writes for the in-progress assessment.
 * All coach assessment entry keys should go through here where practical.
 */

import { STORAGE_KEYS } from '@/constants/storageKeys';
import type { PartialCategory } from '@/lib/assessmentCompleteness';

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* non-fatal */
  }
}

function safeRemoveItem(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* non-fatal */
  }
}

export type PartialAssessmentSessionRecord = {
  clientName?: string;
  category?: string;
};

export type PrefillClientSessionRecord = {
  clientName?: string;
  fullName?: string;
  dateOfBirth?: string;
  email?: string;
  phone?: string;
};

export type EditAssessmentSessionPayload = {
  editType?: string;
  assessmentId?: string;
  snapshotId?: string;
  clientName?: string;
  formData?: Record<string, unknown> & { fullName?: string };
};

/** Maps edit session `editType` to partial category (includes `manual` → strength). */
export function getPartialCategoryFromEditType(editType: string | undefined): string | null {
  if (!editType) return null;
  if (editType.startsWith('partial-')) return editType.replace('partial-', '');
  if (editType === 'manual') return 'strength';
  return null;
}

// --- Partial assessment (PARTIAL_ASSESSMENT) ---

export function hasPartialAssessmentInSession(): boolean {
  try {
    return !!sessionStorage.getItem(STORAGE_KEYS.PARTIAL_ASSESSMENT);
  } catch {
    return false;
  }
}

export function readPartialAssessmentRecord(): PartialAssessmentSessionRecord | null {
  return safeParse<PartialAssessmentSessionRecord>(
    sessionStorage.getItem(STORAGE_KEYS.PARTIAL_ASSESSMENT),
  );
}

export function writePartialAssessment(record: PartialAssessmentSessionRecord): void {
  safeSetItem(STORAGE_KEYS.PARTIAL_ASSESSMENT, JSON.stringify(record));
}

export function removePartialAssessment(): void {
  safeRemoveItem(STORAGE_KEYS.PARTIAL_ASSESSMENT);
}

/** Client name hint from partial-assessment session (not removed on read). */
export function readPartialAssessmentClientNameHint(): string {
  const rec = readPartialAssessmentRecord();
  const name = rec?.clientName;
  return typeof name === 'string' ? name : '';
}

/** Category used by completeness checks when in partial mode. */
export function readPartialAssessmentCategory(): PartialCategory | undefined {
  const rec = readPartialAssessmentRecord();
  const c = rec?.category;
  if (
    c === 'bodycomp' ||
    c === 'posture' ||
    c === 'fitness' ||
    c === 'strength' ||
    c === 'lifestyle'
  ) {
    return c;
  }
  return undefined;
}

export function readPartialCategoryString(): string | null {
  const rec = readPartialAssessmentRecord();
  const c = rec?.category;
  return typeof c === 'string' ? c : null;
}

// --- Edit assessment (EDIT_ASSESSMENT) ---

export function readEditAssessmentRaw(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEYS.EDIT_ASSESSMENT);
  } catch {
    return null;
  }
}

export function parseEditAssessmentPayload(): EditAssessmentSessionPayload | null {
  const raw = readEditAssessmentRaw();
  if (!raw) return null;
  return safeParse<EditAssessmentSessionPayload>(raw);
}

export function writeEditAssessmentPayload(payload: unknown): void {
  try {
    safeSetItem(STORAGE_KEYS.EDIT_ASSESSMENT, JSON.stringify(payload));
  } catch {
    /* non-fatal */
  }
}

export function removeEditAssessment(): void {
  safeRemoveItem(STORAGE_KEYS.EDIT_ASSESSMENT);
}

export function hasEditAssessmentInSession(): boolean {
  try {
    return !!sessionStorage.getItem(STORAGE_KEYS.EDIT_ASSESSMENT);
  } catch {
    return false;
  }
}

export function readEditAssessmentFormFullName(): string {
  const parsed = parseEditAssessmentPayload();
  const n = parsed?.formData?.fullName;
  return typeof n === 'string' ? n : '';
}

/**
 * When edit payload is partial-*, mirror into PARTIAL_ASSESSMENT for navigation/UX.
 * Used on FormProvider hydration and useAssessmentNavigation mount effect.
 */
export function writePartialRowFromPartialEditPayload(parsed: EditAssessmentSessionPayload): void {
  const category = getPartialCategoryFromEditType(parsed.editType);
  if (!category) return;
  const clientName =
    typeof parsed.formData?.fullName === 'string' ? parsed.formData.fullName : '';
  writePartialAssessment({ category, clientName });
}

/** Legacy name kept for clarity in callers that hydrate from EDIT_ASSESSMENT. */
export function writePartialRowIfPartialEditTypeFromPayload(
  parsed: { editType?: string; formData?: Record<string, unknown> },
): void {
  if (!parsed.editType?.startsWith('partial-')) return;
  const category = parsed.editType.replace('partial-', '');
  const patch = parsed.formData ?? {};
  const clientName = typeof patch.fullName === 'string' ? patch.fullName : '';
  writePartialAssessment({ category, clientName });
}

// --- Prefill (PREFILL_CLIENT) ---

export function readPrefillClientRaw(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEYS.PREFILL_CLIENT);
  } catch {
    return null;
  }
}

export function hasPrefillClientInSession(): boolean {
  try {
    return !!sessionStorage.getItem(STORAGE_KEYS.PREFILL_CLIENT);
  } catch {
    return false;
  }
}

export function writePrefillClientPayload(payload: Record<string, unknown>): void {
  safeSetItem(STORAGE_KEYS.PREFILL_CLIENT, JSON.stringify(payload));
}

export function removePrefillClient(): void {
  safeRemoveItem(STORAGE_KEYS.PREFILL_CLIENT);
}

/** Client name from one-shot prefill payload (does not remove). */
export function readPrefillClientNameHint(): string {
  const rec = safeParse<PrefillClientSessionRecord>(readPrefillClientRaw());
  if (!rec) return '';
  const fromFull = rec.fullName;
  if (typeof fromFull === 'string' && fromFull.trim()) return fromFull.trim();
  const name = rec.clientName;
  return typeof name === 'string' ? name : '';
}

/** Display name for setup step: fullName ?? clientName from prefill JSON. */
export function readPrefillClientDisplayName(): string {
  const rec = safeParse<PrefillClientSessionRecord>(readPrefillClientRaw());
  if (!rec) return '';
  const full = rec.fullName;
  const client = rec.clientName;
  if (typeof full === 'string' && full.trim()) return full.trim();
  if (typeof client === 'string' && client.trim()) return client.trim();
  return '';
}

/**
 * Read + remove prefill blob (FormProvider hydration). Returns merged partial for `base`.
 */
export function consumePrefillClientAsPartial<T extends object>(): Partial<T> | null {
  const raw = readPrefillClientRaw();
  if (!raw) return null;
  const data = safeParse<Partial<T>>(raw);
  removePrefillClient();
  return data && typeof data === 'object' ? data : null;
}

// --- Phase index (ASSESSMENT_PHASE) ---

export function readSavedAssessmentPhaseIndex(): number | null {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEYS.ASSESSMENT_PHASE);
    if (saved === null) return null;
    const idx = parseInt(saved, 10);
    if (!Number.isFinite(idx) || idx < 0) return null;
    return Math.min(idx, 15);
  } catch {
    return null;
  }
}

export function writeAssessmentPhaseIndex(idx: number): void {
  safeSetItem(STORAGE_KEYS.ASSESSMENT_PHASE, String(idx));
}

// --- Session draft (DRAFT_ASSESSMENT) ---

export function readDraftAssessmentRaw(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEYS.DRAFT_ASSESSMENT);
  } catch {
    return null;
  }
}

export function removeDraftAssessment(): void {
  safeRemoveItem(STORAGE_KEYS.DRAFT_ASSESSMENT);
}

export function writeSessionDraftAssessmentJson(json: string): void {
  safeSetItem(STORAGE_KEYS.DRAFT_ASSESSMENT, json);
}

export function writeSessionDraftAssessmentBundle(formData: unknown, clientName: string): void {
  safeSetItem(
    STORAGE_KEYS.DRAFT_ASSESSMENT,
    JSON.stringify({
      formData,
      timestamp: Date.now(),
      clientName,
    }),
  );
}

// --- Setup / demo flags ---

export function removeAssessmentSetupConfirmed(): void {
  safeRemoveItem(STORAGE_KEYS.ASSESSMENT_SETUP_CONFIRMED);
}

/** True after AssessmentSetupStep completed for this tab session. */
export function isAssessmentSetupConfirmedInSession(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEYS.ASSESSMENT_SETUP_CONFIRMED) === '1';
  } catch {
    return false;
  }
}

export function removeIsDemoFlag(): void {
  safeRemoveItem(STORAGE_KEYS.IS_DEMO);
}

// --- Composite helpers ---

/** Form `resetForm` + similar: partial, prefill, edit, draft only. */
export function clearPartialPrefillEditDraft(): void {
  removePartialAssessment();
  removePrefillClient();
  removeEditAssessment();
  removeDraftAssessment();
}

/**
 * Starting a clean assessment from dashboard / client: clears mode bleed keys.
 * Callers may set PARTIAL / PREFILL afterward.
 */
export function clearAssessmentEntryBleedKeys(): void {
  removeIsDemoFlag();
  removePrefillClient();
  removeEditAssessment();
  removeAssessmentSetupConfirmed();
  removeDraftAssessment();
}

/** Client-detail "new assessment": clears demo/prefill/edit without wiping draft or setup flag. */
export function clearClientNavAssessmentBleedKeys(): void {
  removeIsDemoFlag();
  removePrefillClient();
  removeEditAssessment();
}

export function shouldSuppressLocalDraftRecovery(): boolean {
  return hasEditAssessmentInSession() || hasPrefillClientInSession();
}

/** Setup step: best-effort client name from partial → prefill → edit. */
export function readActiveClientNameHintsForSetup(): string {
  const a = readPartialAssessmentClientNameHint();
  if (a.trim()) return a;
  const b = readPrefillClientDisplayName();
  if (b.trim()) return b;
  return readEditAssessmentFormFullName().trim();
}
