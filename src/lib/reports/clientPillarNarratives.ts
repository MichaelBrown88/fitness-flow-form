/**
 * Client-facing movement & lifestyle copy — qualitative story, not gap/progression tables.
 */

import type { FormData } from '@/contexts/FormContext';
import type { ScoreCategory } from '@/lib/scoring';
import { ASSESSMENT_LABELS, ASSESSMENT_OPTIONS } from '@/constants/assessment';

const P1_LABELS = ASSESSMENT_LABELS.P1 as Record<string, string>;
const P4_LABELS = ASSESSMENT_LABELS.P4 as Record<string, string>;

export interface ClientPillarNarrativeItem {
  label: string;
  observation: string;
  /** Plain-language aim for the coach–client plan */
  direction?: string;
}

type AssessmentOptionKey = keyof typeof ASSESSMENT_OPTIONS;

function optionLabel(field: AssessmentOptionKey, value: string | undefined): string | null {
  if (!value?.trim()) return null;
  const options = ASSESSMENT_OPTIONS[field];
  if (!Array.isArray(options)) return null;
  const match = options.find((o) => o.value === value);
  return match?.label ?? value.replace(/-/g, ' ');
}

/** Form field paired with the ASSESSMENT_OPTIONS key that holds its labels
 *  (left/right lunge fields share the same option list). */
interface MovementFieldSpec {
  field: keyof FormData & string;
  optionKey: AssessmentOptionKey;
}

const MOVEMENT_OHS_FIELDS: MovementFieldSpec[] = [
  { field: 'ohsSquatDepth', optionKey: 'ohsSquatDepth' },
  { field: 'ohsTorsoLean', optionKey: 'ohsTorsoLean' },
  { field: 'ohsShoulderMobility', optionKey: 'ohsShoulderMobility' },
  { field: 'ohsKneeAlignment', optionKey: 'ohsKneeAlignment' },
  { field: 'ohsHipShift', optionKey: 'ohsHipShift' },
  { field: 'ohsFeetPosition', optionKey: 'ohsFeetPosition' },
];

const MOVEMENT_HINGE_FIELDS: MovementFieldSpec[] = [
  { field: 'hingeDepth', optionKey: 'hingeDepth' },
  { field: 'hingeBackRounding', optionKey: 'hingeBackRounding' },
];

const MOVEMENT_LUNGE_FIELDS: MovementFieldSpec[] = [
  { field: 'lungeLeftBalance', optionKey: 'lungeBalance' },
  { field: 'lungeRightBalance', optionKey: 'lungeBalance' },
  { field: 'lungeLeftKneeAlignment', optionKey: 'lungeKneeAlignment' },
  { field: 'lungeRightKneeAlignment', optionKey: 'lungeKneeAlignment' },
];

function isConcernValue(value: string): boolean {
  const v = value.toLowerCase();
  return (
    v.includes('poor') ||
    v.includes('fair') ||
    v.includes('limited') ||
    v.includes('compensated') ||
    v.includes('moderate') ||
    v.includes('severe') ||
    v.includes('excessive') ||
    v.includes('valgus') ||
    v.includes('varus') ||
    v.includes('quarter') ||
    v.includes('minimal') ||
    v.includes('no-depth')
  );
}

function buildPatternGroup(
  title: string,
  fields: MovementFieldSpec[],
  formData: FormData,
): ClientPillarNarrativeItem | null {
  const lines: string[] = [];
  for (const { field, optionKey } of fields) {
    const raw = formData[field];
    if (typeof raw !== 'string' || !raw.trim()) continue;
    const name = P4_LABELS[field] ?? field;
    const obs = optionLabel(optionKey, raw);
    if (obs) lines.push(`${name}: ${obs}`);
  }
  if (lines.length === 0) return null;

  const hasConcern = fields.some(({ field }) => {
    const v = formData[field];
    return typeof v === 'string' && isConcernValue(v);
  });

  return {
    label: title,
    observation: lines.join(' · '),
    direction: hasConcern
      ? 'Priority in early programming — clean these patterns before heavier progressions.'
      : 'Solid baseline — we\'ll keep quality high as volume and load rise.',
  };
}

export function buildMovementNarrative(
  formData: FormData | undefined,
  category: ScoreCategory | undefined,
): { intro: string | null; items: ClientPillarNarrativeItem[] } {
  if (!formData) {
    return { intro: null, items: [] };
  }

  const items: ClientPillarNarrativeItem[] = [];
  const ohs = buildPatternGroup('Overhead squat', MOVEMENT_OHS_FIELDS, formData);
  const hinge = buildPatternGroup('Hip hinge', MOVEMENT_HINGE_FIELDS, formData);
  const lunge = buildPatternGroup('Split squat / lunge', MOVEMENT_LUNGE_FIELDS, formData);
  if (ohs) items.push(ohs);
  if (hinge) items.push(hinge);
  if (lunge) items.push(lunge);

  const hasPostureScan =
    formData.postureAiResults && Object.keys(formData.postureAiResults).length > 0;
  if (hasPostureScan) {
    items.push({
      label: 'Static posture',
      observation: 'Your scan is summarised in the posture section above — we use it alongside these movement screens.',
      direction: 'Repeat scans in similar lighting and clothing so we can compare over time.',
    });
  }

  const score = Math.round(category?.score ?? 0);
  let intro: string | null = null;
  if (score >= 85) {
    intro =
      'Your movement screen shows strong control on fundamental patterns — a good base for your training goal.';
  } else if (score >= 65) {
    intro =
      'You move well on several patterns with a few areas to tidy up — typical before structured coaching.';
  } else if (score > 0) {
    intro =
      'The screen highlights compensations we\'ll address early so every session builds on safe mechanics.';
  }

  if (items.length === 0 && category) {
    const focus = (category.weaknesses ?? []).slice(0, 2);
    for (const line of focus) {
      items.push({
        label: 'Focus',
        observation: line,
        direction: 'Addressed in warm-ups and accessory work each week.',
      });
    }
  }

  return { intro, items };
}

