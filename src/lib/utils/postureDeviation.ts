import {
  calculateFrontBackDeviationSummary,
  calculateSideViewDeviationSummary,
  getSeverity,
  POSTURE_THRESHOLDS,
  SeverityLevel,
} from '@/lib/utils/postureAlignment';

export type Severity = SeverityLevel;

export type RawLandmarks = Array<{ x: number; y: number; z?: number; visibility?: number }>;

export function calculateDeviationsFromLandmarks(
  landmarks: RawLandmarks | undefined,
  view: 'front' | 'back' | 'side-left' | 'side-right'
): {
  shoulder: Severity;
  hipLevel: Severity;
  hipShift: Severity;
  headTilt: Severity;
  leftLeg: Severity;
  rightLeg: Severity;
  forwardHead: Severity;
  pelvicTilt: Severity;
  leftKneeDirection: 'straight' | 'valgus' | 'varus';
  rightKneeDirection: 'straight' | 'valgus' | 'varus';
} {
  const defaults = {
    shoulder: 'good' as Severity,
    hipLevel: 'good' as Severity,
    hipShift: 'good' as Severity,
    headTilt: 'good' as Severity,
    leftLeg: 'good' as Severity,
    rightLeg: 'good' as Severity,
    forwardHead: 'good' as Severity,
    pelvicTilt: 'good' as Severity,
    leftKneeDirection: 'straight' as const,
    rightKneeDirection: 'straight' as const,
  };

  const isSideView = view === 'side-left' || view === 'side-right';

  if (!landmarks || landmarks.length < 33) return defaults;

  if (!isSideView) {
    const summary = calculateFrontBackDeviationSummary(landmarks, view);
    return {
      ...defaults,
      shoulder: summary.shoulder,
      hipLevel: summary.hipLevel,
      hipShift: summary.hipShift,
      headTilt: summary.headTilt,
      leftLeg: summary.leftLeg,
      rightLeg: summary.rightLeg,
      leftKneeDirection: summary.leftKneeDirection,
      rightKneeDirection: summary.rightKneeDirection,
    };
  }

  const summary = calculateSideViewDeviationSummary(landmarks, view);
  return {
    ...defaults,
    forwardHead: summary.forwardHead,
    pelvicTilt: summary.pelvicTilt,
  };
}

export function getRawLandmarkYPercent(landmarks: RawLandmarks | undefined, idx: number): number | null {
  const point = landmarks?.[idx];
  if (!point || typeof point.y !== 'number') return null;
  const percent = point.y * 100;
  return Math.max(5, Math.min(95, percent));
}

export function getAverageYPercent(landmarks: RawLandmarks | undefined, idxA: number, idxB: number): number | null {
  const a = getRawLandmarkYPercent(landmarks, idxA);
  const b = getRawLandmarkYPercent(landmarks, idxB);
  if (a === null || b === null) return null;
  return Math.max(5, Math.min(95, (a + b) / 2));
}

export function getSideViewPlumbSeverity(
  landmarks: RawLandmarks | undefined,
  view: 'side-left' | 'side-right',
  idx: number
): Severity {
  if (!landmarks || landmarks.length < 33) return 'good';
  const ankleIdx = view === 'side-left' ? 27 : 28;
  const landmark = landmarks[idx];
  const ankle = landmarks[ankleIdx];
  if (!landmark || !ankle) return 'good';
  const deviation = Math.abs(landmark.x - ankle.x);
  return getSeverity(deviation, POSTURE_THRESHOLDS.PLUMB_LINE);
}

export function getHeadPitchSeverity(landmarks: RawLandmarks | undefined, view: 'side-left' | 'side-right'): Severity {
  if (!landmarks || landmarks.length < 9) return 'good';
  const eyeIdx = view === 'side-left' ? 2 : 5;
  const earIdx = view === 'side-left' ? 7 : 8;
  const eye = landmarks[eyeIdx];
  const ear = landmarks[earIdx];
  if (!eye || !ear) return 'good';
  const earEyeDiff = Math.abs(ear.y - eye.y);
  if (earEyeDiff < POSTURE_THRESHOLDS.HEAD_UPDOWN.NEUTRAL) return 'good';
  if (earEyeDiff < POSTURE_THRESHOLDS.HEAD_UPDOWN.UP) return 'mild';
  return 'moderate';
}

export function getAiStatusSeverity(status?: string): Severity {
  if (!status) return 'good';
  const normalized = status.toLowerCase();
  if (normalized.includes('severe')) return 'severe';
  if (normalized.includes('moderate')) return 'moderate';
  if (normalized.includes('mild')) return 'mild';
  return 'good';
}
