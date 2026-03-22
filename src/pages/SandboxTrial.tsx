/**
 * SandboxTrial
 *
 * Zero-friction entry point: creates an anonymous Firebase Auth session,
 * provisions a temporary sandbox org (3 free AI assessments), then drops the
 * coach straight into the assessment flow — no sign-up required.
 *
 * When they exhaust their 3 assessments they are prompted to create a real
 * account.  The anonymous user is then linked with a credential so all their
 * client data is preserved.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInAnonymously } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getFirebaseAuth, getDb } from '@/services/firebase';
import { ROUTES } from '@/constants/routes';
import { logger } from '@/lib/utils/logger';
import { Seo } from '@/components/seo/Seo';
import { requireSeoForPath } from '@/constants/seo';

const trySeo = requireSeoForPath(ROUTES.TRY);

export const SANDBOX_ASSESSMENTS_LIMIT = 3;

export default function SandboxTrial() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const auth = getFirebaseAuth();
        const db = getDb();

        // Reuse existing anonymous session if available
        let uid: string;
        if (auth.currentUser) {
          uid = auth.currentUser.uid;
        } else {
          const { user } = await signInAnonymously(auth);
          uid = user.uid;
        }

        const orgId = `${uid}_sandbox`;

        // Idempotent — safe to re-run if user reloads the page mid-setup
        await setDoc(
          doc(db, 'organizations', orgId),
          {
            name: 'My Trial',
            subscription: {
              plan: 'sandbox',
              status: 'active',
            },
            trialAssessmentsRemaining: SANDBOX_ASSESSMENTS_LIMIT,
            trialStartedAt: serverTimestamp(),
            metadata: { isSandbox: true },
          },
          { merge: true }
        );

        await setDoc(
          doc(db, 'userProfiles', uid),
          {
            organizationId: orgId,
            role: 'owner',
            onboardingCompleted: false,
            isAnonymous: true,
          },
          { merge: true }
        );

        // Coaches subcollection entry — required for isOrgCoach() Firestore rule
        await setDoc(
          doc(db, `organizations/${orgId}/coaches/${uid}`),
          { role: 'owner', uid },
          { merge: true }
        );

        logger.info('[SandboxTrial] Sandbox provisioned', { uid, orgId });

        if (!cancelled) {
          navigate(ROUTES.ASSESSMENT, { replace: true });
        }
      } catch (err) {
        logger.error('[SandboxTrial] Bootstrap failed', err);
        if (!cancelled) {
          setError('Could not start your trial. Please try again.');
        }
      }
    }

    void bootstrap();
    return () => { cancelled = true; };
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center">
        <Seo
          pathname={ROUTES.TRY}
          title={trySeo.title}
          description={trySeo.description}
          noindex={trySeo.noindex}
        />
        <p className="text-sm text-slate-500">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="h-10 px-6 rounded-xl bg-slate-900 text-white text-sm font-bold"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-white">
      <Seo
        pathname={ROUTES.TRY}
        title={trySeo.title}
        description={trySeo.description}
        noindex={trySeo.noindex}
      />
      <div className="h-12 w-12 rounded-full border-4 border-slate-200 border-t-primary animate-spin" />
      <p className="text-sm font-medium text-slate-400">Setting up your trial…</p>
    </div>
  );
}
