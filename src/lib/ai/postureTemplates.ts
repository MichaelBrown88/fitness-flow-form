/**
 * DETERMINISTIC POSTURE TEMPLATE ENGINE
 *
 * Replaces per-image Gemini AI calls with deterministic templates that map
 * CalculatedPostureMetrics (from postureMath.ts) into PostureAnalysisResult.
 *
 * The math layer (MediaPipe + postureMath) is the single source of truth.
 * This module only formats those numbers into human-readable text.
 */

import type { PostureAnalysisResult } from '@/lib/ai/postureAnalysis';
import type { LandmarkResult } from '@/lib/ai/postureLandmarks';
import type { CalculatedPostureMetrics } from '@/lib/utils/postureMath';
import { calculateFrontViewMetrics, calculateSideViewMetrics } from '@/lib/utils/postureMath';

type Severity = 'Neutral' | 'Mild' | 'Moderate' | 'Severe';
type FrontBackView = 'front' | 'back';
type SideView = 'side-left' | 'side-right';
type PostureView = FrontBackView | SideView;

const FORWARD_HEAD_DESC: Record<Severity, string> = {
  Neutral: 'Your head aligns well with your shoulders.',
  Mild: 'Your head sits slightly forward of your shoulders.',
  Moderate: 'Your head sits noticeably forward of your shoulders.',
  Severe: 'Your head sits significantly forward of your shoulders.',
};

const FORWARD_HEAD_REC: Record<Severity, string> = {
  Neutral: '',
  Mild: 'Practice chin tucks daily to strengthen deep neck flexors.',
  Moderate: 'Prioritize chin tucks and upper back strengthening exercises.',
  Severe: 'Focus on chin tucks, neck stretches, and consider professional assessment.',
};

const HEAD_PITCH_DESC: Record<string, string> = {
  'Looking Down': 'Your head tilts downward from neutral.',
  'Looking Up': 'Your head tilts backward, as if looking up.',
  Level: 'Your head position is neutral.',
};

const HEAD_PITCH_REC: Record<string, string> = {
  'Looking Down': 'Practice keeping your gaze level during daily activities.',
  'Looking Up': 'Focus on bringing your chin slightly down to neutral.',
  Level: '',
};

const KYPHOSIS_DESC: Record<string, string> = {
  'Within range': 'Your upper back curve appears normal.',
  'Slightly increased': 'Your upper back shows a slightly increased curve.',
  'Moderately increased': 'Your upper back has a noticeably increased curve.',
  'Notably increased': 'Your upper back has a significantly increased curve.',
};

const KYPHOSIS_REC: Record<string, string> = {
  'Within range': '',
  'Slightly increased': 'Incorporate thoracic extension exercises into your routine.',
  'Moderately increased': 'Prioritize upper back extension and chest stretching.',
  'Notably increased': 'Focus on thoracic mobility work and consider professional assessment.',
};

const LORDOSIS_DESC: Record<string, string> = {
  'Within range': 'Your lower back curve appears normal.',
  'Slightly increased': 'Your lower back shows a slightly increased curve.',
  'Moderately increased': 'Your lower back has a noticeably increased curve.',
  'Notably increased': 'Your lower back has a significantly increased curve.',
};

const LORDOSIS_REC: Record<string, string> = {
  'Within range': '',
  'Slightly increased': 'Strengthen your core with exercises like dead bugs and planks.',
  'Moderately increased': 'Prioritize core stability and hip flexor stretching.',
  'Notably increased': 'Focus on core strengthening and hip flexor mobility daily.',
};

const PELVIC_SIDE_DESC: Record<string, string> = {
  Neutral: 'Your pelvis is in a neutral position.',
  'Anterior Tilt': 'Your pelvis tilts forward.',
  'Posterior Tilt': 'Your pelvis tilts backward.',
};

const PELVIC_SIDE_REC: Record<string, string> = {
  Neutral: '',
  'Anterior Tilt': 'Strengthen your core and stretch your hip flexors.',
  'Posterior Tilt': 'Stretch your hamstrings and strengthen your hip flexors.',
};

