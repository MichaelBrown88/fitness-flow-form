/**
 * Framing metrics stored on live_sessions for repeat-scan consistency.
 */
import { CONFIG } from '@/config';
import type { MediaPipeLandmark } from '@/lib/types/mediapipe';

export interface PostureFramingMetadata {
  bodyFillPercent: number;
  distanceScore: number;
  shoulderToFootPixelHeight: number;
}

export function computePostureFramingMetadata(
  raw: MediaPipeLandmark[] | undefined,
  imageHeightPx: number
): PostureFramingMetadata | null {
  if (!raw || raw.length < 29 || imageHeightPx <= 0) return null;

  const nose = raw[0];
  const leftShoulder = raw[11];
  const rightShoulder = raw[12];
  const leftAnkle = raw[27];
  const rightAnkle = raw[28];
  if (!nose || !leftShoulder || !rightShoulder || !leftAnkle || !rightAnkle) return null;

  const ankleYAvg = (leftAnkle.y + rightAnkle.y) / 2;
  const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
  const bodyHeightNorm = Math.max(0.001, ankleYAvg - nose.y);
  const shoulderToFootNorm = Math.max(0.001, ankleYAvg - shoulderY);

  const bodyFillPercent = bodyHeightNorm * 100;
  const shoulderToFootPixelHeight = shoulderToFootNorm * imageHeightPx;

  const { USER_SCALE_OPTIMAL_MIN, USER_SCALE_OPTIMAL_MAX } = CONFIG.COMPANION.POSE_THRESHOLDS;
  const ideal = (USER_SCALE_OPTIMAL_MIN + USER_SCALE_OPTIMAL_MAX) / 2;
  const halfSpan = Math.max(0.05, (USER_SCALE_OPTIMAL_MAX - USER_SCALE_OPTIMAL_MIN) / 2);
  const distanceScore = Math.max(0, Math.min(1, 1 - Math.abs(bodyHeightNorm - ideal) / halfSpan));

  return { bodyFillPercent, distanceScore, shoulderToFootPixelHeight };
}
