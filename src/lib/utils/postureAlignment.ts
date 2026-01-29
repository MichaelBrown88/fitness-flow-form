export type SeverityLevel = 'good' | 'mild' | 'moderate' | 'severe';

export type KneeDirection = 'valgus' | 'varus' | 'neutral';
export type KneeLabel = 'straight' | 'valgus' | 'varus';

/**
 * Clinical thresholds for posture assessment
 * These MUST stay in sync across wireframe + report logic.
 */
export const POSTURE_THRESHOLDS = {
  // Front/Back View - Level checks (as fraction of image height)
  SHOULDER_LEVEL: {
    GOOD: 0.008,
    MILD: 0.015,
    MODERATE: 0.025,
    SEVERE: 0.04,
  },
  HIP_LEVEL: {
    GOOD: 0.008,
    MILD: 0.015,
    MODERATE: 0.025,
    SEVERE: 0.04,
  },
  HEAD_TILT: {
    GOOD: 0.008,
    MILD: 0.015,
    MODERATE: 0.025,
    SEVERE: 0.04,
  },
  // Front/Back View - Hip Shift (lateral displacement as fraction of body width)
  HIP_SHIFT: {
    GOOD: 0.012,
    MILD: 0.025,
    MODERATE: 0.04,
    SEVERE: 0.06,
  },
  // Front/Back View - Lateral Head Tilt (nose/chin off midline)
  LATERAL_HEAD: {
    GOOD: 0.012,
    MILD: 0.025,
    MODERATE: 0.04,
    SEVERE: 0.06,
  },
  // Front/Back View - Leg alignment (knee deviation from hip-ankle line)
  LEG_ALIGNMENT: {
    GOOD: 0.01,
    MILD: 0.02,
    MODERATE: 0.035,
    SEVERE: 0.05,
  },
  // Back View - Scoliosis (spine midpoint deviation from shoulder-hip midline)
  SCOLIOSIS: {
    GOOD: 0.015,
    MILD: 0.03,
    MODERATE: 0.05,
    SEVERE: 0.08,
  },
  // Side View - Plumb line deviations (as fraction of image width)
  PLUMB_LINE: {
    GOOD: 0.025,
    MILD: 0.05,
    MODERATE: 0.08,
    SEVERE: 0.12,
  },
  // Side View - Pelvic Tilt (fallback threshold)
  PELVIC_TILT: {
    GOOD: 0.015,
    MILD: 0.03,
    MODERATE: 0.05,
    SEVERE: 0.08,
  },
  // Side View - Head Up/Down (ear vs eye vertical relationship)
  HEAD_UPDOWN: {
    NEUTRAL: 0.02,
    UP: 0.04,
    DOWN: 0.04,
  },
} as const;

export function getSeverity(
  value: number,
  thresholds: { GOOD: number; MILD: number; MODERATE: number; SEVERE: number }
): SeverityLevel {
  if (value < thresholds.GOOD) return 'good';
  if (value < thresholds.MILD) return 'mild';
  if (value < thresholds.MODERATE) return 'moderate';
  return 'severe';
}

/**
 * Calculate line from hip to ankle and measure knee deviation
 * Returns the deviation of knee from the hip-ankle line (valgus/varus detection)
 */
export function calculateKneeDeviation(
  hipX: number, hipY: number,
  kneeX: number, kneeY: number,
  ankleX: number, ankleY: number
): { deviation: number; direction: KneeDirection } {
  const t = (kneeY - hipY) / (ankleY - hipY);
  const expectedKneeX = hipX + (ankleX - hipX) * t;
  const deviation = kneeX - expectedKneeX;
  const direction: KneeDirection = Math.abs(deviation) < 0.01 ? 'neutral' : (deviation < 0 ? 'valgus' : 'varus');

  return { deviation, direction };
}

function normalizeKneeDirection(
  direction: KneeDirection,
  severity: SeverityLevel,
  view: 'front' | 'back'
): KneeLabel {
  if (severity === 'good' || direction === 'neutral') return 'straight';
  if (view === 'back') {
    return direction === 'valgus' ? 'varus' : 'valgus';
  }
  return direction;
}

export interface FrontBackDeviationSummary {
  shoulder: SeverityLevel;
  hipLevel: SeverityLevel;
  hipShift: SeverityLevel;
  headTilt: SeverityLevel;
  leftLeg: SeverityLevel;
  rightLeg: SeverityLevel;
  leftKneeDirection: KneeLabel;
  rightKneeDirection: KneeLabel;
  leftKneeDeviation: number;
  rightKneeDeviation: number;
  leftKneeIsValgus: boolean;
  rightKneeIsValgus: boolean;
}