function getSidePelvicStatus(pelvicAngle: number): 'Neutral' | 'Anterior Tilt' | 'Posterior Tilt' {
  if (pelvicAngle < 160) return 'Anterior Tilt';
  if (pelvicAngle > 185) return 'Posterior Tilt';
  return 'Neutral';
}

function getSidePelvicSeverity(pelvicAngle: number): Severity {
  const dev = pelvicAngle < 160 ? 160 - pelvicAngle : pelvicAngle > 185 ? pelvicAngle - 185 : 0;
  if (dev === 0) return 'Neutral';
  if (dev < 8) return 'Mild';
  if (dev < 15) return 'Moderate';
  return 'Severe';
}

function buildDeviationsList(items: Array<{ status: string; label: string; neutral: string[] }>): string[] {
  const deviations: string[] = [];
  for (const item of items) {
    const statusLower = item.status.toLowerCase();
    if (!item.neutral.some(n => statusLower === n.toLowerCase())) {
      deviations.push(item.label);
    }
  }
  return deviations.length > 0 ? deviations : ['Your posture alignment is excellent'];
}

function buildOverallAssessment(deviations: string[], isPositive: boolean): string {
  if (isPositive) {
    return 'Your posture shows good overall alignment. Continue maintaining your current habits with balanced strength and flexibility work.';
  }
  const issues = deviations.filter(d => d !== 'Your posture alignment is excellent');
  if (issues.length === 1) {
    return `Your posture is generally well-aligned with one area to address. Focus on corrective exercises for this and you should see improvement quickly.`;
  }
  return `Your posture shows a few areas for improvement. Targeted corrective exercises can help address these patterns over time.`;
}

function getShoulderHigherSide(
  leftElevation: number,
  rightElevation: number,
): 'left' | 'right' | 'even' {
  const diff = Math.abs(leftElevation - rightElevation);
  if (diff < 0.3) return 'even';
  return leftElevation > rightElevation ? 'left' : 'right';
}

/**
 * Build PostureAnalysisResult for a FRONT or BACK view from deterministic metrics.
 */
