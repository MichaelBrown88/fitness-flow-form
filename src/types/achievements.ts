import type { Timestamp } from 'firebase/firestore';

export type AchievementType = 'streak' | 'milestone' | 'trophy';
export type AchievementCategory = 'assessment' | 'progress' | 'goal' | 'pillar';

export interface Achievement {
  id: string;
  organizationId: string;
  type: AchievementType;
  category: AchievementCategory;
  title: string;
  description: string;
  icon: string;
  unlockedAt: Timestamp | null;
  progress: number;
  threshold: number;
  currentValue: number;
}

/** Definition for a possible achievement (static template) */
export interface AchievementDefinition {
  id: string;
  type: AchievementType;
  category: AchievementCategory;
  title: string;
  description: string;
  icon: string;
  threshold: number;
}
