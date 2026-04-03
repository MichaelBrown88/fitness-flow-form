import { Link } from 'react-router-dom';
import { Navbar, Footer } from '@/components/landing';
import { ROUTES } from '@/constants/routes';
import { Seo } from '@/components/seo/Seo';
import { SEO_NOINDEX_CHECKOUT_RESULT } from '@/constants/seo';
import { CHECKOUT_FLOW_COPY } from '@/constants/checkoutFlowCopy';

/**
 * Logged-out user backed out of Stripe Checkout — no charge.
 */
export default function CheckoutGuestCancelPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Seo
        pathname={ROUTES.CHECKOUT_CANCEL}
        title={SEO_NOINDEX_CHECKOUT_RESULT.title}
        description={SEO_NOINDEX_CHECKOUT_RESULT.description}
        noindex
      />
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-lg w-full bg-card rounded-2xl border border-border p-8 sm:p-10 shadow-sm text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">{CHECKOUT_FLOW_COPY.guestCancelTitle}</h1>
          <p className="text-sm text-muted-foreground mb-8 text-left leading-relaxed">
            {CHECKOUT_FLOW_COPY.guestCancelLead}
          </p>
          <div className="flex flex-col gap-3">
            <Link
              to={`${ROUTES.PRICING}#pricing`}
              className="inline-flex items-center justify-center w-full h-11 rounded-xl bg-foreground text-primary-foreground font-bold text-sm hover:bg-foreground/90 transition-colors"
            >
              {CHECKOUT_FLOW_COPY.guestCancelCtaPricing}
            </Link>
            <Link
              to={ROUTES.HOME}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {CHECKOUT_FLOW_COPY.guestCancelCtaHome}
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
