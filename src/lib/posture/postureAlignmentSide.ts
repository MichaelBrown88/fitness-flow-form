import {
  POSTURE_THRESHOLDS,
  getSeverity,
} from '@/lib/utils/postureAlignment';
import type { SideViewAlignments } from './types';

/**
 * Calculates comprehensive alignment status for side view landmarks
 */
export function calculateSideViewAlignments(
  landmarks: Array<{ x: number; y: number; z?: number; visibility?: number }>,
  view: 'side-left' | 'side-right',
  canvasWidth: number,
  canvasHeight: number
): SideViewAlignments {
  // Use appropriate landmarks based on which side we're viewing
  const eyeIdx = view === 'side-left' ? 2 : 5;
  const earIdx = view === 'side-left' ? 7 : 8;
  const shoulderIdx = view === 'side-left' ? 11 : 12;
  const hipIdx = view === 'side-left' ? 23 : 24;
  const kneeIdx = view === 'side-left' ? 25 : 26;
  const ankleIdx = view === 'side-left' ? 27 : 28;

  const eye = landmarks[eyeIdx];
  const ear = landmarks[earIdx];
  const shoulder = landmarks[shoulderIdx];
  const hip = landmarks[hipIdx];
  const knee = landmarks[kneeIdx];
  const ankle = landmarks[ankleIdx];

  // Plumb line is based on ankle position
  const plumbX = (ankle?.x ?? 0.5) * canvasWidth;
  const ankleY = (ankle?.y ?? 0.9) * canvasHeight;

  // For side view, "forward" depends on which side the person is facing
  const forwardDir = view === 'side-left' ? -1 : 1;

  // Convert all positions to canvas coordinates
  const earX = (ear?.x ?? 0.5) * canvasWidth;
  const earY = (ear?.y ?? 0.1) * canvasHeight;
  const eyeX = (eye?.x ?? 0.5) * canvasWidth;
  const eyeY = (eye?.y ?? 0.1) * canvasHeight;
  const shoulderX = (shoulder?.x ?? 0.5) * canvasWidth;
  const shoulderY = (shoulder?.y ?? 0.25) * canvasHeight;
  const hipX = (hip?.x ?? 0.5) * canvasWidth;
  const hipY = (hip?.y ?? 0.5) * canvasHeight;
  const kneeX = (knee?.x ?? 0.5) * canvasWidth;
  const kneeY = (knee?.y ?? 0.75) * canvasHeight;
  const ankleX = (ankle?.x ?? 0.5) * canvasWidth;

  // ===== EAR (Forward Head Posture) =====
  const earDeviation = (earX - plumbX) * forwardDir;
  const earDeviationNorm = Math.abs((ear?.x ?? 0.5) - (ankle?.x ?? 0.5));
  const earSeverity = getSeverity(earDeviationNorm, POSTURE_THRESHOLDS.PLUMB_LINE);
  const earIsForward = earDeviation > POSTURE_THRESHOLDS.PLUMB_LINE.GOOD * canvasWidth;

  // ===== HEAD UP/DOWN TILT =====
  const earEyeYDiff = ((ear?.y ?? 0) - (eye?.y ?? 0));
  const headUpDownStatus = Math.abs(earEyeYDiff) < POSTURE_THRESHOLDS.HEAD_UPDOWN.NEUTRAL ? 'neutral' :
    (earEyeYDiff > 0 ? 'up' : 'down');
  const headUpDownSeverity = Math.abs(earEyeYDiff) < POSTURE_THRESHOLDS.HEAD_UPDOWN.NEUTRAL ? 'good' :
    (Math.abs(earEyeYDiff) < POSTURE_THRESHOLDS.HEAD_UPDOWN.UP ? 'mild' : 'moderate');

  // ===== SHOULDER (Rounded) =====
  const shoulderDeviation = (shoulderX - plumbX) * forwardDir;
  const shoulderDeviationNorm = Math.abs((shoulder?.x ?? 0.5) - (ankle?.x ?? 0.5));
  const shoulderSeverity = getSeverity(shoulderDeviationNorm, POSTURE_THRESHOLDS.PLUMB_LINE);
  const shoulderIsForward = shoulderDeviation > POSTURE_THRESHOLDS.PLUMB_LINE.GOOD * canvasWidth;

  // ===== HIP POSITION =====
  const hipDeviation = (hipX - plumbX) * forwardDir;
  const hipDeviationNorm = Math.abs((hip?.x ?? 0.5) - (ankle?.x ?? 0.5));
  const hipSeverity = getSeverity(hipDeviationNorm, POSTURE_THRESHOLDS.PLUMB_LINE);
  const hipIsForward = hipDeviation > POSTURE_THRESHOLDS.PLUMB_LINE.GOOD * canvasWidth;

  // ===== KNEE (Hyperextension) =====
  const kneeDeviation = (kneeX - plumbX) * forwardDir;
  const kneeStatus = Math.abs(kneeDeviation) < POSTURE_THRESHOLDS.PLUMB_LINE.GOOD * canvasWidth ? 'neutral' :
    (kneeDeviation < 0 ? 'hyperextended' : 'flexed');

  // ===== KYPHOSIS (Upper back curve) =====
  const kyphosisIndicator = Math.abs(shoulderDeviation - hipDeviation) / canvasWidth;
  const kyphosisSeverity = shoulderX * forwardDir < hipX * forwardDir && Math.abs(shoulderDeviation) > POSTURE_THRESHOLDS.PLUMB_LINE.MILD * canvasWidth
    ? getSeverity(kyphosisIndicator, POSTURE_THRESHOLDS.PLUMB_LINE)
    : 'good';

  // ===== LORDOSIS (Lower back curve) =====
  const lordosisIndicator = hipDeviationNorm;
  const lordosisSeverity = getSeverity(lordosisIndicator, POSTURE_THRESHOLDS.PLUMB_LINE);
  const lordosisType = lordosisSeverity === 'good' ? 'normal' :
    (hipIsForward ? 'hyper' : 'hypo');

  // ===== PELVIC TILT =====
  const pelvicTiltIndicator = hipDeviationNorm;
  const pelvicTiltType = Math.abs(hipDeviation) < POSTURE_THRESHOLDS.PLUMB_LINE.GOOD * canvasWidth ? 'neutral' :
    (hipIsForward ? 'anterior' : 'posterior');
  const pelvicTiltSeverity = getSeverity(pelvicTiltIndicator, POSTURE_THRESHOLDS.PLUMB_LINE);

  return {
    plumbX,
    ear: {
      x: earX,
      y: earY,
      severity: earSeverity,
      forwardAmount: earDeviation,
      isForward: earIsForward,
    },
    eye: {
      x: eyeX,
      y: eyeY,
    },
    headUpDown: {
      status: headUpDownStatus,
      severity: headUpDownSeverity,
      earEyeDiff: earEyeYDiff,
    },
    shoulder: {
      x: shoulderX,
      y: shoulderY,
      severity: shoulderSeverity,
      forwardAmount: shoulderDeviation,
      isForward: shoulderIsForward,
    },
    hip: {
      x: hipX,
      y: hipY,
      severity: hipSeverity,
      forwardAmount: hipDeviation,
      isForward: hipIsForward,
    },
    knee: {
      x: kneeX,
      y: kneeY,
      status: kneeStatus,
      deviation: kneeDeviation,
    },
    ankle: {
      x: ankleX,
      y: ankleY,
    },
    kyphosis: {
      severity: kyphosisSeverity,
      curveIndicator: kyphosisIndicator,
    },
    lordosis: {
      severity: lordosisSeverity,
      curveIndicator: lordosisIndicator,
      type: lordosisType,
    },
    pelvicTilt: {
      severity: pelvicTiltSeverity,
      type: pelvicTiltType,
      tiltIndicator: pelvicTiltIndicator,
    },
  };
}
