import { Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { ROUTES } from '@/constants/routes';

/**
 * Stripe Checkout success redirect — session_id is in the query string for support/debug.
 */
export default function BillingSuccessPage() {
  return (
    <div className="min-h-screen bg-muted/50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-background rounded-2xl border border-border p-8 text-center shadow-sm">
        <div className="flex justify-center mb-4">
          <CheckCircle className="h-14 w-14 text-emerald-500" aria-hidden />
        </div>
        <h1 className="text-xl font-bold text-foreground mb-2">You&apos;re all set</h1>
        <p className="text-sm text-foreground-secondary mb-6">
          Your subscription is processing. It may take a minute for your plan and AI credits to appear on your
          organization.
        </p>
        <Link
          to={ROUTES.DASHBOARD}
          className="inline-flex items-center justify-center w-full h-11 rounded-xl bg-foreground text-white font-bold text-sm hover:bg-foreground/90 transition-colors"
        >
          Go to dashboard
        </Link>
        <Link
          to={ROUTES.BILLING}
          className="block mt-3 text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          View billing
        </Link>
      </div>
    </div>
  );
}
