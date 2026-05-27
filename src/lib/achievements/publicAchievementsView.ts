import type { Achievement } from '@/types/achievements';

const UP_NEXT_LOCKED = 3;

function sortByProgress(items: Achievement[]): Achievement[] {
  return [...items].sort((a, b) => {
    const aPct = a.threshold > 0 ? (a.currentValue ?? 0) / a.threshold : 0;
    const bPct = b.threshold > 0 ? (b.currentValue ?? 0) / b.threshold : 0;
    return bPct - aPct;
  });
}

/** Public client view: unlocked plus a small “up next” set — no wall of 0% locked trophies. */
export function filterPublicAchievementList(items: Achievement[]): Achievement[] {
  const unlocked = items.filter((a) => a.unlockedAt != null);
  const locked = sortByProgress(items.filter((a) => a.unlockedAt == null));
  const upNext = locked.slice(0, UP_NEXT_LOCKED);
  return [...unlocked, ...upNext];
}
