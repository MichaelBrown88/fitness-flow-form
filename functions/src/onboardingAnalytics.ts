/**
 * Onboarding Analytics Cloud Function
 *
 * Tracks step transitions (0->1, 1->2, 2->3, 3->4) for funnel analysis.
 * Stores only step + date counts; no PII.
 */

import * as admin from 'firebase-admin';
import type { CallableRequest } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import {
  ONBOARDING_FUNNEL_STEP_MAX,
  ONBOARDING_FUNNEL_STEP_MIN,
} from './constants/onboardingFunnel';

export interface LogOnboardingStepRequest {
  step: number; // Step reached (1, 2, 3, or 4)
}

function getDb() {
  return admin.firestore();
}

export async function handleLogOnboardingStep(
  request: CallableRequest<LogOnboardingStepRequest>,
): Promise<{ success: boolean }> {
  const { step } = request.data || {};

  if (
    typeof step !== 'number' ||
    step < ONBOARDING_FUNNEL_STEP_MIN ||
    step > ONBOARDING_FUNNEL_STEP_MAX
  ) {
    return { success: false };
  }

  try {
    const db = getDb();
    const ref = db.doc('platform/onboarding_funnel');

    const field = `step${step}`;
    await ref.set(
      {
        [field]: FieldValue.increment(1),
        lastUpdated: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    await db.collection('platform_activity_feed').add({
      type: 'onboarding_step',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      organizationId: null,
      organizationName: null,
      actorUid: request.auth?.uid ?? null,
      actorLabel: 'Onboarding',
      summary: `Onboarding step ${step} completed`,
      details: { step },
    });

    return { success: true };
  } catch (err) {
    console.warn('logOnboardingStep failed:', err);
    return { success: false };
  }
}
