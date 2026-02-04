/**
 * Warm-up Exercise Definitions
 *
 * Includes general mobility, posture corrections, hip/ankle/shoulder mobility,
 * core activation, glute activation, and dynamic movement prep.
 */

import type { Exercise } from './types';

export const WARMUP_EXERCISES: Exercise[] = [
  // General Mobility
  {
    name: 'Arm Circles',
    category: 'warm-up',
    sessionTypes: ['push', 'pull', 'upper-body', 'full-body'],
    bodyParts: ['shoulders'],
    goals: ['build-muscle', 'build-strength', 'improve-fitness', 'general-health'],
    prescription: { sets: '2', reps: '10-15 each direction', notes: 'Forward and backward' },
    equipment: ['none'],
    impactLevel: 'low',
    genderSuitability: 'all',
    description: 'Gentle shoulder mobility warm-up'
  },
  {
    name: 'Leg Swings',
    category: 'warm-up',
    sessionTypes: ['legs', 'lower-body', 'full-body'],
    bodyParts: ['hips', 'legs'],
    goals: ['build-muscle', 'build-strength', 'improve-fitness', 'general-health'],
    prescription: { sets: '2', reps: '10-15 each leg', notes: 'Forward/back and side-to-side' },
    equipment: ['none'],
    impactLevel: 'low',
    genderSuitability: 'all',
    addresses: { mobility: ['hip-mobility'] },
    description: 'Dynamic hip mobility warm-up'
  },
  {
    name: 'Cat-Cow Stretch',
    category: 'warm-up',
    sessionTypes: ['full-body', 'upper-body', 'lower-body'],
    bodyParts: ['back', 'core'],
    goals: ['build-muscle', 'build-strength', 'improve-fitness', 'general-health'],
    prescription: { sets: '2', reps: '10-12', notes: 'Slow, controlled' },
    equipment: ['none'],
    impactLevel: 'low',
    genderSuitability: 'all',
    addresses: { postural: ['kyphosis', 'lordosis'], mobility: ['hip-mobility'] },
    description: 'Spinal mobility warm-up'
  },

  // Posture Corrections (Warm-up that also corrects)
  {
    name: 'Chin Tucks',
    category: 'warm-up',
    sessionTypes: ['push', 'pull', 'upper-body', 'full-body'],
    bodyParts: ['neck', 'core'],
    goals: ['build-muscle', 'build-strength', 'improve-fitness', 'general-health'],
    prescription: { sets: '3', reps: '10-15', notes: 'Slow, controlled - hold 2-3s' },
    equipment: ['none'],
    impactLevel: 'low',
    genderSuitability: 'all',
    addresses: { postural: ['forward-head'] },
    description: 'Corrects forward head posture'
  },
  {
    name: 'Wall Angels',
    category: 'warm-up',
    sessionTypes: ['push', 'pull', 'upper-body', 'full-body'],
    bodyParts: ['shoulders', 'back'],
    goals: ['build-muscle', 'build-strength', 'improve-fitness', 'general-health'],
    prescription: { sets: '2-3', reps: '10-12', notes: 'Keep back flat against wall' },
    equipment: ['none'],
    impactLevel: 'low',
    genderSuitability: 'all',
    addresses: { postural: ['rounded-shoulders', 'kyphosis'] },
    description: 'Corrects rounded shoulders and thoracic extension'
  },
  {
    name: 'Thoracic Extensions over Foam Roller',
    category: 'warm-up',
    sessionTypes: ['push', 'pull', 'upper-body', 'full-body'],
    bodyParts: ['back', 'shoulders'],
    goals: ['build-muscle', 'build-strength', 'improve-fitness', 'general-health'],
    prescription: { sets: '2-3', reps: '8-10', notes: 'Slow, focus on extension' },
    equipment: ['foam-roller'],
    impactLevel: 'low',
    genderSuitability: 'all',
    addresses: { postural: ['kyphosis'], mobility: ['shoulder-mobility'] },
    description: 'Improves thoracic extension for better overhead movement'
  },
  {
    name: 'Upper Trapezius Stretch',
    category: 'warm-up',
    sessionTypes: ['push', 'pull', 'upper-body', 'full-body'],
    bodyParts: ['neck', 'shoulders'],
    goals: ['build-muscle', 'build-strength', 'improve-fitness', 'general-health'],
    prescription: { sets: '2-3', time: '30-45s each side', notes: 'Hold stretch' },
    equipment: ['none'],
    impactLevel: 'low',
    genderSuitability: 'all',
    addresses: { postural: ['forward-head', 'rounded-shoulders'] },
    description: 'Releases tight upper traps from forward head posture'
  },
  {
    name: 'Prone Y/T/W',
    category: 'warm-up',
    sessionTypes: ['pull', 'upper-body', 'full-body'],
    bodyParts: ['back', 'shoulders'],
    goals: ['build-muscle', 'build-strength', 'improve-fitness', 'general-health'],
    prescription: { sets: '2-3', reps: '8 each position', notes: 'Y, T, then W positions' },
    equipment: ['none'],
    impactLevel: 'low',
    genderSuitability: 'all',
    addresses: { postural: ['rounded-shoulders', 'kyphosis'], strength: ['upper-body-weakness'] },
    description: 'Activates lower traps and serratus anterior'
  },

  // Hip Mobility
  {
    name: '90/90 Hip Switches',
    category: 'warm-up',
    sessionTypes: ['legs', 'lower-body', 'full-body'],
    bodyParts: ['hips', 'glutes'],
    goals: ['build-muscle', 'build-strength', 'improve-fitness', 'general-health'],
    prescription: { sets: '2-3', reps: '6-8 each side', notes: 'Slow, controlled rotation' },
    equipment: ['none'],
    impactLevel: 'low',
    genderSuitability: 'all',
    addresses: { mobility: ['hip-mobility'], asymmetry: ['hip-instability'] },
    description: 'Improves hip internal/external rotation'
  },
  {
    name: 'Hip Flexor Stretch',
    category: 'warm-up',
    sessionTypes: ['legs', 'lower-body', 'full-body'],
    bodyParts: ['hips', 'quadriceps'],
    goals: ['build-muscle', 'build-strength', 'improve-fitness', 'general-health'],
    prescription: { sets: '2-3', time: '45s each side', notes: 'Hold stretch, activate glute' },
    equipment: ['none'],
    impactLevel: 'low',
    genderSuitability: 'all',
    addresses: { postural: ['anterior-pelvic-tilt'], mobility: ['hip-mobility'] },
    description: 'Releases tight hip flexors'
  },
  {
    name: 'Hip CARs (Controlled Articular Rotations)',
    category: 'warm-up',
    sessionTypes: ['legs', 'lower-body', 'full-body'],
    bodyParts: ['hips'],
    goals: ['build-muscle', 'build-strength', 'improve-fitness', 'general-health'],
    prescription: { sets: '2', reps: '5-8 each leg', notes: 'Slow, full range of motion' },
    equipment: ['none'],
    impactLevel: 'low',
    genderSuitability: 'all',
    addresses: { mobility: ['hip-mobility'], asymmetry: ['hip-instability'] },
    description: 'Full range hip mobility warm-up'
  },

  // Ankle Mobility
  {
    name: 'Knee-to-Wall Ankle Mobilizations',
    category: 'warm-up',
    sessionTypes: ['legs', 'lower-body', 'full-body'],
    bodyParts: ['ankles', 'calves'],
    goals: ['build-muscle', 'build-strength', 'improve-fitness', 'general-health'],
    prescription: { sets: '2-3', reps: '8-10 each side', notes: 'Keep heel down, track knee over toe' },
    equipment: ['none'],
    impactLevel: 'low',
    genderSuitability: 'all',
    addresses: { mobility: ['ankle-mobility'] },
    description: 'Improves dorsiflexion for better squat depth'
  },
  {
    name: 'Calf Stretch',
    category: 'warm-up',
    sessionTypes: ['legs', 'lower-body', 'full-body'],
    bodyParts: ['calves', 'ankles'],
    goals: ['build-muscle', 'build-strength', 'improve-fitness', 'general-health'],
    prescription: { sets: '2-3', time: '45s each side', notes: 'Hold stretch' },
    equipment: ['none'],
    impactLevel: 'low',
    genderSuitability: 'all',
    addresses: { mobility: ['ankle-mobility'] },
    description: 'Releases tight calves'
  },

  // Shoulder Mobility
  {
    name: 'PVC Shoulder Dislocates',
    category: 'warm-up',
    sessionTypes: ['push', 'pull', 'upper-body', 'full-body'],
    bodyParts: ['shoulders'],
    goals: ['build-muscle', 'build-strength', 'improve-fitness', 'general-health'],
    prescription: { sets: '2-3', reps: '8-10', notes: 'Controlled, wide grip' },
    equipment: ['none'], // Can use PVC, broomstick, or resistance band
    impactLevel: 'low',
    genderSuitability: 'all',
    addresses: { mobility: ['shoulder-mobility'], postural: ['rounded-shoulders'] },
    description: 'Improves overhead shoulder mobility'
  },
  {
    name: 'Sleeper Stretch',
    category: 'warm-up',
    sessionTypes: ['push', 'pull', 'upper-body', 'full-body'],
    bodyParts: ['shoulders'],
    goals: ['build-muscle', 'build-strength', 'improve-fitness', 'general-health'],
    prescription: { sets: '2-3', time: '45s each side', notes: 'Hold stretch lying on side' },
    equipment: ['none'],
    impactLevel: 'low',
    genderSuitability: 'all',
    addresses: { mobility: ['shoulder-mobility'] },
    description: 'Improves internal rotation mobility'
  },
  {
    name: 'Band Pull-Aparts',
    category: 'warm-up',
    sessionTypes: ['push', 'pull', 'upper-body', 'full-body'],
    bodyParts: ['back', 'shoulders'],
    goals: ['build-muscle', 'build-strength', 'improve-fitness', 'general-health'],
    prescription: { sets: '2-3', reps: '15-20', notes: 'Squeeze shoulder blades' },
    equipment: ['resistance-band'],
    impactLevel: 'low',
    genderSuitability: 'all',
    addresses: { postural: ['rounded-shoulders'], strength: ['upper-body-weakness'] },
    description: 'Activates rear delts and mid-traps'
  },

  // Core Activation
  {
    name: 'Dead Bug',
    category: 'warm-up',
    sessionTypes: ['full-body', 'legs', 'lower-body'],
    bodyParts: ['core'],
    goals: ['build-muscle', 'build-strength', 'improve-fitness', 'general-health'],
    prescription: { sets: '2-3', reps: '8-10 each side', notes: 'Slow, controlled, keep lower back pressed down' },
    equipment: ['none'],
    impactLevel: 'low',
    genderSuitability: 'all',
    addresses: { postural: ['lordosis'], strength: ['core-weakness'] },
    description: 'Core stability warm-up'
  },
  {
    name: 'Bird Dog',
    category: 'warm-up',
    sessionTypes: ['full-body', 'legs', 'lower-body'],
    bodyParts: ['core', 'back'],
    goals: ['build-muscle', 'build-strength', 'improve-fitness', 'general-health'],
    prescription: { sets: '2-3', reps: '8-10 each side', notes: 'Hold 2-3s, alternate sides' },
    equipment: ['none'],
    impactLevel: 'low',
    genderSuitability: 'all',
    addresses: { strength: ['core-weakness'], asymmetry: ['limb-asymmetry'] },
    description: 'Core stability and anti-extension'
  },
  {
    name: 'Plank Hold',
    category: 'warm-up',
    sessionTypes: ['full-body'],
    bodyParts: ['core'],
    goals: ['build-muscle', 'build-strength', 'improve-fitness', 'general-health'],
    prescription: { sets: '2-3', time: '30-60s', notes: 'Hold strict form' },
    equipment: ['none'],
    impactLevel: 'low',
    genderSuitability: 'all',
    addresses: { strength: ['core-weakness'] },
    description: 'Core stability warm-up'
  },

  // Glute Activation
  {
    name: 'Glute Bridges',
    category: 'warm-up',
    sessionTypes: ['legs', 'lower-body', 'full-body'],
    bodyParts: ['glutes', 'hamstrings'],
    goals: ['build-muscle', 'build-strength', 'improve-fitness', 'general-health'],
    prescription: { sets: '2-3', reps: '12-15', notes: 'Squeeze glutes at top' },
    equipment: ['none'],
    impactLevel: 'low',
    genderSuitability: 'all',
    addresses: { postural: ['anterior-pelvic-tilt'], strength: ['upper-body-weakness'] },
    description: 'Activates glutes before lower body work'
  },
  {
    name: 'Clamshells',
    category: 'warm-up',
    sessionTypes: ['legs', 'lower-body', 'full-body'],
    bodyParts: ['glutes', 'hips'],
    goals: ['build-muscle', 'build-strength', 'improve-fitness', 'general-health'],
    prescription: { sets: '2-3', reps: '12-15 each side', notes: 'Slow, controlled' },
    equipment: ['none'],
    impactLevel: 'low',
    genderSuitability: 'all',
    addresses: { asymmetry: ['limb-asymmetry', 'hip-instability'] },
    description: 'Activates lateral glutes'
  },

  // Dynamic Movement Prep
  {
    name: 'Walking Lunges',
    category: 'warm-up',
    sessionTypes: ['legs', 'lower-body', 'full-body'],
    bodyParts: ['legs', 'glutes', 'quadriceps'],
    goals: ['build-muscle', 'build-strength', 'improve-fitness', 'general-health'],
    prescription: { sets: '1-2', reps: '10-12 each leg', notes: 'Light weight or bodyweight' },
    equipment: ['bodyweight', 'dumbbells'],
    impactLevel: 'moderate',
    genderSuitability: 'all',
    exclusions: { bodyComp: { sedentary: true, maxBMI: 35 } },
    addresses: { asymmetry: ['limb-asymmetry', 'hip-instability'] },
    description: 'Dynamic warm-up for lower body'
  },
  {
    name: 'Bodyweight Squats',
    category: 'warm-up',
    sessionTypes: ['legs', 'lower-body', 'full-body'],
    bodyParts: ['legs', 'glutes', 'quadriceps'],
    goals: ['build-muscle', 'build-strength', 'improve-fitness', 'general-health'],
    prescription: { sets: '1-2', reps: '10-15', notes: 'Light warm-up pace' },
    equipment: ['bodyweight'],
    impactLevel: 'moderate',
    genderSuitability: 'all',
    exclusions: { bodyComp: { sedentary: true, maxBMI: 35 } },
    description: 'Basic squat pattern warm-up'
  },

  // Asymmetry Corrections
  {
    name: 'Isolateral Neck Stabilization',
    category: 'warm-up',
    sessionTypes: ['upper-body', 'full-body'],
    bodyParts: ['neck', 'core'],
    goals: ['build-muscle', 'build-strength', 'improve-fitness', 'general-health'],
    prescription: { sets: '3', reps: '10-12 each side', notes: 'Gentle isometric holds' },
    equipment: ['none'],
    impactLevel: 'low',
    genderSuitability: 'all',
    addresses: { postural: ['head-tilt'], asymmetry: ['limb-asymmetry'] },
    description: 'Corrects head tilt and neck alignment'
  },
  {
    name: 'Mini-Band Lateral Walks',
    category: 'warm-up',
    sessionTypes: ['legs', 'lower-body', 'full-body'],
    bodyParts: ['glutes', 'hips'],
    goals: ['build-muscle', 'build-strength', 'improve-fitness', 'general-health'],
    prescription: { sets: '2-3', reps: '10-12 steps each direction', notes: 'Keep tension on band' },
    equipment: ['resistance-band'],
    impactLevel: 'low',
    genderSuitability: 'all',
    addresses: { asymmetry: ['limb-asymmetry', 'hip-instability'], postural: ['knee-valgus'] },
    description: 'Activates lateral glutes for knee stability'
  },
];
