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
 *   STRIPE_PRICE_<REGION>_<CLIENT_COUNT> — e.g. STRIPE_PRICE_GB_5, STRIPE_PRICE_GB_10, STRIPE_PRICE_US_5, ...
 *   (Legacy: STRIPE_PRICE_STARTER, STRIPE_PRICE_PRO, STRIPE_PRICE_ENTERPRISE still supported if request has plan/seats)
 */

import * as admin from 'firebase-admin';
import Stripe from 'stripe';
import type { CallableRequest } from 'firebase-functions/v2/https';

const SEAT_TIERS = [5, 10, 20, 35, 50, 75, 100, 150, 250, 300] as const;
type Region = 'GB' | 'US' | 'KW';

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

function getPriceIdForTier(region: Region, clientCount: number): string | undefined {
  const tier = SEAT_TIERS.includes(clientCount as (typeof SEAT_TIERS)[number])
    ? clientCount
    : Math.max(...SEAT_TIERS.filter((t) => t <= clientCount), 5);
  const key = `STRIPE_PRICE_${region}_${tier}`;
  return process.env[key];
}

function regionToCurrency(region: string): string {
  const map: Record<string, string> = { GB: 'GBP', US: 'USD', KW: 'KWD' };
  return map[region] || 'GBP';
}

// ---------------------------------------------------------------------------
// createCheckoutSession — callable function handler
// ---------------------------------------------------------------------------
export interface CheckoutRequest {
  organizationId: string;
  region: Region;
  clientCount: number;
  plan?: 'starter' | 'professional' | 'enterprise';
  seats?: number;
}

export async function handleCreateCheckoutSession(
  request: CallableRequest<CheckoutRequest>
) {
  if (!request.auth?.uid) {
    throw new Error('Authentication required.');
  }

  const { organizationId, region, clientCount, plan, seats } = request.data;

  if (!organizationId) {
    throw new Error('Missing required field: organizationId.');
  }

  let priceId: string | undefined;
  let effectiveRegion: Region = region ?? 'GB';
  let effectiveClientCount: number = clientCount ?? seats ?? 10;

  if (region != null && clientCount != null) {
    priceId = getPriceIdForTier(effectiveRegion, effectiveClientCount);
  }
  if (!priceId && plan && seats != null) {
    const legacy: Record<string, string | undefined> = {
      starter: process.env.STRIPE_PRICE_STARTER,
      professional: process.env.STRIPE_PRICE_PRO,
      enterprise: process.env.STRIPE_PRICE_ENTERPRISE,
    };
    priceId = legacy[plan];
    effectiveRegion = 'GB';
    effectiveClientCount = seats;
  }

  if (!priceId) {
    throw new Error(
      `Stripe Price ID not configured for region=${effectiveRegion} clientCount=${effectiveClientCount}. ` +
      'Set STRIPE_PRICE_<REGION>_<TIER> (e.g. STRIPE_PRICE_GB_10) in environment.'
    );
  }

  const stripe = getStripe();
  const db = admin.firestore();

  const orgDoc = await db.doc(`organizations/${organizationId}`).get();
  if (!orgDoc.exists) {
    throw new Error('Organization not found.');
  }
  const orgData = orgDoc.data();
  if (orgData?.ownerId !== request.auth.uid) {
    throw new Error('Not authorized for this organization.');
  }

  let customerId = orgData?.stripe?.stripeCustomerId;

  if (!customerId) {
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

    await db.doc(`organizations/${organizationId}`).update({
      'stripe.stripeCustomerId': customerId,
    });
  }

  const baseUrl = process.env.APP_URL || 'https://one-assess.com';

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${baseUrl}/onboarding?step=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/onboarding?step=payment`,
    metadata: {
      organizationId,
      region: String(effectiveRegion),
      clientCount: String(effectiveClientCount),
    },
    subscription_data: {
      metadata: {
        organizationId,
        region: String(effectiveRegion),
        clientCount: String(effectiveClientCount),
      },
    },
  });

  return {
    sessionUrl: session.url,
    sessionId: session.id,
  };
}

// ---------------------------------------------------------------------------
// createCustomerPortalSession — callable function handler
// ---------------------------------------------------------------------------
export interface PortalSessionRequest {
  organizationId: string;
}

export async function handleCreateCustomerPortalSession(
  request: CallableRequest<PortalSessionRequest>,
) {
  if (!request.auth?.uid) {
    throw new Error('Authentication required.');
  }

  const { organizationId } = request.data;
  if (!organizationId) {
    throw new Error('Missing required field: organizationId.');
  }

  const db = admin.firestore();

  const orgDoc = await db.doc(`organizations/${organizationId}`).get();
  if (!orgDoc.exists) {
    throw new Error('Organization not found.');
  }
  const orgData = orgDoc.data();
  if (orgData?.ownerId !== request.auth.uid) {
    throw new Error('Not authorized for this organization.');
  }

  const customerId = orgData?.stripe?.stripeCustomerId;
  if (!customerId) {
    throw new Error('No Stripe customer found for this organization. Please subscribe first.');
  }

  const stripe = getStripe();
  const baseUrl = process.env.APP_URL || 'https://one-assess.com';

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${baseUrl}/billing`,
  });

  return { url: session.url };
}

