/**
 * Plan package lines (Solo Coach / Gym · Studio) and GB capacity tiers per track.
 * US/KW use legacy SEAT_TIERS index slices.
 */

import {
  getActivePaidTiersForTrack,
  type PackageTrack,
  SEAT_TIERS,
  type BillingPeriod,
  type Region,
} from '@/constants/pricing';
import { getMonthlyPrice } from '@/lib/pricing/config';
import type { BusinessType } from '@/types/onboarding';

export const DEFAULT_PLAN_CLIENT_COUNT = 10;

/** Billing package line — same as capacity PackageTrack */
export type PlanPackageTrack = PackageTrack;

export const PLAN_PACKAGE_TRACK_COPY: Record<
  PlanPackageTrack,
  { title: string; subtitle: string }
> = {
  solo: {
    title: 'Solo Coach',
    subtitle: 'Independent coach — up to 100 clients on paid tiers; contact us beyond that',
  },
  gym: {
    title: 'Gym / Studio',
    subtitle: 'Teams & member volume — 50 to 250 clients; contact us for more',
  },
};

const LEGACY_CAPACITY_OPTIONS: readonly number[] = SEAT_TIERS;

const LEGACY_TRACK_SLICES: Record<
  PlanPackageTrack,
  { from: number; to: number; defaultGlobalIndex: number }
> = {
  solo: { from: 1, to: 3, defaultGlobalIndex: 1 },
  gym: { from: 2, to: 9, defaultGlobalIndex: 4 },
};

function gbTiersOrdered(track: PlanPackageTrack) {
  return getActivePaidTiersForTrack(track).sort((a, b) => a.clientLimit - b.clientLimit);
}

export function businessTypeToTrack(bt: BusinessType | undefined): PlanPackageTrack {
  if (bt === 'gym' || bt === 'gym_chain') return 'gym';
  return 'solo';
}

/** Positions 0..n-1 into the tier list for this region/track */
export function tierIndicesForTrack(region: Region, track: PlanPackageTrack): number[] {
  if (region === 'GB') {
    const n = gbTiersOrdered(track).length;
    return Array.from({ length: n }, (_, i) => i);
  }
  const slice = LEGACY_TRACK_SLICES[track];
  const len = slice.to - slice.from + 1;
  return Array.from({ length: len }, (_, i) => slice.from + i);
}

export function defaultTierPosition(region: Region, track: PlanPackageTrack): number {
  if (region === 'GB') {
    const tiers = gbTiersOrdered(track);
    if (track === 'solo') return 0;
    return Math.max(0, Math.floor(tiers.length / 2));
  }
  const slice = LEGACY_TRACK_SLICES[track];
  const indices = tierIndicesForTrack(region, track);
  const pos = indices.indexOf(slice.defaultGlobalIndex);
  return pos >= 0 ? pos : 0;
}

export function tierPositionForClientTarget(
  region: Region,
  track: PlanPackageTrack,
  targetClients: number,
): number {
  const target = Math.max(1, Math.floor(targetClients));
  if (region === 'GB') {
    const tiers = gbTiersOrdered(track);
    for (let pos = 0; pos < tiers.length; pos++) {
      if (tiers[pos]!.clientLimit >= target) return pos;
    }
    return Math.max(0, tiers.length - 1);
  }
  const indices = tierIndicesForTrack(region, track);
  for (let pos = 0; pos < indices.length; pos++) {
    const g = indices[pos]!;
    const cap = LEGACY_CAPACITY_OPTIONS[g]!;
    if (cap >= target) return pos;
  }
  return Math.max(0, indices.length - 1);
}

export function clientCountFromPosition(
  region: Region,
  track: PlanPackageTrack,
  position: number,
): number {
  if (region === 'GB') {
    const tiers = gbTiersOrdered(track);
    const row = tiers[Math.min(position, tiers.length - 1)];
    return row?.clientLimit ?? DEFAULT_PLAN_CLIENT_COUNT;
  }
  const indices = tierIndicesForTrack(region, track);
  const globalIdx = indices[Math.min(position, indices.length - 1)] ?? 0;
  return LEGACY_CAPACITY_OPTIONS[globalIdx] ?? DEFAULT_PLAN_CLIENT_COUNT;
}

export type SeatDropdownOption = {
  position: number;
  clients: number;
  displayMonthly: number;
  perClient: number;
};

export function buildSeatDropdownOptions(
  region: Region,
  track: PlanPackageTrack,
  billingPeriod: BillingPeriod,
): SeatDropdownOption[] {
  if (region === 'GB') {
    const tiers = gbTiersOrdered(track);
    return tiers.map((row, position) => {
      const clients = row.clientLimit;
      const displayMonthly =
        billingPeriod === 'annual' ? row.annualPriceGbp / 12 : row.monthlyPriceGbp;
      const perClient = clients > 0 ? displayMonthly / clients : 0;
      return { position, clients, displayMonthly, perClient };
    });
  }
  const indices = tierIndicesForTrack(region, track);
  return indices.map((globalIdx, position) => {
    const clients = LEGACY_CAPACITY_OPTIONS[globalIdx] ?? DEFAULT_PLAN_CLIENT_COUNT;
    const displayMonthly = getMonthlyPrice(region, clients);
    const perClient = clients > 0 ? displayMonthly / clients : 0;
    return { position, clients, displayMonthly, perClient };
  });
}

export function minDisplayMonthlyInTrack(
  region: Region,
  track: PlanPackageTrack,
  billingPeriod: BillingPeriod,
): number {
  const opts = buildSeatDropdownOptions(region, track, billingPeriod);
  if (opts.length === 0) return 0;
  return Math.min(...opts.map((o) => o.displayMonthly));
}
