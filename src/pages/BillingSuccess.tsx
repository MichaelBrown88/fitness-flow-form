import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { ROUTES } from '@/constants/routes';
import { CHECKOUT_FLOW_COPY } from '@/constants/checkoutFlowCopy';

/**
 * Stripe Checkout success for logged-in org checkout — next steps, not a sales page.
 */
export default function BillingSuccessPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');

  return (
    <div className="min-h-screen bg-muted/50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-background rounded-2xl border border-border p-8 text-center shadow-sm">
        <div className="flex justify-center mb-4">
          <CheckCircle className="h-14 w-14 text-emerald-500" aria-hidden />
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
          className="inline-flex items-center justify-center w-full h-11 rounded-xl bg-foreground text-white font-bold text-sm hover:bg-foreground/90 transition-colors"
        >
          {CHECKOUT_FLOW_COPY.billingSuccessCtaDashboard}
        </Link>
        <Link
          to={ROUTES.BILLING}
          className="block mt-3 text-sm font-medium text-indigo-600 hover:text-indigo-700"
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
  );
}
