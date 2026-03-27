import type { PostureAnalysisResult } from '@/lib/ai/postureAnalysis';
import {
  calculateDeviationsFromLandmarks,
  getAverageYPercent,
  getRawLandmarkYPercent,
  getSideViewPlumbSeverity,
  getHeadPitchSeverity,
  getAiStatusSeverity,
  type RawLandmarks,
  type Severity,
} from '@/lib/utils/postureDeviation';
import type { PostureView } from './postureViewerTypes';

/**
 * Consolidated deviation labels - no repetition, brief text
 * Groups related issues (e.g., both knees = "Knees")
 */
export interface DeviationItem {
  key: string;
  label: string;
  recommendation: string;
  side: 'left' | 'right' | 'center';
  severity: Severity;
}

export function getAnchorForItem(
  item: DeviationItem,
  landmarks: RawLandmarks | undefined,
  view: PostureView,
): number | null {
  if (!landmarks) return null;
  const isSideView = view === 'side-left' || view === 'side-right';
  switch (item.key) {
    case 'head_tilt':
      return getAverageYPercent(landmarks, 7, 8);
    case 'head_pitch':
    case 'forward_head':
      return getRawLandmarkYPercent(landmarks, view === 'side-left' ? 7 : 8);
    case 'shoulders':
    case 'rounded_shoulders':
      return getAverageYPercent(landmarks, 11, 12);
    case 'upper_back':
      return getAverageYPercent(landmarks, 11, 12);
    case 'spine': {
      const shoulder = getAverageYPercent(landmarks, 11, 12);
      const hip = getAverageYPercent(landmarks, 23, 24);
      if (shoulder === null || hip === null) return null;
      return Math.max(5, Math.min(95, (shoulder + hip) / 2));
    }
    case 'hip_shift':
    case 'pelvic_tilt':
    case 'forward_hips':
    case 'lower_back':
      return getAverageYPercent(landmarks, 23, 24);
    case 'left_knee':
      return getRawLandmarkYPercent(landmarks, 25);
    case 'right_knee':
      return getRawLandmarkYPercent(landmarks, 26);
    default:
      return isSideView ? getAverageYPercent(landmarks, 23, 24) : null;
  }
}

export function getScreenSide(
  side: 'left' | 'right' | 'center',
  view: PostureView,
): 'left' | 'right' | 'center' {
  if (side === 'center') return 'center';
  if (view === 'front') return side === 'left' ? 'right' : 'left';
  return side;
}

export function getSeverityTone(severity: Severity) {
  if (severity === 'mild') {
    return { dot: 'bg-score-amber', text: 'text-score-amber' };
  }
  return { dot: 'bg-score-red', text: 'text-score-red' };
}

/**
 * Get deviations that can actually be detected from the given view
 * Uses MediaPipe-calculated severities (same as wireframe) - NOT AI descriptions
 */
