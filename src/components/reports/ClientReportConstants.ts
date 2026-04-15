/**
 * Constants and utility functions for ClientReport
 * Extracted to reduce component size and improve maintainability
 */

export const CATEGORY_ORDER = ['bodyComp', 'strength', 'cardio', 'movementQuality', 'lifestyle'] as const;

export const CATEGORY_COLOR: Record<string, string> = {
  bodyComp: 'bg-[hsl(var(--brand-accent))]',
  strength: 'bg-[hsl(var(--brand-accent))]',
  cardio: 'bg-[hsl(var(--brand-accent))]',
  movementQuality: 'bg-[hsl(var(--brand-accent))]',
  lifestyle: 'bg-[hsl(var(--brand-accent))]',
};

export const CATEGORY_HEX: Record<string, string> = {
  bodyComp: '#10b981',
  strength: '#6366f1',
  cardio: '#0ea5e9',
  movementQuality: '#f59e0b',
  lifestyle: '#a855f7',
};

export const CATEGORY_EXPLANATIONS: Record<string, string> = {
  bodyComp: "Your body's makeup—muscle, fat, and water. Think of it as the foundation for everything else.",
  strength: "How strong you are and how long you can sustain effort. This affects daily activities and injury prevention.",
  cardio: "Your heart and lung capacity. This determines how efficiently your body uses oxygen during activity.",
  movementQuality: "How well your joints move and how your body holds itself. Better movement quality means fewer aches and more efficient movement.",
  lifestyle: "Your daily habits—sleep, stress, nutrition, hydration, and activity. These are the foundation that makes everything else work better.",
};

export const PROGRAM_PHASES = [
  {
    key: 'foundation',
    title: 'Building the Foundation',
    color: 'bg-foreground/90',
    text: 'Movement quality, posture, breathing, and consistency. Install habits that make progress inevitable.',
  },
  {
    key: 'overload',
    title: 'Progressive Overload',
    color: 'bg-[hsl(var(--brand-accent))]',
    text: 'Gradually increase volume, intensity, or density with excellent technique to drive adaptations.',
  },
  {
    key: 'performance',
    title: 'Performance Development',
    color: 'bg-[hsl(var(--brand-accent))]',
    text: 'Translate base capacity into performance—better pace, higher outputs, stronger lifts.',
  },
  {
    key: 'specialisation',
    title: 'Specialisation',
    color: 'bg-[hsl(var(--brand-accent))]',
    text: 'Emphasise your primary goal block (fat loss, hypertrophy, strength, or endurance) based on response.',
  },
  {
    key: 'mastery',
    title: 'Mastery',
    color: 'bg-[hsl(var(--brand-accent))]',
    text: 'Refine strengths, shore up weak links, and consolidate results for long-term sustainability.',
  },
] as const;

import { scoreGrade, SCORE_COLORS } from '@/lib/scoring/scoreColor';
import { getPillarLabel } from '@/constants/pillars';

export function circleColor(score: number): string {
  return SCORE_COLORS[scoreGrade(score)].circle;
}

export function niceLabel(id: string): string {
  return getPillarLabel(id, 'full');
}

