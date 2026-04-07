/**
 * User-visible copy for posture landmark quality / retake flows.
 */

export const POSTURE_LANDMARK_QUALITY_COPY = {
  NO_LANDMARKS: 'No landmarks detected — ensure full body is visible',
  KEY_POINTS_MISSING: 'Key body points not detected — step back so full body is in frame',
  GENERIC_LOW_CONFIDENCE: 'Poor landmark confidence — try better lighting or form-fitting clothing',
} as const;

export function postureLandmarkStructuralRetakeReason(failingRegions: readonly string[]): string {
  if (failingRegions.length === 0) {
    return POSTURE_LANDMARK_QUALITY_COPY.GENERIC_LOW_CONFIDENCE;
  }
  return `Unclear visibility (${failingRegions.join(', ')}) — improve lighting or step back so shoulders, hips, and feet are visible`;
}
