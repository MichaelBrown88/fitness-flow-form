import { LandmarkResult } from '@/lib/ai/postureLandmarks';
import type { MediaPipeLandmark } from '@/lib/types/mediapipe';
import { calculateFrontBackDeviationSummary } from '@/lib/utils/postureAlignment';

/**
 * UTILITY: POSTURE MATHEMATICS
 * Calculates angles, deviations, and severity levels from MediaPipe landmarks.
 * This reduces reliance on AI for deterministic biometric checks.
 */

export interface CalculatedPostureMetrics {
  headTiltDegrees: number;
  forwardHeadCm: number;
  shoulderSymmetryCm: number;
  hipSymmetryCm: number;
  pelvicTiltDegrees: number;
  kneeValgusDegrees: number;
  leftLegAlignmentStatus?: 'Straight' | 'Valgus' | 'Varus';
  rightLegAlignmentStatus?: 'Straight' | 'Valgus' | 'Varus';
  leftLegSeverity?: 'Good' | 'Mild' | 'Moderate' | 'Severe';
  rightLegSeverity?: 'Good' | 'Mild' | 'Moderate' | 'Severe';
  leftKneeDeviationPercent?: number;
  rightKneeDeviationPercent?: number;
  kneeAlignmentStatus?: 'Neutral' | 'Valgus' | 'Varus';
  leftKneeIsValgus?: boolean;
  rightKneeIsValgus?: boolean;
  // Severity levels
  headSeverity: 'Neutral' | 'Mild' | 'Moderate' | 'Severe';
  shoulderSeverity: 'Neutral' | 'Asymmetric';
  hipSeverity: 'Neutral' | 'Asymmetric';
  pelvicSeverity: 'Neutral' | 'Mild' | 'Moderate' | 'Severe';
  
  // Head Pitch (Frankfurt Plane) - Side view
  headPitchDegrees: number;
  headPitchStatus: 'Level' | 'Looking Up' | 'Looking Down';
  
  // Lateral Hip Shift - Front/Back view
  hipShiftPercent: number;
  hipShiftDirection: 'None' | 'Left' | 'Right';
}

/**
 * Calculate distance between two points in 2D space
 */
