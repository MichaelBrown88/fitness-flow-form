import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ORG_BILLING_COPY } from '@/constants/orgBilling';
import { ROUTES } from '@/constants/routes';

export interface BillingActiveSubscriptionExplainerProps {
  onOpenPortal: () => void;
  portalLoading: boolean;
  statsClientCount?: number;
}

export function BillingActiveSubscriptionExplainer({
  onOpenPortal,
  portalLoading,
  statsClientCount,
}: BillingActiveSubscriptionExplainerProps) {
  return (
    <section
      id="billing-checkout-prep"
      className="scroll-mt-24 rounded-2xl border border-border/80 bg-card p-6 sm:p-8 shadow-sm ring-1 ring-border/40 space-y-5"
    >
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          {ORG_BILLING_COPY.billingActiveSubSectionEyebrow}
        </p>
        <h2 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
          {ORG_BILLING_COPY.billingActiveSubSectionTitle}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
          {ORG_BILLING_COPY.billingActiveSubSectionLead}
        </p>
      </div>
      <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-5 max-w-2xl leading-relaxed">
        <li>{ORG_BILLING_COPY.billingActiveSubBulletPortal}</li>
        <li>{ORG_BILLING_COPY.billingActiveSubBulletNoCompare}</li>
        <li>{ORG_BILLING_COPY.billingActiveSubBulletStripeConfig}</li>
      </ul>
      {statsClientCount != null ? (
        <p className="text-xs font-medium text-foreground rounded-lg bg-muted/60 border border-border/60 px-3 py-2 w-fit">
          {ORG_BILLING_COPY.billingActiveSubClientsNote.replace('{count}', String(statsClientCount))}
        </p>
      ) : null}
      <div className="flex flex-col sm:flex-row gap-3 pt-1">
        <Button
          type="button"
          className="rounded-xl font-semibold w-full sm:w-auto"
          onClick={() => onOpenPortal()}
          disabled={portalLoading}
        >
          {portalLoading ? (
            <span className="inline-flex items-center gap-2">
              <span
                className="h-4 w-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin"
                aria-hidden
              />
              {ORG_BILLING_COPY.billingPagePortalCtaLoading}
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
              {ORG_BILLING_COPY.billingPageStripePortalHonestCta}
            </span>
          )}
        </Button>
        <Button type="button" variant="outline" className="rounded-xl font-semibold w-full sm:w-auto" asChild>
          <Link to={ROUTES.CONTACT}>{ORG_BILLING_COPY.billingActiveSubContactCta}</Link>
        </Button>
      </div>
      <p className="text-xs text-muted-foreground border border-border/70 rounded-xl p-4 bg-muted/25 leading-relaxed max-w-2xl">
        {ORG_BILLING_COPY.billingPagePortalHintDashboard}
      </p>
    </section>
  );
}
