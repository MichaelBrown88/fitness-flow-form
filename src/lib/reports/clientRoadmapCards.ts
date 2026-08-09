/**
 * High-level client roadmap cards — one behaviour theme per assessed pillar,
 * each with a few CONCRETE, referenceable prescriptions.
 *
 * This is the report's lead-magnet: a client who doesn't sign up should leave
 * with a framework they can actually run (Zone 2 3×/week, protein per meal,
 * 7.5h sleep, no caffeine after 2pm). It gives structure — targets and ranges —
 * without prescribing an exact program (no set/rep/%-1RM schemes). Deterministic
 * from scores + goals + lifestyle inputs; ordered by goal priority.
 */

import type { FormData } from '@/contexts/FormContext';
import { buildClientProfile } from '@/lib/physiology/profile';
import type { ClientGoalContext, PillarId } from '@/lib/goals/goalContext';

export interface ClientRoadmapCard {
  pillar: PillarId;
  /** Short pillar label for the numbered kicker, e.g. "Fitness". */
  pillarLabel: string;
  /** Behaviour theme, e.g. "Build your aerobic base". */
  title: string;
  /** Concrete, referenceable levers — targets/ranges, never exact programming. */
  prescriptions: string[];
}

const PILLAR_LABELS: Record<PillarId, string> = {
  bodyComp: 'Body composition',
  strength: 'Strength',
  cardio: 'Fitness',
  movementQuality: 'Movement',
  lifestyle: 'Lifestyle',
};

type CardBody = Pick<ClientRoadmapCard, 'title' | 'prescriptions'>;

function proteinLine(bodyWeightKg: number, emphasis: 'high' | 'normal'): string {
  const perKg = emphasis === 'high' ? 2.0 : 1.8;
  if (bodyWeightKg > 0) {
    const grams = Math.round((bodyWeightKg * perKg) / 10) * 10;
    const perMeal = Math.round(grams / 4 / 5) * 5;
    return `Protein ~${grams}g a day — roughly ${perMeal}g (a palm) at every meal.`;
  }
  return 'Protein at every meal — a palm-sized portion (~30–40g).';
}

function deficitLine(bodyWeightKg: number): string {
  if (bodyWeightKg > 0) {
    const lo = (bodyWeightKg * 0.005).toFixed(1);
    const hi = (bodyWeightKg * 0.0075).toFixed(1);
    return `Small calorie deficit — aim to lose about ${lo}–${hi} kg a week, no faster.`;
  }
  return 'Small, steady calorie deficit — about 0.5–0.75 kg a week, no crash dieting.';
}

function cardioCard(score: number): CardBody {
  if (score < 55) {
    return {
      title: 'Build your aerobic base',
      prescriptions: [
        'Zone 2 cardio 3× a week, 30–40 min — easy enough to hold a conversation.',
        'Add 5 min to one session every couple of weeks as it gets easier.',
      ],
    };
  }
  if (score <= 75) {
    return {
      title: 'Add structured conditioning',
      prescriptions: [
        'Keep 2 Zone 2 sessions a week (40 min, conversational pace).',
        'Add 1 interval session: 6–8 rounds of ~1 min hard / 2 min easy.',
      ],
    };
  }
  return {
    title: 'Maintain your engine',
    prescriptions: [
      '2 Zone 2 sessions a week hold your fitness.',
      '1 weekly interval session keeps pushing capacity.',
    ],
  };
}

function strengthCard(score: number): CardBody {
  if (score < 55) {
    return {
      title: 'Foundational strength',
      prescriptions: [
        'Full-body strength 2–3× a week — squat, hinge, push, pull.',
        'Progressive overload: add a rep or a little weight once the top of your range feels easy.',
      ],
    };
  }
  if (score <= 75) {
    return {
      title: 'Progressive strength',
      prescriptions: [
        'Train each major muscle group 2× a week.',
        'Add reps or load most weeks; stop 1–2 reps short of failure.',
      ],
    };
  }
  return {
    title: 'Keep the strength you\u2019ve built',
    prescriptions: [
      '2–3 quality strength sessions a week hold your baseline.',
      'Wave the load — push for ~3 weeks, then an easier deload week.',
    ],
  };
}

