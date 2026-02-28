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
          <h3 className="text-sm sm:text-base font-bold text-zinc-900">Assessment Streak</h3>
          <p className="text-xs sm:text-xs text-zinc-500">Keep your consistency going</p>
        </div>
        <div className="ml-auto text-right">
          <div className="text-2xl sm:text-3xl font-bold text-zinc-900">{currentStreak}</div>
          <div className="text-[10px] text-zinc-400 font-black uppercase tracking-[0.15em]">
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
                    : 'bg-zinc-100 border-2 border-dashed border-zinc-200'
                }`}
              >
                <span className={`text-xs sm:text-sm font-bold ${isUnlocked ? 'text-white' : 'text-zinc-300'}`}>
                  {streak.threshold}
                </span>
              </div>
              <span className="text-[10px] sm:text-[10px] font-medium text-zinc-500 text-center max-w-[60px] leading-tight">
                {streak.title}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
