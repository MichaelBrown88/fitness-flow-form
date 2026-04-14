/**
 * Achievements tab: reads from the canonical org-scoped path
 * organizations/{orgId}/clients/{clientId}/achievements
 *
 * Populated by:
 *   - evaluateAchievements() on every assessment save (new achievements)
 *   - migrateAchievements Cloud Function (one-time migration of legacy data)
 */

import type { Timestamp } from 'firebase/firestore';
import { useOutletContext } from 'react-router-dom';
import { useOrgClientAchievements } from '@/hooks/useOrgClientAchievements';
import { useAuth } from '@/hooks/useAuth';
import { ACHIEVEMENT_DEFINITIONS } from '@/constants/achievements';
import { StreakDisplay } from '@/components/achievements/StreakDisplay';
import { TrophyGrid } from '@/components/achievements/TrophyGrid';
import { MilestoneProgress } from '@/components/achievements/MilestoneProgress';
import { Loader2, Trophy } from 'lucide-react';
import type { ClientDetailOutletContext } from './ClientDetailLayout';
import type { Achievement } from '@/types/achievements';

type OrgAchievementsReturn = ReturnType<typeof useOrgClientAchievements>;

function fillDefaults(data: OrgAchievementsReturn) {
  const existingIds = new Set(data.achievements.map((a) => a.id));
  const streaks = [...data.streaks];
  const trophies = [...data.trophies];
  const milestones = [...data.milestones];

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
  const { profile: coachProfile } = useAuth();

  // Resolve the stable clientId: prefer profile.clientId, fall back to the
  // doc ID (which equals the legacy name-slug until backfillClientIds runs)
  const orgId = coachProfile?.organizationId ?? profile?.organizationId;
  const clientId = profile?.clientId;

  if (!clientId) {
    return (
      <div className="rounded-2xl border border-border bg-muted p-8 text-center max-w-md mx-auto">
        <Trophy className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm font-medium text-foreground-secondary">Achievements pending migration</p>
        <p className="text-xs text-muted-foreground mt-1">
          Run <code className="bg-muted px-1 rounded">backfillClientIds()</code> then{' '}
          <code className="bg-muted px-1 rounded">migrateAchievements()</code> from the browser
          console to load this client's achievements.
        </p>
      </div>
    );
  }

  return <ClientAchievementsContent orgId={orgId ?? ''} clientId={clientId} />;
}

function ClientAchievementsContent({
  orgId,
  clientId,
}: {
  orgId: string;
  clientId: string;
}) {
  const data = useOrgClientAchievements(orgId, clientId);
  const { streaks, trophies, milestones } = fillDefaults(data);

  if (data.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground mt-3">Loading achievements…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-yellow-500 rounded-xl shrink-0">
          <Trophy className="w-5 h-5 text-yellow-950" />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-foreground">ARC™ milestones</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {data.unlockedCount} of {ACHIEVEMENT_DEFINITIONS.length} unlocked on their journey
          </p>
        </div>
      </div>

      <StreakDisplay streaks={streaks} currentStreak={data.currentStreak} />
      <TrophyGrid trophies={trophies} />
      <MilestoneProgress milestones={milestones} />
    </div>
  );
}
