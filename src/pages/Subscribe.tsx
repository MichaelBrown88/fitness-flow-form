import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/constants/routes';
import { FREE_TIER_CLIENT_LIMIT, GYM_TRIAL_CLIENT_CAP } from '@/constants/pricing';
import { SUBSCRIBE_COPY } from '@/constants/subscribeCopy';
import { Timestamp } from 'firebase/firestore';

function trialEndDate(value: unknown): Date | null {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return null;
}

/**
 * Full-page paywall after gym trial (or pending onboarding) expiry — primary path to checkout.
 */
export default function Subscribe() {
  const navigate = useNavigate();
  const { orgSettings, profile, loading } = useAuth();
  const sub = orgSettings?.subscription;
  const orgType = orgSettings?.type;
  const isGymOrg = orgType === 'gym' || orgType === 'gym_chain';
  const trialCapFromSub =
    sub && typeof sub.trialClientCap === 'number' && sub.trialClientCap > 0
      ? sub.trialClientCap
      : null;
  const trialClientCap = trialCapFromSub ?? (isGymOrg ? GYM_TRIAL_CLIENT_CAP : FREE_TIER_CLIENT_LIMIT);
  const subscribeLead = isGymOrg
    ? SUBSCRIBE_COPY.leadGym(trialClientCap)
    : SUBSCRIBE_COPY.leadSolo(trialClientCap);

  useEffect(() => {
    if (loading) return;
    if (!profile?.onboardingCompleted) {
      navigate(ROUTES.ONBOARDING, { replace: true });
      return;
    }
    const planKind = sub?.planKind;
    if (planKind === 'solo_free') {
      navigate(ROUTES.DASHBOARD, { replace: true });
      return;
    }
    if (planKind === 'paid' || sub?.status === 'active') {
      navigate(ROUTES.DASHBOARD, { replace: true });
      return;
    }
    const end = trialEndDate(sub?.trialEndsAt);
    if (end && end.getTime() > Date.now()) {
      navigate(ROUTES.DASHBOARD, { replace: true });
    }
  }, [loading, profile?.onboardingCompleted, sub, navigate]);

  return (
    <AppShell title="Your free trial has ended" hideTitle>
      <div className="mx-auto max-w-lg px-4 py-12 text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">{SUBSCRIBE_COPY.title}</h1>
          <p className="text-sm text-foreground-secondary">{subscribeLead}</p>
        </div>
        <div className="rounded-2xl border border-border bg-background p-6 text-left space-y-3 text-sm text-foreground-secondary">
          <p className="font-semibold text-foreground">{SUBSCRIBE_COPY.bulletsTitle}</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>{SUBSCRIBE_COPY.bulletCapacity}</li>
            <li>{SUBSCRIBE_COPY.bulletAi}</li>
            <li>{SUBSCRIBE_COPY.bulletBranding}</li>
          </ul>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button
            className="rounded-xl h-11 font-bold"
            onClick={() => navigate(ROUTES.BILLING)}
          >
            See plans and pricing
          </Button>
          <Button variant="outline" className="rounded-xl h-11" onClick={() => navigate(ROUTES.CONTACT)}>
            Talk to us
          </Button>
        </div>
        <button
          type="button"
          onClick={() => navigate(ROUTES.DASHBOARD)}
          className="text-xs text-muted-foreground hover:text-foreground-secondary"
        >
          Back to dashboard
        </button>
      </div>
    </AppShell>
  );
}
