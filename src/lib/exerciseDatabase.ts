/**
 * Comprehensive Exercise Database
 * 
 * Organized into three categories: Warm-up, Workout, Cardio
 * Each exercise is tagged with:
 * - Session types (legs, push, pull, upper-body, lower-body, full-body)
 * - Body parts
 * - Goals (build-muscle, build-strength, improve-fitness, weight-loss)
 * - Gender suitability
 * - Impact level
 * - Corrective/issue-specific applications
 * - Prescription (sets/reps/time)
 */

export type SessionType = 'pull' | 'push' | 'legs' | 'upper-body' | 'lower-body' | 'full-body' | 'cardio' | 'warm-up';
export type BodyPart = 'legs' | 'glutes' | 'hamstrings' | 'quadriceps' | 'calves' | 'chest' | 'shoulders' | 'back' | 'lats' | 'biceps' | 'triceps' | 'core' | 'neck' | 'hips' | 'ankles';
export type GoalType = 'build-muscle' | 'build-strength' | 'improve-fitness' | 'weight-loss' | 'general-health';
export type GenderSuitability = 'all' | 'male-preferred' | 'female-preferred';
export type ImpactLevel = 'low' | 'moderate' | 'high';
export type Equipment = 'bodyweight' | 'dumbbells' | 'barbell' | 'cable' | 'machine' | 'resistance-band' | 'foam-roller' | 'kettlebell' | 'none';

export interface Exercise {
  name: string;
  category: 'warm-up' | 'workout' | 'cardio';
  sessionTypes: SessionType[]; // Which session types this exercise fits
  bodyParts: BodyPart[]; // Which body parts this targets
  goals: GoalType[]; // Which goals this supports
  prescription: {
    sets?: string; // e.g., "3"
    reps?: string; // e.g., "10-12" or "8-12/side"
    time?: string; // e.g., "30-45s" or "20-30 min"
    notes?: string; // e.g., "2-4x/week" or "Slow, controlled"
  };
  equipment: Equipment[];
  impactLevel: ImpactLevel;
  genderSuitability: GenderSuitability;
  
  // Issue-specific applications
  addresses?: {
    postural?: string[]; // e.g., ['forward-head', 'rounded-shoulders', 'kyphosis']
    mobility?: string[]; // e.g., ['hip-mobility', 'ankle-mobility', 'shoulder-mobility']
    strength?: string[]; // e.g., ['core-weakness', 'upper-body-weakness']
    asymmetry?: string[]; // e.g., ['limb-asymmetry', 'hip-instability']
  };
  
  // Exclusion criteria (when NOT to use this exercise)
  exclusions?: {
    bodyComp?: {
      maxBMI?: number; // Don't use if BMI exceeds this
      maxBodyFat?: number; // Don't use if body fat % exceeds this (gender-specific)
      sedentary?: boolean; // Don't use if client is sedentary
    };
    movement?: string[]; // e.g., ['ohs-pain', 'hinge-pain', 'lunge-pain']
    mobility?: string[]; // e.g., ['poor-ankle-mobility', 'poor-shoulder-mobility']
  };
  
  // Preference logic
  preference?: {
    whenPreferred?: {
      goal?: GoalType; // Preferred when this goal
      equipment?: Equipment; // Preferred when this equipment available
    };
    whenNotPreferred?: {
      goal?: GoalType; // Not preferred when this goal
      hasIssues?: string[]; // Not preferred when these issues exist
    };
  };
  
  description?: string; // Exercise description/instructions
}

/**
 * WARM-UP EXERCISES
 */
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

/**
 * WORKOUT EXERCISES
 * Organized by movement pattern and goal
 */
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

/**
 * CARDIO EXERCISES
 */
