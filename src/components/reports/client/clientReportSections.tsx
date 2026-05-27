/* eslint-disable react-refresh/only-export-components -- section IDs and meta co-located for ClientReport */
import React from 'react';
import { Scale, Dumbbell, Heart, Zap, Sun } from 'lucide-react';
import { getPillarLabel } from '@/constants/pillars';
import type { ScoringPillarId } from '@/constants/pillars';

export const SECTION_IDS = [
  'body-comp',
  'strength',
  'cardio',
  'movement-quality',
  'lifestyle',
] as const;

export type SectionId = (typeof SECTION_IDS)[number];

const SECTION_TO_SCORING: Record<SectionId, ScoringPillarId> = {
  'body-comp': 'bodyComp',
  strength: 'strength',
  cardio: 'cardio',
  'movement-quality': 'movementQuality',
  lifestyle: 'lifestyle',
};

const iconClass = 'w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5';

export const SECTION_META: Record<
  SectionId,
  { title: string; shortTitle: string; summary: string; icon: React.ReactNode }
> = {
  'body-comp': {
    title: getPillarLabel('bodyComp', 'full'),
    shortTitle: getPillarLabel('bodyComp', 'short'),
    summary: 'Weight, muscle mass, and body fat analysis',
    icon: <Scale className={iconClass} />,
  },
  strength: {
    title: getPillarLabel('strength', 'full'),
    shortTitle: getPillarLabel('strength', 'short'),
    summary: 'Muscular endurance, core stability, and overall strength',
    icon: <Dumbbell className={iconClass} />,
  },
  cardio: {
    title: getPillarLabel('cardio', 'full'),
    shortTitle: getPillarLabel('cardio', 'short'),
    summary: 'Resting heart rate, recovery, and aerobic capacity',
    icon: <Heart className={iconClass} />,
  },
  'movement-quality': {
    title: getPillarLabel('movementQuality', 'full'),
    shortTitle: getPillarLabel('movementQuality', 'short'),
    summary: 'Posture, mobility, and movement pattern assessment',
    icon: <Zap className={iconClass} />,
  },
  lifestyle: {
    title: getPillarLabel('lifestyle', 'full'),
    shortTitle: getPillarLabel('lifestyle', 'short'),
    summary: 'Sleep, nutrition, stress, and daily activity habits',
    icon: <Sun className={iconClass} />,
  },
};

export function scoringIdForSection(sectionId: SectionId): ScoringPillarId {
  return SECTION_TO_SCORING[sectionId];
}

export const DEFAULT_OPEN: SectionId[] = [];
