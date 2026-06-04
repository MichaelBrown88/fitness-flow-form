/**
 * Studio baseline session steps (before / between phase navigation).
 */

import type { FormData } from '@/contexts/FormContext';
import type { PhaseId } from '@/lib/phases/types';
import { hasRemoteIntakeResumeSession } from '@/lib/assessment/baselineSession';

export type StudioSessionStep = 'intake-review';

/** Physical battery order for in-studio tests (excludes P0/P1 pre-assessment). */
export const STUDIO_PHYSICAL_PHASE_ORDER: PhaseId[] = ['P3', 'P2', 'P5', 'P4', 'P7'];

/** Full baseline plan phase ids (no P6 — goals on P1 / pre-assessment). */
export const STUDIO_BASELINE_PHASE_IDS: PhaseId[] = ['P0', 'P1', 'P3', 'P2', 'P5', 'P4', 'P7'];

const REMOTE_POSTURE_VIEWS = ['front', 'side-left', 'back', 'side-right'] as const;

export function sortStudioPhaseIds(ids: PhaseId[]): PhaseId[] {
  const order = STUDIO_BASELINE_PHASE_IDS;
  return [...new Set(ids)].sort((a, b) => {
    const ai = order.indexOf(a);
    const bi = order.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
}

export function isRemoteIntakeFormComplete(formData: FormData | null | undefined): boolean {
  if (!formData) return false;
  const name = typeof formData.fullName === 'string' ? formData.fullName.trim() : '';
  const recent = typeof formData.recentActivity === 'string' ? formData.recentActivity.trim() : '';
  const history =
    typeof formData.trainingHistory === 'string' ? formData.trainingHistory.trim() : '';
  const activity =
    typeof formData.activityLevel === 'string' ? formData.activityLevel.trim() : '';
  const parq1 = typeof formData.parq1 === 'string' ? formData.parq1.trim() : '';
  return Boolean(name && recent && history && activity && parq1);
}

export function hasRemotePostureCaptureComplete(formData: FormData | null | undefined): boolean {
  if (!formData) return false;
  return REMOTE_POSTURE_VIEWS.every((view) => {
    const key = `postureRemotePath_${view}` as keyof FormData;
    const v = formData[key];
    return typeof v === 'string' && v.trim().length > 0;
  });
}

export function shouldUseStudioBaselineFlow(options: {
  isBaselineSession: boolean;
  isPartialAssessment: boolean;
}): boolean {
  return options.isBaselineSession && !options.isPartialAssessment;
}

/** True when the client completed (or partially completed) home pre-assessment before studio. */
export function shouldShowRemoteIntakeReview(
  formData: FormData,
  remoteIntakeResume: boolean,
): boolean {
  return remoteIntakeResume || isRemoteIntakeFormComplete(formData);
}

/** Partial remote pre-assessment — show review screen before physical phases. */
export function shouldShowStudioIntakeReview(
  formData: FormData,
  remoteIntakeResume: boolean,
): boolean {
  return remoteIntakeResume && !isRemoteIntakeFormComplete(formData);
}

export function filterPhasesForStudioBaseline(
  phaseIds: PhaseId[],
  formData: FormData,
  remoteIntakeResume: boolean,
): PhaseId[] {
  let ids = [...phaseIds];
  const remoteIntakeCaptured =
    remoteIntakeResume || isRemoteIntakeFormComplete(formData);
  if (remoteIntakeCaptured) {
    ids = ids.filter((id) => id !== 'P0' && id !== 'P1');
  }
  return sortStudioPhaseIds(ids);
}

export function readRemoteIntakeResumeFlag(): boolean {
  return hasRemoteIntakeResumeSession();
}
