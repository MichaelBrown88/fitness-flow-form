/**
 * Stripe Cloud Functions
 *
 * Handles checkout session creation and webhook processing.
 * All Stripe secret-key operations stay server-side per .cursorrules:
 * "Never perform sensitive logic client-side if it exposes secrets."
 *
 * Environment variables (see root .env.example):
 *   STRIPE_SECRET_KEY | STRIPE_SECRET_KEY_TEST | STRIPE_SECRET_KEY_LIVE
 *   STRIPE_MODE=test|live
 *   STRIPE_WEBHOOK_SECRET (+ _TEST / _LIVE optional)
 *   STRIPE_PACKAGE_<S10|…|G250|A|…|F>_<MONTHLY|ANNUAL>_<TEST|LIVE> — capacity prices (GBP)
 *   Legacy: STRIPE_PRICE_<REGION>_<TIER>, STRIPE_PRICE_STARTER|PRO|ENTERPRISE
 *
 * Billing source of truth: Stripe webhooks (`handleStripeWebhook`) update org subscription fields in Firestore.
 * Client UI and callables should treat those org fields as authoritative after sync (not client-only flags).
 */

import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import Stripe from 'stripe';
import {
  beginStripeWebhookProcessing,
  markStripeWebhookEventCompleted,
  clearStripeWebhookProcessingLock,
  claimCreditTopupCheckoutSession,
} from './stripeWebhookIdempotency';
import { assertRateLimit, buildRateLimitKey } from './rateLimit';
import {
  parseMetadataInt,
  METADATA_MAX_CLIENT_CAP,
  METADATA_MAX_MONTHLY_AI_CREDITS,
  METADATA_MAX_CREDIT_TOPUP_QTY,
} from './metadataInts';
import { HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import {
  capacityPriceEnvKey,
  brandingPriceEnvKey,
  getPaidTierByClientCount,
  getPaidTierForPackageTrack,
  getPaidTierById,
  getMonthlyAiCreditsForTier,
  paidTierFromPriceId,
  stripeModeSuffix,
  isPaidCapacityTierId,
  type BillingPeriod,
  type PaidCapacityTierId,
  type PackageTrack,
  FREE_TIER_MONTHLY_AI_CREDITS,
} from './shared/billing/capacityTiers';

const SEAT_TIERS = [5, 10, 20, 35, 50, 75, 100, 150, 250, 300] as const;
type Region = 'GB' | 'US' | 'KW';

// ---------------------------------------------------------------------------
// Stripe client (lazy-initialized)
// ---------------------------------------------------------------------------
let stripeInstance: Stripe | null = null;

function resolveStripeSecretKey(): string {
  const mode = (process.env.STRIPE_MODE || 'test').toLowerCase();
  if (mode === 'live') {
    return (
      process.env.STRIPE_SECRET_KEY_LIVE ||
      process.env.STRIPE_SECRET_KEY ||
      ''
    );
  }
  return (
    process.env.STRIPE_SECRET_KEY_TEST ||
    process.env.STRIPE_SECRET_KEY ||
    ''
  );
}

function resolveWebhookSecret(): string {
  const mode = (process.env.STRIPE_MODE || 'test').toLowerCase();
  if (mode === 'live') {
    return (
      process.env.STRIPE_WEBHOOK_SECRET_LIVE ||
      process.env.STRIPE_WEBHOOK_SECRET ||
      ''
    );
  }
  return (
    process.env.STRIPE_WEBHOOK_SECRET_TEST ||
    process.env.STRIPE_WEBHOOK_SECRET ||
    ''
  );
}

function getStripe(): Stripe {
  if (!stripeInstance) {
    const key = resolveStripeSecretKey();
    if (!key) {
      throw new Error(
        'Stripe secret key not configured. Set STRIPE_SECRET_KEY or STRIPE_SECRET_KEY_TEST / STRIPE_SECRET_KEY_LIVE.',
      );
    }
    // GA API version (Dashboard). stripe@20 types may pin a newer literal; cast keeps runtime aligned with CFO review.
    stripeInstance = new Stripe(key, {
      apiVersion: '2024-11-20.acacia' as Stripe.StripeConfig['apiVersion'],
    });
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

async function enforceBillingCallableRateLimit(
  db: admin.firestore.Firestore,
  namespace: string,
  uid: string,
  rawIp: string | undefined,
): Promise<void> {
  try {
    await assertRateLimit(
      db,
      buildRateLimitKey(namespace, uid, rawIp),
      { maxRequests: 15, windowSeconds: 60 },
    );
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'RATE_LIMITED') {
      throw new HttpsError('resource-exhausted', 'Too many requests. Try again shortly.');
    }
    throw e;
  }
}

/** Owner or org_admin of this org — matches in-app Billing (org_admin) access. */
async function assertOrgBillingCallableAccess(
  db: admin.firestore.Firestore,
  uid: string,
  organizationId: string,
  orgData: FirebaseFirestore.DocumentData | undefined,
): Promise<void> {
  if (!orgData) {
    throw new Error('Organization not found.');
  }
  if (orgData.ownerId === uid) {
    return;
  }
  const profileSnap = await db.doc(`userProfiles/${uid}`).get();
  const p = profileSnap.data();
  if (p?.organizationId === organizationId && p?.role === 'org_admin') {
    return;
  }
  throw new Error('Not authorized for this organization.');
}

/** Purchased credit packs that survive monthly renewal replenishment (incremented on top-up checkout). */
const ASSESSMENT_CREDITS_TOPUP_BALANCE = 'assessmentCreditsTopupBalance';

function isCheckoutPaymentCompleteForSubscription(session: Stripe.Checkout.Session): boolean {
  const ps = session.payment_status;
  return ps === 'paid' || ps === 'no_payment_required';
}

/** Total spendable AI credits: monthly allowance plus persistent top-up balance, capped at 9999. */
function computeAssessmentCreditsWithTopup(monthlyCredits: number, topupBalance: number): number {
  if (monthlyCredits < 0 || monthlyCredits >= 9999) {
    return 9999;
  }
  const topup = typeof topupBalance === 'number' && topupBalance > 0 ? topupBalance : 0;
  return Math.min(9999, monthlyCredits + topup);
}

export type ApplySubscriptionCheckoutResult =
  | { applied: true }
  | { applied: false; reason: 'payment_not_complete' | 'missing_subscription' };

/**
 * Idempotently writes org subscription fields from a completed Checkout session (subscription mode).
 * Used by the Stripe webhook and by syncCheckoutSession when webhooks are delayed or missed.
 */
export async function applySubscriptionCheckoutToOrganization(
  db: admin.firestore.Firestore,
  stripe: Stripe,
  params: {
    orgId: string;
    session: Stripe.Checkout.Session;
    /** When false, skips Slack new-subscription alert (e.g. manual sync from success page). */
    sendSubscriptionAlert?: boolean;
  },
): Promise<ApplySubscriptionCheckoutResult> {
  const { orgId, session, sendSubscriptionAlert = true } = params;

  const subRef = session.subscription;
  const subId =
    typeof subRef === 'string'
      ? subRef
      : subRef && typeof subRef === 'object' && 'id' in subRef
        ? (subRef as Stripe.Subscription).id
        : '';
  if (!subId) {
    return { applied: false, reason: 'missing_subscription' };
  }

  if (!isCheckoutPaymentCompleteForSubscription(session)) {
    logger.info('applySubscriptionCheckoutToOrganization — skipped (payment not complete)', {
      orgId,
      sessionId: session.id,
      payment_status: session.payment_status,
    });
    return { applied: false, reason: 'payment_not_complete' };
  }

  const sub = await stripe.subscriptions.retrieve(subId);
  const item = sub.items?.data?.[0];
  const priceObj = item?.price;
  const stripePriceId = typeof priceObj === 'string' ? priceObj : priceObj?.id;
  let amountCents = 0;
  const unitAmount = (priceObj as { unit_amount?: number } | undefined)?.unit_amount;
  if (unitAmount != null) {
    amountCents = unitAmount;
  }

  const region = (session.metadata?.region as string) || 'GB';
  const currency = regionToCurrency(region);
  const legacyClientCount = parseMetadataInt(
    session.metadata?.clientCount || session.metadata?.seats || undefined,
    10,
    METADATA_MAX_CLIENT_CAP,
  );

  const tierFromPrice = paidTierFromPriceId(stripePriceId);
  const metaTier = session.metadata?.tierId;
  const capacityTierId: PaidCapacityTierId | undefined = isPaidTierId(metaTier)
    ? metaTier
    : tierFromPrice;
  const tierRow = capacityTierId ? getPaidTierById(capacityTierId) : undefined;
  const clientLimit =
    tierRow?.clientLimit ??
    parseMetadataInt(session.metadata?.clientLimit, legacyClientCount, METADATA_MAX_CLIENT_CAP);
  const fromMetaCredits = parseMetadataInt(
    session.metadata?.monthlyAiCredits,
    0,
    METADATA_MAX_MONTHLY_AI_CREDITS,
  );
  const monthlyAiCredits =
    tierRow?.monthlyAiCredits ??
    (fromMetaCredits > 0 ? fromMetaCredits : getPaidTierByClientCount(legacyClientCount).monthlyAiCredits);

  const orgSnap = await db.doc(`organizations/${orgId}`).get();
  const orgData = orgSnap.data();
  const rawTopup = orgData?.[ASSESSMENT_CREDITS_TOPUP_BALANCE];
  const existingTopup = typeof rawTopup === 'number' && rawTopup > 0 ? rawTopup : 0;
  const baseMonthly = monthlyAiCredits > 0 ? monthlyAiCredits : FREE_TIER_MONTHLY_AI_CREDITS;

  const updateData: Record<string, unknown> = {
    'subscription.status': 'active',
    'stripe.stripeSubscriptionId': subId,
    'stripe.stripeCustomerId': session.customer,
    'stripe.stripePriceId': stripePriceId || session.metadata?.plan || session.metadata?.clientCount || '',
    'subscription.plan': capacityTierId ? `package_${capacityTierId.toLowerCase()}` : 'starter',
    'subscription.clientSeats': clientLimit,
    'subscription.region': region,
    'subscription.currency': currency,
    'subscription.clientCount': clientLimit,
    'subscription.amountCents': amountCents,
    'subscription.capacityTierId': capacityTierId ?? null,
    'subscription.clientCap': clientLimit,
    'subscription.monthlyAiCredits': monthlyAiCredits,
    assessmentCredits: computeAssessmentCreditsWithTopup(baseMonthly, existingTopup),
  };
  if (currency === 'KWD') {
    updateData['subscription.amountFils'] = amountCents;
  }

  await db.doc(`organizations/${orgId}`).update(updateData);
  logger.info('applySubscriptionCheckoutToOrganization — org activated', { orgId, sessionId: session.id });

  if (session.metadata?.customBranding === 'true') {
    await db.doc(`organizations/${orgId}`).update({
      customBrandingEnabled: true,
      customBrandingPaidAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    logger.info('applySubscriptionCheckoutToOrganization — custom branding with subscription', {
      orgId,
      sessionId: session.id,
    });
  }

  if (sendSubscriptionAlert) {
    const orgName = (await db.doc(`organizations/${orgId}`).get()).data()?.name as string | undefined;
    const tierLabel = capacityTierId || 'plan';
    const amtDisplay =
      amountCents > 0
        ? new Intl.NumberFormat('en-GB', {
            style: 'currency',
            currency,
            maximumFractionDigits: 2,
          }).format(amountCents / (currency === 'KWD' ? 1000 : 100)) + '/mo'
        : undefined;
    alertNewSubscription({ orgId, orgName, tierName: tierLabel, amountDisplay: amtDisplay });
  }

  return { applied: true };
}

// ---------------------------------------------------------------------------
// createCheckoutSession — callable function handler
// ---------------------------------------------------------------------------
export interface CheckoutRequest {
  organizationId: string;
  /** Capacity-based CFO packages (preferred). */
  tierId?: PaidCapacityTierId;
  /** Monthly vs annual capacity checkout (GBP). */
  billingPeriod?: BillingPeriod;
  /** GB capacity ladder: solo vs gym (same client count → different Stripe price). */
  packageTrack?: PackageTrack;
  /** Include one-time custom branding price on the same Checkout session as the subscription. */
  includeCustomBranding?: boolean;
  /** Legacy seat-based checkout */
  region?: Region;
  clientCount?: number;
  plan?: 'starter' | 'professional' | 'enterprise';
  seats?: number;
}

function isPaidTierId(value: unknown): value is PaidCapacityTierId {
  return typeof value === 'string' && isPaidCapacityTierId(value);
}

export async function handleCreateCheckoutSession(
  request: CallableRequest<CheckoutRequest>
) {
  if (!request.auth?.uid) {
    throw new Error('Authentication required.');
  }

  const db = admin.firestore();
  await enforceBillingCallableRateLimit(
    db,
    'stripe_checkout',
    request.auth.uid,
    request.rawRequest?.ip,
  );

  const {
    organizationId,
    region,
    clientCount,
    plan,
    seats,
    tierId,
    billingPeriod,
    packageTrack,
    includeCustomBranding,
  } = request.data;

  if (!organizationId) {
    throw new Error('Missing required field: organizationId.');
  }

  let priceId: string | undefined;
  let effectiveRegion: Region = region ?? 'GB';
  let effectiveClientCount: number = clientCount ?? seats ?? 10;
  let capacityTierId: PaidCapacityTierId | undefined;
  let capacityBillingPeriod: BillingPeriod = 'monthly';

  if (isPaidTierId(tierId) && (billingPeriod === 'monthly' || billingPeriod === 'annual')) {
    capacityTierId = tierId;
    capacityBillingPeriod = billingPeriod;
    const mode = stripeModeSuffix();
    const envKey = capacityPriceEnvKey(tierId, billingPeriod, mode);
    priceId = process.env[envKey];
    effectiveRegion = 'GB';
    const tierRow = getPaidTierById(tierId);
    effectiveClientCount = tierRow?.clientLimit ?? effectiveClientCount;
    if (!priceId) {
      throw new Error(
        `Stripe Price ID not configured for ${envKey}. Create the price in Stripe and set the env var.`,
      );
    }
  } else if (
    effectiveRegion === 'GB' &&
    clientCount != null &&
    (billingPeriod === 'monthly' || billingPeriod === 'annual' || billingPeriod === undefined)
  ) {
    const track: PackageTrack = packageTrack === 'gym' ? 'gym' : 'solo';
    const row = getPaidTierForPackageTrack(clientCount, track);
    const bp: BillingPeriod = billingPeriod === 'annual' ? 'annual' : 'monthly';
    const mode = stripeModeSuffix();
    const envKey = capacityPriceEnvKey(row.id, bp, mode);
    const pid = process.env[envKey];
    if (pid) {
      priceId = pid;
      capacityTierId = row.id;
      capacityBillingPeriod = bp;
      effectiveClientCount = row.clientLimit;
    }
  }
  if (!priceId && region != null && clientCount != null) {
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
        'Set capacity env vars (STRIPE_PACKAGE_* ) or STRIPE_PRICE_<REGION>_<TIER>.',
    );
  }

  const stripe = getStripe();

  const orgDoc = await db.doc(`organizations/${organizationId}`).get();
  if (!orgDoc.exists) {
    throw new Error('Organization not found.');
  }
  const orgData = orgDoc.data();
  await assertOrgBillingCallableAccess(db, request.auth.uid, organizationId, orgData);

  /** Only explicit `false` (not purchased) — matches client upsell; legacy `undefined` keeps prior behaviour without a surprise charge. */
  const wantsBranding =
    includeCustomBranding === true && orgData?.customBrandingEnabled === false;
  const orgRegion = (orgData?.subscription?.region ?? orgData?.region) as string | undefined;
  const brandingCurrency = regionToCurrency(orgRegion || 'GB');
  const brandingPriceId = wantsBranding ? brandingPriceIdForCurrency(brandingCurrency) : undefined;
  if (wantsBranding && !brandingPriceId) {
    throw new Error(
      `Custom branding price is not configured for currency ${brandingCurrency}. Set STRIPE_CUSTOM_BRANDING_${stripeModeSuffix()} or STRIPE_PRICE_BRANDING_* .`,
    );
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

  const tierRow = capacityTierId ? getPaidTierById(capacityTierId) : undefined;
  const meta: Record<string, string> = {
    organizationId,
    region: String(effectiveRegion),
    clientCount: String(effectiveClientCount),
  };
  if (capacityTierId && tierRow) {
    meta.tierId = capacityTierId;
    meta.billingPeriod = capacityBillingPeriod;
    meta.clientLimit = String(tierRow.clientLimit);
    meta.monthlyAiCredits = String(tierRow.monthlyAiCredits);
  }
  if (wantsBranding) {
    meta.customBranding = 'true';
  }

  const lineItems: { price: string; quantity: number }[] = [{ price: priceId, quantity: 1 }];
  if (brandingPriceId) {
    lineItems.push({ price: brandingPriceId, quantity: 1 });
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: lineItems,
    success_url: `${baseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/billing`,
    metadata: meta,
    subscription_data: {
      metadata: { ...meta },
    },
  });

  return {
    sessionUrl: session.url,
    sessionId: session.id,
  };
}

// ---------------------------------------------------------------------------
// createLandingGuestCheckoutSession — unauthenticated callable (test mode only)
// ---------------------------------------------------------------------------
export interface LandingGuestCheckoutRequest {
  region: Region;
  clientCount: number;
  billingPeriod: BillingPeriod;
  packageTrack: PackageTrack;
}

/**
 * Public marketing flow: same Stripe prices as logged-in checkout, no Firebase org.
 * Gated by ENABLE_LANDING_GUEST_CHECKOUT + STRIPE_MODE=test. Rate-limited by IP.
 */
export async function handleCreateLandingGuestCheckoutSession(
  request: CallableRequest<LandingGuestCheckoutRequest>,
): Promise<{ sessionUrl: string | null; sessionId: string }> {
  if (process.env.ENABLE_LANDING_GUEST_CHECKOUT !== 'true') {
    throw new HttpsError(
      'permission-denied',
      'Landing guest checkout is off: set ENABLE_LANDING_GUEST_CHECKOUT=true in functions/.env (or Cloud Run env), then redeploy createLandingGuestCheckoutSession.',
    );
  }
  const stripeMode = (process.env.STRIPE_MODE || 'test').toLowerCase();
  if (stripeMode !== 'test') {
    throw new HttpsError(
      'failed-precondition',
      'Landing guest checkout is only allowed when STRIPE_MODE=test.',
    );
  }

  const db = admin.firestore();
  try {
    await assertRateLimit(
      db,
      buildRateLimitKey('landing_guest_checkout', undefined, request.rawRequest?.ip),
      { maxRequests: 8, windowSeconds: 60 },
    );
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'RATE_LIMITED') {
      throw new HttpsError('resource-exhausted', 'Too many checkout attempts. Try again shortly.');
    }
    throw e;
  }

  const { region, clientCount, billingPeriod, packageTrack } = request.data || ({} as LandingGuestCheckoutRequest);

  if (region !== 'GB') {
    throw new HttpsError('invalid-argument', 'Only GB region is supported.');
  }
  if (typeof clientCount !== 'number' || !Number.isFinite(clientCount) || clientCount < 1 || clientCount > 300) {
    throw new HttpsError('invalid-argument', 'Invalid client count.');
  }
  if (billingPeriod !== 'monthly' && billingPeriod !== 'annual') {
    throw new HttpsError('invalid-argument', 'Invalid billing period.');
  }
  if (packageTrack !== 'solo' && packageTrack !== 'gym') {
    throw new HttpsError('invalid-argument', 'Invalid package track.');
  }

  const track: PackageTrack = packageTrack === 'gym' ? 'gym' : 'solo';
  const row = getPaidTierForPackageTrack(clientCount, track);
  const bp: BillingPeriod = billingPeriod === 'annual' ? 'annual' : 'monthly';
  const modeSuffix = stripeModeSuffix();
  const envKey = capacityPriceEnvKey(row.id, bp, modeSuffix);
  const priceId = process.env[envKey];
  if (!priceId) {
    throw new HttpsError(
      'failed-precondition',
      `Stripe price not configured for ${envKey}. Set capacity env vars in functions/.env.`,
    );
  }

  const stripe = getStripe();
  const baseUrl = (process.env.APP_URL || 'https://one-assess.com').replace(/\/$/, '');

  const meta: Record<string, string> = {
    landingGuestPreview: 'true',
    region: 'GB',
    clientCount: String(row.clientLimit),
    tierId: row.id,
    billingPeriod: bp,
    clientLimit: String(row.clientLimit),
    monthlyAiCredits: String(row.monthlyAiCredits),
  };

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/checkout/cancel`,
    metadata: meta,
    subscription_data: {
      metadata: { ...meta },
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

/** Solo vs gym for which Stripe portal configuration to open. */
function packageTrackForPortal(
  orgData: FirebaseFirestore.DocumentData | undefined,
): PackageTrack {
  const sub = orgData?.subscription as Record<string, unknown> | undefined;
  const explicit = typeof sub?.packageTrack === 'string' ? sub.packageTrack : undefined;
  if (explicit === 'gym') return 'gym';
  if (explicit === 'solo') return 'solo';
  const t = typeof sub?.type === 'string' ? sub.type : undefined;
  if (t === 'gym' || t === 'gym_chain') return 'gym';
  if (t === 'solo_coach') return 'solo';
  const rootType = typeof orgData?.type === 'string' ? orgData.type : undefined;
  if (rootType === 'gym' || rootType === 'gym_chain') return 'gym';
  return 'solo';
}

/**
 * Customer portal configuration (bpc_...). Track-specific env vars isolate solo vs gym plan lists.
 * STRIPE_BILLING_PORTAL_CONFIGURATION_ID_SOLO_TEST | _SOLO_LIVE | _GYM_TEST | _GYM_LIVE, or legacy _TEST/_LIVE.
 */
function resolveBillingPortalConfigurationId(
  orgData: FirebaseFirestore.DocumentData | undefined,
): string | undefined {
  const mode = (process.env.STRIPE_MODE || 'test').toLowerCase();
  const isLive = mode === 'live';
  const track = packageTrackForPortal(orgData);

  const soloId = isLive
    ? process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID_SOLO_LIVE?.trim()
    : process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID_SOLO_TEST?.trim();
  const gymId = isLive
    ? process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID_GYM_LIVE?.trim()
    : process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID_GYM_TEST?.trim();

  const trackSpecific = track === 'gym' ? gymId : soloId;
  if (trackSpecific) return trackSpecific;

  const testId = process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID_TEST?.trim();
  const liveId = process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID_LIVE?.trim();
  const fallbackId = process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID?.trim();
  if (isLive) {
    return liveId || fallbackId;
  }
  return testId || fallbackId;
}

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
  await enforceBillingCallableRateLimit(
    db,
    'stripe_portal',
    request.auth.uid,
    request.rawRequest?.ip,
  );

  const orgDoc = await db.doc(`organizations/${organizationId}`).get();
  if (!orgDoc.exists) {
    throw new Error('Organization not found.');
  }
  const orgData = orgDoc.data();
  await assertOrgBillingCallableAccess(db, request.auth.uid, organizationId, orgData);

  const customerId = orgData?.stripe?.stripeCustomerId;
  if (!customerId) {
    throw new Error('No Stripe customer found for this organization. Please subscribe first.');
  }

  const stripe = getStripe();
  const baseUrl = process.env.APP_URL || 'https://one-assess.com';

  const portalConfigurationId = resolveBillingPortalConfigurationId(orgData);
  const sessionParams: Stripe.BillingPortal.SessionCreateParams = {
    customer: customerId,
    return_url: `${baseUrl}/billing`,
  };
  if (portalConfigurationId) {
    sessionParams.configuration = portalConfigurationId;
  }

  const [session, subsForCustomer] = await Promise.all([
    stripe.billingPortal.sessions.create(sessionParams),
    stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 20 }),
  ]);
  const hasStripeSubscriptions = subsForCustomer.data.length > 0;

  return { url: session.url, hasStripeSubscriptions };
}

// ---------------------------------------------------------------------------
// updateSubscriptionPlan — in-app capacity change (GB), no Customer Portal
// ---------------------------------------------------------------------------

export interface UpdateSubscriptionPlanRequest {
  organizationId: string;
  region: Region;
  clientCount: number;
  billingPeriod: BillingPeriod;
  packageTrack?: PackageTrack;
}

export interface UpdateSubscriptionPlanResponse {
  ok: true;
  unchanged?: boolean;
}

/**
 * Updates the org's Stripe subscription to a new capacity price (same billing interval only).
 * Monthly ↔ annual requires a different Stripe flow; we surface a clear error.
 */
export async function handleUpdateSubscriptionPlan(
  request: CallableRequest<UpdateSubscriptionPlanRequest>,
): Promise<UpdateSubscriptionPlanResponse> {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }

  const { organizationId, region, clientCount, billingPeriod, packageTrack } = request.data;

  if (!organizationId) {
    throw new HttpsError('invalid-argument', 'Missing required field: organizationId.');
  }
  if (region !== 'GB') {
    throw new HttpsError(
      'failed-precondition',
      'In-app plan changes are only available for UK (GB) organisations. Contact support for other regions.',
    );
  }
  if (clientCount == null || clientCount < 1) {
    throw new HttpsError('invalid-argument', 'Invalid client count.');
  }
  if (billingPeriod !== 'monthly' && billingPeriod !== 'annual') {
    throw new HttpsError('invalid-argument', 'billingPeriod must be monthly or annual.');
  }

  const db = admin.firestore();
  await enforceBillingCallableRateLimit(
    db,
    'stripe_plan_update',
    request.auth.uid,
    request.rawRequest?.ip,
  );

  const orgDoc = await db.doc(`organizations/${organizationId}`).get();
  if (!orgDoc.exists) {
    throw new HttpsError('not-found', 'Organization not found.');
  }
  const orgData = orgDoc.data();
  await assertOrgBillingCallableAccess(db, request.auth.uid, organizationId, orgData);

  const subId =
    typeof orgData?.stripe?.stripeSubscriptionId === 'string'
      ? orgData.stripe.stripeSubscriptionId.trim()
      : '';
  if (!subId) {
    throw new HttpsError(
      'failed-precondition',
      'No subscription ID on file. Use checkout below to subscribe first, or contact support.',
    );
  }

  const track: PackageTrack = packageTrack === 'gym' ? 'gym' : 'solo';
  const row = getPaidTierForPackageTrack(clientCount, track);
  const bp: BillingPeriod = billingPeriod === 'annual' ? 'annual' : 'monthly';
  const mode = stripeModeSuffix();
  const envKey = capacityPriceEnvKey(row.id, bp, mode);
  const priceId = process.env[envKey];
  if (!priceId) {
    throw new HttpsError(
      'failed-precondition',
      `Stripe price not configured for ${envKey}. Set the env var in Cloud Functions.`,
    );
  }

  const stripe = getStripe();
  const sub = await stripe.subscriptions.retrieve(subId, { expand: ['items.data.price'] });
  const item = sub.items?.data?.[0];
  if (!item?.id) {
    throw new HttpsError('failed-precondition', 'Subscription has no line items to update.');
  }

  const priceObj = item.price;
  const expanded =
    priceObj && typeof priceObj === 'object' && 'recurring' in priceObj
      ? (priceObj as Stripe.Price)
      : null;
  const currentInterval = expanded?.recurring?.interval;
  const targetInterval: Stripe.Price.Recurring.Interval = bp === 'annual' ? 'year' : 'month';
  if (currentInterval && currentInterval !== targetInterval) {
    throw new HttpsError(
      'failed-precondition',
      'Switching between monthly and annual billing is not available in-app yet. Use Card & invoices (Stripe) or contact support.',
    );
  }

  const currentPriceId = typeof priceObj === 'string' ? priceObj : priceObj?.id;
  if (currentPriceId === priceId) {
    return { ok: true, unchanged: true };
  }

  const meta: Stripe.MetadataParam = {
    ...(sub.metadata as Stripe.Metadata),
    organizationId,
    tierId: row.id,
    billingPeriod: bp,
    clientLimit: String(row.clientLimit),
    monthlyAiCredits: String(row.monthlyAiCredits),
    region: 'GB',
    clientCount: String(row.clientLimit),
  };

  await stripe.subscriptions.update(subId, {
    items: [{ id: item.id, price: priceId }],
    proration_behavior: 'create_prorations',
    metadata: meta,
  });

  return { ok: true };
}

// ---------------------------------------------------------------------------
// createBrandingCheckoutSession — one-time payment for custom branding add-on
// ---------------------------------------------------------------------------
export interface BrandingCheckoutRequest {
  organizationId: string;
  /** Return URL after successful payment (default billing). */
  returnTarget?: 'billing' | 'settings';
}

function brandingPriceIdForCurrency(currency: string): string | undefined {
  const mode = stripeModeSuffix();
  if (currency === 'GBP') {
    return (
      process.env[brandingPriceEnvKey(mode)] ||
      process.env.STRIPE_PRICE_BRANDING_GBP
    );
  }
  if (currency === 'USD') return process.env.STRIPE_PRICE_BRANDING_USD;
  if (currency === 'KWD') return process.env.STRIPE_PRICE_BRANDING_KWD;
  return undefined;
}

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
  await enforceBillingCallableRateLimit(
    db,
    'stripe_branding_checkout',
    request.auth.uid,
    request.rawRequest?.ip,
  );

  const orgDoc = await db.doc(`organizations/${organizationId}`).get();
  if (!orgDoc.exists) {
    throw new Error('Organization not found.');
  }
  const orgData = orgDoc.data();
  await assertOrgBillingCallableAccess(db, request.auth.uid, organizationId, orgData);
  if (orgData?.customBrandingEnabled === true) {
    throw new Error('Custom branding is already enabled for this organization.');
  }

  const region = (orgData?.subscription?.region ?? orgData?.region) as string || 'GB';
  const currency = regionToCurrency(region);
  const priceId = brandingPriceIdForCurrency(currency);
  if (!priceId) {
    throw new Error(
      `Stripe Price ID for custom branding (${currency}) not configured. Set STRIPE_CUSTOM_BRANDING_${stripeModeSuffix()} or STRIPE_PRICE_BRANDING_* .`,
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
  const returnTarget = request.data.returnTarget === 'settings' ? 'settings' : 'billing';
  const successUrl =
    returnTarget === 'settings'
      ? `${baseUrl}/settings?tab=organization&orgTab=branding&branding_purchase=success`
      : `${baseUrl}/billing?branding=success`;
  const cancelUrl =
    returnTarget === 'settings'
      ? `${baseUrl}/settings?tab=organization&orgTab=branding`
      : `${baseUrl}/billing`;

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'payment',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      organizationId,
      customBranding: 'true',
    },
  });

  return { sessionUrl: session.url, sessionId: session.id };
}

// ---------------------------------------------------------------------------
// syncCheckoutSession — idempotent org sync when Stripe webhooks are delayed/missed
// ---------------------------------------------------------------------------

export interface SyncCheckoutSessionRequest {
  sessionId: string;
}

export type SyncCheckoutSessionResponse = {
  ok: true;
  appliedSubscription: boolean;
  detail?: string;
};

export async function handleSyncCheckoutSession(
  request: CallableRequest<SyncCheckoutSessionRequest>,
): Promise<SyncCheckoutSessionResponse> {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }
  const sessionId =
    typeof request.data?.sessionId === 'string' ? request.data.sessionId.trim() : '';
  if (!sessionId) {
    throw new HttpsError('invalid-argument', 'sessionId is required.');
  }

  const db = admin.firestore();
  await enforceBillingCallableRateLimit(
    db,
    'stripe_sync_checkout',
    request.auth.uid,
    request.rawRequest?.ip,
  );

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['subscription'],
  });

  if (session.metadata?.landingGuestPreview === 'true') {
    return { ok: true, appliedSubscription: false, detail: 'guest_preview' };
  }

  const orgId = session.metadata?.organizationId;
  if (!orgId) {
    throw new HttpsError(
      'failed-precondition',
      'This checkout session is not linked to an organisation.',
    );
  }

  const orgDoc = await db.doc(`organizations/${orgId}`).get();
  if (!orgDoc.exists) {
    throw new HttpsError('not-found', 'Organisation not found.');
  }
  await assertOrgBillingCallableAccess(db, request.auth.uid, orgId, orgDoc.data());

  if (session.subscription) {
    const result = await applySubscriptionCheckoutToOrganization(db, stripe, {
      orgId,
      session,
      sendSubscriptionAlert: false,
    });
    if (result.applied) {
      return { ok: true, appliedSubscription: true };
    }
    return {
      ok: true,
      appliedSubscription: false,
      detail: result.reason,
    };
  }

  if (session.payment_status === 'paid' && session.metadata?.customBranding === 'true') {
    await db.doc(`organizations/${orgId}`).update({
      customBrandingEnabled: true,
      customBrandingPaidAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { ok: true, appliedSubscription: false, detail: 'branding_only' };
  }

  return { ok: true, appliedSubscription: false, detail: 'not_subscription_checkout' };
}

// ---------------------------------------------------------------------------
// stripeWebhook — HTTP function handler
// ---------------------------------------------------------------------------
import type { Request, Response } from 'express';
import {
  alertNewSubscription,
  alertSubscriptionCancelled,
  alertPaymentFailed,
  alertTrialEnding,
} from './slackBillingAlerts';
import { sendTrialEndingSoonEmail } from './trialNudges';

export async function handleStripeWebhook(req: Request, res: Response) {
  const webhookSecret = resolveWebhookSecret();
  if (!webhookSecret) {
    logger.error('Stripe webhook secret not configured');
    res.status(500).send('Webhook secret not configured');
    return;
  }

  const stripe = getStripe();
  const sig = req.headers['stripe-signature'] as string;

  let event: Stripe.Event;
  try {
    const rawBody = (req as unknown as { rawBody: Buffer }).rawBody || req.body;
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    logger.error('Stripe webhook signature verification failed', err);
    res.status(400).send('Webhook signature verification failed');
    return;
  }

  const db = admin.firestore();
  let processingClaimed = false;
  try {
    const mode = await beginStripeWebhookProcessing(db, event);
    if (mode === 'duplicate') {
      logger.info('Stripe webhook skipped (duplicate or concurrent)', {
        eventId: event.id,
        type: event.type,
      });
      res.status(200).json({ received: true, duplicate: true });
      return;
    }
    processingClaimed = true;
    await runStripeWebhookHandlers(db, stripe, event);
    await markStripeWebhookEventCompleted(db, event.id);
    res.status(200).json({ received: true });
  } catch (err) {
    if (processingClaimed) {
      await clearStripeWebhookProcessingLock(db, event.id);
    }
    logger.error('Stripe webhook handler failed', {
      eventId: event.id,
      type: event.type,
      err,
    });
    res.status(500).send('Webhook handler failed');
  }
}

async function runStripeWebhookHandlers(
  db: admin.firestore.Firestore,
  stripe: Stripe,
  event: Stripe.Event,
): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.metadata?.landingGuestPreview === 'true') {
        logger.info('checkout.session.completed — landing guest preview (no organization write)', {
          eventId: event.id,
        });
        break;
      }
      const orgId = session.metadata?.organizationId;

      if (orgId && session.subscription) {
        const applied = await applySubscriptionCheckoutToOrganization(db, stripe, {
          orgId,
          session,
          sendSubscriptionAlert: true,
        });
        if (!applied.applied && applied.reason === 'payment_not_complete') {
          logger.info('checkout.session.completed — subscription checkout skipped until payment completes', {
            eventId: event.id,
            orgId,
            payment_status: session.payment_status,
          });
        }
      }

      if (orgId && session.payment_status === 'paid' && !session.subscription && session.metadata?.customBranding === 'true') {
        await db.doc(`organizations/${orgId}`).update({
          customBrandingEnabled: true,
          customBrandingPaidAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        logger.info('checkout.session.completed — custom branding paid', { eventId: event.id, orgId });
      }

      // Credit top-up: add the purchased credits to the org's balance
      if (orgId && session.payment_status === 'paid' && session.metadata?.type === 'credit_topup') {
        const qty = parseMetadataInt(
          session.metadata?.creditQuantity,
          20,
          METADATA_MAX_CREDIT_TOPUP_QTY,
        );
        const claimed = await claimCreditTopupCheckoutSession(db, session.id, {
          orgId,
          stripeEventId: event.id,
          quantity: qty,
        });
        if (!claimed) {
          logger.info('credit_topup skipped — checkout session already fulfilled', {
            eventId: event.id,
            sessionId: session.id,
            orgId,
          });
          break;
        }
        await db.doc(`organizations/${orgId}`).update({
          assessmentCredits: admin.firestore.FieldValue.increment(qty),
          [ASSESSMENT_CREDITS_TOPUP_BALANCE]: admin.firestore.FieldValue.increment(qty),
          lastCreditTopupAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        logger.info('credit_topup applied', { eventId: event.id, orgId, qty, sessionId: session.id });
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

        const item0 = subscription.items?.data?.[0];
        const priceObj = item0?.price;
        const stripePriceId = typeof priceObj === 'string' ? priceObj : priceObj?.id;
        const tierFromPrice = paidTierFromPriceId(stripePriceId);
        const metaTier = subscription.metadata?.tierId;
        const capacityTierId: PaidCapacityTierId | undefined = isPaidTierId(metaTier)
          ? metaTier
          : tierFromPrice;
        if (capacityTierId) {
          const row = getPaidTierById(capacityTierId);
          if (row) {
            updateData['subscription.capacityTierId'] = capacityTierId;
            updateData['subscription.clientCap'] = row.clientLimit;
            updateData['subscription.clientSeats'] = row.clientLimit;
            updateData['subscription.clientCount'] = row.clientLimit;
            updateData['subscription.monthlyAiCredits'] = row.monthlyAiCredits;
            updateData['subscription.plan'] = `package_${capacityTierId.toLowerCase()}`;
          }
        }
        if (stripePriceId) {
          updateData['stripe.stripePriceId'] = stripePriceId;
        }

        // cancel_at gives us the period end if set
        if (subscription.cancel_at) {
          updateData['stripe.cancelAt'] = new Date(subscription.cancel_at * 1000);
        }

        await db.doc(`organizations/${orgId}`).update(updateData);
        logger.info('subscription.updated', { eventId: event.id, orgId, status });

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
        logger.info('subscription.deleted', { eventId: event.id, orgId });

        const orgSnap = await db.doc(`organizations/${orgId}`).get();
        const orgData = orgSnap.data();
        const ownerId: string | undefined = orgData?.ownerId;
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

        const cancelDetails = (subscription as unknown as { cancellation_details?: { reason?: string; comment?: string } }).cancellation_details;
        const reason = cancelDetails?.comment || cancelDetails?.reason || undefined;
        alertSubscriptionCancelled({ orgId, orgName: orgData?.name as string | undefined, reason });
      }
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice & {
        subscription?: string | Stripe.Subscription | null;
      };
      const subRef = invoice.subscription;
      const subId =
        typeof subRef === 'string' ? subRef : subRef && typeof subRef === 'object' ? subRef.id : null;
      if (!subId) {
        logger.info('invoice.payment_failed — no subscription on invoice', {
          eventId: event.id,
          invoiceId: invoice.id,
        });
        break;
      }

      let orgId: string | undefined;
      try {
        const sub = await stripe.subscriptions.retrieve(subId);
        orgId = sub.metadata?.organizationId;
      } catch (e) {
        logger.error('invoice.payment_failed — failed to load subscription', {
          eventId: event.id,
          subId,
          err: e,
        });
        break;
      }
      if (!orgId) {
        logger.info('invoice.payment_failed — missing organizationId on subscription', {
          eventId: event.id,
          invoiceId: invoice.id,
          subId,
        });
        break;
      }

      logger.info('invoice.payment_failed', { eventId: event.id, orgId, invoiceId: invoice.id });

      const orgSnap = await db.doc(`organizations/${orgId}`).get();
      const orgData = orgSnap.data();
      const ownerId: string | undefined = orgData?.ownerId;
      if (ownerId) {
        await db.collection(`notifications/${ownerId}/items`).add({
          type: 'invoice_payment_failed',
          title: 'Payment failed — update your card',
          body: 'We could not charge your subscription. Please update your payment method in billing to keep your plan active.',
          priority: 'high',
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          recipientUid: ownerId,
          actionUrl: '/billing',
        });
      }

      const attemptCount = (invoice as unknown as { attempt_count?: number }).attempt_count;
      const nextAttempt = (invoice as unknown as { next_payment_attempt?: number }).next_payment_attempt;
      const nextRetryStr = nextAttempt
        ? new Date(nextAttempt * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
        : undefined;
      alertPaymentFailed({
        orgId,
        orgName: orgData?.name as string | undefined,
        invoiceId: invoice.id,
        attemptCount: attemptCount ?? undefined,
        nextRetry: nextRetryStr,
      });
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
      const orgData = orgSnap.data();
      const orgSub = orgData?.subscription as Record<string, unknown> | undefined;
      const capacityTierId = orgSub?.capacityTierId as string | undefined;
      const clientSeats: number = (orgSub?.clientSeats as number) ?? (orgSub?.clientCap as number) ?? 5;
      const rawTopupBal = orgData?.[ASSESSMENT_CREDITS_TOPUP_BALANCE];
      const topupBalance = typeof rawTopupBal === 'number' && rawTopupBal > 0 ? rawTopupBal : 0;

      const item0 = sub.items?.data?.[0];
      const priceObj = item0?.price;
      const stripePriceId = typeof priceObj === 'string' ? priceObj : priceObj?.id;
      const tierFromPrice = paidTierFromPriceId(stripePriceId);

      let monthlyCredits = 0;
      if (isPaidTierId(capacityTierId)) {
        monthlyCredits = getMonthlyAiCreditsForTier(capacityTierId);
      } else if (tierFromPrice) {
        monthlyCredits = getMonthlyAiCreditsForTier(tierFromPrice);
      } else {
        monthlyCredits = getPaidTierByClientCount(clientSeats).monthlyAiCredits;
      }

      const totalCredits = computeAssessmentCreditsWithTopup(monthlyCredits, topupBalance);
      await db.doc(`organizations/${orgId}`).update({
        assessmentCredits: totalCredits,
        creditsReplenishedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      logger.info('invoice.payment_succeeded — credits replenished', {
        eventId: event.id,
        orgId,
        monthlyCredits,
        topupBalance,
        assessmentCredits: totalCredits,
      });
      break;
    }

    case 'customer.subscription.trial_will_end': {
      const subscription = event.data.object as Stripe.Subscription;
      const orgId = subscription.metadata?.organizationId;
      if (orgId) {
        const trialEnd = subscription.trial_end
          ? new Date(subscription.trial_end * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
          : 'in 3 days';
        const orgSnap = await db.doc(`organizations/${orgId}`).get();
        const orgData = orgSnap.data();
        alertTrialEnding({ orgId, orgName: orgData?.name as string | undefined, trialEnd });

        try {
          await sendTrialEndingSoonEmail(orgId, 3);
        } catch (err) {
          logger.error('trial_will_end email failed', { eventId: event.id, orgId, err });
        }

        logger.info('trial_will_end', { eventId: event.id, orgId, trialEnd });
      }
      break;
    }

    default:
      logger.info('Stripe webhook unhandled event type', {
        eventId: event.id,
        type: event.type,
      });
  }
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
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }
  const { organizationId } = request.data;
  if (!organizationId) {
    throw new HttpsError('invalid-argument', 'Missing organizationId.');
  }

  const db = admin.firestore();
  try {
    await assertRateLimit(
      db,
      buildRateLimitKey('credit_topup', request.auth.uid, request.rawRequest?.ip),
      { maxRequests: 10, windowSeconds: 60 },
    );
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'RATE_LIMITED') {
      throw new HttpsError('resource-exhausted', 'Too many credit purchase attempts. Try again shortly.');
    }
    throw e;
  }

  const stripe = getStripe();
  const baseUrl = process.env.APP_URL || 'https://one-assess.com';

  const orgDoc = await db.doc(`organizations/${organizationId}`).get();
  if (!orgDoc.exists) {
    throw new HttpsError('not-found', 'Organization not found.');
  }
  const orgData = orgDoc.data()!;
  if (orgData.ownerId !== request.auth.uid) {
    throw new HttpsError('permission-denied', 'Only the organization owner can purchase credits.');
  }

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
