/**
 * useCheckout — client-side hook for Stripe Checkout integration
 *
 * Lazy-loads @stripe/stripe-js per .cursorrules:
 * "Heavy libraries MUST use Dynamic Imports inside the function that needs them."
 *
 * If VITE_STRIPE_PUBLISHABLE_KEY is not set, all operations gracefully no-op
 * and the onboarding flow falls back to free trial mode.
 */

import { useState, useCallback } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { STRIPE_CONFIG } from '@/constants/platform';
import { logger } from '@/lib/utils/logger';
import type { CreateCheckoutRequest, CreateCheckoutResponse } from '@/types/platform';

export function useCheckout() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Start a Stripe Checkout session.
   * Calls the createCheckoutSession Cloud Function, then redirects
   * the user to Stripe's hosted checkout page.
   *
   * @returns true if redirect was initiated, false if Stripe is not configured
   */
  const startCheckout = useCallback(
    async (organizationId: string, plan: CreateCheckoutRequest['plan'], seats: number): Promise<boolean> => {
      // If Stripe is not configured, skip payment entirely
      if (!STRIPE_CONFIG.isEnabled) {
        logger.info('[Checkout] Stripe not configured — skipping payment (trial mode)');
        return false;
      }

      setLoading(true);
      setError(null);

      try {
        // 1. Call Cloud Function to create a Checkout Session
        const functions = getFunctions();
        const createSession = httpsCallable<CreateCheckoutRequest, CreateCheckoutResponse>(
          functions,
          'createCheckoutSession'
        );

        const result = await createSession({ organizationId, plan, seats });
        const { sessionUrl } = result.data;

        if (!sessionUrl) {
          throw new Error('No checkout session URL returned from server.');
        }

        // 2. Lazy-load Stripe.js and redirect to Checkout
        const { loadStripe } = await import('@stripe/stripe-js');
        const stripe = await loadStripe(STRIPE_CONFIG.publishableKey);

        if (!stripe) {
          throw new Error('Failed to load Stripe. Please check your internet connection.');
        }

        // Redirect to Stripe Checkout
        window.location.href = sessionUrl;
        return true;
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : 'Unable to start checkout. Please try again.';
        setError(message);
        logger.error('[Checkout] Failed to start checkout:', message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    startCheckout,
    loading,
    error,
    /** Whether Stripe payment is available (env key is set) */
    isStripeEnabled: STRIPE_CONFIG.isEnabled,
  };
}
