import { COACH_WORKSPACE_PROFILE_COPY } from '@/constants/coachWorkspaceProfileCopy';

/** Org root subscription snapshot (or full Subscription-shaped object). */
export function coachPlanSubtitle(
  subscription:
    | { planKind?: string; status?: string }
    | undefined,
): string {
  const pk = subscription?.planKind;
  if (!pk) {
    return COACH_WORKSPACE_PROFILE_COPY.PLAN_FALLBACK;
  }
  switch (pk) {
    case 'solo_free':
      return 'Solo';
    case 'gym_trial':
      return subscription?.status === 'trial' ? 'Gym trial' : 'Gym';
    case 'paid':
      return 'Team';
    case 'pending_onboarding':
      return 'Setup';
    default:
      return COACH_WORKSPACE_PROFILE_COPY.PLAN_FALLBACK;
  }
}
