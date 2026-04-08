/* eslint-disable react-refresh/only-export-components -- section IDs and meta co-located for ClientReport */
import React from 'react';
import { Activity, Scale, Dumbbell, Heart, Zap, Sun } from 'lucide-react';

export const SECTION_IDS = [
  'starting-point',
  'body-comp',
  'strength',
  'cardio',
  'movement-quality',
  'lifestyle',
] as const;

export type SectionId = (typeof SECTION_IDS)[number];

const iconClass = 'w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5';

export const SECTION_META: Record<
  SectionId,
  { title: string; shortTitle: string; summary: string; icon: React.ReactNode }
> = {
  'starting-point': {
    title: 'Your AXIS Score™',
    shortTitle: 'Overview',
    summary: 'Overall score, archetype, radar, and key strengths',
    icon: <Activity className={iconClass} />,
  },
  'body-comp': {
    title: 'Body Composition',
    shortTitle: 'Body',
    summary: 'Weight, muscle mass, and body fat analysis',
    icon: <Scale className={iconClass} />,
  },
  strength: {
    title: 'Functional Strength',
    shortTitle: 'Strength',
    summary: 'Muscular endurance, core stability, and overall strength',
    icon: <Dumbbell className={iconClass} />,
  },
  cardio: {
    title: 'Metabolic Fitness',
    shortTitle: 'Cardio',
    summary: 'Resting heart rate, recovery, and aerobic capacity',
    icon: <Heart className={iconClass} />,
  },
  'movement-quality': {
    title: 'Movement Quality',
    shortTitle: 'Movement',
    summary: 'Posture, mobility, and movement pattern assessment',
    icon: <Zap className={iconClass} />,
  },
  lifestyle: {
    title: 'Lifestyle Factors',
    shortTitle: 'Lifestyle',
    summary: 'Sleep, nutrition, stress, and daily activity habits',
    icon: <Sun className={iconClass} />,
  },
};

export const DEFAULT_OPEN: SectionId[] = ['starting-point'];
