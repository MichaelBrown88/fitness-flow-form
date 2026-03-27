/**
 * DataRoadmapSection (renamed to "Intelligence Capabilities")
 *
 * Shows a grid of capability cards — unlocked / in-progress / locked.
 * Framed as a capability roadmap rather than gamified progress, so it reads
 * as a product timeline for external audiences rather than a game.
 */

import { Lock, CheckCircle2, Zap } from 'lucide-react';
import { TIER_DEFINITIONS } from '@/types/analytics';
import type { MilestoneProgress, AnalyticsTier } from '@/types/analytics';

function CapabilityCard({
  tier,
  isUnlocked,
  isNext,
  currentCount,
}: {
  tier: typeof TIER_DEFINITIONS[number];
  isUnlocked: boolean;
  isNext: boolean;
  currentCount: number;
}) {
  const remaining = Math.max(0, tier.threshold - currentCount);

  return (
    <div
      className={`rounded-xl border p-4 transition-all ${
        isUnlocked
          ? 'border-emerald-500/30 bg-emerald-600/5'
          : isNext
          ? 'border-amber-500/30 bg-amber-500/5'
          : 'border-admin-border bg-admin-bg/30 opacity-55'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
            isUnlocked
              ? 'bg-emerald-600/20 text-emerald-400'
              : isNext
              ? 'bg-amber-500/20 text-amber-400'
              : 'bg-admin-border text-foreground-secondary'
          }`}
        >
          {isUnlocked
            ? <CheckCircle2 className="w-3.5 h-3.5" />
            : isNext
            ? <Zap className="w-3.5 h-3.5" />
            : <Lock className="w-3.5 h-3.5" />
          }
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`text-sm font-semibold ${
              isUnlocked ? 'text-emerald-300' : isNext ? 'text-amber-300' : 'text-muted-foreground'
            }`}>
              {tier.label}
            </p>
            {tier.threshold > 0 && !isUnlocked && (
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {isNext ? `${remaining} sessions to go` : `${tier.threshold} sessions`}
              </span>
            )}
            {isUnlocked && (
              <span className="text-[10px] text-emerald-500 font-medium">Active</span>
            )}
          </div>
          <p className="text-xs text-admin-fg-muted mt-0.5 leading-relaxed">
            {isUnlocked ? tier.description : tier.preview}
          </p>
        </div>
      </div>
    </div>
  );
}

interface Props {
  progress: MilestoneProgress;
}

export function DataRoadmapSection({ progress }: Props) {
  const { currentCount, nextTier, unlockedTiers } = progress;
  const unlockedCount = unlockedTiers.length;
  const totalCount = TIER_DEFINITIONS.length;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs text-admin-fg-muted mt-0.5">
            {unlockedCount === totalCount
              ? 'All capabilities active — full intelligence platform.'
              : nextTier
              ? `Next capability unlocks at ${nextTier.threshold} scored assessments · currently at ${currentCount}.`
              : 'Capabilities unlock automatically as the dataset grows.'}
          </p>
        </div>
        {unlockedCount > 0 && (
          <span className="text-xs text-admin-fg-muted border border-admin-border rounded-full px-3 py-1">
            {unlockedCount} / {totalCount} active
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {TIER_DEFINITIONS.map(tierDef => {
          const isUnlocked = unlockedTiers.includes(tierDef.tier as AnalyticsTier);
          const isNext = tierDef.tier === nextTier?.tier;
          return (
            <CapabilityCard
              key={tierDef.tier}
              tier={tierDef}
              isUnlocked={isUnlocked}
              isNext={isNext}
              currentCount={currentCount}
            />
          );
        })}
      </div>
    </div>
  );
}
