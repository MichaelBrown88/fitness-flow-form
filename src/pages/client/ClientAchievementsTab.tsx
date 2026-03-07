/**
 * Achievements tab: same format as the client-facing achievements page (StreakDisplay, TrophyGrid, MilestoneProgress).
 */

import type { Timestamp } from 'firebase/firestore';
import { useOutletContext } from 'react-router-dom';
import { useTokenAchievements } from '@/hooks/useTokenAchievements';
import { ACHIEVEMENT_DEFINITIONS } from '@/constants/achievements';
import { StreakDisplay } from '@/components/achievements/StreakDisplay';
import { TrophyGrid } from '@/components/achievements/TrophyGrid';
import { MilestoneProgress } from '@/components/achievements/MilestoneProgress';
import { Loader2, Trophy } from 'lucide-react';
import type { ClientDetailOutletContext } from './ClientDetailLayout';
import type { Achievement } from '@/types/achievements';

type TokenAchievementsReturn = ReturnType<typeof useTokenAchievements>;

/** Fill in missing achievements with empty defaults so client and coach see the same layout */
function fillDefaults(achievements: TokenAchievementsReturn) {
  const existingIds = new Set(achievements.achievements.map((a) => a.id));
  const streaks = [...achievements.streaks];
  const trophies = [...achievements.trophies];
  const milestones = [...achievements.milestones];

  for (const def of ACHIEVEMENT_DEFINITIONS) {
    if (existingIds.has(def.id)) continue;
    const placeholder = {
      id: def.id,
      organizationId: '',
      type: def.type,
      category: def.category,
      title: def.title,
      description: def.description,
      icon: def.icon,
      unlockedAt: null as Timestamp | null,
      progress: 0,
      threshold: def.threshold,
      currentValue: 0,
    } as Achievement;
    if (def.type === 'streak') streaks.push(placeholder);
    if (def.type === 'trophy') trophies.push(placeholder);
    if (def.type === 'milestone') milestones.push(placeholder);
  }

  return { streaks, trophies, milestones };
}

export default function ClientAchievementsTab() {
  const { profile } = useOutletContext<ClientDetailOutletContext>();
  const shareToken = profile?.shareToken;

  if (!shareToken) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center max-w-md mx-auto">
        <Trophy className="h-10 w-10 text-slate-300 mx-auto mb-3" />
        <p className="text-sm font-medium text-slate-600">No share link yet</p>
        <p className="text-xs text-slate-500 mt-1">
          Share the client report or roadmap to enable achievements. Achievements will appear here once the client views their content.
        </p>
      </div>
    );
  }

  return <ClientAchievementsContent shareToken={shareToken} />;
}

function ClientAchievementsContent({ shareToken }: { shareToken: string }) {
  const achievements = useTokenAchievements(shareToken);
  const { streaks, trophies, milestones } = fillDefaults(achievements);

  if (achievements.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-slate-500 mt-3">Loading achievements…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex items-center gap-3">
        <div className="p-2 gradient-bg rounded-xl shrink-0">
          <Trophy className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-zinc-900">Achievements</h1>
          <p className="text-xs sm:text-sm text-zinc-500">
            {achievements.unlockedCount} of {ACHIEVEMENT_DEFINITIONS.length} unlocked
          </p>
        </div>
      </div>

      <StreakDisplay streaks={streaks} currentStreak={achievements.currentStreak} />
      <TrophyGrid trophies={trophies} />
      <MilestoneProgress milestones={milestones} />
    </div>
  );
}
