/**
 * Client Re-Test Cadence Types
 * 
 * Defines the data structures for smart re-test scheduling.
 * The system generates recommendations based on assessment findings and goals,
 * while allowing coaches to override with custom schedules.
 */

/** Priority levels for reassessment urgency */
export type CadencePriority = 'high' | 'medium' | 'low';

/** Partial assessment categories (matches existing partial assessment system) */
export type PartialAssessmentCategory = 'bodycomp' | 'posture' | 'fitness' | 'strength' | 'lifestyle';

/** @deprecated Use 'bodycomp' instead. Kept for Firestore backward compatibility. */
export type LegacyPartialCategory = 'inbody';

/** Accepts both current and legacy pillar identifiers for reading stored data */
export type PartialAssessmentCategoryCompat = PartialAssessmentCategory | LegacyPartialCategory;

/**
 * Configuration for a single pillar's retest cadence
 */
export interface CadenceConfig {
  /** Days between retests */
  intervalDays: number;
  /** Why this interval was recommended (shown in UI) */
  reason?: string;
  /** Priority level for this pillar */
  priority: CadencePriority;
}

/**
 * Cadence configuration for all 5 assessment pillars
 */
export interface PillarCadence {
  /** Body composition (scan or measurements) - Base: 30 days */
  bodycomp: CadenceConfig;
  /** Movement quality (posture, OHS, hinge, lunge, mobility) - Base: 45 days */
  posture: CadenceConfig;
  /** Cardio (YMCA step test, treadmill) - Base: 45 days */
  fitness: CadenceConfig;
  /** Strength (pushups, squats, plank, grip) - Base: 60 days */
  strength: CadenceConfig;
  /** Lifestyle factors (nutrition, sleep, stress, recovery) - Base: 45 days */
  lifestyle: CadenceConfig;
}

/**
 * Complete retest schedule stored on a client profile
 */
export interface RetestSchedule {
  /** Auto-generated recommendations from assessment analysis */
  recommended: PillarCadence;
  /** Coach overrides (takes precedence over recommended) */
  custom?: Partial<PillarCadence>;
  /** When recommendations were generated */
  generatedAt: Date;
  /** Assessment ID that generated these recommendations */
  sourceAssessmentId: string;
}

/**
 * Base intervals for retest cadence (ACSM/NASM aligned)
 * Used as defaults when no assessment data exists
 */
export const BASE_CADENCE_INTERVALS: Record<PartialAssessmentCategory | 'fullAssessment', number> = {
  bodycomp: 30,    // Monthly body composition tracking
  posture: 45,     // 4-6 week corrective exercise block (FMS standards)
  fitness: 45,     // 6-week adaptation block
  strength: 60,    // True hypertrophy measurement (technique vs tissue)
  lifestyle: 45,   // Lifestyle factor reassessment
  fullAssessment: 90, // Quarterly comprehensive review
} as const;

/**
 * Score thresholds for cadence adjustments
 */
export const CADENCE_SCORE_THRESHOLDS = {
  /** Score below this is critical - reduce interval by 50% */
  critical: 40,
  /** Score below this needs attention - reduce interval by 25% */
  needsWork: 60,
  /** Score above this is strong - extend interval by 25% */
  strong: 80,
} as const;

/**
 * Clinical warning threshold for frequent body composition scans
 * BIA is sensitive to hydration, so frequent scans pick up water weight noise
 */
export const BODY_COMP_HYDRATION_WARNING_THRESHOLD = 21; // days

/** Maps legacy 'inbody' pillar ID to current 'bodycomp' for Firestore backward compatibility */
export function normalizePillarId(id: string): PartialAssessmentCategory | string {
  if (id === 'inbody') return 'bodycomp';
  return id;
}
