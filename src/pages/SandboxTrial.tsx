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
import { Button } from '@/components/ui/button';
import { formatSandboxBootstrapError } from '@/lib/utils/sandboxTrialErrors';

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
            role: 'org_admin',
            displayName: 'Coach',
            onboardingCompleted: false,
            isAnonymous: true,
          },
          { merge: true }
        );

        // Coaches subcollection entry — required for isOrgCoach() Firestore rule
        await setDoc(
          doc(db, `organizations/${orgId}/coaches/${uid}`),
          { role: 'org_admin', uid, displayName: 'Coach' },
          { merge: true }
        );

        logger.info('[SandboxTrial] Sandbox provisioned', { uid, orgId });

        if (!cancelled) {
          navigate(ROUTES.ASSESSMENT, { replace: true });
        }
      } catch (err) {
        logger.error('[SandboxTrial] Bootstrap failed', err);
        if (!cancelled) {
          setError(formatSandboxBootstrapError(err));
        }
      }
    }

    void bootstrap();
    return () => { cancelled = true; };
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center bg-background">
        <Seo
          pathname={ROUTES.TRY}
          title={trySeo.title}
          description={trySeo.description}
          noindex={trySeo.noindex}
        />
        <div
          role="alert"
          className="max-w-md rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-foreground"
        >
          {error}
        </div>
        <Button type="button" variant="default" className="h-10 px-6 font-semibold" onClick={() => window.location.reload()}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-background">
      <Seo
        pathname={ROUTES.TRY}
        title={trySeo.title}
        description={trySeo.description}
        noindex={trySeo.noindex}
      />
      <div className="h-12 w-12 rounded-full border-4 border-border border-t-primary animate-spin" />
      <p className="text-sm font-medium text-muted-foreground">Setting up your trial…</p>
    </div>
  );
}
