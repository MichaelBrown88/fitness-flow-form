import type { PostureAnalysisResult } from '../ai/postureAnalysis';
import { CONFIG } from '@/config';

/**
 * Draws deviations on the canvas based on posture analysis results
 */
export function drawDeviations(
  ctx: CanvasRenderingContext2D,
  view: string,
  analysis: PostureAnalysisResult,
  centerX: number,
  shoulderY: number,
  hipY: number
): void {
  const facingDir = view === 'side-right' ? 1 : -1;
  const isBackView = view === 'back';

  ctx.strokeStyle = CONFIG.POSTURE_OVERLAY.STYLE.DEVIATION_COLOR;
  ctx.lineWidth = CONFIG.POSTURE_OVERLAY.STYLE.DEVIATION_WIDTH;
  ctx.setLineDash([5, 5]);

  if (view === 'front' || view === 'back') {
    drawFrontBackDeviations(ctx, analysis, centerX, shoulderY, hipY, isBackView);
  } else {
    drawSideViewDeviations(ctx, analysis, centerX, shoulderY, hipY, facingDir);
  }
}

function drawFrontBackDeviations(
  ctx: CanvasRenderingContext2D,
  analysis: PostureAnalysisResult,
  centerX: number,
  shoulderY: number,
  hipY: number,
  isBackView: boolean
): void {
  // 1. Head Tilt - only draw if tilt is significant (> 5 degrees raw)
  const rawTiltDeg = Math.abs(analysis.head_alignment?.tilt_degrees || 0);
  if (analysis.head_alignment && analysis.head_alignment.status !== 'Neutral' && rawTiltDeg > 5) {
    const tiltDeg = Math.min(rawTiltDeg, 20);
    const status = analysis.head_alignment.status;

    let screenTiltDir = 1;
    if (status === 'Tilted Right') {
      screenTiltDir = isBackView ? 1 : -1;
    } else if (status === 'Tilted Left') {
      screenTiltDir = isBackView ? -1 : 1;
    }

    let headY: number;
    if (analysis.landmarks?.head_y_percent !== undefined) {
      const reportedHeadY = (analysis.landmarks.head_y_percent / 100) * ctx.canvas.height;
      const headToShoulderDist = shoulderY - reportedHeadY;
      headY = reportedHeadY + (headToShoulderDist * 0.5);
    } else {
      headY = shoulderY * 0.7;
    }

    const rad = (tiltDeg * Math.PI / 180);
    const lineLength = 90;

    ctx.beginPath();
    if (screenTiltDir === 1) {
      ctx.moveTo(centerX - (Math.cos(rad) * lineLength), headY - (Math.sin(rad) * lineLength));
      ctx.lineTo(centerX + (Math.cos(rad) * lineLength), headY + (Math.sin(rad) * lineLength));
    } else {
      ctx.moveTo(centerX - (Math.cos(rad) * lineLength), headY + (Math.sin(rad) * lineLength));
      ctx.lineTo(centerX + (Math.cos(rad) * lineLength), headY - (Math.sin(rad) * lineLength));
    }
    ctx.stroke();
  }

  // 2. Shoulder Asymmetry
  if (analysis.shoulder_alignment && analysis.shoulder_alignment.status !== 'Neutral') {
    const diffCm = analysis.shoulder_alignment.height_difference_cm || 0;
    const leftCm = analysis.shoulder_alignment.left_elevation_cm ?? 0;
    const rightCm = analysis.shoulder_alignment.right_elevation_cm ?? 0;

    let higherSide = 0;
    if (rightCm > leftCm) {
      higherSide = isBackView ? -1 : 1;
    } else if (leftCm > rightCm) {
      higherSide = isBackView ? 1 : -1;
    }

    if (higherSide !== 0) {
      const pixelDiff = Math.min(diffCm * 15, 60);
      ctx.beginPath();
      ctx.moveTo(centerX - 150, shoulderY + (higherSide * pixelDiff / 2));
      ctx.lineTo(centerX + 150, shoulderY - (higherSide * pixelDiff / 2));
      ctx.stroke();
    }
  }

  // 3. Pelvic/Hip Asymmetry
  const pelvicData = analysis.pelvic_tilt;
  const hipData = analysis.hip_alignment;

  if ((pelvicData && pelvicData.status !== 'Neutral') || (hipData && hipData.status !== 'Neutral')) {
    const pelvicDiff = pelvicData?.height_difference_cm || 0;
    const hipDiff = hipData?.height_difference_cm || 0;
    const diffCm = Math.max(pelvicDiff, hipDiff);

    const pelvicLeftCm = pelvicData?.left_hip_elevation_cm ?? 0;
    const pelvicRightCm = pelvicData?.right_hip_elevation_cm ?? 0;
    const hipLeftCm = hipData?.left_elevation_cm ?? 0;
    const hipRightCm = hipData?.right_elevation_cm ?? 0;
    const leftTotal = pelvicLeftCm + hipLeftCm;
    const rightTotal = pelvicRightCm + hipRightCm;

    let higherSide = 0;
    if (rightTotal > leftTotal) {
      higherSide = isBackView ? -1 : 1;
    } else if (leftTotal > rightTotal) {
      higherSide = isBackView ? 1 : -1;
    }

    if (higherSide !== 0 || diffCm > 0) {
      const pixelDiff = Math.min(Math.max(diffCm * 15, 20), 60);
      ctx.beginPath();
      ctx.moveTo(centerX - 150, hipY + (higherSide * pixelDiff / 2));
      ctx.lineTo(centerX + 150, hipY - (higherSide * pixelDiff / 2));
      ctx.stroke();
    }
  }

  // 4. Spinal Curvature (Scoliosis) - back view only
  if (isBackView && analysis.spinal_curvature && analysis.spinal_curvature.status !== 'Aligned') {
    const curveDeg = analysis.spinal_curvature.curve_degrees || 0;
    const curveDir = analysis.spinal_curvature.curve_direction;

    let bulgeSide = curveDeg > 0 ? 1 : -1;
    if (curveDir === 'right-leaning') {
      bulgeSide = -1;
    } else if (curveDir === 'left-leaning') {
      bulgeSide = 1;
    }

    ctx.beginPath();
    ctx.setLineDash([2, 4]);

    const curveHeight = hipY - shoulderY;
    const bulge = Math.min(Math.max(Math.abs(curveDeg) * 4, 40), 150);

    const cp1x = centerX + (bulgeSide * bulge);
    const cp1y = shoulderY + (curveHeight * 0.3);
    const cp2x = centerX - (bulgeSide * bulge * 0.5);
    const cp2y = shoulderY + (curveHeight * 0.7);

    ctx.moveTo(centerX, shoulderY);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, centerX, hipY);
    ctx.stroke();
    ctx.setLineDash([5, 5]);
  }
}

