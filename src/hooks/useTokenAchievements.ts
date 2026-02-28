/**
 * Token-scoped Achievements Hook
 *
 * Reads achievements from publicReports/{shareToken}/achievements.
 * Used for client-facing views via the share link.
 */

import { useState, useEffect } from 'react';
import { collection, query, limit, onSnapshot } from 'firebase/firestore';
import { getDb } from '@/services/firebase';
import { COLLECTIONS } from '@/constants/collections';
import type { Achievement } from '@/types/achievements';
import { logger } from '@/lib/utils/logger';

const MAX_ACHIEVEMENTS = 50;

export function useTokenAchievements(shareToken: string | null | undefined) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!shareToken) {
      setAchievements([]);
      setIsLoading(false);
      return;
    }

    const colRef = collection(
      getDb(),
      COLLECTIONS.PUBLIC_REPORTS,
      shareToken,
      COLLECTIONS.ACHIEVEMENTS,
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
          logger.debug('[TokenAchievements] Collection not yet accessible');
          setAchievements([]);
        } else {
          logger.error('[TokenAchievements] Subscription error:', error);
        }
        setIsLoading(false);
      },
    );

    return unsub;
  }, [shareToken]);

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
