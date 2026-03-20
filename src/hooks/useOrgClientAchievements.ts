/**
 * Org-scoped Achievements Hook (coach-facing)
 *
 * Reads achievements from the canonical org-scoped path:
 *   organizations/{orgId}/clients/{clientId}/achievements
 *
 * Used by the coach's ClientAchievementsTab after the Phase 6 migration.
 * The public-facing client view uses the getClientAchievements Cloud Function
 * (via useTokenAchievements) which performs the same resolution server-side.
 */

import { useState, useEffect } from 'react';
import { collection, query, limit, onSnapshot } from 'firebase/firestore';
import { getDb } from '@/services/firebase';
import { ORGANIZATION } from '@/lib/database/paths';
import type { Achievement } from '@/types/achievements';
import { logger } from '@/lib/utils/logger';

const MAX_ACHIEVEMENTS = 50;

export function useOrgClientAchievements(
  organizationId: string | null | undefined,
  clientId: string | null | undefined,
) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!organizationId || !clientId) {
      setAchievements([]);
      setIsLoading(false);
      return;
    }

    const colRef = collection(
      getDb(),
      ORGANIZATION.clientAchievements.collection(organizationId, clientId),
    );
    const q = query(colRef, limit(MAX_ACHIEVEMENTS));

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const items: Achievement[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Achievement[];
        setAchievements(items);
        setIsLoading(false);
      },
      (error) => {
        if (error.message?.includes('Missing or insufficient permissions')) {
          logger.debug('[OrgClientAchievements] Collection not yet accessible');
          setAchievements([]);
        } else {
          logger.error('[OrgClientAchievements] Subscription error:', error);
        }
        setIsLoading(false);
      },
    );

    return unsub;
  }, [organizationId, clientId]);

  const unlocked = achievements.filter((a) => a.unlockedAt !== null);
  const streaks = achievements.filter((a) => a.type === 'streak');
  const milestones = achievements.filter((a) => a.type === 'milestone');
  const trophies = achievements.filter((a) => a.type === 'trophy');
  const currentStreak = streaks.filter((s) => s.unlockedAt !== null).length;

  return {
    achievements,
    unlocked,
    streaks,
    milestones,
    trophies,
    unlockedCount: unlocked.length,
    totalCount: achievements.length,
    currentStreak,
    isLoading,
  };
}
