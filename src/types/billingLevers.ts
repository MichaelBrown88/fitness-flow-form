import type { PackageTrack, PaidCapacityTierId, BillingPeriod } from '@/constants/pricing';
import { getActivePaidTiersForTrack } from '@/constants/pricing';

export type DraftSubscription = {
  track: PackageTrack;
  tierId: PaidCapacityTierId;
  period: BillingPeriod;
  branding: boolean;
};

export type CurrentSubscription = {
  track: PackageTrack;
  tierId: PaidCapacityTierId;
  period: BillingPeriod;
  customBrandingEnabled: boolean;
};

export type DraftAction =
  | { type: 'SET_TRACK'; track: PackageTrack }
  | { type: 'SET_TIER'; tierId: PaidCapacityTierId }
  | { type: 'SET_PERIOD'; period: BillingPeriod }
  | { type: 'SET_BRANDING'; branding: boolean }
  | { type: 'RESET'; initial: DraftSubscription };

export function draftReducer(state: DraftSubscription, action: DraftAction): DraftSubscription {
  switch (action.type) {
    case 'SET_TRACK': {
      if (action.track === state.track) return state;
      const tiers = getActivePaidTiersForTrack(action.track);
      const sorted = [...tiers].sort((a, b) => a.clientLimit - b.clientLimit);
      const fallback = sorted[0];
      if (!fallback) return { ...state, track: action.track };
      // Pick the tier closest to current capacity in the new track
      const currentTier = getActivePaidTiersForTrack(state.track).find(t => t.id === state.tierId);
      const currentLimit = currentTier?.clientLimit ?? 0;
      const best = sorted.reduce((prev, curr) =>
        Math.abs(curr.clientLimit - currentLimit) < Math.abs(prev.clientLimit - currentLimit) ? curr : prev,
      );
      return { ...state, track: action.track, tierId: (best ?? fallback).id };
    }
    case 'SET_TIER':
      return state.tierId === action.tierId ? state : { ...state, tierId: action.tierId };
    case 'SET_PERIOD':
      return state.period === action.period ? state : { ...state, period: action.period };
    case 'SET_BRANDING':
      return state.branding === action.branding ? state : { ...state, branding: action.branding };
    case 'RESET':
      return action.initial;
  }
}

export function draftEquals(a: DraftSubscription, b: DraftSubscription): boolean {
  return a.track === b.track && a.tierId === b.tierId && a.period === b.period && a.branding === b.branding;
}
