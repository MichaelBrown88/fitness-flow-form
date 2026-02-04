import {
  POSTURE_THRESHOLDS,
  calculateKneeDeviation,
  getSeverity,
} from '@/lib/utils/postureAlignment';
import type { FrontBackAlignments } from './types';

/**
 * Calculates comprehensive alignment status for front/back view landmarks
 */
export function calculateFrontBackAlignments(
  landmarks: Array<{ x: number; y: number; z?: number; visibility?: number }>,
  canvasWidth: number,
  canvasHeight: number,
  isBackView: boolean = false
): FrontBackAlignments {
  // Landmark positions (normalized 0-1)
  const nose = landmarks[0];
  const leftEar = landmarks[7];
  const rightEar = landmarks[8];
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];
  const leftKnee = landmarks[25];
  const rightKnee = landmarks[26];
  const leftAnkle = landmarks[27];
  const rightAnkle = landmarks[28];

  // Calculate body midline (average of shoulders and hips X positions)
  const shoulderMidX = ((leftShoulder?.x ?? 0.5) + (rightShoulder?.x ?? 0.5)) / 2;
  const hipMidX = ((leftHip?.x ?? 0.5) + (rightHip?.x ?? 0.5)) / 2;
  const bodyMidlineX = (shoulderMidX + hipMidX) / 2;
  const ankleMidX = ((leftAnkle?.x ?? bodyMidlineX) + (rightAnkle?.x ?? bodyMidlineX)) / 2;

  // ===== SHOULDER LEVEL =====
  const shoulderDiff = Math.abs((leftShoulder?.y ?? 0) - (rightShoulder?.y ?? 0));
  const shoulderSeverity = getSeverity(shoulderDiff, POSTURE_THRESHOLDS.SHOULDER_LEVEL);
  const shoulderHigherSide = shoulderDiff < POSTURE_THRESHOLDS.SHOULDER_LEVEL.GOOD ? 'level' :
    ((leftShoulder?.y ?? 0) < (rightShoulder?.y ?? 0) ? 'left' : 'right');

  // ===== HIP LEVEL =====
  const hipDiff = Math.abs((leftHip?.y ?? 0) - (rightHip?.y ?? 0));
  const hipSeverity = getSeverity(hipDiff, POSTURE_THRESHOLDS.HIP_LEVEL);
  const hipHigherSide = hipDiff < POSTURE_THRESHOLDS.HIP_LEVEL.GOOD ? 'level' :
    ((leftHip?.y ?? 0) < (rightHip?.y ?? 0) ? 'left' : 'right');

  // ===== HEAD TILT (ear level) =====
  const earDiff = Math.abs((leftEar?.y ?? 0) - (rightEar?.y ?? 0));
  const headTiltSeverity = getSeverity(earDiff, POSTURE_THRESHOLDS.HEAD_TILT);
  const tiltDirection = earDiff < POSTURE_THRESHOLDS.HEAD_TILT.GOOD ? 'level' :
    ((leftEar?.y ?? 0) < (rightEar?.y ?? 0) ? 'right' : 'left');

  // ===== HIP SHIFT =====
  const hipShiftAmount = Math.abs(hipMidX - ankleMidX);
  const hipShiftSeverity = getSeverity(hipShiftAmount, POSTURE_THRESHOLDS.HIP_SHIFT);
  const hipShiftDirection = hipShiftAmount < POSTURE_THRESHOLDS.HIP_SHIFT.GOOD ? 'centered' :
    (hipMidX < bodyMidlineX ? 'left' : 'right');

  // ===== LATERAL HEAD (nose off midline) =====
  const noseOffset = Math.abs((nose?.x ?? bodyMidlineX) - bodyMidlineX);
  const lateralHeadSeverity = getSeverity(noseOffset, POSTURE_THRESHOLDS.LATERAL_HEAD);
  const lateralHeadDirection = noseOffset < POSTURE_THRESHOLDS.LATERAL_HEAD.GOOD ? 'centered' :
    ((nose?.x ?? bodyMidlineX) < bodyMidlineX ? 'left' : 'right');

  // ===== LEFT LEG ALIGNMENT =====
  const leftKneeDevResult = calculateKneeDeviation(
    (leftHip?.x ?? 0), (leftHip?.y ?? 0),
    (leftKnee?.x ?? 0), (leftKnee?.y ?? 0),
    (leftAnkle?.x ?? 0), (leftAnkle?.y ?? 0)
  );
  const leftLegSeverity = getSeverity(Math.abs(leftKneeDevResult.deviation), POSTURE_THRESHOLDS.LEG_ALIGNMENT);

  // ===== RIGHT LEG ALIGNMENT =====
  const rightKneeDevResult = calculateKneeDeviation(
    (rightHip?.x ?? 0), (rightHip?.y ?? 0),
    (rightKnee?.x ?? 0), (rightKnee?.y ?? 0),
    (rightAnkle?.x ?? 0), (rightAnkle?.y ?? 0)
  );
  const rightLegSeverity = getSeverity(Math.abs(rightKneeDevResult.deviation), POSTURE_THRESHOLDS.LEG_ALIGNMENT);

  // ===== SCOLIOSIS (back view only) =====
  let scoliosis: FrontBackAlignments['scoliosis'];
  if (isBackView) {
    const spineMidX = (shoulderMidX + hipMidX) / 2;
    const scoliosisDeviation = Math.abs(shoulderMidX - hipMidX);
    const scoliosisSeverity = getSeverity(scoliosisDeviation, POSTURE_THRESHOLDS.SCOLIOSIS);
    const scoliosisDirection = scoliosisDeviation < POSTURE_THRESHOLDS.SCOLIOSIS.GOOD ? 'straight' :
      (shoulderMidX < hipMidX ? 'right' : 'left');

    scoliosis = {
      severity: scoliosisSeverity,
      shoulderMidX: shoulderMidX * canvasWidth,
      hipMidX: hipMidX * canvasWidth,
      spineMidX: spineMidX * canvasWidth,
      deviation: scoliosisDeviation,
      direction: scoliosisDirection,
    };
  }

  return {
    shoulders: {
      severity: shoulderSeverity,
      leftY: (leftShoulder?.y ?? 0) * canvasHeight,
      rightY: (rightShoulder?.y ?? 0) * canvasHeight,
      diff: shoulderDiff,
      higherSide: shoulderHigherSide,
    },
    hips: {
      severity: hipSeverity,
      leftY: (leftHip?.y ?? 0) * canvasHeight,
      rightY: (rightHip?.y ?? 0) * canvasHeight,
      diff: hipDiff,
      higherSide: hipHigherSide,
    },
    headTilt: {
      severity: headTiltSeverity,
      leftY: (leftEar?.y ?? 0) * canvasHeight,
      rightY: (rightEar?.y ?? 0) * canvasHeight,
      diff: earDiff,
      tiltDirection,
    },
    hipShift: {
      severity: hipShiftSeverity,
      midpointX: hipMidX * canvasWidth,
      bodyMidlineX: bodyMidlineX * canvasWidth,
      shiftAmount: hipShiftAmount,
      shiftDirection: hipShiftDirection,
    },
    lateralHead: {
      severity: lateralHeadSeverity,
      noseX: (nose?.x ?? bodyMidlineX) * canvasWidth,
      midlineX: bodyMidlineX * canvasWidth,
      offset: noseOffset,
      direction: lateralHeadDirection,
    },
    leftLeg: {
      severity: leftLegSeverity,
      hipPos: { x: (leftHip?.x ?? 0) * canvasWidth, y: (leftHip?.y ?? 0) * canvasHeight },
      kneePos: { x: (leftKnee?.x ?? 0) * canvasWidth, y: (leftKnee?.y ?? 0) * canvasHeight },
      anklePos: { x: (leftAnkle?.x ?? 0) * canvasWidth, y: (leftAnkle?.y ?? 0) * canvasHeight },
      kneeDeviation: leftKneeDevResult.deviation,
      direction: leftKneeDevResult.direction,
    },
    rightLeg: {
      severity: rightLegSeverity,
      hipPos: { x: (rightHip?.x ?? 0) * canvasWidth, y: (rightHip?.y ?? 0) * canvasHeight },
      kneePos: { x: (rightKnee?.x ?? 0) * canvasWidth, y: (rightKnee?.y ?? 0) * canvasHeight },
      anklePos: { x: (rightAnkle?.x ?? 0) * canvasWidth, y: (rightAnkle?.y ?? 0) * canvasHeight },
      kneeDeviation: rightKneeDevResult.deviation,
      direction: rightKneeDevResult.direction,
    },
    scoliosis,
    bodyMidlineX: bodyMidlineX * canvasWidth,
  };
}
