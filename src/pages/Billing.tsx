import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { doc, getDoc } from 'firebase/firestore';
import { CreditCard, Users, ArrowLeft, ExternalLink } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getDb } from '@/services/firebase';
import { formatPrice, getLocaleForRegion } from '@/lib/utils/currency';
import {
  REGION_TO_CURRENCY,
  DEFAULT_REGION,
  DEFAULT_CURRENCY,
  FREE_TIER_CLIENT_LIMIT,
} from '@/constants/pricing';
import type { Region } from '@/constants/pricing';
import { logger } from '@/lib/utils/logger';
import { ROUTES } from '@/constants/routes';
import { BillingStripeSubscribeCard } from '@/components/org/billing/BillingStripeSubscribeCard';

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
  orgType?: string;
  packageTrack?: string;
  coachCount: number;
  statsClientCount: number;
  assessmentCredits?: number;
}

/** Minimum desired clients for capacity tier when starting solo checkout (e.g. third client on free tier). */
function checkoutClientTargetForStripe(org: OrgBillingData): number {
  const cap = org.subscription.clientCap ?? FREE_TIER_CLIENT_LIMIT;
  const stats = org.statsClientCount;
  const isSolo = org.orgType === 'solo_coach' || org.packageTrack === 'solo';
  if (isSolo) {
    return Math.min(300, Math.max(cap, stats + 1, FREE_TIER_CLIENT_LIMIT + 1));
  }
  return Math.max(1, cap);
}

function PlanBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    trial: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    past_due: 'bg-amber-50 text-amber-700 border-amber-200',
    cancelled: 'bg-red-50 text-red-700 border-red-200',
  };
  const classes = colorMap[status] ?? 'bg-muted/50 text-foreground-secondary border-border';
  return (
    <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${classes}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function BillingPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [orgData, setOrgData] = useState<OrgBillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    if (!user || !profile?.organizationId) return;

    const db = getDb();
    getDoc(doc(db, 'organizations', profile.organizationId)).then((snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      const sub = data.subscription ?? {};
      const rootOrgType = typeof data.type === 'string' ? data.type : undefined;
      const subType = typeof sub.type === 'string' ? sub.type : undefined;
      const packageTrackExplicit = typeof sub.packageTrack === 'string' ? sub.packageTrack : undefined;
      /** Many org docs set gym/solo only on subscription.type; subscribe UI reads organizations.type or subscription.packageTrack. */
      const packageTrack =
        packageTrackExplicit ??
        (subType === 'gym' ? 'gym' : subType === 'solo' ? 'solo' : undefined);
      const orgType =
        rootOrgType ??
        (subType === 'gym_chain' ? 'gym_chain' : subType === 'solo_coach' ? 'solo_coach' : undefined);
      const region = (sub.region as Region) ?? DEFAULT_REGION;
      const currency = sub.currency ?? REGION_TO_CURRENCY[region];
      const amountCents = sub.amountCents ?? sub.amountFils;
      const clientCap = sub.clientCap ?? sub.clientSeats ?? sub.clientCount ?? 2;
      const stripeRaw = data.stripe;
      // organizations.stripe is an untyped map from Firestore; narrow fields without trusting shape.
      const stripeObj =
        stripeRaw && typeof stripeRaw === 'object'
          ? (stripeRaw as Record<string, unknown>)
          : undefined;
      const stripeCustomerId =
        typeof stripeObj?.stripeCustomerId === 'string' ? stripeObj.stripeCustomerId : undefined;
      const stripeSubscriptionId =
        typeof stripeObj?.stripeSubscriptionId === 'string' ? stripeObj.stripeSubscriptionId : undefined;
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
      });
    }).catch((err) => {
      logger.error('Failed to load billing data:', err);
    }).finally(() => {
      setLoading(false);
    });
  }, [user, profile?.organizationId]);

  const handleManagePayment = async () => {
    if (!profile?.organizationId) return;
    setPortalLoading(true);
    try {
      const functions = getFunctions();
      const createPortalSession = httpsCallable<
        { organizationId: string },
        { url: string }
      >(functions, 'createCustomerPortalSession');
      const result = await createPortalSession({ organizationId: profile.organizationId });
      window.location.href = result.data.url;
    } catch (err) {
      logger.error('Failed to open billing portal:', err);
    } finally {
      setPortalLoading(false);
    }
  };

  if (profile && profile.role !== 'org_admin') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
        <div className="text-center space-y-3">
          <h2 className="text-xl font-bold text-foreground">Access Restricted</h2>
          <p className="text-sm text-muted-foreground">Only organization admins can view billing.</p>
          <button
            onClick={() => navigate(ROUTES.DASHBOARD)}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/50">
        <div className="h-10 w-10 rounded-full border-4 border-border border-t-foreground animate-spin" />
      </div>
    );
  }

  const currency = orgData?.subscription.currency ?? DEFAULT_CURRENCY;
  const amountCents = orgData?.subscription.amountCents ?? orgData?.subscription.amountFils ?? 0;
  const monthlyAmount = currency === 'KWD' ? (amountCents as number) / 1000 : (amountCents as number) / 100;
  const region = (orgData?.subscription.region as Region) ?? DEFAULT_REGION;
  const locale = getLocaleForRegion(region);

  return (
    <div className="min-h-screen bg-muted/50">
      <div className="max-w-3xl mx-auto px-4 py-10 sm:py-16">
        <button
          onClick={() => navigate(ROUTES.SETTINGS)}
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground-secondary transition-colors mb-8"
        >
          <ArrowLeft size={16} />
          Settings
        </button>

        <h1 className="text-2xl font-bold text-foreground mb-8">Billing & Subscription</h1>

        <div className="space-y-6">
          {profile?.organizationId && orgData ? (
            <BillingStripeSubscribeCard
              organizationId={profile.organizationId}
              region={region}
              clientTarget={checkoutClientTargetForStripe(orgData)}
              subscriptionStatus={orgData.subscription.status}
              stripeSubscriptionId={orgData.stripeSubscriptionId}
              orgType={orgData.orgType}
              packageTrack={orgData.packageTrack}
            />
          ) : null}
          <div className="bg-background rounded-xl border border-border p-6">
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Current Plan</h2>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xl font-bold text-foreground capitalize">{orgData?.subscription.plan}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {monthlyAmount > 0 ? `${formatPrice(monthlyAmount, currency, locale)}/month` : 'Free trial'}
                </p>
              </div>
              <PlanBadge status={orgData?.subscription.status ?? 'trial'} />
            </div>
          </div>

          <div className="bg-background rounded-xl border border-border p-6">
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Client capacity</h2>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <Users size={18} className="text-foreground-secondary" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">
                  {orgData?.statsClientCount ?? 0} /{' '}
                  {orgData?.subscription.clientCap ??
                    orgData?.subscription.clientCount ??
                    orgData?.subscription.clientSeats ??
                    2}{' '}
                  clients
                </p>
                <p className="text-xs text-muted-foreground">Active (non-archived) clients vs plan limit</p>
              </div>
            </div>
            <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all"
                style={{
                  width: `${Math.min(
                    ((orgData?.statsClientCount ?? 0) /
                      Math.max(
                        orgData?.subscription.clientCap ??
                          orgData?.subscription.clientCount ??
                          orgData?.subscription.clientSeats ??
                          1,
                        1,
                      )) *
                      100,
                    100,
                  )}%`,
                }}
              />
            </div>
            {orgData?.subscription.monthlyAiCredits != null && (
              <div className="mt-6 pt-6 border-t border-border">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">AI credits</p>
                <p className="text-sm font-bold text-foreground">
                  {orgData.assessmentCredits ?? '—'} / {orgData.subscription.monthlyAiCredits} remaining this cycle
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Each AI body-comp import or posture analysis uses one credit. Resets on subscription renewal.
                </p>
              </div>
            )}
          </div>

          <div className="bg-background rounded-xl border border-border p-6">
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Payment</h2>
            {orgData?.stripeCustomerId ? (
              <button
                onClick={handleManagePayment}
                disabled={portalLoading}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-foreground text-white font-bold text-sm hover:bg-foreground/90 transition-colors disabled:opacity-50"
              >
                {portalLoading ? (
                  <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : (
                  <ExternalLink size={16} />
                )}
                Manage Payment
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <CreditCard size={18} className="text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No payment method on file. Subscribe to add one.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default BillingPage;