export function buildFrontBackResult(
  metrics: Partial<CalculatedPostureMetrics>,
  landmarks: LandmarkResult,
  view: FrontBackView,
): PostureAnalysisResult {
  const raw = landmarks.raw;
  const headTiltDeg = metrics.headTiltDegrees ?? 0;
  const shoulderDiffCm = metrics.shoulderSymmetryCm ?? 0;
  const hipDiffCm = metrics.hipSymmetryCm ?? 0;
  const hipShiftPct = metrics.hipShiftPercent ?? 0;
  const hipShiftDir = metrics.hipShiftDirection ?? 'None';

  const leftShoulderY = raw?.[11]?.y ?? 0;
  const rightShoulderY = raw?.[12]?.y ?? 0;
  const leftHipY = raw?.[23]?.y ?? 0;
  const rightHipY = raw?.[24]?.y ?? 0;

  const shoulderLeftCm = leftShoulderY < rightShoulderY ? shoulderDiffCm : 0;
  const shoulderRightCm = rightShoulderY < leftShoulderY ? shoulderDiffCm : 0;
  const hipLeftCm = leftHipY < rightHipY ? hipDiffCm : 0;
  const hipRightCm = rightHipY < leftHipY ? hipDiffCm : 0;

  const shoulderHigher = getShoulderHigherSide(shoulderLeftCm, shoulderRightCm);

  const headTiltStatus: 'Neutral' | 'Tilted Left' | 'Tilted Right' =
    Math.abs(headTiltDeg) < 5 ? 'Neutral' :
    headTiltDeg > 0 ? 'Tilted Right' : 'Tilted Left';

  const headTiltDesc = headTiltStatus === 'Neutral'
    ? 'Your head is well-centered.'
    : `Your head tilts slightly to the ${headTiltStatus === 'Tilted Right' ? 'right' : 'left'}.`;

  const shoulderStatus = metrics.shoulderSeverity === 'Asymmetric' ? 'Asymmetric' as const : 'Neutral' as const;
  const shoulderDesc = shoulderStatus === 'Neutral'
    ? 'Your shoulders are level and well-aligned.'
    : shoulderHigher === 'left'
      ? 'Your left shoulder sits higher than your right.'
      : shoulderHigher === 'right'
        ? 'Your right shoulder sits higher than your left.'
        : 'Your shoulders show slight asymmetry.';
  const shoulderRec = shoulderStatus === 'Neutral' ? '' : 'Focus on balanced shoulder stretches and strengthening.';

  const hipStatus = metrics.hipSeverity === 'Asymmetric' ? 'Asymmetric' as const : 'Neutral' as const;
  const hipHigher = hipLeftCm > hipRightCm ? 'left' : hipRightCm > hipLeftCm ? 'right' : 'even';
  const hipDesc = hipStatus === 'Neutral'
    ? 'Your hips are level and well-aligned.'
    : hipHigher === 'left'
      ? 'Your left hip sits higher than your right.'
      : hipHigher === 'right'
        ? 'Your right hip sits higher than your right.'
        : 'Your hips show slight asymmetry.';
  const hipRec = hipStatus === 'Neutral' ? '' : 'Incorporate single-leg exercises to improve hip balance.';

  const pelvicStatus: 'Neutral' | 'Lateral Tilt' = hipDiffCm > 1.0 ? 'Lateral Tilt' : 'Neutral';
  const pelvicDesc = pelvicStatus === 'Neutral'
    ? 'Your hips are level and well-aligned.'
    : hipHigher === 'left'
      ? 'Your left side is elevated relative to your right.'
      : hipHigher === 'right'
        ? 'Your right side is elevated relative to your left.'
        : 'Your pelvis shows a slight lateral tilt.';

  const hipShiftStatus: 'Centered' | 'Shifted Left' | 'Shifted Right' =
    hipShiftDir === 'Left' ? 'Shifted Left' :
    hipShiftDir === 'Right' ? 'Shifted Right' : 'Centered';
  const hipShiftSeverity: 'Good' | 'Mild' | 'Moderate' | 'Severe' =
    hipShiftPct < 3 ? 'Good' : hipShiftPct < 6 ? 'Mild' : hipShiftPct < 10 ? 'Moderate' : 'Severe';
  const hipShiftDesc = hipShiftStatus === 'Centered'
    ? 'Your hips are centered.'
    : `Your pelvis shifts to the ${hipShiftDir.toLowerCase()}.`;

  const leftLegStatus = metrics.leftLegAlignmentStatus ?? 'Straight';
  const rightLegStatus = metrics.rightLegAlignmentStatus ?? 'Straight';
  const leftLegSev = metrics.leftLegSeverity ?? 'Good';
  const rightLegSev = metrics.rightLegSeverity ?? 'Good';
  const leftKneeDev = metrics.leftKneeDeviationPercent ?? 0;
  const rightKneeDev = metrics.rightKneeDeviationPercent ?? 0;

  const legDesc = (status: string, side: string) =>
    status === 'Straight'
      ? `Your ${side} leg aligns well from hip to ankle.`
      : status === 'Valgus'
        ? `Your ${side} knee angles inward.`
        : `Your ${side} knee angles outward.`;
  const legRec = (status: string) =>
    status === 'Straight' ? ''
      : status === 'Valgus' ? 'Strengthen hip abductors with clamshells and side-lying leg raises.'
        : 'Work on hip and ankle mobility exercises.';

  const kneeAlignStatus = metrics.kneeAlignmentStatus ?? 'Neutral';

  const deviationItems = [
    { status: headTiltStatus, label: `Head tilt to the ${headTiltDeg > 0 ? 'right' : 'left'}`, neutral: ['Neutral'] },
    { status: shoulderStatus, label: 'Shoulder asymmetry', neutral: ['Neutral'] },
    { status: hipStatus, label: 'Hip level asymmetry', neutral: ['Neutral'] },
    { status: hipShiftStatus, label: `Hip shift to the ${hipShiftDir.toLowerCase()}`, neutral: ['Centered'] },
    { status: leftLegStatus, label: `Left knee ${leftLegStatus.toLowerCase()}`, neutral: ['Straight'] },
    { status: rightLegStatus, label: `Right knee ${rightLegStatus.toLowerCase()}`, neutral: ['Straight'] },
  ];
  const deviations = buildDeviationsList(deviationItems);
  const isPositive = deviations[0] === 'Your posture alignment is excellent';

  return {
    landmarks: {
      shoulder_y_percent: landmarks.shoulder_y_percent,
      hip_y_percent: landmarks.hip_y_percent,
      head_y_percent: landmarks.head_y_percent,
      center_x_percent: landmarks.center_x_percent,
      raw: landmarks.raw,
    },
    head_alignment: {
      status: headTiltStatus,
      tilt_degrees: headTiltDeg,
      description: headTiltDesc,
      recommendation: headTiltStatus === 'Neutral' ? '' : 'Practice keeping your head centered during daily activities.',
    },
    ...(view === 'front' ? {
      lateral_head_position: {
        status: 'Centered' as const,
        shift_percent: 0,
        description: 'Your head is centered on your body.',
      },
    } : {}),
    forward_head: {
      status: 'Neutral',
      deviation_degrees: 0,
      description: 'Forward head is assessed in side views.',
    },
    shoulder_alignment: {
      status: shoulderStatus,
      left_elevation_cm: shoulderLeftCm,
      right_elevation_cm: shoulderRightCm,
      height_difference_cm: shoulderDiffCm,
      rounded_forward: false,
      description: shoulderDesc,
      recommendation: shoulderRec,
    },
    kyphosis: { status: 'Within range', curve_degrees: 0, description: 'Assessed in side views.' },
    lordosis: { status: 'Within range', curve_degrees: 0, description: 'Assessed in side views.' },
    pelvic_tilt: {
      status: pelvicStatus === 'Lateral Tilt' ? 'Lateral Tilt' : 'Neutral',
      lateral_tilt_degrees: hipDiffCm > 1 ? hipDiffCm * 2 : 0,
      left_hip_elevation_cm: hipLeftCm,
      right_hip_elevation_cm: hipRightCm,
      height_difference_cm: hipDiffCm,
      description: pelvicDesc,
      recommendation: pelvicStatus === 'Neutral' ? '' : 'Focus on hip-leveling exercises like single-leg deadlifts.',
    },
    hip_alignment: {
      status: hipStatus,
      left_elevation_cm: hipLeftCm,
      right_elevation_cm: hipRightCm,
      height_difference_cm: hipDiffCm,
      description: hipDesc,
      recommendation: hipRec,
    },
    hip_shift: {
      status: hipShiftStatus,
      severity: hipShiftSeverity,
      shift_percent: hipShiftPct,
      description: hipShiftDesc,
      recommendation: hipShiftStatus === 'Centered' ? '' : 'Work on single-leg balance exercises to improve lateral stability.',
    },
    left_leg_alignment: {
      status: leftLegStatus as 'Straight' | 'Valgus' | 'Varus',
      severity: leftLegSev as 'Good' | 'Mild' | 'Moderate' | 'Severe',
      knee_deviation_percent: leftKneeDev,
      description: legDesc(leftLegStatus, 'left'),
      recommendation: legRec(leftLegStatus),
    },
    right_leg_alignment: {
      status: rightLegStatus as 'Straight' | 'Valgus' | 'Varus',
      severity: rightLegSev as 'Good' | 'Mild' | 'Moderate' | 'Severe',
      knee_deviation_percent: rightKneeDev,
      description: legDesc(rightLegStatus, 'right'),
      recommendation: legRec(rightLegStatus),
    },
    knee_alignment: {
      status: kneeAlignStatus as 'Neutral' | 'Valgus' | 'Varus',
      deviation_degrees: 0,
      description: kneeAlignStatus === 'Neutral' ? 'Your knees align well with your hips.' : `Your knees show ${kneeAlignStatus.toLowerCase()} tendency.`,
      recommendation: kneeAlignStatus === 'Neutral' ? '' : 'Focus on keeping knees tracking over toes during squats.',
    },
    deviations,
    risk_flags: [],
    overall_assessment: buildOverallAssessment(deviations, isPositive),
  };
}