export function calculateFrontBackDeviationSummary(
  landmarks: Array<{ x: number; y: number; z?: number; visibility?: number }> | undefined,
  view: 'front' | 'back'
): FrontBackDeviationSummary {
  const defaults: FrontBackDeviationSummary = {
    shoulder: 'good',
    hipLevel: 'good',
    hipShift: 'good',
    headTilt: 'good',
    leftLeg: 'good',
    rightLeg: 'good',
    leftKneeDirection: 'straight',
    rightKneeDirection: 'straight',
    leftKneeDeviation: 0,
    rightKneeDeviation: 0,
  };

  if (!landmarks || landmarks.length < 33) return defaults;

  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];
  const leftEar = landmarks[7];
  const rightEar = landmarks[8];
  const leftKnee = landmarks[25];
  const rightKnee = landmarks[26];
  const leftAnkle = landmarks[27];
  const rightAnkle = landmarks[28];

  const shoulderDiff = Math.abs((leftShoulder?.y ?? 0) - (rightShoulder?.y ?? 0));
  const shoulder = getSeverity(shoulderDiff, POSTURE_THRESHOLDS.SHOULDER_LEVEL);

  const hipDiff = Math.abs((leftHip?.y ?? 0) - (rightHip?.y ?? 0));
  const hipLevel = getSeverity(hipDiff, POSTURE_THRESHOLDS.HIP_LEVEL);

  const earDiff = Math.abs((leftEar?.y ?? 0) - (rightEar?.y ?? 0));
  const headTilt = getSeverity(earDiff, POSTURE_THRESHOLDS.HEAD_TILT);

  const shoulderMidX = ((leftShoulder?.x ?? 0.5) + (rightShoulder?.x ?? 0.5)) / 2;
  const hipMidX = ((leftHip?.x ?? 0.5) + (rightHip?.x ?? 0.5)) / 2;
  const bodyMidlineX = (shoulderMidX + hipMidX) / 2;
  const ankleMidX = ((leftAnkle?.x ?? bodyMidlineX) + (rightAnkle?.x ?? bodyMidlineX)) / 2;
  const hipShiftAmount = Math.abs(hipMidX - ankleMidX);
  const hipShift = getSeverity(hipShiftAmount, POSTURE_THRESHOLDS.HIP_SHIFT);

  const leftKneeDevResult = calculateKneeDeviation(
    (leftHip?.x ?? 0), (leftHip?.y ?? 0),
    (leftKnee?.x ?? 0), (leftKnee?.y ?? 0),
    (leftAnkle?.x ?? 0), (leftAnkle?.y ?? 0)
  );
  const leftLeg = getSeverity(Math.abs(leftKneeDevResult.deviation), POSTURE_THRESHOLDS.LEG_ALIGNMENT);
  const leftKneeDirection = normalizeKneeDirection(leftKneeDevResult.direction, leftLeg, view);
  const leftKneeIsValgus = leftKneeDirection === 'valgus';

  const rightKneeDevResult = calculateKneeDeviation(
    (rightHip?.x ?? 0), (rightHip?.y ?? 0),
    (rightKnee?.x ?? 0), (rightKnee?.y ?? 0),
    (rightAnkle?.x ?? 0), (rightAnkle?.y ?? 0)
  );
  const rightLeg = getSeverity(Math.abs(rightKneeDevResult.deviation), POSTURE_THRESHOLDS.LEG_ALIGNMENT);
  const rightKneeDirection = normalizeKneeDirection(rightKneeDevResult.direction, rightLeg, view);
  const rightKneeIsValgus = rightKneeDirection === 'valgus';

  return {
    shoulder,
    hipLevel,
    hipShift,
    headTilt,
    leftLeg,
    rightLeg,
    leftKneeDirection,
    rightKneeDirection,
    leftKneeDeviation: leftKneeDevResult.deviation,
    rightKneeDeviation: rightKneeDevResult.deviation,
    leftKneeIsValgus,
    rightKneeIsValgus,
  };
}

export interface SideViewDeviationSummary {
  forwardHead: SeverityLevel;
  pelvicTilt: SeverityLevel;
}

export function calculateSideViewDeviationSummary(
  landmarks: Array<{ x: number; y: number; z?: number; visibility?: number }> | undefined,
  view: 'side-left' | 'side-right'
): SideViewDeviationSummary {
  const defaults: SideViewDeviationSummary = { forwardHead: 'good', pelvicTilt: 'good' };
  if (!landmarks || landmarks.length < 33) return defaults;

  const ear = view === 'side-left' ? landmarks[7] : landmarks[8];
  const hip = view === 'side-left' ? landmarks[23] : landmarks[24];
  const ankle = view === 'side-left' ? landmarks[27] : landmarks[28];

  const earDeviationNorm = Math.abs((ear?.x ?? 0.5) - (ankle?.x ?? 0.5));
  const forwardHead = getSeverity(earDeviationNorm, POSTURE_THRESHOLDS.PLUMB_LINE);

  const hipDeviationNorm = Math.abs((hip?.x ?? 0.5) - (ankle?.x ?? 0.5));
  const pelvicTilt = getSeverity(hipDeviationNorm, POSTURE_THRESHOLDS.PLUMB_LINE);

  return { forwardHead, pelvicTilt };
}
