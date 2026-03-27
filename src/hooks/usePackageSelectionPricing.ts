import { useMemo } from 'react';
import {
  REGION_TO_CURRENCY,
  DEFAULT_REGION,
  getPaidTierForPackageTrack,
  type Region,
  type BillingPeriod,
} from '@/constants/pricing';
import { getMonthlyPrice } from '@/lib/pricing/config';
import { getLocaleForRegion } from '@/lib/utils/currency';
import type { BusinessType } from '@/types/onboarding';
import {
  type PlanPackageTrack,
  buildSeatDropdownOptions,
  clientCountFromPosition,
} from '@/lib/pricing/planPackageTracks';

export interface UsePackageSelectionPricingParams {
  region?: Region;
  track: PlanPackageTrack;
  tierPosition: number;
  businessType?: BusinessType;
  billingPeriod: BillingPeriod;
}

export interface PackageSelectionPricing {
  clientCount: number;
  currency: string;
  locale: string;
  monthlyFee: number;
  tierRow: ReturnType<typeof getPaidTierForPackageTrack> | null;
  displayPrice: number;
  seatOptions: ReturnType<typeof buildSeatDropdownOptions>;
  isSoloFreeOnboarding: boolean;
}

export function usePackageSelectionPricing(
  params: UsePackageSelectionPricingParams,
): PackageSelectionPricing {
  const {
    region = DEFAULT_REGION,
    track,
    tierPosition,
    businessType,
    billingPeriod,
  } = params;

  const clientCount = useMemo(
    () => clientCountFromPosition(region, track, tierPosition),
    [region, track, tierPosition],
  );

  const currency = REGION_TO_CURRENCY[region];
  const locale = getLocaleForRegion(region);
  const monthlyFee = getMonthlyPrice(region, clientCount);
  const tierRow =
    region === 'GB' ? getPaidTierForPackageTrack(clientCount, track) : null;
  const isSoloFreeOnboarding = businessType === 'solo_coach';
  const displayPrice =
    region === 'GB' && tierRow && billingPeriod === 'annual'
      ? tierRow.annualPriceGbp / 12
      : monthlyFee;

  const seatOptions = useMemo(
    () => buildSeatDropdownOptions(region, track, billingPeriod),
    [region, track, billingPeriod],
  );

  return useMemo(
    () => ({
      clientCount,
      currency,
      locale,
      monthlyFee,
      tierRow,
      displayPrice,
      seatOptions,
      isSoloFreeOnboarding,
    }),
    [
      clientCount,
      currency,
      locale,
      monthlyFee,
      tierRow,
      displayPrice,
      seatOptions,
      isSoloFreeOnboarding,
    ],
  );
}