// ---------------------------------------------------------------------------
// createBrandingCheckoutSession — one-time payment for custom branding add-on
// ---------------------------------------------------------------------------
export interface BrandingCheckoutRequest {
  organizationId: string;
}

const BRANDING_PRICE_IDS: Record<string, string | undefined> = {
  GBP: process.env.STRIPE_PRICE_BRANDING_GBP,
  USD: process.env.STRIPE_PRICE_BRANDING_USD,
  KWD: process.env.STRIPE_PRICE_BRANDING_KWD,
};

export async function handleCreateBrandingCheckoutSession(
  request: CallableRequest<BrandingCheckoutRequest>,
) {
  if (!request.auth?.uid) {
    throw new Error('Authentication required.');
  }

  const { organizationId } = request.data;
  if (!organizationId) {
    throw new Error('Missing required field: organizationId.');
  }

  const db = admin.firestore();
  const orgDoc = await db.doc(`organizations/${organizationId}`).get();
  if (!orgDoc.exists) {
    throw new Error('Organization not found.');
  }
  const orgData = orgDoc.data();
  if (orgData?.ownerId !== request.auth.uid) {
    throw new Error('Not authorized for this organization.');
  }
  if (orgData?.customBrandingEnabled === true) {
    throw new Error('Custom branding is already enabled for this organization.');
  }

  const region = (orgData?.subscription?.region ?? orgData?.region) as string || 'GB';
  const currency = regionToCurrency(region);
  const priceId = BRANDING_PRICE_IDS[currency];
  if (!priceId) {
    throw new Error(
      `Stripe Price ID for custom branding (${currency}) not configured. Set STRIPE_PRICE_BRANDING_GBP / USD / KWD.`
    );
  }

  let customerId = orgData?.stripe?.stripeCustomerId;
  if (!customerId) {
    const stripe = getStripe();
    const userDoc = await db.doc(`userProfiles/${request.auth.uid}`).get();
    const userEmail = userDoc.data()?.email || request.auth.token?.email || '';
    const customer = await stripe.customers.create({
      email: userEmail,
      metadata: { organizationId, firebaseUid: request.auth.uid },
    });
    customerId = customer.id;
    await db.doc(`organizations/${organizationId}`).update({
      'stripe.stripeCustomerId': customerId,
    });
  }

  const stripe = getStripe();
  const baseUrl = process.env.APP_URL || 'https://one-assess.com';

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'payment',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/billing?branding=success`,
    cancel_url: `${baseUrl}/billing`,
    metadata: {
      organizationId,
      customBranding: 'true',
    },
  });

  return { sessionUrl: session.url, sessionId: session.id };
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
      const region = (session.metadata?.region as string) || 'GB';
      const clientCount = parseInt(session.metadata?.clientCount || session.metadata?.seats || '10', 10);
      const currency = regionToCurrency(region);

      if (orgId && session.subscription) {
        let amountCents = 0;
        if (typeof session.subscription === 'string') {
          const sub = await stripe.subscriptions.retrieve(session.subscription);
          const item = sub.items?.data?.[0];
          const unitAmount = (item?.price as { unit_amount?: number } | undefined)?.unit_amount;
          if (unitAmount != null) {
            amountCents = unitAmount;
          }
        }

        const updateData: Record<string, unknown> = {
          'subscription.status': 'active',
          'stripe.stripeSubscriptionId': session.subscription,
          'stripe.stripeCustomerId': session.customer,
          'stripe.stripePriceId': session.metadata?.plan || session.metadata?.clientCount || '',
          'subscription.plan': 'starter',
          'subscription.clientSeats': clientCount,
          'subscription.region': region,
          'subscription.currency': currency,
          'subscription.clientCount': clientCount,
          'subscription.amountCents': amountCents,
        };
        if (currency === 'KWD') {
          updateData['subscription.amountFils'] = amountCents;
        }
        await db.doc(`organizations/${orgId}`).update(updateData);
        console.log(`[Stripe Webhook] checkout.session.completed — org ${orgId} activated`);
      }

      if (orgId && session.payment_status === 'paid' && !session.subscription && session.metadata?.customBranding === 'true') {
        await db.doc(`organizations/${orgId}`).update({
          customBrandingEnabled: true,
          customBrandingPaidAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`[Stripe Webhook] checkout.session.completed — org ${orgId} custom branding paid`);
      }

      // Credit top-up: add the purchased credits to the org's balance
      if (orgId && session.payment_status === 'paid' && session.metadata?.type === 'credit_topup') {
        const qty = parseInt(session.metadata?.creditQuantity || '20', 10);
        await db.doc(`organizations/${orgId}`).update({
          assessmentCredits: admin.firestore.FieldValue.increment(qty),
          lastCreditTopupAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`[Stripe Webhook] credit_topup — org ${orgId} +${qty} credits`);
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

        // Notify the org owner when the subscription goes past_due
        if (status === 'past_due') {
          const orgSnap = await db.doc(`organizations/${orgId}`).get();
          const ownerId: string | undefined = orgSnap.data()?.ownerId;
          if (ownerId) {
            await db.collection(`notifications/${ownerId}/items`).add({
              type: 'subscription_past_due',
              title: 'Payment failed — action required',
              body: 'Your subscription payment failed. Please update your payment method to avoid service interruption.',
              priority: 'high',
              read: false,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              recipientUid: ownerId,
              actionUrl: '/billing',
            });
          }
        }
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

        // Notify the org owner that the subscription has been cancelled
        const orgSnap = await db.doc(`organizations/${orgId}`).get();
        const ownerId: string | undefined = orgSnap.data()?.ownerId;
        if (ownerId) {
          await db.collection(`notifications/${ownerId}/items`).add({
            type: 'subscription_cancelled',
            title: 'Subscription cancelled',
            body: 'Your One Assess subscription has been cancelled. Resubscribe any time to restore access.',
            priority: 'high',
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            recipientUid: ownerId,
            actionUrl: '/billing',
          });
        }
      }
      break;
    }

    case 'invoice.payment_succeeded': {
      // Replenish monthly AI credits when a subscription renews
      const invoice = event.data.object as Stripe.Invoice & {
        billing_reason?: string;
        subscription?: string;
        subscription_details?: { metadata?: Record<string, string> };
      };
      const isRenewal = invoice.billing_reason === 'subscription_cycle';
      if (!isRenewal) break;

      const subId = typeof invoice.subscription === 'string' ? invoice.subscription : null;
      if (!subId) break;

      const sub = await stripe.subscriptions.retrieve(subId);
      const orgId = sub.metadata?.organizationId;
      if (!orgId) break;

      const orgSnap = await db.doc(`organizations/${orgId}`).get();
      const clientSeats: number = orgSnap.data()?.subscription?.clientSeats ?? 5;

      // Credit allocation lookup (mirrors MONTHLY_CREDITS_BY_TIER in pricing constants)
      const CREDIT_BY_TIER: Record<number, number> = {
        5: 15, 10: 30, 20: 60, 35: 90, 50: 100,
        75: 150, 100: 200, 150: 300, 250: 500, 300: -1,
      };
      const tiers = [5, 10, 20, 35, 50, 75, 100, 150, 250, 300];
      const tier = Math.max(...tiers.filter(t => t <= clientSeats), 5);
      const monthlyCredits = CREDIT_BY_TIER[tier] ?? 30;

      if (monthlyCredits === -1) {
        // Unlimited plan — set a high sentinel rather than incrementing
        await db.doc(`organizations/${orgId}`).update({
          assessmentCredits: 9999,
          creditsReplenishedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        await db.doc(`organizations/${orgId}`).update({
          assessmentCredits: monthlyCredits, // Reset (not accumulate) each billing cycle
          creditsReplenishedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      console.log(`[Stripe Webhook] invoice.payment_succeeded — org ${orgId} credits reset to ${monthlyCredits}`);
      break;
    }

    default:
      // Unhandled event type — log but don't error
      console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
  }

  res.status(200).json({ received: true });
}

// ---------------------------------------------------------------------------
// createCreditTopupSession — callable function handler
// Creates a one-time Stripe Checkout for a 20-scan credit top-up pack.
// ---------------------------------------------------------------------------

export const CREDIT_TOPUP_QUANTITY = 20;
const CREDIT_TOPUP_PRICE_GBP_PENCE = 900;  // £9 = 900p
const CREDIT_TOPUP_PRICE_USD_CENTS = 1200; // $12 = 1200c
const CREDIT_TOPUP_PRICE_KWD_FILS  = 300;  // 3 KWD = 300 fils

function creditTopupAmountForRegion(region: string): { amount: number; currency: string } {
  if (region === 'US') return { amount: CREDIT_TOPUP_PRICE_USD_CENTS, currency: 'usd' };
  if (region === 'KW') return { amount: CREDIT_TOPUP_PRICE_KWD_FILS, currency: 'kwd' };
  return { amount: CREDIT_TOPUP_PRICE_GBP_PENCE, currency: 'gbp' };
}

export interface CreditTopupRequest {
  organizationId: string;
}

export async function handleCreateCreditTopupSession(
  request: CallableRequest<CreditTopupRequest>
) {
  if (!request.auth?.uid) throw new Error('Authentication required.');
  const { organizationId } = request.data;
  if (!organizationId) throw new Error('Missing required field: organizationId.');

  const db = admin.firestore();
  const stripe = getStripe();
  const baseUrl = process.env.APP_URL || 'https://one-assess.com';

  const orgDoc = await db.doc(`organizations/${organizationId}`).get();
  if (!orgDoc.exists) throw new Error('Organization not found.');
  const orgData = orgDoc.data()!;

  const region: string = orgData.subscription?.region || orgData.region || 'GB';
  const { amount, currency } = creditTopupAmountForRegion(region);

  let customerId: string | undefined = orgData.stripe?.stripeCustomerId;
  if (!customerId) {
    const userDoc = await db.doc(`userProfiles/${request.auth.uid}`).get();
    const userEmail = userDoc.data()?.email || request.auth.token?.email || '';
    const customer = await stripe.customers.create({
      email: userEmail,
      metadata: { organizationId, firebaseUid: request.auth.uid },
    });
    customerId = customer.id;
    await db.doc(`organizations/${organizationId}`).update({ 'stripe.stripeCustomerId': customerId });
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'payment',
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency,
          unit_amount: amount,
          product_data: {
            name: `${CREDIT_TOPUP_QUANTITY} AI Assessment Credits`,
            description: 'Each credit unlocks one AI OCR or posture scan.',
          },
        },
      },
    ],
    success_url: `${baseUrl}/dashboard?credits=purchased`,
    cancel_url: `${baseUrl}/dashboard`,
    metadata: { organizationId, creditQuantity: String(CREDIT_TOPUP_QUANTITY), type: 'credit_topup' },
  });

  return { sessionUrl: session.url, sessionId: session.id };
}
