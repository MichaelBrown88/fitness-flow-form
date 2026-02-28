/**
 * Stripe Cloud Functions
 *
 * Handles checkout session creation and webhook processing.
 * All Stripe secret-key operations stay server-side per .cursorrules:
 * "Never perform sensitive logic client-side if it exposes secrets."
 *
 * Environment variables required (set via Firebase Functions config):
 *   STRIPE_SECRET_KEY      — Stripe secret API key
 *   STRIPE_WEBHOOK_SECRET  — Stripe webhook signing secret
 *   STRIPE_PRICE_STARTER   — Stripe Price ID for Starter plan
 *   STRIPE_PRICE_PRO       — Stripe Price ID for Professional plan
 *   STRIPE_PRICE_ENTERPRISE — Stripe Price ID for Enterprise plan
 */

import * as admin from 'firebase-admin';
import Stripe from 'stripe';
import type { CallableRequest } from 'firebase-functions/v2/https';

// ---------------------------------------------------------------------------
// Stripe client (lazy-initialized)
// ---------------------------------------------------------------------------
let stripeInstance: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY is not configured. Set it in Cloud Functions environment.');
    }
    stripeInstance = new Stripe(key, { apiVersion: '2026-01-28.clover' });
  }
  return stripeInstance;
}

// ---------------------------------------------------------------------------
// Price ID mapping
// ---------------------------------------------------------------------------
const PRICE_IDS: Record<string, string | undefined> = {
  starter: process.env.STRIPE_PRICE_STARTER,
  professional: process.env.STRIPE_PRICE_PRO,
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE,
};

// ---------------------------------------------------------------------------
// createCheckoutSession — callable function handler
// ---------------------------------------------------------------------------
export interface CheckoutRequest {
  organizationId: string;
  plan: 'starter' | 'professional' | 'enterprise';
  seats: number;
}

export async function handleCreateCheckoutSession(
  request: CallableRequest<CheckoutRequest>
) {
  // Auth check
  if (!request.auth?.uid) {
    throw new Error('Authentication required.');
  }

  const { organizationId, plan, seats } = request.data;

  if (!organizationId || !plan || !seats) {
    throw new Error('Missing required fields: organizationId, plan, seats.');
  }

  const priceId = PRICE_IDS[plan];
  if (!priceId) {
    throw new Error(
      `Stripe Price ID not configured for plan "${plan}". ` +
      'Set STRIPE_PRICE_STARTER / STRIPE_PRICE_PRO / STRIPE_PRICE_ENTERPRISE in environment.'
    );
  }

  const stripe = getStripe();
  const db = admin.firestore();

  // Verify user owns this organization
  const orgDoc = await db.doc(`organizations/${organizationId}`).get();
  if (!orgDoc.exists) {
    throw new Error('Organization not found.');
  }
  const orgData = orgDoc.data();
  if (orgData?.ownerId !== request.auth.uid) {
    throw new Error('Not authorized for this organization.');
  }

  // Check for existing Stripe customer
  let customerId = orgData?.stripe?.stripeCustomerId;

  if (!customerId) {
    // Retrieve user email for Stripe customer creation
    const userDoc = await db.doc(`userProfiles/${request.auth.uid}`).get();
    const userEmail = userDoc.data()?.email || request.auth.token?.email || '';

    const customer = await stripe.customers.create({
      email: userEmail,
      metadata: {
        organizationId,
        firebaseUid: request.auth.uid,
      },
    });
    customerId = customer.id;

    // Store customer ID on organization
    await db.doc(`organizations/${organizationId}`).update({
      'stripe.stripeCustomerId': customerId,
    });
  }

  // Determine base URL from request origin or fallback
  const baseUrl = process.env.APP_URL || 'https://one-assess.com';

  // Create Checkout Session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [
      {
        price: priceId,
        quantity: seats,
      },
    ],
    success_url: `${baseUrl}/onboarding?step=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/onboarding?step=payment`,
    metadata: {
      organizationId,
      plan,
      seats: String(seats),
    },
    subscription_data: {
      metadata: {
        organizationId,
        plan,
        seats: String(seats),
      },
    },
  });

  return {
    sessionUrl: session.url,
    sessionId: session.id,
  };
}

// ---------------------------------------------------------------------------
// stripeWebhook — HTTP function handler
// ---------------------------------------------------------------------------
import type { Request, Response } from 'express';

export async function handleStripeWebhook(req: Request, res: Response) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET not configured');
    res.status(500).send('Webhook secret not configured');
    return;
  }

  const stripe = getStripe();
  const sig = req.headers['stripe-signature'] as string;

  let event: Stripe.Event;
  try {
    // Firebase Functions v2 provides the raw body as a Buffer on req.body
    // when the content-type is not JSON, or use req.rawBody if available
    const rawBody = (req as unknown as { rawBody: Buffer }).rawBody || req.body;
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('[Stripe Webhook] Signature verification failed:', err);
    res.status(400).send('Webhook signature verification failed');
    return;
  }

  const db = admin.firestore();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const orgId = session.metadata?.organizationId;

      if (orgId && session.subscription) {
        await db.doc(`organizations/${orgId}`).update({
          'subscription.status': 'active',
          'stripe.stripeSubscriptionId': session.subscription,
          'stripe.stripeCustomerId': session.customer,
          'stripe.stripePriceId': session.metadata?.plan || '',
          'subscription.plan': session.metadata?.plan || 'starter',
          'subscription.clientSeats': parseInt(session.metadata?.seats || '10', 10),
        });
        console.log(`[Stripe Webhook] checkout.session.completed — org ${orgId} activated`);
      }
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const orgId = subscription.metadata?.organizationId;

      if (orgId) {
        const status = subscription.status === 'active'
          ? 'active'
          : subscription.status === 'past_due'
            ? 'past_due'
            : subscription.status === 'trialing'
              ? 'trial'
              : subscription.status;

        const updateData: Record<string, unknown> = {
          'subscription.status': status,
        };

        // cancel_at gives us the period end if set
        if (subscription.cancel_at) {
          updateData['stripe.cancelAt'] = new Date(subscription.cancel_at * 1000);
        }

        await db.doc(`organizations/${orgId}`).update(updateData);
        console.log(`[Stripe Webhook] subscription.updated — org ${orgId} status: ${status}`);
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const orgId = subscription.metadata?.organizationId;

      if (orgId) {
        await db.doc(`organizations/${orgId}`).update({
          'subscription.status': 'cancelled',
        });
        console.log(`[Stripe Webhook] subscription.deleted — org ${orgId} cancelled`);
      }
      break;
    }

    default:
      // Unhandled event type — log but don't error
      console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
  }

  res.status(200).json({ received: true });
}