function bodyCompCard(score: number, ctx: ClientGoalContext, bodyWeightKg: number): CardBody {
  if (ctx.hasWeightLoss) {
    return {
      title: 'Lose fat, keep muscle',
      prescriptions: [
        deficitLine(bodyWeightKg),
        proteinLine(bodyWeightKg, 'high'),
        'Build toward 8–10k steps a day; strength train to protect muscle.',
      ],
    };
  }
  if (ctx.hasBuildMuscle) {
    return {
      title: 'Fuel for muscle',
      prescriptions: [
        'Eat at maintenance or a slight surplus on training days.',
        proteinLine(bodyWeightKg, 'high'),
        'Prioritise carbs around your workouts for energy and recovery.',
      ],
    };
  }
  if (score < 60) {
    return {
      title: 'Lean recomposition',
      prescriptions: [
        proteinLine(bodyWeightKg, 'normal'),
        'Prioritise carbs around workouts; keep fats moderate the rest of the day.',
        'Build toward 8–10k steps a day.',
      ],
    };
  }
  return {
    title: 'Maintain your composition',
    prescriptions: [
      'Eat around maintenance calories.',
      proteinLine(bodyWeightKg, 'normal'),
      'Keep daily steps up on rest days.',
    ],
  };
}

function movementCard(score: number): CardBody {
  if (score < 60) {
    return {
      title: 'Daily mobility habit',
      prescriptions: [
        '5–10 min of mobility every day on your tightest areas (hips, shoulders, ankles).',
        'Hold end-range stretches 30–45s; do them before you train as your warm-up.',
      ],
    };
  }
  if (score <= 75) {
    return {
      title: 'Sharpen movement quality',
      prescriptions: [
        'A 5 min mobility primer before every session.',
        'Give extra attention to the pattern flagged in your report.',
      ],
    };
  }
  return {
    title: 'Move well, keep it',
    prescriptions: ['A short 5 min warm-up before sessions protects the range you already have.'],
  };
}

function lifestyleCard(formData: FormData | undefined): CardBody {
  const lines: string[] = [];

  const sleep = (formData?.sleepArchetype || formData?.sleepQuality || '').toLowerCase();
  if (sleep === 'fair' || sleep === 'poor') {
    lines.push('Aim for 7.5–9 h sleep with a consistent bed and wake time, even on weekends.');
  }

  const stress = (formData?.stressLevel || '').toLowerCase();
  if (stress === 'high' || stress === 'moderate') {
    lines.push('A daily 10 min wind-down — a walk or breathing — to bring stress down before bed.');
  }

  const cups = parseFloat(formData?.caffeineCupsPerDay || '0');
  const lastCaffeine = formData?.lastCaffeineIntake || '';
  const cutoffHour = parseInt(lastCaffeine.split(':')[0] || '0', 10);
  if (cups >= 3 || cutoffHour >= 14) {
    lines.push('No caffeine after 2pm so it doesn\u2019t bleed into your sleep.');
  }

  const hydration = (formData?.hydrationHabits || '').toLowerCase();
  if (hydration === 'poor' || hydration === 'fair') {
    lines.push('Aim for ~2–3 L of water a day — a glass with every meal is an easy anchor.');
  }

  const steps = parseFloat(formData?.stepsPerDay || '0');
  if (steps > 0 && steps < 7500) {
    lines.push('Build toward 8–10k steps a day — the biggest lever on the days you don\u2019t train.');
  }

  const alcohol = (formData?.alcoholFrequency || '').toLowerCase();
  if (alcohol === 'multiple-weekly' || alcohol === 'frequent' || alcohol === 'daily') {
    lines.push('Keep alcohol to the weekend — it blunts sleep and recovery more than most expect.');
  }

  if (lines.length === 0) {
    return {
      title: 'Protect your recovery',
      prescriptions: [
        'Hold 7.5–9 h sleep with consistent timing.',
        'Keep 8–10k steps a day and water with every meal.',
      ],
    };
  }

  return {
    title: 'Recovery & daily habits',
    prescriptions: lines.slice(0, 3),
  };
}

/**
 * One card per assessed pillar, in the order the pillars are given
 * (callers pass the goal-role-sorted pillar list so priority order carries over).
 */
export function buildClientRoadmapCards(
  pillars: Array<{ scoringId: PillarId; score: number }>,
  formData: FormData | undefined,
  ctx: ClientGoalContext,
): ClientRoadmapCard[] {
  const bodyWeightKg = formData ? buildClientProfile(formData).bodyWeightKg : 0;

  return pillars.map(({ scoringId, score }) => {
    const body =
      scoringId === 'cardio'
        ? cardioCard(score)
        : scoringId === 'strength'
          ? strengthCard(score)
          : scoringId === 'bodyComp'
            ? bodyCompCard(score, ctx, bodyWeightKg)
            : scoringId === 'movementQuality'
              ? movementCard(score)
              : lifestyleCard(formData);

    return {
      pillar: scoringId,
      pillarLabel: PILLAR_LABELS[scoringId],
      ...body,
    };
  });
}
