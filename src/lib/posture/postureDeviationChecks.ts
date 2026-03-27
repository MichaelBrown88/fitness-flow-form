/**
 * Shared posture deviation checks for reference lines and image labels.
 * Kept outside React components for reuse and fast-refresh hygiene.
 */

import type { PostureAnalysisResult } from '@/lib/ai/postureAnalysis';

const THRESHOLDS = {
  shoulderDiffCm: 1.0,
  hipDiffCm: 1.0,
} as const;

export function isHeadPitchDeviation(analysis: PostureAnalysisResult): boolean {
  const status = analysis.head_updown?.status;
  return status === 'Looking Up' || status === 'Looking Down';
}

export function isShoulderDeviation(analysis: PostureAnalysisResult): boolean {
  const status = analysis.shoulder_alignment?.status;
  const diff = analysis.shoulder_alignment?.height_difference_cm || 0;
  return (
    status === 'Asymmetric' ||
    status === 'Elevated' ||
    status === 'Depressed' ||
    diff >= THRESHOLDS.shoulderDiffCm
  );
}

export function isHipLevelDeviation(analysis: PostureAnalysisResult): boolean {
  const status = analysis.hip_alignment?.status;
  const diff = analysis.hip_alignment?.height_difference_cm || 0;
  return status === 'Asymmetric' || diff >= THRESHOLDS.hipDiffCm;
}

export function isPelvicTiltDeviation(analysis: PostureAnalysisResult): boolean {
  const status = analysis.pelvic_tilt?.status;
  return status === 'Anterior Tilt' || status === 'Posterior Tilt';
}

export function hasAnyDeviation(view: string, analysis: PostureAnalysisResult): boolean {
  const isSideView = view === 'side-left' || view === 'side-right';

  if (isSideView) {
    return (
      isHeadPitchDeviation(analysis) ||
      isPelvicTiltDeviation(analysis) ||
      analysis.forward_head?.status !== 'Neutral' ||
      analysis.kyphosis?.status !== 'Normal' ||
      analysis.lordosis?.status !== 'Normal' ||
      analysis.hip_alignment?.status !== 'Neutral'
    );
  }

  return (
    isShoulderDeviation(analysis) ||
    isHipLevelDeviation(analysis) ||
    analysis.hip_shift?.status !== 'Centered' ||
    analysis.spinal_curvature?.status !== 'Normal' ||
    analysis.left_leg_alignment?.status !== 'Straight' ||
    analysis.right_leg_alignment?.status !== 'Straight' ||
    analysis.head_alignment?.status !== 'Neutral'
  );
}
