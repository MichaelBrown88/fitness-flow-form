import {
  getPaidTierById,
  getPaidTierForPackageTrack,
  isPaidCapacityTierId,
  type PackageTrack,
} from '@/constants/pricing';

const LEGACY_PLAN_LABELS: Record<string, string> = {
  starter: 'Starter',
  professional: 'Professional',
  enterprise: 'Enterprise',
  free: 'Free',
  none: 'No plan',
};

/**
 * Coach-visible plan title: capacity package label when known, else legacy plan names, else humanized key.
 */
export function subscriptionPlanDisplayHeadline(input: {
  plan: string;
  capacityTierId?: string;
  clientCap?: number;
  packageTrack?: PackageTrack;
}): string {
  const { plan, capacityTierId, clientCap, packageTrack } = input;

  if (capacityTierId) {
    const id = capacityTierId.toUpperCase();
    if (isPaidCapacityTierId(id)) {
      const row = getPaidTierById(id);
      if (row) return row.label;
    }
  }

  const pkg = plan.toLowerCase();
  if (pkg.startsWith('package_')) {
    const raw = pkg.slice('package_'.length).toUpperCase();
    if (isPaidCapacityTierId(raw)) {
      const row = getPaidTierById(raw);
      if (row) return row.label;
    }
  }

  if (typeof clientCap === 'number' && clientCap > 0 && packageTrack) {
    return getPaidTierForPackageTrack(clientCap, packageTrack).label;
  }

  const legacy = LEGACY_PLAN_LABELS[plan];
  if (legacy) return legacy;

  const human = plan.replace(/_/g, ' ').trim();
  if (human.length === 0) return 'Plan';
  return human.charAt(0).toUpperCase() + human.slice(1);
}
