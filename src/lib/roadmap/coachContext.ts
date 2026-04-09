import type { RoadmapBlock, RoadmapPhase } from './types';
import { PHASE_NARRATIVES } from './types';
import type { ScoreSummary } from '@/lib/scoring/types';

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

export interface CoachBrief {
  goalLabels: string[];
  mainIssues: string[];
  considerations: string[];
}

/**
 * Builds a short coach brief from client goals, assessment synthesis, and suggested blocks.
 * Used to inform the coach when populating the roadmap.
 */
export function buildCoachBrief(
  clientGoals: string[],
  synthesis: ScoreSummary['synthesis'],
  generatedBlocks: RoadmapBlock[],
): CoachBrief {
  const goalLabels = clientGoals.map((g) => GOAL_LABELS[g] ?? g).filter(Boolean);

  const mainIssues: string[] = [];
  for (const s of synthesis) {
    if (s.severity === 'high' || s.severity === 'medium') {
      mainIssues.push(s.description);
    }
  }
  const criticalOrPrereq = generatedBlocks.filter(
    (b) => b.urgency === 'critical' || b.urgency === 'prerequisite',
  );
  for (const b of criticalOrPrereq) {
    if (!mainIssues.some((m) => m.includes(b.title) || b.finding?.includes(m.slice(0, 20)))) {
      mainIssues.push(`${b.title}: ${b.finding ?? b.description}`);
    }
  }

  const considerations: string[] = [
    'Place critical and prerequisite items in Foundation so they are addressed first.',
    'Development phase should build on Foundation and align with the client’s primary goals.',
    'Performance phase is for fine-tuning and optional metrics once basics are solid.',
  ];
  if (goalLabels.some((g) => /mobility|posture|rehabilitation/i.test(g))) {
    considerations.push('Movement quality and pain-free patterns should be prioritised before heavy loading.');
  }
  if (goalLabels.some((g) => /weight|recomposition/i.test(g))) {
    considerations.push('Include body composition and lifestyle metrics where relevant.');
  }
  if (criticalOrPrereq.some((b) => b.title.toLowerCase().includes('pain'))) {
    considerations.push('Address movement pain before adding loaded or high-intensity work.');
  }

  return { goalLabels, mainIssues, considerations };
}

export interface PhaseFocusContent {
  title: string;
  subtitle: string;
  focusPoints: string[];
}

const PHASE_FOCUS_BY_GOAL: Record<
  RoadmapPhase,
  Partial<Record<string, string[]>>
> = {
  foundation: {
    'improve-mobility': [
      'Joint mobility and movement pattern quality before loading.',
      'Pain-free range of motion in key patterns (squat, hinge, lunge).',
      'Any synthesis findings that affect safety or readiness to train.',
    ],
    'improve-posture': [
      'Postural alignment and movement compensations.',
      'Address any pain or restriction before loading.',
      'Core and movement fundamentals.',
    ],
    rehabilitation: [
      'Pain and contraindications first; refer if needed.',
      'Restore basic movement quality and tolerance.',
      'Low-load, pain-free progressions only.',
    ],
    'build-strength': [
      'Movement quality and stability so loading is safe.',
      'Prerequisite patterns and mobility for the main lifts.',
      'Critical synthesis items that block training.',
    ],
    'weight-loss': [
      'Habit and consistency (nutrition, activity) before intensity.',
      'Any barriers that would limit adherence.',
      'Movement quality so cardio/strength work is sustainable.',
    ],
    'general-health': [
      'Safety-first: pain, contraindications, and synthesis findings.',
      'Baseline movement and lifestyle habits.',
      'Foundations that support long-term adherence.',
    ],
  },
  development: {
    'build-muscle': [
      'Progressive overload in goal-aligned movements.',
      'Recovery and nutrition to support muscle gain.',
      'Balancing volume with movement quality.',
    ],
    'build-strength': [
      'Structured strength progressions and main lifts.',
      'Supporting mobility and stability as needed.',
      'Recovery and load management.',
    ],
    'weight-loss': [
      'Sustained calorie deficit and activity without undermining recovery.',
      'Strength and cardio balance for body composition.',
      'Consistency and adherence metrics.',
    ],
    'body-recomposition': [
      'Training and nutrition aligned to recomp (modest deficit, adequate protein).',
      'Strength and body comp metrics in parallel.',
      'Recovery and lifestyle factors.',
    ],
    'improve-fitness': [
      'Cardio and general fitness progressions.',
      'Lifestyle and consistency.',
      'Building sustainable habits.',
    ],
    'sport-performance': [
      'Sport-specific qualities (power, endurance, movement).',
      'Injury risk reduction and robustness.',
      'Recovery and periodisation.',
    ],
  },
  performance: {
    'build-muscle': [
      'Peak phases and fine-tuning volume/intensity.',
      'Optional metrics that support muscle gain.',
      'Long-term sustainability.',
    ],
    'build-strength': [
      'Peak strength and optional accessory work.',
      'Movement quality maintenance.',
      'Periodisation and recovery.',
    ],
    'sport-performance': [
      'Peak performance and competition readiness.',
      'Fine-tuning and optional metrics.',
      'Recovery and tapering as needed.',
    ],
    'general-health': [
      'Maintenance and optional goals.',
      'Long-term adherence and enjoyment.',
    ],
  },
};

const DEFAULT_PHASE_FOCUS: Record<RoadmapPhase, string[]> = {
  foundation: [
    'Address critical and prerequisite items first (pain, contraindications, synthesis).',
    'Establish movement quality and safety before loading.',
    'Set habits and baselines that later phases will build on.',
  ],
  development: [
    'Progress core areas that directly support the client’s goals.',
    'Balance load, volume, and recovery.',
    'Keep movement quality and adherence in mind.',
  ],
  performance: [
    'Fine-tune and push toward goals where baselines are solid.',
    'Add optional metrics that add value without overwhelming.',
    'Focus on sustainability and long-term results.',
  ],
};

/**
 * Returns focus content for a phase, tailored to the client's primary goal when possible.
 * When a secondary goal exists, development phase includes a note to shift toward it.
 */
export function getPhaseFocus(
  phase: RoadmapPhase,
  clientGoals: string[],
): PhaseFocusContent {
  const primaryGoal = clientGoals[0];
  const secondaryGoal = clientGoals[1];
  const goalFocus = primaryGoal && PHASE_FOCUS_BY_GOAL[phase][primaryGoal];
  let focusPoints: string[] = (goalFocus || DEFAULT_PHASE_FOCUS[phase]) || [];
  if (phase === 'development' && secondaryGoal) {
    const secondaryLabel = GOAL_LABELS[secondaryGoal] ?? secondaryGoal.replace(/-/g, ' ');
    focusPoints = [...focusPoints, `Then shift focus toward ${secondaryLabel}.`];
  }
  const narrative = PHASE_NARRATIVES[phase];

  return {
    title: `Phase: ${narrative.title}`,
    subtitle: narrative.subtitle,
    focusPoints,
  };
}
