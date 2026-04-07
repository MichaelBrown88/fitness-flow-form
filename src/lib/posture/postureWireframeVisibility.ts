/**
 * Wireframe drawing thresholds vs clinical capture gate.
 * Landmarks below DRAW_MIN are omitted; between DRAW_MIN and LOCKED_MIN render as low-confidence (amber).
 */

import { CONFIG } from '@/config';
import { CHART_HEX } from '@/lib/design/chartColors';

/** Below this, treat landmark as absent for wireframe (matches prior MediaPipe draw cutoff). */
export const WIREFRAME_VISIBILITY_DRAW_MIN = 0.3;

/** Matches Companion / still capture structural gate — same source as pose validation. */
export const WIREFRAME_VISIBILITY_LOCKED_MIN =
  CONFIG.COMPANION.POSE_THRESHOLDS.STRUCTURAL_ANCHOR_MIN_VISIBILITY;

/** Stroke/fill for joints/segments visible but below clinical confidence. */
export const WIREFRAME_LOW_VISIBILITY_STROKE = CHART_HEX.scoreAmber;
export const WIREFRAME_LOW_VISIBILITY_FILL = CHART_HEX.scoreAmber;

export type WireframeVisibilityTier = 'absent' | 'uncertain' | 'locked';

export function wireframeLandmarkTier(visibility: number | undefined): WireframeVisibilityTier {
  const v = visibility ?? 0;
  if (v < WIREFRAME_VISIBILITY_DRAW_MIN) return 'absent';
  if (v < WIREFRAME_VISIBILITY_LOCKED_MIN) return 'uncertain';
  return 'locked';
}

export function wireframeSegmentTier(
  visA: number | undefined,
  visB: number | undefined
): WireframeVisibilityTier {
  const a = wireframeLandmarkTier(visA);
  const b = wireframeLandmarkTier(visB);
  if (a === 'absent' || b === 'absent') return 'absent';
  if (a === 'uncertain' || b === 'uncertain') return 'uncertain';
  return 'locked';
}

export function segmentShouldDraw(visA: number | undefined, visB: number | undefined): boolean {
  return wireframeSegmentTier(visA, visB) !== 'absent';
}
