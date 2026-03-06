import { useNavigate, useParams } from 'react-router-dom';
import type { Timestamp } from 'firebase/firestore';
import { ArrowLeft, Loader2, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AppShell from '@/components/layout/AppShell';
import { useAchievements } from '@/hooks/useAchievements';
import { useTokenAchievements } from '@/hooks/useTokenAchievements';
import { ACHIEVEMENT_DEFINITIONS } from '@/constants/achievements';
import { StreakDisplay } from '@/components/achievements/StreakDisplay';
import { TrophyGrid } from '@/components/achievements/TrophyGrid';
import { MilestoneProgress } from '@/components/achievements/MilestoneProgress';

type AchievementHookReturn = ReturnType<typeof useAchievements>;

/** Fill in missing achievements with empty defaults for display */
function fillDefaults(achievements: AchievementHookReturn) {
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
    } as const;
    if (def.type === 'streak') streaks.push(placeholder);
    if (def.type === 'trophy') trophies.push(placeholder);
    if (def.type === 'milestone') milestones.push(placeholder);
  }

  return { streaks, trophies, milestones };
}

/**
 * Achievements Page
 * 
 * Supports two modes:
 *   - Token-scoped (client): /r/:token/achievements
 *   - UID-scoped (coach/legacy): /achievements
 */
export default function AchievementsPage() {
  const navigate = useNavigate();
  const { token } = useParams<{ token?: string }>();

  // Use token-scoped hook when available, otherwise fall back to UID-scoped
  const tokenAchievements = useTokenAchievements(token || null);
  const uidAchievements = useAchievements();
  const achievements: AchievementHookReturn = token ? tokenAchievements : uidAchievements;

  const { streaks, trophies, milestones } = fillDefaults(achievements);
  const clientName = token ? 'Client' : undefined;
  const handleBack = () => {
    if (token) {
      navigate(`/r/${token}`);
    } else {
      navigate(-1);
    }
  };

  const content = (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8 space-y-6 sm:space-y-8">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="h-9 w-9 p-0 rounded-xl shrink-0"
          aria-label="Go back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
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

  if (achievements.isLoading) {
    return token ? (
      <AppShell title="Achievements" mode="public" showClientNav shareToken={token} clientName={clientName ?? 'Client'}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </AppShell>
    ) : (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (token) {
    return (
      <AppShell title="Achievements" mode="public" showClientNav shareToken={token} clientName={clientName ?? 'Client'}>
        {content}
      </AppShell>
    );
  }

  return content;
}
