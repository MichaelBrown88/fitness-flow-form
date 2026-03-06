import type { RoadmapPhase } from './types';
import { PHASE_NARRATIVES } from './types';

const GOAL_LABELS: Record<string, string> = {
  'weight-loss': 'Weight loss',
  'build-muscle': 'Muscle building',
  'build-strength': 'Strength',
  'body-recomposition': 'Body recomposition',
  'improve-fitness': 'Fitness',
  'improve-mobility': 'Mobility',
  'improve-posture': 'Posture',
  'reduce-stress': 'Stress reduction',
  'general-health': 'General health',
  'sport-performance': 'Sport performance',
  'rehabilitation': 'Rehabilitation',
};

export interface JourneySummaryContent {
  intro: string;
  phaseBlurbs: { phase: RoadmapPhase; title: string; blurb: string }[];
  allMetricsActive: string;
}

const PHASES: RoadmapPhase[] = ['foundation', 'development', 'performance'];

const PHASE_BLURBS_CLIENT: Record<RoadmapPhase, string> = {
  foundation: 'Everything starts here — a solid base so the work ahead can stick.',
  development: 'Where your goals really take off.',
  performance: "Fine-tuning so you're not just hitting your goals, but keeping them.",
};

const PHASE_BLURBS_COACH: Record<RoadmapPhase, string> = {
  foundation: "Everything starts here — a solid base so the work ahead can stick.",
  development: "Where their goals really take off.",
  performance: "Fine-tuning so they're not just hitting their goals, but keeping them.",
};

export function buildJourneySummaryContent(options: {
  clientName: string;
  clientGoals: string[];
  itemCount: number;
  phaseCount: number;
  mode: 'client' | 'coach';
}): JourneySummaryContent {
  const { clientName, clientGoals, itemCount, phaseCount, mode } = options;
  const firstName = clientName.split(' ')[0] ?? 'you';
  const primaryGoal = clientGoals?.[0] ? (GOAL_LABELS[clientGoals[0]] ?? clientGoals[0]) : null;
  const goalPhrase = primaryGoal ? ` focused on ${primaryGoal}` : '';
  const blurbs = mode === 'client' ? PHASE_BLURBS_CLIENT : PHASE_BLURBS_COACH;

  const intro =
    mode === 'client'
      ? `You're working across ${phaseCount} phase${phaseCount === 1 ? '' : 's'} with ${itemCount} milestone${itemCount === 1 ? '' : 's'}${goalPhrase}.`
      : `${firstName}'s working across ${phaseCount} phase${phaseCount === 1 ? '' : 's'} with ${itemCount} milestone${itemCount === 1 ? '' : 's'}${goalPhrase}.`;

  const phaseBlurbs = PHASES.map((phase) => ({
    phase,
    title: PHASE_NARRATIVES[phase].title,
    blurb: blurbs[phase],
  }));

  const allMetricsActive =
    mode === 'client'
      ? 'Progress toward later phase goals happens while you build the foundation — all your metrics stay active.'
      : "Progress toward later phase goals happens while they build the foundation — all of their metrics stay active.";

  return { intro, phaseBlurbs, allMetricsActive };
}
