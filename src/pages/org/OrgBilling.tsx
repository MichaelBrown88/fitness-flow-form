/**
 * Org billing UI. Treat `organizations/{id}.subscription` as authoritative after Stripe webhook sync;
 * callables re-verify with Stripe where payment actions run server-side.
 */
import { useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { CreditCard, ExternalLink } from 'lucide-react';
import type { OrgAdminOutletContext } from './OrgAdminLayout';
import { PlanStatusCard } from '@/components/org/billing/PlanStatusCard';
import { ClientCapacityUtilisationBar } from '@/components/org/billing/ClientCapacityUtilisationBar';
import { UpgradeCTA } from '@/components/org/billing/UpgradeCTA';
import { BillingStripeSubscribeCard } from '@/components/org/billing/BillingStripeSubscribeCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DEFAULT_REGION, FREE_TIER_CLIENT_LIMIT, type Region } from '@/constants/pricing';
import { STRIPE_CONFIG } from '@/constants/platform';
import { ORG_BILLING_COPY } from '@/constants/orgBilling';
import { ROUTES } from '@/constants/routes';
import { checkoutClientTargetForStripe } from '@/lib/pricing/orgCheckoutTarget';
import { resolveSubscriptionClientLimit } from '@/lib/pricing/resolveSubscriptionClientLimit';
import { getFirebaseFunctions } from '@/services/firebase';
import { getOrganizationDetails } from '@/services/platformAdmin';
import { logger } from '@/lib/utils/logger';
import { useToast } from '@/hooks/use-toast';

function packageTrackFromOrgType(type: string | undefined): 'gym' | 'solo' | undefined {
  if (type === 'gym' || type === 'gym_chain') return 'gym';
  if (type === 'solo_coach') return 'solo';
  return undefined;
}

export default function OrgBilling() {
  const { orgDetails, coaches, setOrgDetails } = useOutletContext<OrgAdminOutletContext>();
  const { toast } = useToast();
  const [portalLoading, setPortalLoading] = useState(false);

  const plan = orgDetails?.plan || 'none';
  const status = orgDetails?.status || 'none';
  const coachCount = coaches.length;
  const statsClientCount = orgDetails?.clientCount ?? 0;
  const clientLimitDisplay = orgDetails
    ? Math.max(
        1,
        resolveSubscriptionClientLimit({
          capacityTierId: orgDetails.capacityTierId,
          clientCount:
            typeof orgDetails.seatBlock === 'number' && orgDetails.seatBlock > 0
              ? orgDetails.seatBlock
              : undefined,
          clientSeats:
            typeof orgDetails.clientSeats === 'number' && orgDetails.clientSeats > 0
              ? orgDetails.clientSeats
              : undefined,
          plan: orgDetails.plan,
          subscriptionStatus: orgDetails.status,
        }),
      )
    : FREE_TIER_CLIENT_LIMIT;
  const clientCapacityRatio = statsClientCount / clientLimitDisplay;
  const orgId = orgDetails?.id;
  const region = (orgDetails?.region as Region | undefined) ?? DEFAULT_REGION;
  const orgType = orgDetails?.type;
  const packageTrack = packageTrackFromOrgType(orgType);
  const planPackageTrack =
    orgDetails?.packageTrack === 'gym' || orgDetails?.packageTrack === 'solo'
      ? orgDetails.packageTrack
      : packageTrack;
  const clientCap = clientLimitDisplay;
  const hasStripeCustomer = Boolean(orgDetails?.stripeCustomerId?.trim());

  const handleManagePayment = async () => {
    if (!orgId) return;
    setPortalLoading(true);
    try {
      const functions = getFirebaseFunctions();
      const createPortalSession = httpsCallable<
        { organizationId: string },
        { url: string; hasStripeSubscriptions?: boolean }
      >(functions, 'createCustomerPortalSession');
      const result = await createPortalSession({ organizationId: orgId });
      const { url, hasStripeSubscriptions } = result.data;
      if (hasStripeSubscriptions === false) {
        toast({
          title: ORG_BILLING_COPY.billingPagePortalNoSubscriptionToastTitle,
          description: ORG_BILLING_COPY.billingPagePortalNoSubscriptionToastBody,
        });
      }
      window.location.href = url;
    } catch (err) {
      logger.error('Failed to open billing portal:', err);
      const message = err instanceof Error ? err.message : 'Could not open the billing portal.';
      toast({
        title: 'Could not open Stripe',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-12 sm:pb-20 space-y-4 px-1 sm:px-0">
      <Card className="border-border/80">
        <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-semibold text-foreground">{ORG_BILLING_COPY.orgBillingLinkFullPage}</p>
            <p className="text-xs text-muted-foreground">{ORG_BILLING_COPY.orgBillingLinkFullPageHint}</p>
          </div>
          <Button type="button" variant="outline" size="sm" className="shrink-0" asChild>
            <Link to={ROUTES.BILLING}>{ORG_BILLING_COPY.orgBillingLinkFullPageCta}</Link>
          </Button>
        </CardContent>
      </Card>

      <PlanStatusCard
        plan={plan}
        status={status}
        currency={orgDetails?.currency}
        monthlyAmountLocal={orgDetails?.monthlyAmountLocal}
        trialEndsAt={orgDetails?.trialEndsAt}
        capacityTierId={orgDetails?.capacityTierId}
        seatBlock={clientLimitDisplay}
        packageTrack={planPackageTrack}
      />

      {!STRIPE_CONFIG.isEnabled ? (
        <Card>
          <CardHeader className="p-4 sm:p-6 pb-2">
            <CardTitle className="text-base">{ORG_BILLING_COPY.stripeDisabledTitle}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <p className="text-sm text-muted-foreground">{ORG_BILLING_COPY.stripeDisabledBody}</p>
          </CardContent>
        </Card>
      ) : null}

      {orgDetails?.stripeCustomerId ? (
        <Card>
          <CardHeader className="p-4 sm:p-6 pb-2">
            <CardTitle className="text-base">{ORG_BILLING_COPY.portalCardTitle}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 space-y-3">
            <p className="text-sm text-muted-foreground">{ORG_BILLING_COPY.portalCardLead}</p>
            <Button type="button" onClick={() => void handleManagePayment()} disabled={portalLoading}>
              {portalLoading ? (
                <span className="text-sm">{ORG_BILLING_COPY.portalCtaOpening}</span>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4 mr-2" aria-hidden />
                  {ORG_BILLING_COPY.portalCtaOpen}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : STRIPE_CONFIG.isEnabled && orgId ? (
        <Card>
          <CardContent className="p-4 sm:p-6 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <CreditCard className="w-[18px] h-[18px] text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">{ORG_BILLING_COPY.noCustomerLead}</p>
          </CardContent>
        </Card>
      ) : null}

      {STRIPE_CONFIG.isEnabled && orgId ? (
        <BillingStripeSubscribeCard
          organizationId={orgId}
          region={region}
          hasStripeCustomer={hasStripeCustomer}
          statsClientCount={statsClientCount}
          clientTarget={checkoutClientTargetForStripe({
            orgType,
            packageTrack,
            subscriptionClientCap: clientCap,
            statsClientCount,
          })}
          subscriptionStatus={status}
          stripeSubscriptionId={orgDetails?.stripeSubscriptionId}
          orgType={orgType}
          packageTrack={packageTrack}
          currentSubscriptionClientLimit={clientLimitDisplay}
          offerBrandingAddOn={region === 'GB' && orgDetails?.customBrandingEnabled === false}
          onSubscriptionUpdated={() => {
            if (!orgId) return;
            void getOrganizationDetails(orgId)
              .then(setOrgDetails)
              .catch((e) => logger.error('Failed to refresh org after plan update', e));
          }}
        />
      ) : null}

      <ClientCapacityUtilisationBar
        activeClients={statsClientCount}
        clientLimit={clientLimitDisplay}
        coachCount={coachCount}
      />
      <UpgradeCTA plan={plan} status={status} clientCapacityRatio={clientCapacityRatio} />
    </div>
  );
}
