import React from 'react';
import { Flame } from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { Achievement } from '@/types/achievements';

interface StreakDisplayProps {
  streaks: Achievement[];
  currentStreak: number;
}

export function StreakDisplay({ streaks, currentStreak }: StreakDisplayProps) {
  return (
    <Card className="p-4 sm:p-6 md:p-8">
      <div className="flex items-center gap-3 mb-4 sm:mb-6">
        <div className="p-2 gradient-bg rounded-xl">
          <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div>
          <h3 className="text-sm sm:text-base font-bold text-foreground">Assessment Streak</h3>
          <p className="text-xs sm:text-xs text-muted-foreground">Keep your consistency going</p>
        </div>
        <div className="ml-auto text-right">
          <div className="text-2xl sm:text-3xl font-bold text-foreground">{currentStreak}</div>
          <div className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.15em]">
            in a row
          </div>
        </div>
      </div>

      {/* Streak milestone dots */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {streaks.map((streak) => {
          const isUnlocked = streak.unlockedAt !== null;
          return (
            <div key={streak.id} className="flex flex-col items-center gap-1.5 shrink-0">
              <div
                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all ${
                  isUnlocked
                    ? 'gradient-bg shadow-md'
                    : 'bg-muted border-2 border-dashed border-border'
                }`}
              >
                <span className={`text-xs sm:text-sm font-bold ${isUnlocked ? 'text-white' : 'text-foreground-tertiary'}`}>
                  {streak.threshold}
                </span>
              </div>
              <span className="text-[10px] sm:text-[10px] font-medium text-muted-foreground text-center max-w-[60px] leading-tight">
                {streak.title}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