function distance(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

/**
 * Calculate angle between three points (degrees)
 */
function calculateAngle(p1: { x: number; y: number }, p2: { x: number; y: number }, p3: { x: number; y: number }): number {
  const radians = Math.atan2(p3.y - p2.y, p3.x - p2.x) - Math.atan2(p1.y - p2.y, p1.x - p2.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180.0) angle = 360 - angle;
  return angle;
}

/**
 * Convert normalized image coordinates to CM
 * Assumption: Average shoulder width is 40cm for scaling
 */
function pixelsToCm(normalizedValue: number, shoulderWidthNormalized: number): number {
  const CM_PER_SHOULDER = 40; 
  if (shoulderWidthNormalized <= 0) return 0;
  return (normalizedValue / shoulderWidthNormalized) * CM_PER_SHOULDER;
}

function toReportSeverity(severity: 'good' | 'mild' | 'moderate' | 'severe'): 'Good' | 'Mild' | 'Moderate' | 'Severe' {
  switch (severity) {
    case 'mild':
      return 'Mild';
    case 'moderate':
      return 'Moderate';
    case 'severe':
      return 'Severe';
    default:
      return 'Good';
  }
}

/**
 * Main calculation logic for Front/Back View
 * @param landmarks MediaPipe pose landmarks
 * @param view 'front' or 'back' - affects left/right interpretation
 */
export function calculateFrontViewMetrics(landmarks: MediaPipeLandmark[], view: 'front' | 'back' = 'front'): Partial<CalculatedPostureMetrics> {
  // Extract key points
  const leftEar = landmarks[7] || landmarks[0];
  const rightEar = landmarks[8] || landmarks[0];
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];
  const leftAnkle = landmarks[27];
  const rightAnkle = landmarks[28];

  if (!leftShoulder || !rightShoulder) return {};

  const shoulderWidth = distance(leftShoulder, rightShoulder);

  // 1. Head Tilt (vertical difference between ears)
  // Use simple Y difference * scaling factor instead of atan2 (which wraps around for back view)
  // Positive = right ear lower (head tilting right), Negative = left ear lower (head tilting left)
  const earDeltaY = rightEar.y - leftEar.y; // positive if right ear is lower (higher Y)
  // Scale: 1% of image height ≈ 2-3 degrees of tilt (approximate based on typical head size)
  const headTilt = earDeltaY * 100 * 2.5; // Convert to approximate degrees

  // 2. Shoulder Symmetry
  const shoulderDiff = Math.abs(leftShoulder.y - rightShoulder.y);
  const shoulderDiffCm = pixelsToCm(shoulderDiff, shoulderWidth);

  // 3. Hip Symmetry (vertical difference)
  const hipDiff = leftHip && rightHip ? Math.abs(leftHip.y - rightHip.y) : 0;
  const hipDiffCm = pixelsToCm(hipDiff, shoulderWidth);

  // 4. Lateral Hip Shift (horizontal offset from stance center)
  // Hip center should be directly above the midpoint between ankles
  let hipShiftPercent = 0;
  let hipShiftDirection: 'None' | 'Left' | 'Right' = 'None';
  
  if (leftHip && rightHip && leftAnkle && rightAnkle) {
    const hipCenterX = (leftHip.x + rightHip.x) / 2;
    const stanceCenterX = (leftAnkle.x + rightAnkle.x) / 2;
    
    // Calculate shift as percentage of shoulder width (normalized)
    const shiftRaw = hipCenterX - stanceCenterX;
    hipShiftPercent = Math.abs(shiftRaw / shoulderWidth) * 100;
    
    // Determine direction with 2% tolerance threshold
    if (hipShiftPercent > 2) {
      // Note: MediaPipe X coordinates increase from Left (0) to Right (1) of the IMAGE
      // FRONT VIEW: If hipCenterX > stanceCenterX, hips are shifted to subject's RIGHT
      // BACK VIEW: If hipCenterX > stanceCenterX, hips are shifted to subject's LEFT (image is mirrored)
      if (view === 'back') {
        // Back view: image right = subject's left
        hipShiftDirection = shiftRaw > 0 ? 'Left' : 'Right';
      } else {
        // Front view: image right = subject's right
        hipShiftDirection = shiftRaw > 0 ? 'Right' : 'Left';
      }
    }
  }

  const metrics = {
    headTiltDegrees: headTilt,
    shoulderSymmetryCm: shoulderDiffCm,
    hipSymmetryCm: hipDiffCm,
    shoulderSeverity: shoulderDiffCm > 1.0 ? 'Asymmetric' : 'Neutral',
    hipSeverity: hipDiffCm > 1.0 ? 'Asymmetric' : 'Neutral',
    hipShiftPercent,
    hipShiftDirection,
  };

  const legSummary = calculateFrontBackDeviationSummary(landmarks, view);
  const leftLegAlignmentStatus = legSummary.leftKneeDirection === 'valgus'
    ? 'Valgus'
    : legSummary.leftKneeDirection === 'varus'
      ? 'Varus'
      : 'Straight';
  const rightLegAlignmentStatus = legSummary.rightKneeDirection === 'valgus'
    ? 'Valgus'
    : legSummary.rightKneeDirection === 'varus'
      ? 'Varus'
      : 'Straight';
  const leftLegSeverity = toReportSeverity(legSummary.leftLeg);
  const rightLegSeverity = toReportSeverity(legSummary.rightLeg);
  const leftKneeDeviationPercent = Math.abs(legSummary.leftKneeDeviation) * 100;
  const rightKneeDeviationPercent = Math.abs(legSummary.rightKneeDeviation) * 100;
  const kneeAlignmentStatus = leftLegAlignmentStatus === 'Valgus' || rightLegAlignmentStatus === 'Valgus'
    ? 'Valgus'
    : leftLegAlignmentStatus === 'Varus' || rightLegAlignmentStatus === 'Varus'
      ? 'Varus'
      : 'Neutral';
  const leftKneeIsValgus = legSummary.leftKneeIsValgus;
  const rightKneeIsValgus = legSummary.rightKneeIsValgus;
  
  // Log calculated metrics for front/back view
  console.log(`\n📊 [CALCULATED METRICS - ${view.toUpperCase()} VIEW]`);
  console.log(`   Head Tilt: ${headTilt.toFixed(1)}°`);
  console.log(`   Shoulder Diff: ${shoulderDiffCm.toFixed(2)}cm (${metrics.shoulderSeverity})`);
  console.log(`   Hip Diff: ${hipDiffCm.toFixed(2)}cm (${metrics.hipSeverity})`);
  console.log(`   Hip Shift: ${hipShiftPercent.toFixed(1)}% ${hipShiftDirection} (${view === 'back' ? 'mirrored for back view' : 'subject perspective'})`);
  
  return {
    ...metrics,
    leftLegAlignmentStatus,
    rightLegAlignmentStatus,
    leftLegSeverity,
    rightLegSeverity,
    leftKneeDeviationPercent,
    rightKneeDeviationPercent,
    kneeAlignmentStatus,
    leftKneeIsValgus,
    rightKneeIsValgus,
  };
}

/**
 * Main calculation logic for Side View
 * @param landmarks MediaPipe pose landmarks
 * @param view Which side view ('side-left' or 'side-right')
 */