/**
 * Build PostureAnalysisResult for a SIDE view from deterministic metrics.
 */
export function buildSideViewResult(
  metrics: Partial<CalculatedPostureMetrics>,
  landmarks: LandmarkResult,
  view: SideView,
): PostureAnalysisResult {
  const headSeverity: Severity = metrics.headSeverity ?? 'Neutral';
  const forwardHeadCm = metrics.forwardHeadCm ?? 0;
  const pelvicAngle = metrics.pelvicTiltDegrees ?? 170;
  const headPitchStatus = metrics.headPitchStatus ?? 'Level';
  const headPitchDeg = metrics.headPitchDegrees ?? 0;

  const pelvicStatus = getSidePelvicStatus(pelvicAngle);
  const pelvicSeverity = getSidePelvicSeverity(pelvicAngle);

  const headUpdownSeverity: 'Mild' | 'Moderate' | 'Severe' =
    Math.abs(headPitchDeg) < 15 ? 'Mild' : Math.abs(headPitchDeg) < 25 ? 'Moderate' : 'Severe';

  const deviationItems = [
    { status: headSeverity, label: 'Forward head posture', neutral: ['Neutral'] },
    { status: pelvicStatus, label: pelvicStatus === 'Anterior Tilt' ? 'Anterior pelvic tilt' : 'Posterior pelvic tilt', neutral: ['Neutral'] },
    { status: headPitchStatus, label: headPitchStatus === 'Looking Down' ? 'Head pitch down' : 'Head pitch up', neutral: ['Level'] },
  ];
  const deviations = buildDeviationsList(deviationItems);
  const isPositive = deviations[0] === 'Your posture alignment is excellent';

  return {
    landmarks: {
      shoulder_y_percent: landmarks.shoulder_y_percent,
      hip_y_percent: landmarks.hip_y_percent,
      midfoot_x_percent: landmarks.midfoot_x_percent,
      raw: landmarks.raw,
    },
    forward_head: {
      status: headSeverity,
      deviation_degrees: forwardHeadCm * 2.5,
      deviation_cm: forwardHeadCm,
      description: FORWARD_HEAD_DESC[headSeverity],
      recommendation: FORWARD_HEAD_REC[headSeverity],
    },
    head_updown: headPitchStatus !== 'Level' ? {
      status: headPitchStatus as 'Looking Up' | 'Looking Down',
      severity: headUpdownSeverity,
      description: HEAD_PITCH_DESC[headPitchStatus] ?? HEAD_PITCH_DESC.Level,
      recommendation: HEAD_PITCH_REC[headPitchStatus] ?? '',
    } : undefined,
    shoulder_alignment: {
      status: 'Neutral',
      rounded_forward: false,
      description: 'Your shoulders align well in the side view.',
      recommendation: '',
    },
    kyphosis: {
      status: 'Within range',
      curve_degrees: 0,
      description: KYPHOSIS_DESC['Within range'],
    },
    lordosis: {
      status: 'Within range',
      curve_degrees: 0,
      description: LORDOSIS_DESC['Within range'],
    },
    pelvic_tilt: {
      status: pelvicStatus,
      anterior_tilt_degrees: pelvicStatus === 'Anterior Tilt' ? 160 - pelvicAngle : 0,
      description: PELVIC_SIDE_DESC[pelvicStatus] ?? PELVIC_SIDE_DESC.Neutral,
      recommendation: PELVIC_SIDE_REC[pelvicStatus] ?? '',
    },
    hip_alignment: {
      status: 'Neutral',
      description: 'Your hips align well with the plumb line.',
    },
    deviations,
    risk_flags: [],
    overall_assessment: buildOverallAssessment(deviations, isPositive),
  };
}

/**
 * Main entry point: builds PostureAnalysisResult from raw landmarks + view.
 * Fully deterministic -- no AI calls, no network, no cost.
 */
export function buildPostureResult(
  landmarks: LandmarkResult,
  view: PostureView,
): PostureAnalysisResult {
  const isSide = view === 'side-left' || view === 'side-right';

  const metrics = landmarks.raw
    ? isSide
      ? calculateSideViewMetrics(landmarks.raw, view as SideView)
      : calculateFrontViewMetrics(landmarks.raw, view as FrontBackView)
    : {};

  return isSide
    ? buildSideViewResult(metrics, landmarks, view as SideView)
    : buildFrontBackResult(metrics, landmarks, view as FrontBackView);
}
