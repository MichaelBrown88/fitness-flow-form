/**
 * One-off admin script: create Stripe Products/Prices for capacity billing (GBP).
 * Iterates `CAPACITY_TIERS` (solo S10–S100, gym G50–G250, plus legacy A–F).
 *
 * Run from `functions/` with a secret key set:
 *   STRIPE_SECRET_KEY=sk_test_... npx ts-node --transpile-only src/scripts/createStripeCatalog.ts
 *
 * Paste printed STRIPE_PACKAGE_* and STRIPE_CUSTOM_BRANDING_* lines into Firebase Functions env.
 * Do NOT deploy this file as an HTTP endpoint.
 */

import Stripe from 'stripe';
import {
  CAPACITY_TIERS,
  capacityPriceEnvKey,
  brandingPriceEnvKey,
  CUSTOM_BRANDING_PRICE_GBP,
} from '../shared/billing/capacityTiers';

async function main(): Promise<void> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('Set STRIPE_SECRET_KEY (test or live) before running this script.');
  }

  const stripe = new Stripe(key, {
    apiVersion: '2024-11-20.acacia' as Stripe.StripeConfig['apiVersion'],
  });
  const isLive = key.startsWith('sk_live');
  const mode = isLive ? 'LIVE' : 'TEST';

  const subProduct = await stripe.products.create({
    name: 'One Assess Subscription',
    description: 'Capacity-based coach subscription (GBP)',
  });

  console.log(`\n# Subscription product id: ${subProduct.id}\n`);

  for (const tier of CAPACITY_TIERS) {
    const monthly = await stripe.prices.create({
      product: subProduct.id,
      currency: 'gbp',
      unit_amount: Math.round(tier.monthlyPriceGbp * 100),
      recurring: { interval: 'month' },
      metadata: { tierId: tier.id, period: 'monthly' },
    });
    const annual = await stripe.prices.create({
      product: subProduct.id,
      currency: 'gbp',
      unit_amount: Math.round(tier.annualPriceGbp * 100),
      recurring: { interval: 'year' },
      metadata: { tierId: tier.id, period: 'annual' },
    });

    const kM = capacityPriceEnvKey(tier.id, 'monthly', mode);
    const kA = capacityPriceEnvKey(tier.id, 'annual', mode);
    console.log(`${kM}=${monthly.id}`);
    console.log(`${kA}=${annual.id}`);
  }

  const brandingProduct = await stripe.products.create({
    name: 'One Assess Custom Branding',
    description: 'One-time white-label branding add-on',
  });
  const brandingPrice = await stripe.prices.create({
    product: brandingProduct.id,
    currency: 'gbp',
    unit_amount: Math.round(CUSTOM_BRANDING_PRICE_GBP * 100),
    metadata: { type: 'custom_branding' },
  });

  const bk = brandingPriceEnvKey(mode);
  console.log(`\n${bk}=${brandingPrice.id}`);
  console.log(`\n# Optional legacy alias for GBP branding checkout:\n# STRIPE_PRICE_BRANDING_GBP=${brandingPrice.id}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
