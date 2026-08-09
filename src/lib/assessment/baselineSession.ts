import { STORAGE_KEYS } from '@/constants/storageKeys';
import type { AssessmentPlan } from '@/lib/types/assessmentPlan';
import {
  buildStudioBaselinePlan,
  isAssessmentPlanFullCoverage,
} from '@/lib/types/assessmentPlan';
import type { AssessmentSnapshot } from '@/services/assessmentHistory';

export type BaselineIntakeMode = 'studio' | 'send_link_first';

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

export function buildFullBaselinePlan(): AssessmentPlan {
  return buildStudioBaselinePlan();
}

/** True when the client has a completed full baseline (snapshot or current-state doc). */
export function clientHasFullBaseline(input: {
  snapshots?: Pick<AssessmentSnapshot, 'type'>[];
  clientDoc?: {
    assessmentType?: 'full' | 'pillar';
    isPartial?: boolean;
    assessmentCount?: number;
  } | null;
}): boolean {
  const { snapshots = [], clientDoc } = input;

  for (const snap of snapshots) {
    const t = String(snap.type ?? '');
    if (t === 'full-assessment' || t === 'full') {
      return true;
    }
  }

  if (!clientDoc) {
    return false;
  }

  if (clientDoc.isPartial === true || clientDoc.assessmentType === 'pillar') {
    return false;
  }

  return clientDoc.assessmentType === 'full';
}

export function hasActiveBaselineSession(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEYS.BASELINE_ASSESSMENT_SESSION) === '1';
  } catch {
    return false;
  }
}

export function readBaselineIntakeMode(): BaselineIntakeMode | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEYS.BASELINE_INTAKE_MODE);
    if (raw === 'studio' || raw === 'send_link_first') return raw;
  } catch {
    /* ignore */
  }
  return null;
}

export function readBaselineSessionPlan(): AssessmentPlan | null {
  return safeParse<AssessmentPlan>(
    sessionStorage.getItem(STORAGE_KEYS.BASELINE_ASSESSMENT_PLAN),
  );
}

export function markBaselineAssessmentSession(
  intakeMode: BaselineIntakeMode = 'studio',
  options?: { remoteIntakeResume?: boolean },
): void {
  const plan = buildFullBaselinePlan();
  safeSetItem(STORAGE_KEYS.BASELINE_ASSESSMENT_SESSION, '1');
  safeSetItem(STORAGE_KEYS.BASELINE_ASSESSMENT_PLAN, JSON.stringify(plan));
  safeSetItem(STORAGE_KEYS.BASELINE_INTAKE_MODE, intakeMode);
  if (options?.remoteIntakeResume) {
    safeSetItem(STORAGE_KEYS.REMOTE_INTAKE_RESUME, '1');
  } else {
    safeRemoveItem(STORAGE_KEYS.REMOTE_INTAKE_RESUME);
  }
  safeRemoveItem(STORAGE_KEYS.STUDIO_SESSION_STEP);
  safeRemoveItem(STORAGE_KEYS.CONSULTATION_COMPLETE);
}

export function markRemoteIntakeResumeSession(): void {
  safeSetItem(STORAGE_KEYS.REMOTE_INTAKE_RESUME, '1');
}

export function hasRemoteIntakeResumeSession(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEYS.REMOTE_INTAKE_RESUME) === '1';
  } catch {
    return false;
  }
}

export function clearBaselineSessionFlags(): void {
  safeRemoveItem(STORAGE_KEYS.BASELINE_ASSESSMENT_SESSION);
  safeRemoveItem(STORAGE_KEYS.BASELINE_ASSESSMENT_PLAN);
  safeRemoveItem(STORAGE_KEYS.BASELINE_INTAKE_MODE);
  safeRemoveItem(STORAGE_KEYS.REMOTE_INTAKE_RESUME);
  safeRemoveItem(STORAGE_KEYS.RETURNING_SESSION_PLAN);
  safeRemoveItem(STORAGE_KEYS.STUDIO_SESSION_STEP);
  safeRemoveItem(STORAGE_KEYS.CONSULTATION_COMPLETE);
}

export function markReturningSessionPlan(): void {
  safeSetItem(STORAGE_KEYS.RETURNING_SESSION_PLAN, '1');
}

export function hasReturningSessionPlan(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEYS.RETURNING_SESSION_PLAN) === '1';
  } catch {
    return false;
  }
}

export function readBaselineFormPatch(): {
  assessmentPlan: AssessmentPlan;
  assessmentIntakeMode: BaselineIntakeMode | null;
  postureInputMode: 'ai';
} | null {
  if (!hasActiveBaselineSession()) return null;
  const plan = readBaselineSessionPlan() ?? buildFullBaselinePlan();
  return {
    assessmentPlan: plan,
    assessmentIntakeMode: readBaselineIntakeMode(),
    // Studio baselines lead with photo capture; manual observation stays as fallback.
    postureInputMode: 'ai',
  };
}

export function isSessionPlanWizardSkipped(plan: AssessmentPlan | null | undefined): boolean {
  if (hasActiveBaselineSession()) return true;
  if (isAssessmentPlanFullCoverage(plan)) return true;
  return false;
}
