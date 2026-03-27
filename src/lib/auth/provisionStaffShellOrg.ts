/**
 * Creates userProfiles + org coaches row + organizations/{orgId} for a new staff account.
 * The coaches subdocument must exist before the org root write — see firestore.rules (isOrgAdmin).
 */

import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import type { UserProfile } from '@/types/auth';
import { GYM_TRIAL_CLIENT_CAP } from '@/constants/pricing';
import { isTestEmail } from '@/lib/utils/testAccountHelper';

export async function provisionStaffShellOrg(
  db: Firestore,
  params: { uid: string; email: string; displayName: string },
): Promise<void> {
  const { uid, email, displayName } = params;
  const orgId = `org-${uid}`;

  const userProfile: UserProfile = {
    uid,
    organizationId: orgId,
    role: 'org_admin',
    displayName,
    onboardingCompleted: false,
  };

  await setDoc(doc(db, 'userProfiles', uid), userProfile);

  await setDoc(doc(db, `organizations/${orgId}/coaches/${uid}`), {
    uid,
    role: 'org_admin',
    email: email || null,
    displayName,
  });

  await setDoc(doc(db, 'organizations', orgId), {
    name: '',
    ownerId: uid,
    customBrandingEnabled: false,
    subscription: {
      plan: 'starter',
      planKind: 'pending_onboarding',
      status: 'trial',
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      billingEmail: email,
      clientSeats: GYM_TRIAL_CLIENT_CAP,
      clientCap: GYM_TRIAL_CLIENT_CAP,
      trialClientCap: GYM_TRIAL_CLIENT_CAP,
    },
    createdAt: serverTimestamp(),
    ...(isTestEmail(email) && { metadata: { isTest: true } }),
  });
}
