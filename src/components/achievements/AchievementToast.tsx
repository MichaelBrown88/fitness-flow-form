/**
 * Achievement Toast
 *
 * Animated celebration toast shown when an achievement is unlocked.
 * Renders as a standalone overlay — not tied to the standard toast system.
 */

import { useState, useEffect, useCallback } from 'react';
import type { UnlockedAchievement } from '@/services/achievements';
import { ACHIEVEMENT_DEFINITIONS } from '@/constants/achievements';

interface AchievementToastProps {
  achievement: UnlockedAchievement | null;
  onDismiss: () => void;
}

export function AchievementToast({ achievement, onDismiss }: AchievementToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!achievement) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, 4000);
    return () => clearTimeout(timer);
  }, [achievement, onDismiss]);

  if (!achievement) return null;

  const definition = ACHIEVEMENT_DEFINITIONS.find(d => d.id === achievement.id);
  const icon = definition?.icon || '🏆';

  return (
    <div
      className={`fixed top-6 left-1/2 -translate-x-1/2 z-[200] transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
      }`}
    >
      <div className="flex items-center gap-3 bg-white rounded-2xl shadow-2xl border border-amber-200 px-5 py-4 min-w-[280px]">
        <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-2xl shrink-0 animate-bounce">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-amber-600 mb-0.5">
            Achievement Unlocked
          </p>
          <p className="text-sm font-bold text-slate-900 truncate">{achievement.title}</p>
          <p className="text-xs text-slate-500 truncate">{achievement.description}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to manage achievement toast queue.
 * Shows achievements one at a time with auto-dismiss.
 */
export function useAchievementToast() {
  const [queue, setQueue] = useState<UnlockedAchievement[]>([]);
  const [current, setCurrent] = useState<UnlockedAchievement | null>(null);

  const enqueue = useCallback((achievements: UnlockedAchievement[]) => {
    if (achievements.length === 0) return;
    setQueue(prev => [...prev, ...achievements]);
  }, []);

  useEffect(() => {
    if (!current && queue.length > 0) {
      setCurrent(queue[0]);
      setQueue(prev => prev.slice(1));
    }
  }, [current, queue]);

  const dismiss = useCallback(() => {
    setCurrent(null);
  }, []);

  return { current, enqueue, dismiss };
}
