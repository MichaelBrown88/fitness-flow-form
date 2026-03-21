import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/constants/routes';
import { GYM_TRIAL_CLIENT_CAP } from '@/constants/pricing';
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
    <AppShell title="Choose your plan" hideTitle>
      <div className="mx-auto max-w-lg px-4 py-12 text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">Your trial has ended</h1>
          <p className="text-sm text-slate-600">
            Continue with a paid plan to keep your team on One Assess. During trial you could have up to{' '}
            {GYM_TRIAL_CLIENT_CAP} active clients; choose a capacity tier that fits your gym.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-left space-y-3 text-sm text-slate-600">
          <p className="font-semibold text-slate-900">What you get</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Capacity-based monthly billing (UK GBP)</li>
            <li>AI assessment credits included per tier</li>
            <li>Optional custom branding add-on at checkout</li>
          </ul>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button
            className="rounded-xl h-11 font-bold"
            onClick={() => navigate(ROUTES.BILLING)}
          >
            Continue to billing
          </Button>
          <Button variant="outline" className="rounded-xl h-11" onClick={() => navigate(ROUTES.CONTACT)}>
            Talk to sales
          </Button>
        </div>
        <button
          type="button"
          onClick={() => navigate(ROUTES.DASHBOARD)}
          className="text-xs text-slate-400 hover:text-slate-600"
        >
          Back to dashboard
        </button>
      </div>
    </AppShell>
  );
}
