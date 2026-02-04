/**
 * Workout Exercise Definitions
 *
 * Organized by movement pattern:
 * - Pushing movements (chest, shoulders, triceps)
 * - Pulling movements (back, lats, biceps)
 * - Squatting movements (quadriceps, glutes)
 * - Hinging movements (hamstrings, glutes, back)
 * - Isolation movements
 */

import type { Exercise } from './types';

export const WORKOUT_EXERCISES: Exercise[] = [
  // ============================================
  // PUSHING MOVEMENTS
  // ============================================

  // Chest Pressing - Barbell (Strength-focused)
  {
    name: 'Barbell Bench Press',
    category: 'workout',
    sessionTypes: ['push', 'upper-body', 'full-body'],
    bodyParts: ['chest', 'shoulders', 'triceps'],
    goals: ['build-strength', 'build-muscle'],
    prescription: { sets: '3-5', reps: '5-8', notes: 'Progressive overload focus' },
    equipment: ['barbell'],
    impactLevel: 'moderate',
    genderSuitability: 'male-preferred',
    preference: {
      whenPreferred: { goal: 'build-strength' },
      whenNotPreferred: { hasIssues: ['limb-asymmetry', 'rounded-shoulders'] }
    },
    description: 'Primary strength builder for chest and triceps'
  },

  // Chest Pressing - Dumbbell (Hypertrophy/Balance-focused)
  {
    name: 'Dumbbell Bench Press',
    category: 'workout',
    sessionTypes: ['push', 'upper-body', 'full-body'],
    bodyParts: ['chest', 'shoulders', 'triceps'],
    goals: ['build-muscle', 'build-strength'],
    prescription: { sets: '3-4', reps: '8-12', notes: 'Full range of motion' },
    equipment: ['dumbbells'],
    impactLevel: 'moderate',
    genderSuitability: 'all',
    addresses: { asymmetry: ['limb-asymmetry'] },
    preference: {
      whenPreferred: { goal: 'build-muscle' },
      whenNotPreferred: { goal: 'build-strength' }
    },
    description: 'Allows independent arm movement, better for muscle building and correcting imbalances'
  },
  {
    name: 'Incline Dumbbell Press',
    category: 'workout',
    sessionTypes: ['push', 'upper-body'],
    bodyParts: ['chest', 'shoulders'],
    goals: ['build-muscle', 'build-strength'],
    prescription: { sets: '3-4', reps: '8-12', notes: '30-45 degree incline' },
    equipment: ['dumbbells'],
    impactLevel: 'moderate',
    genderSuitability: 'all',
    addresses: { asymmetry: ['limb-asymmetry'] },
    description: 'Upper chest development with independent arm movement'
  },
  {
    name: 'Push-ups',
    category: 'workout',
    sessionTypes: ['push', 'upper-body', 'full-body'],
    bodyParts: ['chest', 'shoulders', 'triceps', 'core'],
    goals: ['build-muscle', 'build-strength', 'improve-fitness'],
    prescription: { sets: '3-4', reps: '8-20', notes: 'Can modify on knees if needed' },
    equipment: ['bodyweight'],
    impactLevel: 'moderate',
    genderSuitability: 'all',
    exclusions: { bodyComp: { sedentary: true, maxBMI: 35 } },
    description: 'Bodyweight pressing movement, scalable difficulty'
  },

  // Shoulder Pressing
  {
    name: 'Overhead Press (Barbell)',
    category: 'workout',
    sessionTypes: ['push', 'upper-body', 'full-body'],
    bodyParts: ['shoulders', 'triceps', 'core'],
    goals: ['build-strength', 'build-muscle'],
    prescription: { sets: '3-5', reps: '5-8', notes: 'Progressive overload focus' },
    equipment: ['barbell'],
    impactLevel: 'moderate',
    genderSuitability: 'male-preferred',
    exclusions: { mobility: ['poor-shoulder-mobility'], movement: ['ohs-pain'] },
    preference: {
      whenPreferred: { goal: 'build-strength' },
      whenNotPreferred: { hasIssues: ['rounded-shoulders', 'poor-shoulder-mobility'] }
    },
    description: 'Primary overhead strength builder'
  },
  {
    name: 'Dumbbell Shoulder Press',
    category: 'workout',
    sessionTypes: ['push', 'upper-body'],
    bodyParts: ['shoulders', 'triceps'],
    goals: ['build-muscle', 'build-strength'],
    prescription: { sets: '3-4', reps: '8-12', notes: 'Seated or standing' },
    equipment: ['dumbbells'],
    impactLevel: 'moderate',
    genderSuitability: 'all',
    addresses: { asymmetry: ['limb-asymmetry'] },
    exclusions: { mobility: ['poor-shoulder-mobility'] },
    description: 'Allows natural arm path, better for muscle building'
  },
  {
    name: 'Lateral Raises',
    category: 'workout',
    sessionTypes: ['push', 'upper-body'],
    bodyParts: ['shoulders'],
    goals: ['build-muscle'],
    prescription: { sets: '3-4', reps: '12-15', notes: 'Light weight, controlled tempo' },
    equipment: ['dumbbells'],
    impactLevel: 'low',
    genderSuitability: 'all',
    addresses: { postural: ['rounded-shoulders'] },
    description: 'Isolation work for side delts'
  },

  // ============================================
  // PULLING MOVEMENTS
  // ============================================

  // Horizontal Pulling (Rowing)
  {
    name: 'Barbell Row',
    category: 'workout',
    sessionTypes: ['pull', 'upper-body', 'full-body'],
    bodyParts: ['back', 'lats', 'biceps'],
    goals: ['build-strength', 'build-muscle'],
    prescription: { sets: '3-5', reps: '5-8', notes: 'Progressive overload focus' },
    equipment: ['barbell'],
    impactLevel: 'moderate',
    genderSuitability: 'male-preferred',
    preference: {
      whenPreferred: { goal: 'build-strength' },
      whenNotPreferred: { hasIssues: ['limb-asymmetry', 'rounded-shoulders'] }
    },
    description: 'Primary horizontal pulling strength builder'
  },
  {
    name: 'Dumbbell Row',
    category: 'workout',
    sessionTypes: ['pull', 'upper-body'],
    bodyParts: ['back', 'lats', 'biceps'],
    goals: ['build-muscle', 'build-strength'],
    prescription: { sets: '3-4', reps: '8-12 each side', notes: 'One arm at a time' },
    equipment: ['dumbbells'],
    impactLevel: 'moderate',
    genderSuitability: 'all',
    addresses: { asymmetry: ['limb-asymmetry'] },
    preference: {
      whenPreferred: { goal: 'build-muscle' },
      whenNotPreferred: { goal: 'build-strength' }
    },
    description: 'Unilateral rowing, excellent for imbalances and muscle building'
  },
  {
    name: 'Cable Row',
    category: 'workout',
    sessionTypes: ['pull', 'upper-body'],
    bodyParts: ['back', 'lats', 'biceps'],
    goals: ['build-muscle', 'build-strength'],
    prescription: { sets: '3-4', reps: '8-12', notes: 'Squeeze shoulder blades' },
    equipment: ['cable'],
    impactLevel: 'low',
    genderSuitability: 'all',
    addresses: { postural: ['rounded-shoulders'] },
    description: 'Constant tension, great for muscle building'
  },

  // Vertical Pulling (Pull-ups/Chin-ups)
  {
    name: 'Pull-ups',
    category: 'workout',
    sessionTypes: ['pull', 'upper-body', 'full-body'],
    bodyParts: ['back', 'lats', 'biceps'],
    goals: ['build-strength', 'build-muscle'],
    prescription: { sets: '3-5', reps: '5-12', notes: 'Can use assistance band if needed' },
    equipment: ['bodyweight'],
    impactLevel: 'moderate',
    genderSuitability: 'male-preferred',
    exclusions: { bodyComp: { sedentary: true, maxBMI: 30 } },
    preference: {
      whenPreferred: { goal: 'build-strength' }
    },
    description: 'Bodyweight vertical pulling, strength-focused'
  },
  {
    name: 'Chin-ups',
    category: 'workout',
    sessionTypes: ['pull', 'upper-body', 'full-body'],
    bodyParts: ['back', 'lats', 'biceps'],
    goals: ['build-strength', 'build-muscle'],
    prescription: { sets: '3-5', reps: '5-12', notes: 'Palms facing you, easier than pull-ups' },
    equipment: ['bodyweight'],
    impactLevel: 'moderate',
    genderSuitability: 'male-preferred',
    exclusions: { bodyComp: { sedentary: true, maxBMI: 30 } },
    description: 'Easier variation of pull-ups, more bicep emphasis'
  },
  {
    name: 'Lat Pulldown',
    category: 'workout',
    sessionTypes: ['pull', 'upper-body'],
    bodyParts: ['back', 'lats'],
    goals: ['build-muscle', 'build-strength'],
    prescription: { sets: '3-4', reps: '8-12', notes: 'Can use various grips' },
    equipment: ['cable', 'machine'],
    impactLevel: 'low',
    genderSuitability: 'all',
    addresses: { postural: ['rounded-shoulders'] },
    description: 'Scalable vertical pulling, great for building lats'
  },

  // Face Pulls (Corrective)
  {
    name: 'Face Pulls',
    category: 'workout',
    sessionTypes: ['pull', 'upper-body'],
    bodyParts: ['back', 'shoulders'],
    goals: ['build-muscle', 'build-strength'],
    prescription: { sets: '3-4', reps: '12-15', notes: 'External rotation at end' },
    equipment: ['cable'],
    impactLevel: 'low',
    genderSuitability: 'all',
    addresses: { postural: ['rounded-shoulders'] },
    description: 'Corrects rounded shoulders while building rear delts and mid-traps'
  },
  {
    name: 'Band Face Pulls',
    category: 'workout',
    sessionTypes: ['pull', 'upper-body'],
    bodyParts: ['back', 'shoulders'],
    goals: ['build-muscle'],
    prescription: { sets: '3', reps: '15-20', notes: 'Light resistance, focus on form' },
    equipment: ['resistance-band'],
    impactLevel: 'low',
    genderSuitability: 'all',
    addresses: { postural: ['rounded-shoulders'] },
    description: 'Corrective exercise for rounded shoulders'
  },

  // ============================================
  // SQUATTING MOVEMENTS
  // ============================================

  {
    name: 'Back Squat (Barbell)',
    category: 'workout',
    sessionTypes: ['legs', 'lower-body', 'full-body'],
    bodyParts: ['legs', 'glutes', 'quadriceps'],
    goals: ['build-strength', 'build-muscle'],
    prescription: { sets: '3-5', reps: '5-8', notes: 'Progressive overload focus' },
    equipment: ['barbell'],
    impactLevel: 'moderate',
    genderSuitability: 'male-preferred',
    exclusions: { mobility: ['poor-ankle-mobility'], bodyComp: { sedentary: true, maxBMI: 35 } },
    preference: {
      whenPreferred: { goal: 'build-strength' },
      whenNotPreferred: { hasIssues: ['limb-asymmetry', 'poor-ankle-mobility', 'knee-valgus'] }
    },
    description: 'Primary lower body strength builder'
  },
  {
    name: 'Goblet Squat',
    category: 'workout',
    sessionTypes: ['legs', 'lower-body', 'full-body'],
    bodyParts: ['legs', 'glutes', 'quadriceps'],
    goals: ['build-muscle', 'build-strength'],
    prescription: { sets: '3-4', reps: '8-12', notes: 'Great for learning squat pattern' },
    equipment: ['dumbbells', 'kettlebell'],
    impactLevel: 'moderate',
    genderSuitability: 'all',
    exclusions: { bodyComp: { sedentary: true, maxBMI: 35 } },
    addresses: { mobility: ['ankle-mobility'] },
    description: 'Beginner-friendly squat variation, helps with depth'
  },
  {
    name: 'Dumbbell Front Squat',
    category: 'workout',
    sessionTypes: ['legs', 'lower-body', 'full-body'],
    bodyParts: ['legs', 'glutes', 'quadriceps', 'core'],
    goals: ['build-muscle', 'build-strength'],
    prescription: { sets: '3-4', reps: '8-12', notes: 'Requires more core and ankle mobility' },
    equipment: ['dumbbells'],
    impactLevel: 'moderate',
    genderSuitability: 'all',
    addresses: { mobility: ['ankle-mobility'], strength: ['core-weakness'] },
    exclusions: { mobility: ['poor-ankle-mobility'] },
    description: 'Front-loaded squat, builds core and quadriceps'
  },
  {
    name: 'Bulgarian Split Squat',
    category: 'workout',
    sessionTypes: ['legs', 'lower-body'],
    bodyParts: ['legs', 'glutes', 'quadriceps'],
    goals: ['build-muscle', 'build-strength'],
    prescription: { sets: '3-4', reps: '8-12 each leg', notes: 'Unilateral, great for imbalances' },
    equipment: ['dumbbells', 'bodyweight'],
    impactLevel: 'moderate',
    genderSuitability: 'all',
    addresses: { asymmetry: ['limb-asymmetry', 'hip-instability'] },
    exclusions: { bodyComp: { sedentary: true, maxBMI: 35 }, movement: ['lunge-pain'] },
    description: 'Unilateral squat variation, excellent for correcting imbalances'
  },
  {
    name: 'Lunges',
    category: 'workout',
    sessionTypes: ['legs', 'lower-body', 'full-body'],
    bodyParts: ['legs', 'glutes', 'quadriceps'],
    goals: ['build-muscle', 'build-strength', 'improve-fitness'],
    prescription: { sets: '3-4', reps: '8-12 each leg', notes: 'Walking or stationary' },
    equipment: ['dumbbells', 'bodyweight'],
    impactLevel: 'moderate',
    genderSuitability: 'all',
    addresses: { asymmetry: ['limb-asymmetry', 'hip-instability'] },
    exclusions: { bodyComp: { sedentary: true, maxBMI: 35 }, movement: ['lunge-pain'] },
    description: 'Unilateral movement, great for imbalances and functional strength'
  },
  {
    name: 'Reverse Lunges',
    category: 'workout',
    sessionTypes: ['legs', 'lower-body'],
    bodyParts: ['legs', 'glutes', 'quadriceps'],
    goals: ['build-muscle', 'build-strength'],
    prescription: { sets: '3-4', reps: '8-12 each leg', notes: 'Easier on knees than forward lunges' },
    equipment: ['dumbbells', 'bodyweight'],
    impactLevel: 'moderate',
    genderSuitability: 'all',
    addresses: { asymmetry: ['limb-asymmetry', 'hip-instability'] },
    exclusions: { bodyComp: { sedentary: true, maxBMI: 35 }, movement: ['lunge-pain'] },
    description: 'Lower impact than forward lunges, better for beginners'
  },

  // ============================================
  // HINGING MOVEMENTS
  // ============================================

  {
    name: 'Deadlift (Barbell)',
    category: 'workout',
    sessionTypes: ['legs', 'lower-body', 'full-body'],
    bodyParts: ['legs', 'glutes', 'hamstrings', 'back'],
    goals: ['build-strength', 'build-muscle'],
    prescription: { sets: '3-5', reps: '5-8', notes: 'Progressive overload focus' },
    equipment: ['barbell'],
    impactLevel: 'moderate',
    genderSuitability: 'male-preferred',
    exclusions: { movement: ['hinge-pain'], bodyComp: { sedentary: true, maxBMI: 35 } },
    preference: {
      whenPreferred: { goal: 'build-strength' },
      whenNotPreferred: { hasIssues: ['rounded-shoulders', 'limb-asymmetry'] }
    },
    description: 'Primary hip hinge strength builder'
  },
  {
    name: 'Romanian Deadlift (Barbell)',
    category: 'workout',
    sessionTypes: ['legs', 'lower-body', 'full-body'],
    bodyParts: ['hamstrings', 'glutes', 'back'],
    goals: ['build-muscle', 'build-strength'],
    prescription: { sets: '3-4', reps: '8-12', notes: 'Focus on hamstring stretch' },
    equipment: ['barbell'],
    impactLevel: 'moderate',
    genderSuitability: 'male-preferred',
    addresses: { mobility: ['hip-mobility'] },
    exclusions: { movement: ['hinge-pain'] },
    description: 'Hamstring-focused hinge, great for posterior chain'
  },
  {
    name: 'Stiff-Legged Deadlift (Dumbbells)',
    category: 'workout',
    sessionTypes: ['legs', 'lower-body'],
    bodyParts: ['hamstrings', 'glutes'],
    goals: ['build-muscle'],
    prescription: { sets: '3-4', reps: '10-12', notes: 'Stretches tight hamstrings while strengthening' },
    equipment: ['dumbbells'],
    impactLevel: 'low',
    genderSuitability: 'all',
    addresses: { mobility: ['hip-mobility'], postural: ['anterior-pelvic-tilt'] },
    exclusions: { movement: ['hinge-pain'] },
    description: 'Corrects tight hamstrings while building posterior chain'
  },
  {
    name: 'Single-Leg Romanian Deadlift',
    category: 'workout',
    sessionTypes: ['legs', 'lower-body'],
    bodyParts: ['hamstrings', 'glutes'],
    goals: ['build-muscle', 'build-strength'],
    prescription: { sets: '3-4', reps: '8-12 each leg', notes: 'Unilateral, great for imbalances' },
    equipment: ['dumbbells', 'bodyweight'],
    impactLevel: 'moderate',
    genderSuitability: 'all',
    addresses: { asymmetry: ['limb-asymmetry', 'hip-instability'] },
    exclusions: { movement: ['hinge-pain'], bodyComp: { sedentary: true } },
    description: 'Unilateral hinge, excellent for imbalances and stability'
  },
  {
    name: 'Hip Thrust',
    category: 'workout',
    sessionTypes: ['legs', 'lower-body'],
    bodyParts: ['glutes', 'hamstrings'],
    goals: ['build-muscle', 'build-strength'],
    prescription: { sets: '3-4', reps: '10-15', notes: 'Glute-focused movement' },
    equipment: ['barbell', 'dumbbells', 'bodyweight'],
    impactLevel: 'low',
    genderSuitability: 'female-preferred',
    addresses: { postural: ['anterior-pelvic-tilt'], strength: ['upper-body-weakness'] },
    description: 'Glute-focused movement, excellent for posterior chain development'
  },
  {
    name: 'Kettlebell Swings',
    category: 'workout',
    sessionTypes: ['legs', 'lower-body', 'full-body'],
    bodyParts: ['glutes', 'hamstrings', 'core'],
    goals: ['build-muscle', 'improve-fitness'],
    prescription: { sets: '3-4', reps: '15-20', notes: 'Hip drive, not squat' },
    equipment: ['kettlebell'],
    impactLevel: 'moderate',
    genderSuitability: 'all',
    exclusions: { bodyComp: { sedentary: true, maxBMI: 35 }, movement: ['hinge-pain'] },
    addresses: { mobility: ['hip-mobility'] },
    description: 'Explosive hip hinge, builds power and fitness'
  },

  // ============================================
  // ISOLATION MOVEMENTS
  // ============================================

  {
    name: 'Bicep Curls',
    category: 'workout',
    sessionTypes: ['pull', 'upper-body'],
    bodyParts: ['biceps'],
    goals: ['build-muscle'],
    prescription: { sets: '3', reps: '12-15', notes: 'Various grips' },
    equipment: ['dumbbells', 'cable', 'barbell'],
    impactLevel: 'low',
    genderSuitability: 'all',
    description: 'Bicep isolation'
  },
  {
    name: 'Tricep Extensions',
    category: 'workout',
    sessionTypes: ['push', 'upper-body'],
    bodyParts: ['triceps'],
    goals: ['build-muscle'],
    prescription: { sets: '3', reps: '12-15', notes: 'Overhead or cable' },
    equipment: ['dumbbells', 'cable'],
    impactLevel: 'low',
    genderSuitability: 'all',
    description: 'Tricep isolation'
  },
  {
    name: 'Leg Curls',
    category: 'workout',
    sessionTypes: ['legs', 'lower-body'],
    bodyParts: ['hamstrings'],
    goals: ['build-muscle'],
    prescription: { sets: '3-4', reps: '12-15', notes: 'Machine or band' },
    equipment: ['machine', 'resistance-band'],
    impactLevel: 'low',
    genderSuitability: 'all',
    description: 'Hamstring isolation'
  },
  {
    name: 'Leg Extensions',
    category: 'workout',
    sessionTypes: ['legs', 'lower-body'],
    bodyParts: ['quadriceps'],
    goals: ['build-muscle'],
    prescription: { sets: '3-4', reps: '12-15', notes: 'Machine' },
    equipment: ['machine'],
    impactLevel: 'low',
    genderSuitability: 'all',
    description: 'Quadricep isolation'
  },
  {
    name: 'Calf Raises',
    category: 'workout',
    sessionTypes: ['legs', 'lower-body'],
    bodyParts: ['calves'],
    goals: ['build-muscle', 'build-strength'],
    prescription: { sets: '3-4', reps: '15-20', notes: 'Seated or standing' },
    equipment: ['dumbbells', 'machine', 'bodyweight'],
    impactLevel: 'low',
    genderSuitability: 'all',
    description: 'Calf isolation'
  },
];
