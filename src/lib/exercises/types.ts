/**
 * Exercise Database Type Definitions
 *
 * Types for the comprehensive exercise database organized by:
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
