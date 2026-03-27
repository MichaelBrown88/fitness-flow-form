/* eslint-disable react-refresh/only-export-components -- section IDs and meta co-located for ClientReport */
import React from 'react';
import { Activity, BarChart3, TrendingUp, Heart, Target, Map } from 'lucide-react';

export const SECTION_IDS = [
  'starting-point',
  'gap-analysis',
  'strengths-focus',
  'lifestyle',
  'movement',
  'destination',
  'action-plan',
] as const;

export type SectionId = (typeof SECTION_IDS)[number];

const iconClass = 'w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5';

export const SECTION_META: Record<
  SectionId,
  { title: string; shortTitle: string; summary: string; icon: React.ReactNode }
> = {
  'starting-point': {
    title: 'Your Starting Point',
    shortTitle: 'Start',
    summary: 'Overall score, archetype, and radar chart',
    icon: <Activity className={iconClass} />,
  },
  'gap-analysis': {
    title: 'Gap Analysis',
    shortTitle: 'Gaps',
    summary: 'Current vs. target in each pillar',
    icon: <BarChart3 className={iconClass} />,
  },
  'strengths-focus': {
    title: 'Strengths & Focus Areas',
    shortTitle: 'Strengths',
    summary: "What you're doing well and where to improve",
    icon: <TrendingUp className={iconClass} />,
  },
  lifestyle: {
    title: 'Lifestyle Factors',
    shortTitle: 'Lifestyle',
    summary: 'Sleep, nutrition, stress, and activity habits',
    icon: <Heart className={iconClass} />,
  },
  movement: {
    title: 'Posture, Movement & Mobility',
    shortTitle: 'Movement',
    summary: 'Movement quality, posture, and flexibility analysis',
    icon: <Activity className={iconClass} />,
  },
  destination: {
    title: 'Your Destination',
    shortTitle: 'Goals',
    summary: 'Goals and what achieving them looks like',
    icon: <Target className={iconClass} />,
  },
  'action-plan': {
    title: 'Your Action Plan',
    shortTitle: 'Plan',
    summary: 'Personalised roadmap to reach your goals',
    icon: <Map className={iconClass} />,
  },
};

export const DEFAULT_OPEN: SectionId[] = ['starting-point'];