function drawSideViewDeviations(
  ctx: CanvasRenderingContext2D,
  analysis: PostureAnalysisResult,
  centerX: number,
  shoulderY: number,
  hipY: number,
  facingDir: number
): void {
  const view = facingDir === -1 ? 'side-left' : 'side-right';
  const rawLandmarks = analysis.landmarks?.raw;

  // Get MediaPipe landmarks for accurate positioning
  let earX: number | null = null;
  let earY: number | null = null;
  let shoulderLandmarkX: number | null = null;
  let shoulderLandmarkY: number | null = null;

  if (rawLandmarks && rawLandmarks.length > 24) {
    const earLandmark = view === 'side-left' ? rawLandmarks[7] : rawLandmarks[8];
    if (earLandmark?.x !== undefined && earLandmark?.y !== undefined) {
      earX = earLandmark.x * ctx.canvas.width;
      earY = earLandmark.y * ctx.canvas.height;
    }

    const shoulderLandmark = view === 'side-left' ? rawLandmarks[11] : rawLandmarks[12];
    if (shoulderLandmark?.x !== undefined && shoulderLandmark?.y !== undefined) {
      shoulderLandmarkX = shoulderLandmark.x * ctx.canvas.width;
      shoulderLandmarkY = shoulderLandmark.y * ctx.canvas.height;
    }
  }

  // Get hip landmarks for pelvic tilt
  let hipLandmarkY: number | null = null;
  if (rawLandmarks && rawLandmarks.length > 24) {
    const hipLandmark = view === 'side-left' ? rawLandmarks[23] : rawLandmarks[24];
    if (hipLandmark?.y !== undefined) {
      hipLandmarkY = hipLandmark.y * ctx.canvas.height;
    }
  }

  // 1. FORWARD HEAD POSTURE
  const fhpStatus = analysis.forward_head?.status;
  const hasForwardHead = fhpStatus && fhpStatus !== 'Neutral';

  if (hasForwardHead) {
    let targetEarX = earX;
    let targetEarY = earY;

    if (targetEarX === null || targetEarY === null) {
      const estimatedForward = facingDir * 50;
      targetEarX = (shoulderLandmarkX || centerX) + estimatedForward;
      targetEarY = shoulderY - 100;
    }

    ctx.beginPath();
    ctx.moveTo(centerX, targetEarY);
    ctx.lineTo(targetEarX, targetEarY);
    ctx.stroke();
  }

  // 2. SHOULDER ROUNDING/FORWARD POSITION
  const shoulderStatus = analysis.shoulder_alignment?.status;
  const isRoundedShoulders = analysis.shoulder_alignment?.rounded_forward ||
                             shoulderStatus === 'Rounded' ||
                             (analysis.shoulder_alignment?.forward_position_cm || 0) > 0;

  if (isRoundedShoulders && shoulderLandmarkX !== null && shoulderLandmarkY !== null) {
    ctx.beginPath();
    ctx.moveTo(centerX, shoulderLandmarkY);
    ctx.lineTo(shoulderLandmarkX, shoulderLandmarkY);
    ctx.stroke();
  }

  // 3. PELVIC TILT
  const pelvicStatus = analysis.pelvic_tilt?.status;
  if (pelvicStatus && pelvicStatus !== 'Neutral') {
    const statusLower = (pelvicStatus || '').toLowerCase();
    const isAnterior = statusLower.includes('anterior');
    const pelvicY = hipLandmarkY || hipY;
    const lineLength = 120;

    const visualAngleDeg = isAnterior ? 10 : 8;
    const rad = (visualAngleDeg * Math.PI) / 180;
    const verticalOffset = Math.tan(rad) * lineLength;

    const tiltSign = isAnterior ? 1 : -1;

    const leftY = pelvicY - (facingDir * tiltSign * verticalOffset);
    const rightY = pelvicY + (facingDir * tiltSign * verticalOffset);

    ctx.beginPath();
    ctx.moveTo(centerX - lineLength, leftY);
    ctx.lineTo(centerX + lineLength, rightY);
    ctx.stroke();
  }
}