export const CARDIO_EXERCISES: Exercise[] = [
  // Zone 2 / Low Intensity
  {
    name: 'Zone 2 Walking',
    category: 'cardio',
    sessionTypes: ['cardio'],
    bodyParts: ['legs'],
    goals: ['weight-loss', 'improve-fitness', 'general-health'],
    prescription: { time: '30-60 min', notes: '2-4x/week, maintain conversation pace' },
    equipment: ['none'],
    impactLevel: 'low',
    genderSuitability: 'all',
    exclusions: {},
    description: 'Low-intensity steady state, excellent for fat loss and recovery'
  },
  {
    name: 'Zone 2 Cycling',
    category: 'cardio',
    sessionTypes: ['cardio'],
    bodyParts: ['legs'],
    goals: ['weight-loss', 'improve-fitness', 'general-health'],
    prescription: { time: '30-60 min', notes: '2-4x/week, low impact' },
    equipment: ['none'], // Stationary bike
    impactLevel: 'low',
    genderSuitability: 'all',
    exclusions: {},
    description: 'Low-impact Zone 2 cardio'
  },
  {
    name: 'Zone 2 Rowing',
    category: 'cardio',
    sessionTypes: ['cardio'],
    bodyParts: ['legs', 'core'],
    goals: ['weight-loss', 'improve-fitness', 'general-health'],
    prescription: { time: '20-40 min', notes: '2-3x/week, full body low impact' },
    equipment: ['machine'],
    impactLevel: 'low',
    genderSuitability: 'all',
    exclusions: {},
    description: 'Full-body Zone 2 cardio, low impact'
  },
  
  // HIIT / High Intensity
  {
    name: 'HIIT Cycling',
    category: 'cardio',
    sessionTypes: ['cardio'],
    bodyParts: ['legs'],
    goals: ['improve-fitness', 'weight-loss', 'build-muscle'],
    prescription: { sets: '6-8', time: '2-4 min intervals', notes: 'High intensity with rest periods' },
    equipment: ['none'], // Stationary bike
    impactLevel: 'moderate',
    genderSuitability: 'all',
    exclusions: { bodyComp: { sedentary: true, maxBMI: 35 } },
    description: 'High-intensity intervals on bike, lower impact than running'
  },
  {
    name: 'Sprint Intervals',
    category: 'cardio',
    sessionTypes: ['cardio'],
    bodyParts: ['legs'],
    goals: ['improve-fitness'],
    prescription: { sets: '6-10', time: '30s on / 90s off', notes: 'Max effort sprints' },
    equipment: ['none'],
    impactLevel: 'high',
    genderSuitability: 'male-preferred',
    exclusions: { bodyComp: { sedentary: true, maxBMI: 30 } },
    description: 'High-impact sprint training'
  },
  {
    name: 'Burpees',
    category: 'cardio',
    sessionTypes: ['cardio', 'full-body'],
    bodyParts: ['legs', 'core'],
    goals: ['improve-fitness', 'weight-loss'],
    prescription: { sets: '4-6', reps: '10-15', notes: 'Full body high intensity' },
    equipment: ['bodyweight'],
    impactLevel: 'high',
    genderSuitability: 'all',
    exclusions: { bodyComp: { sedentary: true, maxBMI: 30 } },
    description: 'High-impact full-body exercise'
  },
  
  // Circuits / Mixed Modalities
  {
    name: 'Circuit Training',
    category: 'cardio',
    sessionTypes: ['cardio', 'full-body'],
    bodyParts: ['legs', 'core'],
    goals: ['improve-fitness', 'build-muscle', 'weight-loss'],
    prescription: { sets: '3-5', time: '30-45s per exercise', notes: 'Multiple exercises, minimal rest' },
    equipment: ['dumbbells', 'bodyweight'],
    impactLevel: 'moderate',
    genderSuitability: 'all',
    exclusions: { bodyComp: { sedentary: true, maxBMI: 35 } },
    description: 'Combines strength and cardio in time-efficient format'
  },
  
  // Moderate Intensity
  {
    name: 'Moderate Pace Running',
    category: 'cardio',
    sessionTypes: ['cardio'],
    bodyParts: ['legs'],
    goals: ['improve-fitness', 'weight-loss'],
    prescription: { time: '20-40 min', notes: '3-4x/week, conversational pace' },
    equipment: ['none'],
    impactLevel: 'high',
    genderSuitability: 'all',
    exclusions: { bodyComp: { sedentary: true, maxBMI: 30 }, mobility: ['poor-ankle-mobility'] },
    description: 'Moderate intensity running'
  },
  {
    name: 'Swimming',
    category: 'cardio',
    sessionTypes: ['cardio'],
    bodyParts: ['legs', 'core'],
    goals: ['improve-fitness', 'weight-loss', 'build-muscle'],
    prescription: { time: '20-40 min', notes: '2-3x/week, low impact' },
    equipment: ['none'],
    impactLevel: 'low',
    genderSuitability: 'all',
    exclusions: {},
    description: 'Low-impact full-body cardio'
  },
];

// Combine all exercises
export const ALL_EXERCISES = [...WARMUP_EXERCISES, ...WORKOUT_EXERCISES, ...CARDIO_EXERCISES];

