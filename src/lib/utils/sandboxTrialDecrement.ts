import { doc, increment, updateDoc } from 'firebase/firestore';
import { getDb } from '@/services/firebase';
import { logger } from '@/lib/utils/logger';

/** Sandbox orgs from SandboxTrial use `{uid}_sandbox` (see firestore.rules `ownsSandboxOrgId`). */
export function isSandboxOrganizationId(organizationId: string): boolean {
  return organizationId.endsWith('_sandbox');
}

/**
 * Decrements `trialAssessmentsRemaining` after a successful assessment persist to Firestore.
 * Offline sync passes only `organizationId` (plan omitted) and we gate on `_sandbox` suffix.
 */
export async function decrementSandboxTrialAfterSuccessfulSave(params: {
  organizationId: string | undefined | null;
  isDemoAssessment: boolean;
  /** From live org settings on online saves; omit on offline drain when unknown. */
  subscriptionPlan?: string | null;
}): Promise<void> {
  if (params.isDemoAssessment) return;
  const orgId = params.organizationId;
  if (!orgId) return;

  const plan = params.subscriptionPlan;
  const eligible =
    plan === 'sandbox' ||
    ((plan === undefined || plan === null) && isSandboxOrganizationId(orgId));

  if (!eligible) return;

  try {
    await updateDoc(doc(getDb(), 'organizations', orgId), {
      trialAssessmentsRemaining: increment(-1),
    });
  } catch (e) {
    logger.warn('[Sandbox] trialAssessmentsRemaining decrement failed (non-fatal)', e);
  }
}
