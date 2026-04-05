import { describe, expect, it } from 'vitest';
import {
  getPaidTierForPackageTrack,
  isPaidCapacityTierId,
  paidTierFromPriceId,
  capacityPriceEnvKey,
} from '@shared/billing/capacityTiers';

describe('capacityTiers (shared with Stripe functions)', () => {
  it('maps solo client count 25 to S35 tier', () => {
    const t = getPaidTierForPackageTrack(25, 'solo');
    expect(t.id).toBe('S35');
    expect(t.clientLimit).toBe(35);
  });

  it('maps gym client count 50 to G50 tier', () => {
    const t = getPaidTierForPackageTrack(50, 'gym');
    expect(t.id).toBe('G50');
    expect(t.packageTrack).toBe('gym');
  });

  it('caps at top solo tier for very large desired client counts', () => {
    const t = getPaidTierForPackageTrack(9999, 'solo');
    expect(t.id).toBe('S100');
    expect(t.clientLimit).toBe(100);
  });

  it('accepts catalog and legacy paid tier ids', () => {
    expect(isPaidCapacityTierId('S10')).toBe(true);
    expect(isPaidCapacityTierId('A')).toBe(true);
    expect(isPaidCapacityTierId('not-a-tier')).toBe(false);
  });

  it('resolves paidTierFromPriceId from env map (webhook / subscription sync)', () => {
    const prevMode = process.env.STRIPE_MODE;
    process.env.STRIPE_MODE = 'test';
    const priceId = 'price_test_s10_monthly_abc';
    const env = {
      [capacityPriceEnvKey('S10', 'monthly', 'TEST')]: priceId,
    } as NodeJS.ProcessEnv;
    try {
      expect(paidTierFromPriceId(priceId, env)).toBe('S10');
      expect(paidTierFromPriceId('price_unknown', env)).toBeUndefined();
    } finally {
      process.env.STRIPE_MODE = prevMode;
    }
  });
});
