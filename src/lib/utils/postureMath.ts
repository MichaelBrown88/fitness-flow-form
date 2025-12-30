import { LandmarkResult } from '@/lib/ai/postureLandmarks';
import type { MediaPipeLandmark } from '@/lib/types/mediapipe';

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
  // Severity levels
  headSeverity: 'Neutral' | 'Mild' | 'Moderate' | 'Severe';
  shoulderSeverity: 'Neutral' | 'Asymmetric';
  hipSeverity: 'Neutral' | 'Asymmetric';
  pelvicSeverity: 'Neutral' | 'Mild' | 'Moderate' | 'Severe';
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

/**
 * Main calculation logic for Front View
 */
export function calculateFrontViewMetrics(landmarks: MediaPipeLandmark[]): Partial<CalculatedPostureMetrics> {
  // Extract key points
  const leftEar = landmarks[7] || landmarks[0];
  const rightEar = landmarks[8] || landmarks[0];
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];

  if (!leftShoulder || !rightShoulder) return {};

  const shoulderWidth = distance(leftShoulder, rightShoulder);

  // 1. Head Tilt (Angle of line between ears vs horizontal)
  const earDeltaY = leftEar.y - rightEar.y;
  const earDeltaX = leftEar.x - rightEar.x;
  const headTilt = Math.atan2(earDeltaY, earDeltaX) * (180 / Math.PI);

  // 2. Shoulder Symmetry
  const shoulderDiff = Math.abs(leftShoulder.y - rightShoulder.y);
  const shoulderDiffCm = pixelsToCm(shoulderDiff, shoulderWidth);

  // 3. Hip Symmetry
  const hipDiff = leftHip && rightHip ? Math.abs(leftHip.y - rightHip.y) : 0;
  const hipDiffCm = pixelsToCm(hipDiff, shoulderWidth);

  return {
    headTiltDegrees: headTilt,
    shoulderSymmetryCm: shoulderDiffCm,
    hipSymmetryCm: hipDiffCm,
    shoulderSeverity: shoulderDiffCm > 1.0 ? 'Asymmetric' : 'Neutral',
    hipSeverity: hipDiffCm > 1.0 ? 'Asymmetric' : 'Neutral'
  };
}

/**
 * Main calculation logic for Side View
 */
export function calculateSideViewMetrics(landmarks: MediaPipeLandmark[]): Partial<CalculatedPostureMetrics> {
  const nose = landmarks[0];
  const ear = landmarks[7] || landmarks[8];
  const shoulder = landmarks[11] || landmarks[12];
  const hip = landmarks[23] || landmarks[24];
  const knee = landmarks[25] || landmarks[26];
  const ankle = landmarks[27] || landmarks[28];

  if (!ear || !shoulder) return {};

  // Standard shoulder width for CM conversion (depth is tricky in 2D, so we use a constant factor)
  // In side view, we use torso height (shoulder to hip) as a reference (~45cm)
  const torsoHeight = distance(shoulder, hip);
  const CM_PER_TORSO = 45;

  // 1. Forward Head (Horizontal offset Ear vs Shoulder)
  const headOffset = Math.abs(ear.x - shoulder.x);
  const headOffsetCm = (headOffset / torsoHeight) * CM_PER_TORSO;

  // 2. Pelvic Tilt (Approximation via Hip vs Knee vs Shoulder)
  // This is a complex calculation in 2D, but we can look at the hip position relative to shoulder/knee
  const pelvicAngle = calculateAngle(shoulder, hip, knee);

  return {
    forwardHeadCm: headOffsetCm,
    headSeverity: headOffsetCm < 2 ? 'Neutral' : headOffsetCm < 4 ? 'Mild' : headOffsetCm < 6 ? 'Moderate' : 'Severe',
    pelvicTiltDegrees: pelvicAngle
  };
}

