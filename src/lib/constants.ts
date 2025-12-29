/**
 * Centralized Constants
 * 
 * All magic strings, phase IDs, goal types, and other constants used throughout the app.
 * Update values here to propagate changes across the entire codebase.
 */

// Phase IDs
export const PHASE_IDS = {
  P1: 'P1',
  P2: 'P2',
  P3: 'P3',
  P4: 'P4',
} as const;

export type PhaseId = typeof PHASE_IDS[keyof typeof PHASE_IDS];

// Goal Types
export const GOAL_TYPES = {
  BUILD_MUSCLE: 'build-muscle',
  BUILD_STRENGTH: 'build-strength',
  IMPROVE_FITNESS: 'improve-fitness',
  WEIGHT_LOSS: 'weight-loss',
  GENERAL_HEALTH: 'general-health',
} as const;

export type GoalType = typeof GOAL_TYPES[keyof typeof GOAL_TYPES];

// Session Types
export const SESSION_TYPES = {
  PULL: 'pull',
  PUSH: 'push',
  LEGS: 'legs',
  UPPER_BODY: 'upper-body',
  LOWER_BODY: 'lower-body',
  FULL_BODY: 'full-body',
  CARDIO: 'cardio',
  WARM_UP: 'warm-up',
} as const;

export type SessionType = typeof SESSION_TYPES[keyof typeof SESSION_TYPES];

// Posture Input Modes
export const POSTURE_INPUT_MODES = {
  MANUAL: 'manual',
  AI: 'ai',
} as const;

export type PostureInputMode = typeof POSTURE_INPUT_MODES[keyof typeof POSTURE_INPUT_MODES];

// Posture Views
export const POSTURE_VIEWS = {
  FRONT: 'front',
  BACK: 'back',
  SIDE_LEFT: 'side-left',
  SIDE_RIGHT: 'side-right',
} as const;

export type PostureView = typeof POSTURE_VIEWS[keyof typeof POSTURE_VIEWS];

// Assessment Views
export const ASSESSMENT_VIEWS = {
  CLIENT: 'client',
  COACH: 'coach',
} as const;

export type AssessmentView = typeof ASSESSMENT_VIEWS[keyof typeof ASSESSMENT_VIEWS];

// Score Thresholds
export const SCORE_THRESHOLDS = {
  EXCELLENT: 75,
  GOOD: 45,
  POOR: 0,
} as const;

// Firestore Collection Names
export const COLLECTIONS = {
  COACHES: 'coaches',
  ASSESSMENTS: 'assessments',
  ORGANIZATIONS: 'organizations',
  CLIENTS: 'clients',
} as const;

// Firestore Field Names
export const FIELDS = {
  ORGANIZATION_ID: 'organizationId',
  CREATED_AT: 'createdAt',
  CLIENT_NAME: 'clientName',
  CLIENT_NAME_LOWER: 'clientNameLower',
  OVERALL_SCORE: 'overallScore',
} as const;

// Default Limits
export const LIMITS = {
  ASSESSMENTS_PER_PAGE: 20,
  CLIENTS_PER_PAGE: 12,
  MAX_ASSESSMENTS_QUERY: 500,
  MAX_CLIENTS_QUERY: 100,
} as const;

// PDF Settings
export const PDF_SETTINGS = {
  FILENAME_PREFIX: 'Fitness-Assessment-',
  FILENAME_SUFFIX_CLIENT: '-Client-Report.pdf',
  FILENAME_SUFFIX_COACH: '-Coach-Report.pdf',
  FONT_LOAD_DELAY_MS: 300,
  SCALE: 3,
  MARGIN_MM: 10,
} as const;

