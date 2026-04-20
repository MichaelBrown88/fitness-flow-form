import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { doc, getDoc } from 'firebase/firestore';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getDb, getFirebaseFunctions } from '@/services/firebase';
import { formatPrice, getLocaleForRegion } from '@/lib/utils/currency';
import { REGION_TO_CURRENCY, DEFAULT_REGION, DEFAULT_CURRENCY } from '@/constants/pricing';
import type { Region, PackageTrack } from '@/constants/pricing';
import { logger } from '@/lib/utils/logger';
import { ROUTES } from '@/constants/routes';
import { getAppShellSeoForPathname } from '@/constants/seo';
import { Seo } from '@/components/seo/Seo';
import { STRIPE_CONFIG } from '@/constants/platform';
import { subscriptionPlanDisplayHeadline } from '@/lib/pricing/subscriptionPlanDisplay';
import { resolveSubscriptionClientLimit } from '@/lib/pricing/resolveSubscriptionClientLimit';
import { ORG_BILLING_COPY } from '@/constants/orgBilling';
import { useToast } from '@/hooks/use-toast';
import AppShell from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { CancellationSurveyDialog } from '@/components/org/billing/CancellationSurveyDialog';
import { BillingOverviewPanel } from '@/components/org/billing/BillingOverviewPanel';
import { ChangePlanPanel } from '@/components/org/billing/ChangePlanPanel';

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
  customBrandingEnabled?: boolean;
}

