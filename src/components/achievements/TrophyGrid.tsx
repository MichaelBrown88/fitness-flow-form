import React from 'react';
import { Card } from '@/components/ui/card';
import {
  Trophy, Award, Target, Rocket, ArrowUpCircle,
  Scale, Dumbbell, Heart, Activity, Leaf, Compass, Flame,
} from 'lucide-react';
import type { Achievement } from '@/types/achievements';

const ICON_MAP: Record<string, React.ElementType> = {
  Trophy,
  Award,
  Target,
  Rocket,
  ArrowUpCircle,
  Scale,
  Dumbbell,
  Heart,
  Activity,
  Leaf,
  Compass,
  Flame,
};

/** Check if an achievement was unlocked within the last 7 days */
function isRecentlyUnlocked(trophy: Achievement): boolean {
  if (!trophy.unlockedAt) return false;
  const unlockedMs = typeof trophy.unlockedAt.toMillis === 'function'
    ? trophy.unlockedAt.toMillis()
    : 0;
  return Date.now() - unlockedMs < 7 * 86_400_000; // 7 days
}

interface TrophyGridProps {
  trophies: Achievement[];
}

export function TrophyGrid({ trophies }: TrophyGridProps) {
  if (trophies.length === 0) return null;

  // Sort: unlocked first (most recently unlocked at top), then locked
  const sorted = [...trophies].sort((a, b) => {
    if (a.unlockedAt && !b.unlockedAt) return -1;
    if (!a.unlockedAt && b.unlockedAt) return 1;
    if (a.unlockedAt && b.unlockedAt) {
      const aMs = typeof a.unlockedAt.toMillis === 'function' ? a.unlockedAt.toMillis() : 0;
      const bMs = typeof b.unlockedAt.toMillis === 'function' ? b.unlockedAt.toMillis() : 0;
      return bMs - aMs; // most recent first
    }
    return 0;
  });

  return (
    <div className="space-y-3 sm:space-y-4">
      <div>
        <h3 className="text-sm sm:text-base font-bold text-foreground">Trophies</h3>
        <p className="text-xs sm:text-xs text-muted-foreground">Special achievements for outstanding performance</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
        {sorted.map((trophy) => {
          const isUnlocked = trophy.unlockedAt !== null;
          const isNew = isRecentlyUnlocked(trophy);
          const IconComponent = ICON_MAP[trophy.icon] ?? Trophy;

          return (
            <Card
              key={trophy.id}
              className={`p-3 sm:p-4 flex flex-col items-center text-center transition-all ${
                isUnlocked
                  ? 'bg-background ring-1 ring-gradient-medium shadow-sm'
                  : 'bg-muted/50 opacity-60'
              } ${isNew ? 'ring-2 ring-primary/40 shadow-md shadow-primary/10' : ''}`}
            >
              <div
                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center mb-2 sm:mb-3 ${
                  isUnlocked ? 'gradient-bg' : 'bg-muted'
                } ${isNew ? 'animate-pulse' : ''}`}
              >
                <IconComponent className={`w-5 h-5 sm:w-6 sm:h-6 ${isUnlocked ? 'text-white' : 'text-muted-foreground'}`} />
              </div>
              {isNew && (
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-primary mb-1">New!</span>
              )}
              <span className="text-xs sm:text-sm font-bold text-foreground mb-0.5">{trophy.title}</span>
              <span className="text-[10px] sm:text-xs text-muted-foreground leading-tight">{trophy.description}</span>

              {/* Progress bar for locked trophies */}
              {!isUnlocked && (
                <div className="w-full mt-2 sm:mt-3">
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full gradient-bg rounded-full transition-all duration-500"
                      style={{ width: `${trophy.progress}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium mt-0.5 block">{trophy.progress}%</span>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
