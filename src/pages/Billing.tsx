import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { doc, getDoc } from 'firebase/firestore';
import { Users, ArrowLeft, ExternalLink, UserCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getDb, getFirebaseFunctions } from '@/services/firebase';
import { formatPrice, getLocaleForRegion } from '@/lib/utils/currency';
import { REGION_TO_CURRENCY, DEFAULT_REGION, DEFAULT_CURRENCY } from '@/constants/pricing';
import { checkoutClientTargetForStripe } from '@/lib/pricing/orgCheckoutTarget';
import type { Region, PackageTrack } from '@/constants/pricing';
import { logger } from '@/lib/utils/logger';
import { ROUTES } from '@/constants/routes';
import { getAppShellSeoForPathname } from '@/constants/seo';
import { Seo } from '@/components/seo/Seo';
import { STRIPE_CONFIG } from '@/constants/platform';
import { subscriptionPlanDisplayHeadline } from '@/lib/pricing/subscriptionPlanDisplay';
import { resolveSubscriptionClientLimit } from '@/lib/pricing/resolveSubscriptionClientLimit';
import { ORG_BILLING_COPY } from '@/constants/orgBilling';
import { BillingStripeSubscribeCard } from '@/components/org/billing/BillingStripeSubscribeCard';
import { useToast } from '@/hooks/use-toast';
import AppShell from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

interface SubscriptionInfo {
  plan: string;
  status: string;
  clientSeats: number;
  clientCount?: number;
  clientCap?: number;
  monthlyAiCredits?: number;
  capacityTierId?: string;
  region?: Region;
  currency?: string;
  amountCents?: number;
  amountFils?: number;
}

interface OrgBillingData {
  name: string;
  subscription: SubscriptionInfo;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  orgType: string;
  packageTrack: PackageTrack;
  coachCount: number;
  statsClientCount: number;
  assessmentCredits?: number;
  /** Firestore `customBrandingEnabled` — only `false` means “not purchased” for add-on upsell. */
  customBrandingEnabled?: boolean;
}

