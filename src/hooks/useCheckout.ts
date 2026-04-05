/**
 * useCheckout — client-side hook for Stripe Checkout integration
 *
 * Hosted Checkout only needs the session URL from the Cloud Function; we redirect
 * with `window.location.assign` (no Stripe.js). That avoids CSP `script-src` needing
 * `js.stripe.com` and matches the landing guest checkout path.
 *
 * If VITE_STRIPE_PUBLISHABLE_KEY is not set, all operations gracefully no-op
 * and the onboarding flow falls back to free trial mode.
 */

import { useState, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { getFirebaseFunctions } from '@/services/firebase';
import { LANDING_GUEST_CHECKOUT_ENABLED, STRIPE_CONFIG } from '@/constants/platform';
import { logger } from '@/lib/utils/logger';
import { functionsCallableUserMessage } from '@/lib/firebase/functionsCallableUserMessage';
import type { Region, BillingPeriod, PackageTrack } from '@/constants/pricing';
import type {
  CreateCheckoutRequest,
  CreateCheckoutResponse,
  CreateLandingGuestCheckoutRequest,
  UpdateSubscriptionPlanRequest,
  UpdateSubscriptionPlanResponse,
} from '@/types/platform';

/** Result after attempting hosted Checkout (redirect vs stay in app with error). */
export type CheckoutSessionAttempt = {
  redirected: boolean;
  errorMessage: string | null;
};

export function useCheckout() {
  const [loading, setLoading] = useState(false);
  const [planUpdateLoading, setPlanUpdateLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Start a Stripe Checkout session.
   * Calls the createCheckoutSession Cloud Function, then redirects
   * the user to Stripe's hosted checkout page.
   *
   * @returns true if redirect was initiated, false if Stripe is not configured
   */
  const startCheckout = useCallback(
    async (
      organizationId: string,
      region: Region,
      clientCount: number,
      billingPeriod: BillingPeriod = 'monthly',
      packageTrack?: PackageTrack,
      includeCustomBranding?: boolean,
    ): Promise<CheckoutSessionAttempt> => {
      // If Stripe is not configured, skip payment entirely
      if (!STRIPE_CONFIG.isEnabled) {
        logger.info('[Checkout] Stripe not configured — skipping payment (trial mode)');
        return { redirected: false, errorMessage: null };
      }

      setLoading(true);
      setError(null);

      try {
        // 1. Call Cloud Function to create a Checkout Session
        const functions = getFirebaseFunctions();
        const createSession = httpsCallable<CreateCheckoutRequest, CreateCheckoutResponse>(
          functions,
          'createCheckoutSession'
        );

        const result = await createSession({
          organizationId,
          region,
          clientCount,
          billingPeriod,
          ...(region === 'GB' && packageTrack ? { packageTrack } : {}),
          ...(includeCustomBranding === true ? { includeCustomBranding: true } : {}),
        });
        const { sessionUrl } = result.data;

        if (!sessionUrl || !/^https?:\/\//i.test(sessionUrl)) {
          throw new Error('No checkout session URL returned from server.');
        }

        window.location.assign(sessionUrl);
        return { redirected: true, errorMessage: null };
      } catch (err: unknown) {
        const message = functionsCallableUserMessage(
          err,
          'Unable to start checkout. Please try again.',
        );
        setError(message);
        logger.error('[Checkout] Failed to start checkout:', message);
        return { redirected: false, errorMessage: message };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Logged-out landing flow: hosted Checkout with the same GB capacity price as seat selection.
   * Server must have STRIPE_MODE=test and ENABLE_LANDING_GUEST_CHECKOUT=true.
   */
  const startLandingGuestCheckout = useCallback(
    async (
      region: Region,
      clientCount: number,
      billingPeriod: BillingPeriod,
      packageTrack: PackageTrack,
    ): Promise<CheckoutSessionAttempt> => {
      if (!LANDING_GUEST_CHECKOUT_ENABLED) {
        logger.info('[Checkout] Landing guest checkout disabled (env)');
        return { redirected: false, errorMessage: null };
      }

      setLoading(true);
      setError(null);

      try {
        const functions = getFirebaseFunctions();
        const createGuest = httpsCallable<
          CreateLandingGuestCheckoutRequest,
          CreateCheckoutResponse
        >(functions, 'createLandingGuestCheckoutSession');

        const result = await createGuest({
          region,
          clientCount,
          billingPeriod,
          packageTrack,
        });
        const { sessionUrl } = result.data;

        if (!sessionUrl || !/^https?:\/\//i.test(sessionUrl)) {
          throw new Error('No checkout session URL returned from server.');
        }

        window.location.assign(sessionUrl);
        return { redirected: true, errorMessage: null };
      } catch (err: unknown) {
        const message = functionsCallableUserMessage(
          err,
          'Unable to start checkout. Please try again.',
        );
        setError(message);
        logger.error('[Checkout] Landing guest checkout failed:', message);
        return { redirected: false, errorMessage: message };
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const purchaseCreditTopup = useCallback(
    async (organizationId: string): Promise<CheckoutSessionAttempt> => {
      if (!STRIPE_CONFIG.isEnabled) {
        logger.info('[Checkout] Stripe not configured — skipping credit topup');
        return { redirected: false, errorMessage: null };
      }

      setLoading(true);
      setError(null);

      try {
        const functions = getFirebaseFunctions();
        const createSession = httpsCallable<{ organizationId: string }, { sessionUrl: string }>(
          functions,
          'createCreditTopupSession'
        );

        const result = await createSession({ organizationId });
        const { sessionUrl } = result.data;

        if (!sessionUrl) throw new Error('No checkout session URL returned from server.');

        window.location.href = sessionUrl;
        return { redirected: true, errorMessage: null };
      } catch (err: unknown) {
        const message = functionsCallableUserMessage(err, 'Unable to start credit checkout.');
        setError(message);
        logger.error('[Checkout] Failed to start credit topup:', message);
        return { redirected: false, errorMessage: message };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * GB orgs with an existing subscription: change capacity in Stripe (subscriptions.update).
   * Monthly ↔ annual is blocked server-side; use Stripe Customer Portal for that edge case.
   */
  const updateSubscriptionPlan = useCallback(
    async (
      organizationId: string,
      region: Region,
      clientCount: number,
      billingPeriod: BillingPeriod,
      packageTrack?: PackageTrack,
    ): Promise<UpdateSubscriptionPlanResponse> => {
      if (!STRIPE_CONFIG.isEnabled) {
        throw new Error('Stripe is not configured.');
      }
      setPlanUpdateLoading(true);
      setError(null);
      try {
        const functions = getFirebaseFunctions();
        const fn = httpsCallable<UpdateSubscriptionPlanRequest, UpdateSubscriptionPlanResponse>(
          functions,
          'updateSubscriptionPlan',
        );
        const result = await fn({
          organizationId,
          region,
          clientCount,
          billingPeriod,
          ...(region === 'GB' && packageTrack ? { packageTrack } : {}),
        });
        return result.data;
      } catch (err: unknown) {
        const message = functionsCallableUserMessage(
          err,
          'Unable to update your plan. Please try again.',
        );
        setError(message);
        logger.error('[Checkout] updateSubscriptionPlan failed:', message);
        throw err;
      } finally {
        setPlanUpdateLoading(false);
      }
    },
    [],
  );

  return {
    startCheckout,
    startLandingGuestCheckout,
    purchaseCreditTopup,
    updateSubscriptionPlan,
    loading,
    planUpdateLoading,
    error,
    /** Whether Stripe payment is available (env key is set) */
    isStripeEnabled: STRIPE_CONFIG.isEnabled,
  };
}