export function calculateSideViewMetrics(
  landmarks: MediaPipeLandmark[], 
  view: 'side-left' | 'side-right' = 'side-left'
): Partial<CalculatedPostureMetrics> {
  const nose = landmarks[0];
  // Use correct ear for each view: left ear (7) for side-left, right ear (8) for side-right
  const ear = view === 'side-left' ? landmarks[7] : landmarks[8];
  // Use correct eye (outer) for each view: left outer (3) for side-left, right outer (6) for side-right
  const eye = view === 'side-left' ? landmarks[3] : landmarks[6];
  // Use correct shoulder for each view
  const shoulder = view === 'side-left' ? landmarks[11] : landmarks[12];
  const hip = view === 'side-left' ? landmarks[23] : landmarks[24];
  const knee = view === 'side-left' ? landmarks[25] : landmarks[26];
  const ankle = view === 'side-left' ? landmarks[27] : landmarks[28];

  if (!ear || !shoulder) return {};

  // Standard shoulder width for CM conversion (depth is tricky in 2D, so we use a constant factor)
  // In side view, we use torso height (shoulder to hip) as a reference (~45cm)
  const torsoHeight = distance(shoulder, hip);
  const CM_PER_TORSO = 45;

  // 1. Forward Head Posture (FHP)
  // Compare ear position to PLUMB LINE (ideal center of mass alignment)
  // The plumb line should pass through ankle, and ear should be above it in ideal posture
  // We use ankle as reference, or center (0.5) if ankle isn't reliable
  const plumbLineX = ankle?.x ?? 0.5; // Ankle position or center of image
  
  // Calculate how far forward the ear is from the plumb line
  // Positive = ear forward of plumb (bad), Negative = ear behind plumb
  // For side-left (facing left): forward is LOWER x value
  // For side-right (facing right): forward is HIGHER x value
  let headForwardOffset: number;
  if (view === 'side-left') {
    // Facing left: forward = left = lower X. If ear.x < plumbLineX, ear is forward
    headForwardOffset = plumbLineX - ear.x;
  } else {
    // Facing right: forward = right = higher X. If ear.x > plumbLineX, ear is forward
    headForwardOffset = ear.x - plumbLineX;
  }
  
  // Convert to cm (only use absolute value for severity, but keep sign for direction info)
  const headOffset = Math.max(0, headForwardOffset); // Only count forward deviation
  const headOffsetCm = (headOffset / torsoHeight) * CM_PER_TORSO;

  // 2. Head Pitch (Frankfurt Plane) - Ear to Eye angle
  // In a level head, ear canal and outer eye should be roughly horizontal (0°)
  // Looking Down (Tucked): Eye Y is higher (lower value) than Ear Y (ears above eyes visually)
  // Looking Up (Extended): Eye Y is lower (higher value) than Ear Y
  let headPitchDegrees = 0;
  let headPitchStatus: 'Level' | 'Looking Up' | 'Looking Down' = 'Level';
  
  if (eye && ear) {
    // Note: In image coordinates, Y increases downward
    // deltaY = eye.y - ear.y
    // Positive deltaY means eye is below ear on screen (looking down)
    // Negative deltaY means eye is above ear on screen (looking up)
    const deltaY = eye.y - ear.y;
    const deltaX = Math.abs(eye.x - ear.x);
    
    // Calculate angle relative to horizontal
    headPitchDegrees = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
    
    // Determine status based on thresholds
    // Positive angle (>10°) = eye below ear = looking down
    // Negative angle (<-10°) = eye above ear = looking up
    if (headPitchDegrees > 10) {
      headPitchStatus = 'Looking Down';
    } else if (headPitchDegrees < -10) {
      headPitchStatus = 'Looking Up';
    } else {
      headPitchStatus = 'Level';
    }
  }

  // 3. Pelvic Tilt (Approximation via Hip vs Knee vs Shoulder)
  // This is a complex calculation in 2D, but we can look at the hip position relative to shoulder/knee
  const pelvicAngle = calculateAngle(shoulder, hip, knee);

  const headSeverity = headOffsetCm < 2 ? 'Neutral' : headOffsetCm < 4 ? 'Mild' : headOffsetCm < 6 ? 'Moderate' : 'Severe';
  
  const metrics = {
    forwardHeadCm: headOffsetCm,
    headSeverity,
    pelvicTiltDegrees: pelvicAngle,
    headPitchDegrees,
    headPitchStatus,
  };
  
  // Log calculated metrics for side view
  console.log(`\n📊 [CALCULATED METRICS - ${view.toUpperCase()}]`);
  console.log(`   Forward Head: ${headOffsetCm.toFixed(2)}cm (${headSeverity})`);
  console.log(`   Head Pitch: ${headPitchDegrees.toFixed(1)}° (${headPitchStatus})`);
  console.log(`   Pelvic Angle: ${pelvicAngle.toFixed(1)}°`);
  console.log(`   Plumb Line X: ${(plumbLineX * 100).toFixed(1)}%`);
  console.log(`   Ear X: ${((ear?.x ?? 0) * 100).toFixed(1)}%`);
  console.log(`   Ear-Plumb Diff: ${((ear?.x ?? 0.5) - plumbLineX).toFixed(3)} (${view === 'side-left' ? 'negative=forward' : 'positive=forward'})`);
  
  return metrics;
}