function BillingPage() {
  const { user, profile, loading: authLoading, effectiveOrgId } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get('view') === 'change' ? 'change' : 'overview';

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
  const [showCancelSurvey, setShowCancelSurvey] = useState(false);

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

  // ── Early returns: role guard, loading, error states ──

  if (profile && profile.role !== 'org_admin') {
    return (
      <>
        {billingSeo}
        <AppShell
          title="Billing"
          actions={
            <Button type="button" variant="ghost" size="sm" onClick={() => navigate(ROUTES.DASHBOARD)} className="h-9 w-9 sm:h-8 sm:w-8 p-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          }
        >
          <div className="max-w-md mx-auto text-center space-y-3 py-16 px-4">
            <h2 className="text-xl font-bold text-foreground">Billing is admin-only</h2>
            <p className="text-sm text-muted-foreground">Billing is managed by your organisation admin. Ask them to adjust your plan or share an invoice.</p>
            <Button type="button" variant="link" onClick={() => navigate(ROUTES.DASHBOARD)}>Go to dashboard</Button>
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
            <div className="h-10 w-10 rounded-full border-4 border-border border-t-primary animate-spin" aria-hidden />
            <p className="text-sm text-muted-foreground">Loading your plan\u2026</p>
          </div>
        </AppShell>
      </>
    );
  }

  if (loadProblem === 'no_org') {
    return (
      <>
        {billingSeo}
        <AppShell title="Billing & subscription" actions={<Button type="button" variant="ghost" size="sm" onClick={() => navigate(ROUTES.SETTINGS)} className="h-9 w-9 sm:h-8 sm:w-8 p-0"><ArrowLeft className="h-4 w-4" /></Button>}>
          <div className="max-w-md mx-auto text-center space-y-4 py-16 px-4">
            <h2 className="text-xl font-semibold text-foreground">{ORG_BILLING_COPY.billingPageMissingOrgTitle}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{ORG_BILLING_COPY.billingPageMissingOrgBody}</p>
            <Button type="button" className="rounded-lg font-semibold" onClick={() => navigate(ROUTES.ONBOARDING)}>Continue setup</Button>
          </div>
        </AppShell>
      </>
    );
  }

  if (loadProblem === 'missing_doc') {
    return (
      <>
        {billingSeo}
        <AppShell title="Billing & subscription" actions={<Button type="button" variant="ghost" size="sm" onClick={() => navigate(ROUTES.SETTINGS)} className="h-9 w-9 sm:h-8 sm:w-8 p-0"><ArrowLeft className="h-4 w-4" /></Button>}>
          <div className="max-w-md mx-auto text-center space-y-4 py-16 px-4">
            <h2 className="text-xl font-semibold text-foreground">{ORG_BILLING_COPY.billingPageOrgDocMissingTitle}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{ORG_BILLING_COPY.billingPageOrgDocMissingBody}</p>
            <Button type="button" variant="outline" className="rounded-lg" onClick={() => navigate(ROUTES.DASHBOARD)}>Back to dashboard</Button>
          </div>
        </AppShell>
      </>
    );
  }

  if (loadProblem === 'error' || !orgData) {
    return (
      <>
        {billingSeo}
        <AppShell title="Billing & subscription" actions={<Button type="button" variant="ghost" size="sm" onClick={() => navigate(ROUTES.SETTINGS)} className="h-9 w-9 sm:h-8 sm:w-8 p-0"><ArrowLeft className="h-4 w-4" /></Button>}>
          <div className="max-w-md mx-auto text-center space-y-4 py-16 px-4">
            <h2 className="text-xl font-semibold text-foreground">{ORG_BILLING_COPY.billingPageLoadFailedTitle}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{ORG_BILLING_COPY.billingPageLoadFailedBody}</p>
            <Button type="button" className="rounded-lg font-semibold" onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </AppShell>
      </>
    );
  }

  // ── Derived values ──

  const currency = orgData.subscription.currency ?? DEFAULT_CURRENCY;
  const amountCents = orgData.subscription.amountCents ?? orgData.subscription.amountFils ?? 0;
  const monthlyAmount = currency === 'KWD' ? (amountCents as number) / 1000 : (amountCents as number) / 100;
  const region = (orgData.subscription.region as Region) ?? DEFAULT_REGION;
  const locale = getLocaleForRegion(region);
  const hasStripeCustomer = Boolean(orgData.stripeCustomerId?.trim());
  const subscriptionStatus = orgData.subscription.status ?? 'trial';
  const clientCapForDisplay = resolveSubscriptionClientLimit({
    capacityTierId: orgData.subscription.capacityTierId,
    clientCap: typeof orgData.subscription.clientCap === 'number' ? orgData.subscription.clientCap : undefined,
    clientCount: orgData.subscription.clientCount,
    clientSeats: orgData.subscription.clientSeats,
    plan: orgData.subscription.plan,
    subscriptionStatus: orgData.subscription.status,
  });
  const subscriptionPlanRaw = orgData.subscription.plan ?? 'starter';
  const subscriptionPlanHeadline = subscriptionPlanDisplayHeadline({
    plan: subscriptionPlanRaw,
    capacityTierId: orgData.subscription.capacityTierId,
    clientCap: clientCapForDisplay,
    packageTrack: orgData.packageTrack,
  });

  const canShowChangePlan =
    STRIPE_CONFIG.isEnabled &&
    (orgData.orgType === 'gym' || orgData.orgType === 'gym_chain' || orgData.orgType === 'solo_coach');

  return (
    <>
      {billingSeo}
      <AppShell
        title="Billing & subscription"
        subtitle={view === 'change' ? 'Change plan' : orgData.name || undefined}
        actions={
          <Button type="button" variant="ghost" size="sm" onClick={() => navigate(ROUTES.SETTINGS)} className="h-9 w-9 sm:h-8 sm:w-8 p-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        }
      >
        <ErrorBoundary>
          {view === 'change' ? (
            <ChangePlanPanel
              organizationId={resolvedOrgId!}
              region={region}
              subscriptionStatus={subscriptionStatus}
              stripeSubscriptionId={orgData.stripeSubscriptionId}
              currentTrack={orgData.packageTrack}
              currentClientLimit={clientCapForDisplay}
              currentTierId={orgData.subscription.capacityTierId}
              hasStripeCustomer={hasStripeCustomer}
              statsClientCount={orgData.statsClientCount}
              monthlyAmount={monthlyAmount}
              assessmentCredits={orgData.assessmentCredits}
              monthlyAiCredits={orgData.subscription.monthlyAiCredits}
              subscriptionPlanHeadline={subscriptionPlanHeadline}
              offerBrandingAddOn={region === 'GB' && orgData.customBrandingEnabled === false}
              userEmail={user?.email ?? undefined}
              onBack={() => setSearchParams({})}
              onSubscriptionUpdated={() => setBillingRefreshKey((k) => k + 1)}
              onManagePayment={handleManagePayment}
              onCancelSubscription={() => setShowCancelSurvey(true)}
            />
          ) : (
            <BillingOverviewPanel
              orgData={orgData}
              organizationId={resolvedOrgId!}
              subscriptionPlanHeadline={subscriptionPlanHeadline}
              subscriptionStatus={subscriptionStatus}
              monthlyAmount={monthlyAmount}
              currency={currency}
              locale={locale}
              clientCapForDisplay={clientCapForDisplay}
              hasStripeCustomer={hasStripeCustomer}
              region={region}
              profile={profile}
              userEmail={user?.email ?? undefined}
              portalLoading={portalLoading}
              canShowChangePlan={canShowChangePlan}
              onChangePlan={() => setSearchParams({ view: 'change' })}
              onManagePayment={() => void handleManagePayment()}
              onCancelSubscription={() => setShowCancelSurvey(true)}
            />
          )}

          {resolvedOrgId && user?.uid && (
            <CancellationSurveyDialog
              open={showCancelSurvey}
              onOpenChange={setShowCancelSurvey}
              organizationId={resolvedOrgId}
              coachUid={user.uid}
              onProceedToPortal={() => void handleManagePayment()}
            />
          )}
        </ErrorBoundary>
      </AppShell>
    </>
  );
}

export default BillingPage;