export function getConsolidatedDeviations(
  analysis: PostureAnalysisResult,
  view: PostureView = 'front',
): DeviationItem[] {
  const items: DeviationItem[] = [];
  const isSideView = view === 'side-left' || view === 'side-right';
  const isFrontBackView = view === 'front' || view === 'back';
  const isBadStatus = (status?: string) => {
    if (!status) return false;
    const normalized = status.toLowerCase();
    return !['neutral', 'normal', 'good', 'level', 'centered', 'straight'].includes(normalized);
  };

  const calc = calculateDeviationsFromLandmarks(analysis.landmarks?.raw, view);

  if (isSideView) {
    if (calc.forwardHead !== 'good') {
      items.push({
        key: 'forward_head',
        label: 'Forward Head',
        recommendation: analysis.forward_head?.recommendation || 'Chin tucks and neck stretches',
        side: 'left',
        severity: calc.forwardHead,
      });
    }

    if (calc.pelvicTilt !== 'good') {
      const forwardDir = view === 'side-left' ? -1 : 1;
      const hip = analysis.landmarks?.raw?.[view === 'side-left' ? 23 : 24];
      const ankle = analysis.landmarks?.raw?.[view === 'side-left' ? 27 : 28];
      const hipForward = hip && ankle ? (hip.x - ankle.x) * forwardDir > 0 : undefined;
      const pelvicLabel = hipForward ? 'Anterior Pelvic Tilt' : 'Posterior Pelvic Tilt';
      items.push({
        key: 'pelvic_tilt',
        label: pelvicLabel,
        recommendation: analysis.pelvic_tilt?.recommendation || 'Hip flexor stretches and glute activation',
        side: 'right',
        severity: calc.pelvicTilt,
      });
    }

    if (analysis.head_updown?.status && analysis.head_updown.status !== 'Neutral') {
      const pitchSeverity = getHeadPitchSeverity(analysis.landmarks?.raw, view);
      items.push({
        key: 'head_pitch',
        label: analysis.head_updown.status === 'Looking Down' ? 'Head Pitch Down' : 'Head Pitch Up',
        recommendation: analysis.head_updown?.recommendation || 'Reset gaze to neutral and relax the neck',
        side: 'left',
        severity: pitchSeverity,
      });
    }

    const shoulderSeverity = getSideViewPlumbSeverity(
      analysis.landmarks?.raw,
      view,
      view === 'side-left' ? 11 : 12,
    );
    const hasRoundedShoulders =
      analysis.shoulder_alignment?.rounded_forward || analysis.shoulder_alignment?.status === 'Rounded';
    if (shoulderSeverity !== 'good' || hasRoundedShoulders) {
      items.push({
        key: 'rounded_shoulders',
        label: hasRoundedShoulders ? 'Rounded Shoulders' : 'Shoulders Forward',
        recommendation: analysis.shoulder_alignment?.recommendation || 'Open the chest and strengthen upper back',
        side: 'left',
        severity: shoulderSeverity !== 'good' ? shoulderSeverity : 'mild',
      });
    }

    const hipSeverity = getSideViewPlumbSeverity(
      analysis.landmarks?.raw,
      view,
      view === 'side-left' ? 23 : 24,
    );
    if (hipSeverity !== 'good') {
      items.push({
        key: 'forward_hips',
        label: 'Forward Hips',
        recommendation: analysis.hip_alignment?.recommendation || 'Stack ribs over hips; focus on core control',
        side: 'right',
        severity: hipSeverity,
      });
    }

    if (isBadStatus(analysis.kyphosis?.status)) {
      items.push({
        key: 'upper_back',
        label: 'Upper Back',
        recommendation: analysis.kyphosis?.recommendation || 'Thoracic extensions and chest stretches',
        side: 'right',
        severity: getAiStatusSeverity(analysis.kyphosis?.status),
      });
    }

    if (isBadStatus(analysis.lordosis?.status)) {
      items.push({
        key: 'lower_back',
        label: 'Lower Back',
        recommendation: analysis.lordosis?.recommendation || 'Core strengthening and hip flexor stretches',
        side: 'left',
        severity: getAiStatusSeverity(analysis.lordosis?.status),
      });
    }
  }

  if (isFrontBackView) {
    if (calc.headTilt !== 'good') {
      items.push({
        key: 'head_tilt',
        label: 'Head Tilt',
        recommendation: analysis.head_alignment?.recommendation || 'Neck mobility and stretches',
        side: 'left',
        severity: calc.headTilt,
      });
    }

    if (calc.shoulder !== 'good') {
      items.push({
        key: 'shoulders',
        label: 'Shoulders',
        recommendation: analysis.shoulder_alignment?.recommendation || 'Release upper trap on high side',
        side: 'right',
        severity: calc.shoulder,
      });
    }

    if (calc.hipShift !== 'good') {
      items.push({
        key: 'hip_shift',
        label: 'Hip Shift',
        recommendation: analysis.hip_shift?.recommendation || 'Strengthen gluteus medius',
        side: 'left',
        severity: calc.hipShift,
      });
    }

    if (isBadStatus(analysis.spinal_curvature?.status)) {
      items.push({
        key: 'spine',
        label: 'Spine',
        recommendation: analysis.spinal_curvature?.recommendation || 'Core stability exercises',
        side: 'right',
        severity: getAiStatusSeverity(analysis.spinal_curvature?.status),
      });
    }

    if (calc.leftLeg !== 'good') {
      items.push({
        key: 'left_knee',
        label: `Left Knee ${calc.leftKneeDirection === 'valgus' ? 'Valgus' : 'Varus'}`,
        recommendation: analysis.left_leg_alignment?.recommendation || 'Hip abductor and glute strengthening',
        side: 'left',
        severity: calc.leftLeg,
      });
    }

    if (calc.rightLeg !== 'good') {
      items.push({
        key: 'right_knee',
        label: `Right Knee ${calc.rightKneeDirection === 'valgus' ? 'Valgus' : 'Varus'}`,
        recommendation: analysis.right_leg_alignment?.recommendation || 'Hip abductor and glute strengthening',
        side: 'right',
        severity: calc.rightLeg,
      });
    }
  }

  return items;
}
