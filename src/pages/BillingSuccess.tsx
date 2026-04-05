import { useEffect, useRef } from 'react';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { CheckCircle } from 'lucide-react';
import { ROUTES } from '@/constants/routes';
import { getAppShellSeoForPathname } from '@/constants/seo';
import { Seo } from '@/components/seo/Seo';
import { CHECKOUT_FLOW_COPY } from '@/constants/checkoutFlowCopy';
import { useAuth } from '@/hooks/useAuth';
import { getFirebaseFunctions } from '@/services/firebase';
import { logger } from '@/lib/utils/logger';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

/**
 * Stripe Checkout success for logged-in org checkout — next steps, not a sales page.
 */
export default function BillingSuccessPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const sessionId = searchParams.get('session_id');
  const successSeoPath = location.pathname.split('?')[0];
  const successSeoMeta = getAppShellSeoForPathname(location.pathname);
  const { user } = useAuth();
  const checkoutSyncStartedRef = useRef(false);

  useEffect(() => {
    if (!sessionId || !user?.uid || checkoutSyncStartedRef.current) {
      return;
    }
    checkoutSyncStartedRef.current = true;
    const sync = httpsCallable<
      { sessionId: string },
      { ok: true; appliedSubscription: boolean; detail?: string }
    >(getFirebaseFunctions(), 'syncCheckoutSession');
    void sync({ sessionId }).catch((err: unknown) => {
      logger.warn('[BillingSuccess] syncCheckoutSession failed; webhook may still update billing', {
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }, [sessionId, user?.uid]);

  return (
    <>
      <Seo
        pathname={successSeoPath}
        title={successSeoMeta.title}
        description={successSeoMeta.description}
        noindex={successSeoMeta.noindex}
      />
    <ErrorBoundary>
    <div className="min-h-screen bg-muted/50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-card rounded-2xl border border-border p-8 text-center shadow-md ring-1 ring-border/40">
        <div className="flex justify-center mb-4">
          <CheckCircle className="h-14 w-14 text-score-green" aria-hidden />
        </div>
        <h1 className="text-xl font-bold text-foreground mb-2">{CHECKOUT_FLOW_COPY.billingSuccessTitle}</h1>
        <p className="text-sm text-foreground-secondary mb-6 text-left leading-relaxed">
          {CHECKOUT_FLOW_COPY.billingSuccessLead}
        </p>
        {sessionId ? (
          <p className="text-xs text-muted-foreground font-mono break-all mb-6 text-left">
            {CHECKOUT_FLOW_COPY.guestSuccessSessionHint} {sessionId}
          </p>
        ) : null}
        <ul className="text-left text-sm text-muted-foreground space-y-2 mb-8 list-disc pl-5">
          <li>{CHECKOUT_FLOW_COPY.billingSuccessStepDashboard}</li>
          <li>{CHECKOUT_FLOW_COPY.billingSuccessStepBilling}</li>
          <li>{CHECKOUT_FLOW_COPY.billingSuccessStepSample}</li>
        </ul>
        <Link
          to={ROUTES.DASHBOARD}
          className="inline-flex items-center justify-center w-full h-11 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-apple"
        >
          {CHECKOUT_FLOW_COPY.billingSuccessCtaDashboard}
        </Link>
        <Link
          to={ROUTES.BILLING}
          className="block mt-3 text-sm font-medium text-primary hover:underline"
        >
          {CHECKOUT_FLOW_COPY.billingSuccessCtaBilling}
        </Link>
        <Link
          to={ROUTES.DEMO}
          className="block mt-3 text-sm font-medium text-primary hover:underline"
        >
          {CHECKOUT_FLOW_COPY.billingSuccessCtaSample}
        </Link>
      </div>
    </div>
    </ErrorBoundary>
    </>
  );
}
