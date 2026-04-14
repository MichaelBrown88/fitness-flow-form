import React from 'react';
import { Card } from '@/components/ui/card';
import { TrendingUp, Zap, Star, CheckCircle2 } from 'lucide-react';
import type { Achievement } from '@/types/achievements';

const ICON_MAP: Record<string, React.ElementType> = {
  TrendingUp,
  Zap,
  Star,
};

/** Check if a milestone was unlocked within the last 7 days */
function isRecentlyUnlocked(milestone: Achievement): boolean {
  if (!milestone.unlockedAt) return false;
  const unlockedMs = typeof milestone.unlockedAt.toMillis === 'function'
    ? milestone.unlockedAt.toMillis()
    : 0;
  return Date.now() - unlockedMs < 7 * 86_400_000;
}

interface MilestoneProgressProps {
  milestones: Achievement[];
}

export function MilestoneProgress({ milestones }: MilestoneProgressProps) {
  if (milestones.length === 0) return null;

  // Sort by threshold ascending
  const sorted = [...milestones].sort((a, b) => a.threshold - b.threshold);

  return (
    <div className="space-y-3 sm:space-y-4">
      <div>
        <h3 className="text-sm sm:text-base font-bold text-foreground">Score Milestones</h3>
        <p className="text-xs sm:text-xs text-muted-foreground">Track your AXIS Score™ progress</p>
      </div>

      <Card className="p-4 sm:p-5 md:p-6 space-y-4 sm:space-y-5">
        {sorted.map((milestone) => {
          const isUnlocked = milestone.unlockedAt !== null;
          const IconComponent = ICON_MAP[milestone.icon] ?? TrendingUp;

          const isNew = isRecentlyUnlocked(milestone);
          return (
            <div key={milestone.id} className={`flex items-center gap-3 ${isNew ? 'ring-1 ring-primary/20 rounded-lg p-2 -mx-2 bg-primary/5' : ''}`}>
              <div
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  isUnlocked ? 'bg-yellow-500' : 'bg-muted'
                } ${isNew ? 'animate-pulse' : ''}`}
              >
                {isUnlocked ? (
                  <CheckCircle2 className="w-4 h-4 text-yellow-950" />
                ) : (
                  <IconComponent className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className={`text-xs sm:text-sm font-bold ${isUnlocked ? 'text-foreground' : 'text-foreground-secondary'}`}>
                    {milestone.title}
                    {isNew && <span className="ml-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-primary">New!</span>}
                  </span>
                  <span className="text-[10px] sm:text-xs text-muted-foreground font-medium shrink-0">
                    {milestone.currentValue}/{milestone.threshold}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${
                      isUnlocked ? 'bg-yellow-500' : 'bg-muted-foreground/40'
                    }`}
                    style={{ width: `${milestone.progress}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
