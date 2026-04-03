import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { Navbar, Footer } from '@/components/landing';
import { ROUTES } from '@/constants/routes';
import { Seo } from '@/components/seo/Seo';
import { SEO_NOINDEX_CHECKOUT_RESULT } from '@/constants/seo';
import { CHECKOUT_FLOW_COPY } from '@/constants/checkoutFlowCopy';

/**
 * Logged-out Stripe Checkout success — not the marketing pricing page.
 */
export default function CheckoutGuestSuccessPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Seo
        pathname={ROUTES.CHECKOUT_SUCCESS}
        title={SEO_NOINDEX_CHECKOUT_RESULT.title}
        description={SEO_NOINDEX_CHECKOUT_RESULT.description}
        noindex
      />
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-lg w-full bg-card rounded-2xl border border-border p-8 sm:p-10 shadow-sm text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-14 w-14 text-emerald-500" aria-hidden />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">{CHECKOUT_FLOW_COPY.guestSuccessTitle}</h1>
          <p className="text-sm text-muted-foreground mb-6 text-left leading-relaxed">
            {CHECKOUT_FLOW_COPY.guestSuccessLead}
          </p>
          {sessionId ? (
            <p className="text-xs text-muted-foreground font-mono break-all mb-6 text-left">
              {CHECKOUT_FLOW_COPY.guestSuccessSessionHint} {sessionId}
            </p>
          ) : null}
          <div className="flex flex-col gap-3">
            <Link
              to={ROUTES.ONBOARDING}
              className="inline-flex items-center justify-center w-full h-11 rounded-xl bg-foreground text-primary-foreground font-bold text-sm hover:bg-foreground/90 transition-colors"
            >
              {CHECKOUT_FLOW_COPY.guestSuccessCtaSignup}
            </Link>
            <Link
              to={ROUTES.LOGIN}
              className="inline-flex items-center justify-center w-full h-11 rounded-xl border border-border bg-background font-semibold text-sm hover:bg-muted/60 transition-colors"
            >
              {CHECKOUT_FLOW_COPY.guestSuccessCtaLogin}
            </Link>
            <Link
              to={ROUTES.DEMO}
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              {CHECKOUT_FLOW_COPY.guestSuccessCtaSampleReport}
            </Link>
            <Link
              to={ROUTES.HOME}
              className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors pt-1"
            >
              {CHECKOUT_FLOW_COPY.guestSuccessCtaHome}
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