function PlanBadge({ status }: { status: string }) {
  const label = status.replace(/_/g, ' ');
  const colorMap: Record<string, string> = {
    active:
      'border-score-green-muted bg-score-green-light text-score-green-bold dark:bg-score-green-muted/20 dark:text-score-green-fg',
    trial: 'border-primary/35 bg-primary/10 text-primary',
    past_due:
      'border-score-amber-muted bg-score-amber-light text-score-amber-bold dark:bg-score-amber-muted/20 dark:text-score-amber-fg',
    cancelled:
      'border-score-red-muted bg-score-red-light text-score-red-bold dark:bg-score-red-muted/20 dark:text-score-red-fg',
  };
  const classes = colorMap[status] ?? 'bg-muted/50 text-foreground-secondary border-border';
  return (
    <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${classes}`}>
      {label}
    </span>
  );
}

function BillingPage() {
  const { user, profile, loading: authLoading, effectiveOrgId } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const billingSeoPath = location.pathname.split('?')[0];
  const billingSeoMeta = getAppShellSeoForPathname(location.pathname);
  const billingSeo = (
    <Seo
      pathname={billingSeoPath}
      title={billingSeoMeta.title}
      description={billingSeoMeta.description}
      noindex={billingSeoMeta.noindex}
    />
  );
  const { toast } = useToast();
  const [orgData, setOrgData] = useState<OrgBillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [billingRefreshKey, setBillingRefreshKey] = useState(0);
  const [loadProblem, setLoadProblem] = useState<null | 'no_org' | 'missing_doc' | 'error'>(null);

  const resolvedOrgId = effectiveOrgId ?? profile?.organizationId ?? null;

  useEffect(() => {
    if (authLoading) return;

    if (!user?.uid || !resolvedOrgId) {
      setOrgData(null);
      setLoadProblem('no_org');
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoadProblem(null);
    setLoading(true);

    const db = getDb();
    getDoc(doc(db, 'organizations', resolvedOrgId))
      .then((snap) => {
        if (cancelled) return;
        if (!snap.exists()) {
          setOrgData(null);
          setLoadProblem('missing_doc');
          return;
        }
        const data = snap.data();
        const sub = data.subscription ?? {};
        const fromRoot = typeof data.type === 'string' && data.type.trim() ? data.type.trim() : null;
        const subType = typeof sub.type === 'string' ? sub.type : undefined;
        const packageTrackExplicit =
          sub.packageTrack === 'gym' || sub.packageTrack === 'solo' ? sub.packageTrack : undefined;

        const orgType =
          fromRoot ??
          (subType === 'gym_chain'
            ? 'gym_chain'
            : subType === 'gym'
              ? 'gym'
              : subType === 'solo_coach'
                ? 'solo_coach'
                : 'solo_coach');

        const packageTrack: PackageTrack =
          packageTrackExplicit ??
          (subType === 'gym' || subType === 'gym_chain'
            ? 'gym'
            : subType === 'solo' || subType === 'solo_coach'
              ? 'solo'
              : orgType === 'gym' || orgType === 'gym_chain'
                ? 'gym'
                : 'solo');

        const region = (sub.region as Region) ?? DEFAULT_REGION;
        const currency = sub.currency ?? REGION_TO_CURRENCY[region];
        const amountCents = sub.amountCents ?? sub.amountFils;
        const clientCap = resolveSubscriptionClientLimit({
          capacityTierId: typeof sub.capacityTierId === 'string' ? sub.capacityTierId : undefined,
          clientCap: typeof sub.clientCap === 'number' ? sub.clientCap : undefined,
          clientCount: typeof sub.clientCount === 'number' ? sub.clientCount : undefined,
          clientSeats: typeof sub.clientSeats === 'number' ? sub.clientSeats : undefined,
          plan: typeof sub.plan === 'string' ? sub.plan : undefined,
          subscriptionStatus: typeof sub.status === 'string' ? sub.status : undefined,
        });
        const stripeRaw = data.stripe;
        const stripeObj =
          stripeRaw && typeof stripeRaw === 'object'
            ? (stripeRaw as Record<string, unknown>)
            : undefined;
        const stripeCustomerId =
          typeof stripeObj?.stripeCustomerId === 'string' ? stripeObj.stripeCustomerId : undefined;
        const stripeSubscriptionId =
          typeof stripeObj?.stripeSubscriptionId === 'string' ? stripeObj.stripeSubscriptionId : undefined;
        const brandingRaw = data.customBrandingEnabled;
        const customBrandingEnabled =
          brandingRaw === true ? true : brandingRaw === false ? false : undefined;

        setOrgData({
          name: data.name ?? '',
          subscription: {
            plan: sub.plan ?? 'starter',
            status: sub.status ?? 'trial',
            clientSeats: sub.clientSeats ?? sub.clientCount ?? 0,
            clientCount: sub.clientCount ?? sub.clientSeats ?? 0,
            clientCap,
            monthlyAiCredits: typeof sub.monthlyAiCredits === 'number' ? sub.monthlyAiCredits : undefined,
            capacityTierId: typeof sub.capacityTierId === 'string' ? sub.capacityTierId : undefined,
            region,
            currency,
            amountCents: amountCents ?? 0,
            amountFils: sub.amountFils ?? 0,
          },
          stripeCustomerId,
          stripeSubscriptionId,
          orgType,
          packageTrack,
          coachCount: data._counts?.coaches ?? 1,
          statsClientCount: typeof data.stats?.clientCount === 'number' ? data.stats.clientCount : 0,
          assessmentCredits: typeof data.assessmentCredits === 'number' ? data.assessmentCredits : undefined,
          customBrandingEnabled,
        });
        setLoadProblem(null);
      })
      .catch((err) => {
        if (cancelled) return;
        logger.error('Failed to load billing data:', err);
        setOrgData(null);
        setLoadProblem('error');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.uid, resolvedOrgId, billingRefreshKey]);

  const handleManagePayment = async () => {
    const orgId = effectiveOrgId ?? profile?.organizationId;
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

  if (profile && profile.role !== 'org_admin') {
    return (
      <>
        {billingSeo}
      <AppShell
        title="Billing"
        actions={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => navigate(ROUTES.DASHBOARD)}
            className="h-9 w-9 sm:h-8 sm:w-8 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        }
      >
        <div className="max-w-md mx-auto text-center space-y-3 py-16 px-4">
          <h2 className="text-xl font-bold text-foreground">Billing is admin-only</h2>
          <p className="text-sm text-muted-foreground">Billing is managed by your organisation admin. Ask them to adjust your plan or share an invoice.</p>
          <Button type="button" variant="link" onClick={() => navigate(ROUTES.DASHBOARD)}>
            Go to dashboard
          </Button>
        </div>
      </AppShell>
      </>
    );
  }

  if (authLoading || loading) {
    return (
      <>
        {billingSeo}
      <AppShell title="Billing & subscription" hideTitle>
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
          <div
            className="h-10 w-10 rounded-full border-4 border-border border-t-primary animate-spin"
            aria-hidden
          />
          <p className="text-sm text-muted-foreground">Loading your plan…</p>
        </div>
      </AppShell>
      </>
    );
  }

  if (loadProblem === 'no_org') {
    return (
      <>
        {billingSeo}
      <AppShell
        title="Billing & subscription"
        actions={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => navigate(ROUTES.SETTINGS)}
            className="h-9 w-9 sm:h-8 sm:w-8 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        }
      >
        <div className="max-w-md mx-auto text-center space-y-4 py-16 px-4">
          <h2 className="text-xl font-semibold text-foreground">{ORG_BILLING_COPY.billingPageMissingOrgTitle}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{ORG_BILLING_COPY.billingPageMissingOrgBody}</p>
          <Button type="button" className="rounded-lg font-semibold" onClick={() => navigate(ROUTES.ONBOARDING)}>
            Continue setup
          </Button>
        </div>
      </AppShell>
      </>
    );
  }

  if (loadProblem === 'missing_doc') {
    return (
      <>
        {billingSeo}
      <AppShell
        title="Billing & subscription"
        actions={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => navigate(ROUTES.SETTINGS)}
            className="h-9 w-9 sm:h-8 sm:w-8 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        }
      >
        <div className="max-w-md mx-auto text-center space-y-4 py-16 px-4">
          <h2 className="text-xl font-semibold text-foreground">{ORG_BILLING_COPY.billingPageOrgDocMissingTitle}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{ORG_BILLING_COPY.billingPageOrgDocMissingBody}</p>
          <Button type="button" variant="outline" className="rounded-lg" onClick={() => navigate(ROUTES.DASHBOARD)}>
            Back to dashboard
          </Button>
        </div>
      </AppShell>
      </>
    );
  }

  if (loadProblem === 'error' || !orgData) {
    return (
      <>
        {billingSeo}
      <AppShell
        title="Billing & subscription"
        actions={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => navigate(ROUTES.SETTINGS)}
            className="h-9 w-9 sm:h-8 sm:w-8 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        }
      >
        <div className="max-w-md mx-auto text-center space-y-4 py-16 px-4">
          <h2 className="text-xl font-semibold text-foreground">{ORG_BILLING_COPY.billingPageLoadFailedTitle}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{ORG_BILLING_COPY.billingPageLoadFailedBody}</p>
          <Button type="button" className="rounded-lg font-semibold" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </AppShell>
      </>
    );
  }

  const currency = orgData.subscription.currency ?? DEFAULT_CURRENCY;
  const amountCents = orgData.subscription.amountCents ?? orgData.subscription.amountFils ?? 0;
  const monthlyAmount =
    currency === 'KWD' ? (amountCents as number) / 1000 : (amountCents as number) / 100;
  const region = (orgData.subscription.region as Region) ?? DEFAULT_REGION;
  const locale = getLocaleForRegion(region);
  const hasStripeCustomer = Boolean(orgData.stripeCustomerId?.trim());
  const subscriptionStatus = orgData.subscription.status ?? 'trial';
  const clientCapForDisplay = resolveSubscriptionClientLimit({
    capacityTierId: orgData.subscription.capacityTierId,
    clientCap:
      typeof orgData.subscription.clientCap === 'number' ? orgData.subscription.clientCap : undefined,
    clientCount: orgData.subscription.clientCount,
    clientSeats: orgData.subscription.clientSeats,
    plan: orgData.subscription.plan,
    subscriptionStatus: orgData.subscription.status,
  });
  /** In-app plan change only when Stripe subscription exists; otherwise show Checkout (e.g. active + customer but missing sub id). */
  const checkoutLocked =
    subscriptionStatus === 'active' && Boolean(orgData.stripeSubscriptionId?.trim());
  const subscriptionPlanRaw = orgData.subscription.plan ?? 'starter';
  const subscriptionPlanHeadline = subscriptionPlanDisplayHeadline({
    plan: subscriptionPlanRaw,
    capacityTierId: orgData.subscription.capacityTierId,
    clientCap: clientCapForDisplay,
    packageTrack: orgData.packageTrack,
  });

  const planSubtitle =
    monthlyAmount > 0
      ? `${formatPrice(monthlyAmount, currency, locale)}/month`
      : subscriptionStatus === 'trial'
        ? ORG_BILLING_COPY.billingPagePlanTrialNoPrice
        : subscriptionStatus === 'active' && hasStripeCustomer
          ? ORG_BILLING_COPY.billingPagePlanActiveWithPortal
          : subscriptionStatus === 'active'
            ? ORG_BILLING_COPY.billingPagePlanActiveNoStripe
            : ORG_BILLING_COPY.billingPagePlanOtherNoPrice;

  const canShowCapacityCatalog =
    STRIPE_CONFIG.isEnabled &&
    (orgData.orgType === 'gym' ||
      orgData.orgType === 'gym_chain' ||
      orgData.orgType === 'solo_coach');

  const showChoosePackageLink = Boolean(canShowCapacityCatalog);

  return (
    <>
      {billingSeo}
    <AppShell
      title="Billing & subscription"
      subtitle={orgData.name || undefined}
      actions={
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => navigate(ROUTES.SETTINGS)}
          className="h-9 w-9 sm:h-8 sm:w-8 p-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
      }
    >
      <ErrorBoundary>
      <div className="mx-auto max-w-5xl space-y-10 sm:space-y-12 pb-20 sm:pb-28 px-1 sm:px-0">
        <section aria-labelledby="billing-plan-heading">
          <Card className="overflow-hidden rounded-lg border border-border/70 bg-background shadow-none">
            <div className="border-b border-border/60 bg-gradient-to-br from-primary/[0.08] via-primary/[0.02] to-transparent px-6 py-7 sm:px-8 sm:py-8">
              <p
                id="billing-plan-heading"
                className="text-xs font-semibold uppercase tracking-wider text-primary mb-3"
              >
                {ORG_BILLING_COPY.billingPageYourPlanEyebrow}
              </p>
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                      {subscriptionPlanHeadline}
                    </span>
                    <PlanBadge status={subscriptionStatus} />
                  </div>
                  {monthlyAmount > 0 ? (
                    <p className="text-3xl sm:text-4xl font-bold text-foreground tabular-nums tracking-tight">
                      {formatPrice(monthlyAmount, currency, locale)}
                      <span className="text-base sm:text-lg font-medium text-muted-foreground"> / month</span>
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground max-w-md leading-relaxed">{planSubtitle}</p>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row lg:flex-col gap-2 w-full lg:w-52 shrink-0">
                  {hasStripeCustomer ? (
                    <Button
                      type="button"
                      className="rounded-lg font-semibold w-full"
                      onClick={() => void handleManagePayment()}
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
                          {checkoutLocked
                            ? ORG_BILLING_COPY.billingPageStripePortalHonestCta
                            : ORG_BILLING_COPY.billingSubscriptionManagePlan}
                        </span>
                      )}
                    </Button>
                  ) : null}
                  {showChoosePackageLink ? (
                    <Button type="button" variant="outline" className="rounded-lg w-full" asChild>
                      <a href="#billing-checkout-prep">{ORG_BILLING_COPY.billingSubscriptionScrollToPackages}</a>
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
            <CardContent className="p-6 sm:p-8 space-y-8">
              {monthlyAmount > 0 ? (
                <p className="text-xs text-muted-foreground -mt-2 sm:-mt-3">
                  Billed monthly (before tax, if applicable)
                </p>
              ) : null}

              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Users className="h-5 w-5 text-foreground-secondary" aria-hidden />
                </div>
                <div className="min-w-0 flex-1 space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Client slots used</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Active clients counted against your plan limit
                    </p>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{
                        width: `${Math.min(
                          (orgData.statsClientCount / Math.max(clientCapForDisplay, 1)) * 100,
                          100,
                        )}%`,
                      }}
                    />
                  </div>
                  <p className="text-sm font-medium tabular-nums text-foreground">
                    {orgData.statsClientCount} of {clientCapForDisplay} client slots used
                  </p>
                </div>
              </div>

              {orgData.subscription.monthlyAiCredits != null ? (
                <div className="rounded-lg border border-border/70 bg-muted/25 px-4 py-4 space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">AI scan credits</p>
                  <p className="text-sm font-semibold text-foreground">
                    {orgData.assessmentCredits ?? '—'} of {orgData.subscription.monthlyAiCredits} credits remaining this month
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Each posture analysis or body composition scan uses one credit. Credits reset on your monthly renewal date.
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </section>

        {resolvedOrgId ? (
          <BillingStripeSubscribeCard
            organizationId={resolvedOrgId}
            region={region}
            hasStripeCustomer={hasStripeCustomer}
            statsClientCount={orgData.statsClientCount}
            clientTarget={checkoutClientTargetForStripe({
              orgType: orgData.orgType,
              packageTrack: orgData.packageTrack,
              subscriptionClientCap: clientCapForDisplay,
              statsClientCount: orgData.statsClientCount,
            })}
            subscriptionStatus={subscriptionStatus}
            stripeSubscriptionId={orgData.stripeSubscriptionId}
            orgType={orgData.orgType}
            packageTrack={orgData.packageTrack}
            currentSubscriptionClientLimit={clientCapForDisplay}
            offerBrandingAddOn={region === 'GB' && orgData.customBrandingEnabled === false}
            onSubscriptionUpdated={() => setBillingRefreshKey((k) => k + 1)}
          />
        ) : null}

        <section
          className="rounded-lg border border-dashed border-border/70 bg-muted/15 px-6 py-7 sm:px-8 sm:py-8"
          aria-labelledby="billing-contact-heading"
        >
          <h2
            id="billing-contact-heading"
            className="text-sm font-semibold text-foreground tracking-tight"
          >
            {ORG_BILLING_COPY.billingPageAccountStripTitle}
          </h2>
          <p className="text-xs text-muted-foreground mt-2 max-w-lg leading-relaxed">
            {ORG_BILLING_COPY.billingPageAccountStripLead}
          </p>
          <div className="mt-5 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
              <UserCircle className="h-5 w-5 text-muted-foreground" aria-hidden />
            </div>
            <div className="min-w-0 space-y-1">
              <p className="text-base font-semibold text-foreground">
                {profile?.displayName?.trim() || 'Organisation admin'}
              </p>
              <p className="text-sm text-muted-foreground break-all">{user?.email ?? '—'}</p>
            </div>
          </div>
        </section>
      </div>
      </ErrorBoundary>
    </AppShell>
    </>
  );
}

export default BillingPage;
