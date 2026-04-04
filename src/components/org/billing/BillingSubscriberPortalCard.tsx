import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ORG_BILLING_COPY } from '@/constants/orgBilling';

interface BillingSubscriberPortalCardProps {
  subscriptionStatus: string;
  portalLoading: boolean;
  onOpenPortal: () => void;
}

export function BillingSubscriberPortalCard({
  subscriptionStatus,
  portalLoading,
  onOpenPortal,
}: BillingSubscriberPortalCardProps) {
  const isPastDue = subscriptionStatus === 'past_due';

  return (
    <Card className="border-primary/20 shadow-sm">
      <CardHeader className="p-4 sm:p-6 pb-2">
        <CardTitle className="text-lg sm:text-xl">{ORG_BILLING_COPY.billingPagePortalTitle}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
        {isPastDue ? (
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400 rounded-lg border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/80 dark:bg-amber-950/30 px-3 py-2">
            {ORG_BILLING_COPY.billingPagePastDuePortalHint}
          </p>
        ) : null}
        <p className="text-sm text-muted-foreground leading-relaxed">{ORG_BILLING_COPY.billingPagePortalLead}</p>
        <ul className="text-sm text-foreground list-disc pl-5 space-y-1.5 marker:text-muted-foreground">
          <li>{ORG_BILLING_COPY.billingPagePortalBulletPayment}</li>
          <li>{ORG_BILLING_COPY.billingPagePortalBulletInvoices}</li>
          <li>{ORG_BILLING_COPY.billingPagePortalBulletPlan}</li>
          <li>{ORG_BILLING_COPY.billingPagePortalBulletCapacity}</li>
        </ul>
        {subscriptionStatus === 'trial' ? (
          <p className="text-xs text-muted-foreground">{ORG_BILLING_COPY.billingPageTrialWithCustomerHint}</p>
        ) : null}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
          <Button
            type="button"
            size="lg"
            className="rounded-xl font-semibold w-full sm:w-auto"
            onClick={() => void onOpenPortal()}
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
                {ORG_BILLING_COPY.billingPagePortalCta}
              </span>
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{ORG_BILLING_COPY.billingPagePortalFootnote}</p>
      </CardContent>
    </Card>
  );
}
