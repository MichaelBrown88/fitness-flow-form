import type { RoadmapCategory } from '@/lib/roadmap/types';

export interface TrainingModality {
  label: string;
  requirements: Partial<Record<RoadmapCategory, number>>;
}

export const TRAINING_THRESHOLDS: Record<string, TrainingModality> = {
  heavyLoading: { label: 'Heavy Loading', requirements: { movementQuality: 65 } },
  moderateLoading: { label: 'Moderate Loading', requirements: { movementQuality: 50 } },
  hiit: { label: 'HIIT Training', requirements: { cardio: 50, movementQuality: 50 } },
  plyometrics: { label: 'Plyometrics', requirements: { movementQuality: 60, strength: 50 } },
  fullUnrestricted: { label: 'Full Unrestricted', requirements: { movementQuality: 65, strength: 65, cardio: 65, bodyComp: 65, lifestyle: 65 } },
} as const;

export const PHASE_SCORE_TARGETS: Record<string, number> = {
  foundation: 65,
  development: 70,
  performance: 75,
};
