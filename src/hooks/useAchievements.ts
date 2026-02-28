/**
 * Legacy UID-scoped Achievements Hook
 *
 * Still reads from the old achievements/{uid}/items path for
 * authenticated coach users on the /achievements route.
 * 
 * For client-facing views, use useTokenAchievements instead.
 */

import { useState, useEffect } from 'react';
import { collection, query, limit, onSnapshot } from 'firebase/firestore';
import { getDb } from '@/services/firebase';
import { useAuth } from '@/hooks/useAuth';
import type { Achievement } from '@/types/achievements';
import { logger } from '@/lib/utils/logger';

const MAX_ACHIEVEMENTS = 50;

export function useAchievements() {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setAchievements([]);
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(getDb(), 'achievements', user.uid, 'items'),
      limit(MAX_ACHIEVEMENTS),
    );

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
          logger.debug('[Achievements] Collection not yet accessible');
          setAchievements([]);
        } else {
          logger.error('[Achievements] Subscription error:', error);
        }
        setIsLoading(false);
      },
    );

    return unsub;
  }, [user?.uid]);

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
