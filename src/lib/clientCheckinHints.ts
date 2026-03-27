import type { ClientProfile } from '@/services/clientProfiles';
import type { Timestamp } from 'firebase/firestore';
import { BASE_CADENCE_INTERVALS } from '@/types/client';

export type CheckinHintId = 'lifestyle' | 'posture';

export type CheckinHint = {
  id: CheckinHintId;
  /** Sort key: larger = more overdue / higher priority */
  overdueScore: number;
};

function daysSince(ts: Timestamp | undefined): number | null {
  if (!ts?.toMillis) return null;
  return Math.floor((Date.now() - ts.toMillis()) / (86_400_000));
}

function intervalForPillar(profile: ClientProfile, pillar: 'lifestyle' | 'posture'): number {
  const custom = profile.retestSchedule?.custom?.[pillar];
  const rec = profile.retestSchedule?.recommended?.[pillar];
  const n = custom?.intervalDays ?? rec?.intervalDays ?? BASE_CADENCE_INTERVALS[pillar];
  return typeof n === 'number' && n > 0 ? n : BASE_CADENCE_INTERVALS[pillar];
}

/**
 * Up to two in-profile check-in suggestions (lifestyle / posture) based on last* dates and cadence.
 */
export function getClientCheckinHints(profile: ClientProfile | null): CheckinHint[] {
  if (!profile) return [];

  const lifestyleInterval = intervalForPillar(profile, 'lifestyle');
  const postureInterval = intervalForPillar(profile, 'posture');
  const lifeDays = daysSince(profile.lastLifestyleDate);
  const postureDays = daysSince(profile.lastPostureDate);

  const out: CheckinHint[] = [];

  const lifeOverdue =
    lifeDays === null ? lifestyleInterval : Math.max(0, lifeDays - lifestyleInterval);
  if (lifeDays === null || lifeDays >= lifestyleInterval) {
    out.push({ id: 'lifestyle', overdueScore: lifeOverdue + (lifeDays === null ? 1000 : 0) });
  }

  const postureOverdue =
    postureDays === null ? postureInterval : Math.max(0, postureDays - postureInterval);
  if (postureDays === null || postureDays >= postureInterval) {
    out.push({ id: 'posture', overdueScore: postureOverdue + (postureDays === null ? 1000 : 0) });
  }

  out.sort((a, b) => b.overdueScore - a.overdueScore);
  return out.slice(0, 2);
}
