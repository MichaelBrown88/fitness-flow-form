/**
 * Granular movement and category finding definitions for roadmap block generation.
 * Each draggable item maps to one specific finding or metric.
 */

export type MovementFormSlice = {
  postureHeadOverall?: string | string[];
  postureShouldersOverall?: string | string[];
  postureHipsOverall?: string | string[];
  ohsTorsoLean?: string;
  ohsKneeAlignment?: string;
  lungeLeftKneeAlignment?: string;
  lungeRightKneeAlignment?: string;
  hingeBackRounding?: string;
  ohsFeetPosition?: string;
  ohsHasPain?: string;
  hingeHasPain?: string;
  lungeHasPain?: string;
};

export interface MovementFindingDetail {
  id: string;
  title: string;
  scoreDetailId: 'posture' | 'movement' | 'mobility';
  condition: (form: MovementFormSlice) => boolean;
  overactiveMuscles: string[];
  underactiveMuscles: string[];
  primaryStretch: string;
  primaryActivation: string;
  contraindications: string[];
  visualTrigger: string;
}

function toArray(v: string | string[] | undefined): string[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

export const MOVEMENT_FINDING_DETAILS: MovementFindingDetail[] = [
  {
    id: 'mq-forward-head',
    title: 'Forward Head Posture',
    scoreDetailId: 'posture',
    condition: (form) => toArray(form.postureHeadOverall).includes('forward-head'),
    overactiveMuscles: ['Upper Trapezius', 'Levator Scapulae'],
    underactiveMuscles: ['Deep Cervical Flexors'],
    primaryStretch: 'Upper Trapezius Stretch',
    primaryActivation: 'Chin Tucks',
    contraindications: ['Overhead Press'],
    visualTrigger: 'Head sits forward of the shoulder line',
  },
  {
    id: 'mq-rounded-shoulders',
    title: 'Rounded Shoulders',
    scoreDetailId: 'posture',
    condition: (form) => toArray(form.postureShouldersOverall).includes('rounded'),
    overactiveMuscles: ['Pectoralis Major', 'Pectoralis Minor'],
    underactiveMuscles: ['Lower Trapezius', 'Serratus Anterior'],
    primaryStretch: 'Doorway Pec Stretch',
    primaryActivation: 'Prone Y Raise',
    contraindications: ['Overhead Press'],
    visualTrigger: 'Shoulders rounded or protracted',
  },
  {
    id: 'mq-anterior-pelvic-tilt',
    title: 'Anterior Pelvic Tilt',
    scoreDetailId: 'posture',
    condition: (form) => toArray(form.postureHipsOverall).includes('anterior-tilt'),
    overactiveMuscles: ['Iliopsoas', 'Rectus Femoris', 'Erector Spinae'],
    underactiveMuscles: ['Gluteus Maximus', 'Hamstrings', 'Abdominals'],
    primaryStretch: 'Kneeling Hip Flexor Stretch',
    primaryActivation: 'Glute Bridge',
    contraindications: ['Full Sit-ups'],
    visualTrigger: 'Pelvis rolled forward with excessive lumbar arch',
  },
  {
    id: 'mq-excessive-torso-lean',
    title: 'Excessive Torso Lean',
    scoreDetailId: 'movement',
    condition: (form) => form.ohsTorsoLean === 'excessive-lean',
    overactiveMuscles: ['Erector Spinae'],
    underactiveMuscles: ['Core stabilisers'],
    primaryStretch: 'Hip Flexor Stretch',
    primaryActivation: 'Dead Bug',
    contraindications: [],
    visualTrigger: 'Torso leans excessively forward during squat',
  },
  {
    id: 'mq-knee-valgus',
    title: 'Knee Valgus',
    scoreDetailId: 'movement',
    condition: (form) =>
      form.ohsKneeAlignment === 'valgus' ||
      form.lungeLeftKneeAlignment === 'caves-inward' ||
      form.lungeRightKneeAlignment === 'caves-inward',
    overactiveMuscles: ['Adductor Complex', 'Biceps Femoris (Short Head)'],
    underactiveMuscles: ['Gluteus Medius', 'Gluteus Maximus'],
    primaryStretch: 'Standing Adductor Stretch',
    primaryActivation: 'Wall Slides',
    contraindications: ['Box Jumps'],
    visualTrigger: 'Knees collapse inward during movement',
  },
  {
    id: 'mq-posterior-pelvic-tilt',
    title: 'Posterior Pelvic Tilt',
    scoreDetailId: 'posture',
    condition: (form) =>
      toArray(form.postureHipsOverall).includes('posterior-tilt') ||
      form.hingeBackRounding === 'severe',
    overactiveMuscles: ['Hamstrings', 'Rectus Abdominis'],
    underactiveMuscles: ['Erector Spinae', 'Iliopsoas'],
    primaryStretch: 'Seated Hamstring Stretch',
    primaryActivation: 'Pelvic See-Saw',
    contraindications: ['Abdominal Crunches'],
    visualTrigger: 'Flattened lower back and tucked pelvis',
  },
  {
    id: 'mq-flat-feet',
    title: 'Flat Feet',
    scoreDetailId: 'posture',
    condition: (form) => form.ohsFeetPosition === 'pronation',
    overactiveMuscles: ['Peroneals', 'Gastrocnemius', 'Soleus'],
    underactiveMuscles: ['Posterior Tibialis', 'Anterior Tibialis'],
    primaryStretch: 'Gastrocnemius Stretch',
    primaryActivation: 'Single-leg Calf Raise',
    contraindications: ['Heavy Sumo Squats'],
    visualTrigger: 'Arch of the foot collapses or flattens',
  },
];

export interface CategoryDetailConfig {
  id: string;
  title: string;
  action: string;
}

export const CATEGORY_DETAIL_CONFIG: Record<string, CategoryDetailConfig[]> = {
  cardio: [
    { id: 'rhr', title: 'Resting Heart Rate', action: 'Progressive aerobic conditioning and recovery practices to improve resting HR.' },
    { id: 'hrr', title: 'Heart Rate Recovery', action: 'Structured cardio with cool-downs to improve HR recovery post-exercise.' },
    { id: 'hr60', title: 'Recovery (1 min)', action: 'Aerobic base building and consistent cardio to improve 1-minute recovery.' },
    { id: 'vo2', title: 'VO₂max', action: 'Progressive aerobic conditioning to improve aerobic capacity.' },
  ],
  strength: [
    { id: 'pushups', title: 'Push-up Endurance', action: 'Progressive push-up progressions and upper-body strength work.' },
    { id: 'squats', title: 'Squat Endurance', action: 'Lower-body strength and endurance progressions (goblet squats, etc.).' },
    { id: 'plank', title: 'Core Stability', action: 'Progressive plank and core stability work.' },
    { id: 'grip', title: 'Grip Strength', action: 'Grip-focused exercises and progressive loading.' },
  ],
  bodyComp: [
    { id: 'bf', title: 'Body Fat %', action: 'Structured nutrition and training to support healthy body fat levels.' },
    { id: 'smm', title: 'Skeletal Muscle Mass', action: 'Progressive resistance training and protein adequacy.' },
    { id: 'visceral', title: 'Visceral Fat Level', action: 'Lifestyle and nutrition interventions to reduce visceral adiposity.' },
    { id: 'whr', title: 'Waist-to-Hip Ratio', action: 'Combined nutrition and training approach for healthy WHR.' },
  ],
};