function stepsDirection(steps: number): string {
  if (steps < 5000) return 'Build toward 7,000+ daily steps — low-effort wins for energy and recovery.';
  if (steps < 7500) return 'Aim for 7,500–8,000 steps on most days to support your programme.';
  return 'Maintain this activity level — it supports recovery and body-composition goals.';
}

function sleepDirection(formData: FormData): string | undefined {
  const archetype = formData.sleepArchetype || formData.sleepQuality || '';
  if (archetype === 'excellent' || archetype === 'good') {
    return 'Protect this — sleep is when adaptation from training actually happens.';
  }
  if (archetype === 'fair' || archetype === 'poor') {
    return 'Prioritise a consistent wind-down and 7–8 h where possible — it will accelerate every other pillar.';
  }
  return undefined;
}

function stressDirection(value: string): string | undefined {
  if (value === 'very-low' || value === 'low') return 'Keep practices that help you stay balanced.';
  return 'Stress management is part of the plan — not separate from training.';
}

export function buildLifestyleNarrative(
  formData: FormData | undefined,
  category: ScoreCategory | undefined,
): { intro: string | null; items: ClientPillarNarrativeItem[] } {
  if (!formData) {
    return { intro: null, items: [] };
  }

  const items: ClientPillarNarrativeItem[] = [];

  const steps = parseFloat(formData.stepsPerDay || '0');
  if (steps > 0) {
    const display = steps >= 1000 ? `${(steps / 1000).toFixed(1)}k` : String(Math.round(steps));
    items.push({
      label: 'Daily movement',
      observation: `About ${display} steps per day on average.`,
      direction: stepsDirection(steps),
    });
  }

  const sleepArchetype = formData.sleepArchetype || formData.sleepQuality;
  const sleepDuration = formData.sleepDuration;
  if (sleepArchetype || sleepDuration) {
    const parts: string[] = [];
    const archLabel = sleepArchetype
      ? optionLabel(
          formData.sleepArchetype ? 'sleepArchetype' : 'sleepQuality',
          sleepArchetype,
        )
      : null;
    if (archLabel) parts.push(archLabel);
    const durLabel = sleepDuration ? optionLabel('sleepDuration', sleepDuration) : null;
    if (durLabel) parts.push(durLabel);
    items.push({
      label: 'Sleep',
      observation: parts.join(' · ') || 'Recorded',
      direction: sleepDirection(formData),
    });
  }

  if (formData.stressLevel) {
    items.push({
      label: 'Stress & recovery',
      observation: optionLabel('stressLevel', formData.stressLevel) ?? formData.stressLevel,
      direction: stressDirection(formData.stressLevel),
    });
  }

  if (formData.nutritionHabits) {
    items.push({
      label: 'Nutrition',
      observation: optionLabel('nutritionHabits', formData.nutritionHabits) ?? formData.nutritionHabits,
      direction:
        formData.nutritionHabits === 'excellent' || formData.nutritionHabits === 'good'
          ? 'We\'ll align portions and protein with your main goal.'
          : 'Small, repeatable meal habits beat perfect diets you can\'t sustain.',
    });
  }

  if (formData.hydrationHabits) {
    items.push({
      label: 'Hydration',
      observation: optionLabel('hydrationHabits', formData.hydrationHabits) ?? formData.hydrationHabits,
      direction: 'Consistent hydration supports energy, performance, and appetite awareness.',
    });
  }

  const sedentary = parseFloat(formData.sedentaryHours || '0');
  if (sedentary > 0) {
    items.push({
      label: 'Sedentary time',
      observation: `${sedentary % 1 === 0 ? sedentary.toFixed(0) : sedentary.toFixed(1)} hours seated per day.`,
      direction:
        sedentary >= 8
          ? 'Break up long sitting blocks — short walks add up.'
          : 'Keep limiting long unbroken sitting where you can.',
    });
  }

  if (formData.activityLevel) {
    items.push({
      label: 'General activity',
      observation: optionLabel('activityLevel', formData.activityLevel) ?? formData.activityLevel,
    });
  }

  const score = Math.round(category?.score ?? 0);
  let intro: string | null = null;
  if (score >= 80) {
    intro = 'Your daily habits are supporting your training — we\'ll keep the essentials steady while you chase your main goal.';
  } else if (score >= 55) {
    intro = 'A few lifestyle levers will multiply the work you do in the gym — these are the habits we\'ll tighten first.';
  } else if (score > 0) {
    intro = 'Recovery and daily habits are the foundation — improving them makes every session count more.';
  }

  if (items.length === 0 && category) {
    for (const line of (category.weaknesses ?? []).slice(0, 3)) {
      items.push({
        label: 'Focus',
        observation: line,
        direction: 'Your coach will set one or two habits at a time so change sticks.',
      });
    }
  }

  return { intro, items: items.slice(0, 5) };
}
