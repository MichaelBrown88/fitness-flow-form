/**
 * Achievements tab: reads from the canonical org-scoped path
 * organizations/{orgId}/clients/{clientId}/achievements
 *
 * Populated by `evaluateAchievements()` on every assessment save, and
 * on-demand via the "Generate from latest assessment" button below.
 *
 * Resolves the lookup id in this order: profile.clientId (UUID for
 * new clients), profile.legacySlug, then generateClientSlug(clientName)
 * — which equals the Firestore doc id for legacy clients. This means
 * the page works without the historical backfillClientIds migration.
 */

import { useState } from 'react';
import type { Timestamp } from 'firebase/firestore';
import { useOutletContext } from 'react-router-dom';
import { useOrgClientAchievements } from '@/hooks/useOrgClientAchievements';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ACHIEVEMENT_DEFINITIONS } from '@/constants/achievements';
import { StreakDisplay } from '@/components/achievements/StreakDisplay';
import { TrophyGrid } from '@/components/achievements/TrophyGrid';
import { MilestoneProgress } from '@/components/achievements/MilestoneProgress';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, Trophy } from 'lucide-react';
import { generateClientSlug } from '@/services/clientProfiles';
import { evaluateAchievements } from '@/services/achievements';
import { computeScores } from '@/lib/scoring';
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
  const outlet = useOutletContext<ClientDetailOutletContext>();
  const { profile, clientName } = outlet;
  const { profile: coachProfile } = useAuth();

  const orgId = coachProfile?.organizationId ?? profile?.organizationId ?? '';
  const clientId =
    profile?.clientId ??
    profile?.legacySlug ??
    (clientName ? generateClientSlug(clientName) : '');

  if (!orgId || !clientId) {
    return (
      <div className="rounded-2xl border border-border bg-muted p-8 text-center max-w-md mx-auto">
        <Trophy className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm font-medium text-foreground-secondary">Loading client…</p>
      </div>
    );
  }

  return <ClientAchievementsContent orgId={orgId} clientId={clientId} outlet={outlet} />;
}

function ClientAchievementsContent({
  orgId,
  clientId,
  outlet,
}: {
  orgId: string;
  clientId: string;
  outlet: ClientDetailOutletContext;
}) {
  const data = useOrgClientAchievements(orgId, clientId);
  const { streaks, trophies, milestones } = fillDefaults(data);
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);

  const { currentAssessment, snapshots, assessments } = outlet;
  const formData = currentAssessment?.formData ?? snapshots[0]?.formData ?? null;
  const assessmentCount = Math.max(snapshots.length, assessments.length, 1);

  const onGenerate = async () => {
    if (!formData) {
      toast({
        title: 'Cannot generate milestones',
        description: 'A latest assessment is required to evaluate milestones.',
        variant: 'destructive',
      });
      return;
    }
    setGenerating(true);
    try {
      const scores = computeScores(formData);
      const categoryScores = scores.categories.map((c) => ({
        id: c.id,
        score: c.score,
        assessed: c.assessed,
      }));
      const unlocked = await evaluateAchievements({
        organizationId: orgId,
        clientId,
        overallScore: scores.overall,
        fullProfileScore: scores.fullProfileScore,
        categoryScores,
        assessmentCount,
      });
      toast({
        title: unlocked.length > 0 ? `${unlocked.length} milestone${unlocked.length === 1 ? '' : 's'} unlocked` : 'Milestones evaluated',
        description:
          unlocked.length > 0
            ? unlocked.map((u) => u.title).join(', ')
            : 'No new milestones unlocked yet — keep working through the plan.',
      });
    } catch (err) {
      toast({
        title: 'Could not generate milestones',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  if (data.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground mt-3">Loading milestones…</p>
      </div>
    );
  }

  const hasNoUnlocked = data.unlockedCount === 0;

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
        <Button
          onClick={onGenerate}
          disabled={generating || !formData}
          size="sm"
          variant={hasNoUnlocked ? 'default' : 'outline'}
          className="h-9 gap-1.5 rounded-full"
        >
          {generating ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Evaluating…
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" /> Generate from latest assessment
            </>
          )}
        </Button>
      </div>

      <StreakDisplay streaks={streaks} currentStreak={data.currentStreak} />
      <TrophyGrid trophies={trophies} />
      <MilestoneProgress milestones={milestones} />
    </div>
  );
}
