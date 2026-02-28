import type { ScoringPillarId } from '@/constants/pillars';

/** Tailwind accent classes per pillar for the countdown cards */
export const PILLAR_ACCENT: Record<ScoringPillarId, { dot: string; text: string; bar: string }> = {
  bodyComp:        { dot: 'bg-indigo-500',  text: 'text-indigo-600',  bar: 'bg-indigo-500' },
  strength:        { dot: 'bg-amber-500',   text: 'text-amber-600',   bar: 'bg-amber-500' },
  cardio:          { dot: 'bg-red-500',     text: 'text-red-500',     bar: 'bg-red-500' },
  movementQuality: { dot: 'bg-emerald-500', text: 'text-emerald-600', bar: 'bg-emerald-500' },
  lifestyle:       { dot: 'bg-violet-500',  text: 'text-violet-600',  bar: 'bg-violet-500' },
};

export type CountdownTrend = 'accelerating' | 'on-track' | 'slowing' | 'near-goal' | 'first-assessment';

/** Coaching text templates per pillar per trend scenario. {weeks} is replaced at runtime. */
const TEMPLATES: Record<ScoringPillarId, Record<CountdownTrend, string>> = {
  bodyComp: {
    accelerating: 'Your body composition is responding well. Keep nutrition consistent and you\'ll hit your target ahead of schedule.',
    'on-track': 'You\'re right on track. Maintain your current training and nutrition habits.',
    slowing: 'Progress has plateaued — this is common. Focus on nutrition adherence and sleep quality this month.',
    'near-goal': 'Almost there — just {weeks} more weeks. Stay consistent to finish strong.',
    'first-assessment': 'Your starting point. We\'ll track how this changes each reassessment.',
  },
  strength: {
    accelerating: 'Your strength gains are ahead of schedule. Keep pushing progressive overload.',
    'on-track': 'Strength is building steadily. Keep showing up and the numbers will follow.',
    slowing: 'Strength progress has slowed — consider a deload week to let your body recover.',
    'near-goal': 'Just {weeks} more weeks to your strength target. Maintain intensity and recovery.',
    'first-assessment': 'Your baseline strength. We\'ll measure progress from here.',
  },
  cardio: {
    accelerating: 'Your cardiovascular fitness is improving faster than expected. Great consistency.',
    'on-track': 'Cardio is progressing well. Keep up your current training frequency.',
    slowing: 'Cardio progress has slowed. Try adding one extra Zone 2 session this week.',
    'near-goal': '{weeks} more weeks at this pace. Keep your heart rate training consistent.',
    'first-assessment': 'Your cardiovascular baseline. Improvements will show within 4-6 weeks.',
  },
  movementQuality: {
    accelerating: 'Your movement patterns are improving quickly. The mobility work is paying off.',
    'on-track': 'Movement quality is on track. Continue your warm-up and mobility routine.',
    slowing: 'Movement gains have slowed. Spend an extra 5 minutes on targeted mobility daily.',
    'near-goal': 'Nearly there — {weeks} weeks to full movement quality. Keep up the daily mobility.',
    'first-assessment': 'Your movement baseline. Mobility improvements often show the fastest gains.',
  },
  lifestyle: {
    accelerating: 'Your lifestyle habits are trending in the right direction. Keep it up.',
    'on-track': 'Lifestyle factors are stable. Consistency here supports every other pillar.',
    slowing: 'Some lifestyle factors have slipped. Prioritise sleep and hydration this week.',
    'near-goal': 'Just {weeks} more weeks. Your habits are close to where they need to be.',
    'first-assessment': 'Your lifestyle snapshot. Small habit changes here have outsized effects.',
  },
};

/** Get coaching text for a pillar and trend, with weeks substituted */
export function getCoachingText(
  pillarId: string,
  trend: CountdownTrend,
  weeksToGoal: number,
): string {
  const pillarTemplates = TEMPLATES[pillarId as ScoringPillarId];
  if (!pillarTemplates) return '';
  const template = pillarTemplates[trend] ?? pillarTemplates['first-assessment'];
  return template.replace('{weeks}', String(weeksToGoal));
}

/** Frequency multipliers for sessions-per-week estimation */
export const FREQ_MULTIPLIERS: Record<number, number> = {
  3: 1.0,
  4: 0.85,
  5: 0.70,
};
