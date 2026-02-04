import type { SeverityLevel } from '@/lib/utils/postureAlignment';
import { POSTURE_THRESHOLDS } from '@/lib/utils/postureAlignment';
import type { PostureView, WireframeOptions, WireframeOnlyOptions, SideViewAlignments } from './types';
import { ALIGNMENT_COLORS, DEBUG_POSE_CONNECTIONS } from './types';
import { calculateFrontBackAlignments } from './postureAlignmentFront';
import { calculateSideViewAlignments } from './postureAlignmentSide';
import {
  getSeverityColor,
  drawControlLine,
  drawAlignmentLine,
  drawLandmarkPoint,
} from './drawingUtils';

/**
 * Draws view-specific MediaPipe pose landmarks wireframe on an image
 */
export async function drawLandmarkWireframe(
  imageData: string,
  landmarks: Array<{ x: number; y: number; z?: number; visibility?: number }>,
  view: PostureView = 'front',
  options: WireframeOptions = {}
): Promise<string> {
  const {
    pointRadius = 8,
    lineWidth = 4,
    opacity = 1.0,
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0);
        ctx.globalAlpha = opacity;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (view === 'front' || view === 'back') {
          drawFrontBackWireframe(ctx, landmarks, view, pointRadius, lineWidth);
        } else {
          drawSideWireframe(ctx, landmarks, view, pointRadius, lineWidth);
        }

        ctx.globalAlpha = 1;
        resolve(canvas.toDataURL('image/jpeg', 0.95));
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image for wireframe'));
    img.src = imageData;
  });
}

function drawFrontBackWireframe(
  ctx: CanvasRenderingContext2D,
  landmarks: Array<{ x: number; y: number; z?: number; visibility?: number }>,
  view: 'front' | 'back',
  pointRadius: number,
  lineWidth: number
): void {
  const isBackView = view === 'back';
  const alignments = calculateFrontBackAlignments(landmarks, ctx.canvas.width, ctx.canvas.height, isBackView);

  const getPos = (idx: number) => ({
    x: (landmarks[idx]?.x ?? 0) * ctx.canvas.width,
    y: (landmarks[idx]?.y ?? 0) * ctx.canvas.height,
    visible: (landmarks[idx]?.visibility ?? 1) > 0.3,
  });

  // 1. VERTICAL MIDLINE
  drawControlLine(ctx, alignments.bodyMidlineX, 0, alignments.bodyMidlineX, ctx.canvas.height, ALIGNMENT_COLORS.MIDLINE);

  // 2. HORIZONTAL CONTROL LINES
  const avgShoulderY = (alignments.shoulders.leftY + alignments.shoulders.rightY) / 2;
  const avgHipY = (alignments.hips.leftY + alignments.hips.rightY) / 2;
  const avgEarY = (alignments.headTilt.leftY + alignments.headTilt.rightY) / 2;

  drawControlLine(ctx, 0, avgShoulderY, ctx.canvas.width, avgShoulderY);
  drawControlLine(ctx, 0, avgHipY, ctx.canvas.width, avgHipY);
  if (!isBackView) {
    drawControlLine(ctx, 0, avgEarY, ctx.canvas.width, avgEarY);
  }

  // 3. TORSO SKELETON
  ctx.strokeStyle = ALIGNMENT_COLORS.NEUTRAL;
  ctx.lineWidth = lineWidth - 1;
  ctx.setLineDash([]);

  const leftShoulder = getPos(11);
  const leftHip = getPos(23);
  if (leftShoulder.visible && leftHip.visible) {
    ctx.beginPath();
    ctx.moveTo(leftShoulder.x, leftShoulder.y);
    ctx.lineTo(leftHip.x, leftHip.y);
    ctx.stroke();
  }

  const rightShoulder = getPos(12);
  const rightHip = getPos(24);
  if (rightShoulder.visible && rightHip.visible) {
    ctx.beginPath();
    ctx.moveTo(rightShoulder.x, rightShoulder.y);
    ctx.lineTo(rightHip.x, rightHip.y);
    ctx.stroke();
  }

  // 4. HEAD TILT (front view only)
  if (!isBackView) {
    const leftEar = getPos(7);
    const rightEar = getPos(8);
    if (leftEar.visible && rightEar.visible) {
      drawAlignmentLine(ctx, leftEar.x, leftEar.y, rightEar.x, rightEar.y, alignments.headTilt.severity, lineWidth);
    }
  }

  // 5. LATERAL HEAD POSITION (front view only)
  if (!isBackView && alignments.lateralHead.severity !== 'good') {
    const nose = getPos(0);
    if (nose.visible) {
      ctx.strokeStyle = getSeverityColor(alignments.lateralHead.severity);
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(nose.x, nose.y);
      ctx.lineTo(alignments.bodyMidlineX, nose.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // 6. SHOULDER LINE
  if (leftShoulder.visible && rightShoulder.visible) {
    drawAlignmentLine(ctx, leftShoulder.x, leftShoulder.y, rightShoulder.x, rightShoulder.y, alignments.shoulders.severity, lineWidth);

    const avgShoulderYRef = (leftShoulder.y + rightShoulder.y) / 2;
    ctx.strokeStyle = getSeverityColor(alignments.shoulders.severity);
    ctx.lineWidth = alignments.shoulders.severity === 'good' ? 2 : 4;
    ctx.setLineDash(alignments.shoulders.severity === 'good' ? [8, 8] : [6, 4]);
    ctx.beginPath();
    ctx.moveTo(leftShoulder.x - 40, avgShoulderYRef);
    ctx.lineTo(rightShoulder.x + 40, avgShoulderYRef);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // 7. HIP LINE
  if (leftHip.visible && rightHip.visible) {
    drawAlignmentLine(ctx, leftHip.x, leftHip.y, rightHip.x, rightHip.y, alignments.hips.severity, lineWidth);

    const avgHipYRef = (leftHip.y + rightHip.y) / 2;
    ctx.strokeStyle = getSeverityColor(alignments.hips.severity);
    ctx.lineWidth = alignments.hips.severity === 'good' ? 2 : 4;
    ctx.setLineDash(alignments.hips.severity === 'good' ? [8, 8] : [6, 4]);
    ctx.beginPath();
    ctx.moveTo(leftHip.x - 40, avgHipYRef);
    ctx.lineTo(rightHip.x + 40, avgHipYRef);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // 8. HIP SHIFT
  ctx.strokeStyle = getSeverityColor(alignments.hipShift.severity);
  ctx.lineWidth = alignments.hipShift.severity === 'good' ? 2 : 4;
  ctx.setLineDash(alignments.hipShift.severity === 'good' ? [8, 8] : [6, 4]);
  ctx.beginPath();
  const hipShiftExtend = 30;
  ctx.moveTo(Math.min(alignments.hipShift.midpointX, alignments.bodyMidlineX) - hipShiftExtend, avgHipY);
  ctx.lineTo(Math.max(alignments.hipShift.midpointX, alignments.bodyMidlineX) + hipShiftExtend, avgHipY);
  ctx.stroke();
  ctx.setLineDash([]);

  // 9. LEFT LEG
  const leftKnee = getPos(25);
  const leftAnkle = getPos(27);
  if (leftHip.visible && leftKnee.visible && leftAnkle.visible) {
    drawControlLine(ctx, leftHip.x, leftHip.y, leftAnkle.x, leftAnkle.y);
    drawAlignmentLine(ctx, leftHip.x, leftHip.y, leftKnee.x, leftKnee.y, alignments.leftLeg.severity, lineWidth);
    drawAlignmentLine(ctx, leftKnee.x, leftKnee.y, leftAnkle.x, leftAnkle.y, alignments.leftLeg.severity, lineWidth);

    const idealKneeXLeft = alignments.leftLeg.hipPos.x +
      (alignments.leftLeg.anklePos.x - alignments.leftLeg.hipPos.x) *
      ((alignments.leftLeg.kneePos.y - alignments.leftLeg.hipPos.y) /
       (alignments.leftLeg.anklePos.y - alignments.leftLeg.hipPos.y));
    ctx.strokeStyle = getSeverityColor(alignments.leftLeg.severity);
    ctx.lineWidth = alignments.leftLeg.severity === 'good' ? 2 : 4;
    ctx.setLineDash(alignments.leftLeg.severity === 'good' ? [6, 6] : [4, 3]);
    ctx.beginPath();
    const leftKneeExtend = 20;
    ctx.moveTo(Math.min(leftKnee.x, idealKneeXLeft) - leftKneeExtend, leftKnee.y);
    ctx.lineTo(Math.max(leftKnee.x, idealKneeXLeft) + leftKneeExtend, leftKnee.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // 10. RIGHT LEG
  const rightKnee = getPos(26);
  const rightAnkle = getPos(28);
  if (rightHip.visible && rightKnee.visible && rightAnkle.visible) {
    drawControlLine(ctx, rightHip.x, rightHip.y, rightAnkle.x, rightAnkle.y);
    drawAlignmentLine(ctx, rightHip.x, rightHip.y, rightKnee.x, rightKnee.y, alignments.rightLeg.severity, lineWidth);
    drawAlignmentLine(ctx, rightKnee.x, rightKnee.y, rightAnkle.x, rightAnkle.y, alignments.rightLeg.severity, lineWidth);

    const idealKneeXRight = alignments.rightLeg.hipPos.x +
      (alignments.rightLeg.anklePos.x - alignments.rightLeg.hipPos.x) *
      ((alignments.rightLeg.kneePos.y - alignments.rightLeg.hipPos.y) /
       (alignments.rightLeg.anklePos.y - alignments.rightLeg.hipPos.y));
    ctx.strokeStyle = getSeverityColor(alignments.rightLeg.severity);
    ctx.lineWidth = alignments.rightLeg.severity === 'good' ? 2 : 4;
    ctx.setLineDash(alignments.rightLeg.severity === 'good' ? [6, 6] : [4, 3]);
    ctx.beginPath();
    const rightKneeExtend = 20;
    ctx.moveTo(Math.min(rightKnee.x, idealKneeXRight) - rightKneeExtend, rightKnee.y);
    ctx.lineTo(Math.max(rightKnee.x, idealKneeXRight) + rightKneeExtend, rightKnee.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // 11. SCOLIOSIS (back view only)
  if (isBackView && alignments.scoliosis && alignments.scoliosis.severity !== 'good') {
    const scoliosis = alignments.scoliosis;
    ctx.strokeStyle = getSeverityColor(scoliosis.severity);
    ctx.lineWidth = lineWidth;
    ctx.setLineDash([]);

    const midTorsoY = (avgShoulderY + avgHipY) / 2;
    const curveBulge = scoliosis.direction === 'left' ? -30 : 30;

    ctx.beginPath();
    ctx.moveTo(scoliosis.shoulderMidX, avgShoulderY);
    ctx.quadraticCurveTo(
      scoliosis.shoulderMidX + curveBulge,
      midTorsoY,
      scoliosis.hipMidX,
      avgHipY
    );
    ctx.stroke();

    drawControlLine(ctx, alignments.bodyMidlineX, avgShoulderY, alignments.bodyMidlineX, avgHipY);
  }

  // DRAW LANDMARK POINTS
  const frontBackPoints: Array<{ pos: ReturnType<typeof getPos>; severity: SeverityLevel | null }> = [];

  if (!isBackView) {
    frontBackPoints.push(
      { pos: getPos(0), severity: alignments.lateralHead.severity },
      { pos: getPos(7), severity: alignments.headTilt.severity },
      { pos: getPos(8), severity: alignments.headTilt.severity },
    );
  }

  frontBackPoints.push(
    { pos: getPos(11), severity: alignments.shoulders.severity },
    { pos: getPos(12), severity: alignments.shoulders.severity },
    { pos: getPos(23), severity: alignments.hips.severity },
    { pos: getPos(24), severity: alignments.hips.severity },
    { pos: getPos(25), severity: alignments.leftLeg.severity },
    { pos: getPos(26), severity: alignments.rightLeg.severity },
    { pos: getPos(27), severity: 'good' },
    { pos: getPos(28), severity: 'good' },
  );

  for (const { pos, severity } of frontBackPoints) {
    if (pos.visible) {
      drawLandmarkPoint(ctx, pos.x, pos.y, severity, pointRadius);
    }
  }
}

function drawSideWireframe(
  ctx: CanvasRenderingContext2D,
  landmarks: Array<{ x: number; y: number; z?: number; visibility?: number }>,
  view: 'side-left' | 'side-right',
  pointRadius: number,
  lineWidth: number
): void {
  const alignments = calculateSideViewAlignments(landmarks, view, ctx.canvas.width, ctx.canvas.height);

  // 1. VERTICAL PLUMB LINE
  ctx.strokeStyle = ALIGNMENT_COLORS.MIDLINE;
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 10]);
  ctx.beginPath();
  ctx.moveTo(alignments.plumbX, 0);
  ctx.lineTo(alignments.plumbX, ctx.canvas.height);
  ctx.stroke();
  ctx.setLineDash([]);

  // HORIZONTAL CONTROL LINES
  drawControlLine(ctx, 0, alignments.ear.y, ctx.canvas.width, alignments.ear.y);
  drawControlLine(ctx, 0, alignments.hip.y, ctx.canvas.width, alignments.hip.y);

  // 2. EAR POSITION
  drawAlignmentLine(ctx, alignments.ear.x, alignments.ear.y, alignments.shoulder.x, alignments.shoulder.y, alignments.ear.severity, lineWidth);

  drawHorizontalAlignmentLine(ctx, alignments.ear.x, alignments.plumbX, alignments.ear.y, alignments.ear.severity, 60);

  // 3. HEAD PITCH
  drawAlignmentLine(ctx, alignments.ear.x, alignments.ear.y, alignments.eye.x, alignments.eye.y, alignments.headUpDown.severity, lineWidth + 1);

  // 4. SHOULDER POSITION
  drawAlignmentLine(ctx, alignments.shoulder.x, alignments.shoulder.y, alignments.hip.x, alignments.hip.y, alignments.shoulder.severity, lineWidth);

  drawHorizontalAlignmentLine(ctx, alignments.shoulder.x, alignments.plumbX, alignments.shoulder.y, alignments.shoulder.severity, 60);

  // 5. HIP POSITION
  drawAlignmentLine(ctx, alignments.hip.x, alignments.hip.y, alignments.knee.x, alignments.knee.y, alignments.hip.severity, lineWidth);

  drawHorizontalAlignmentLine(ctx, alignments.hip.x, alignments.plumbX, alignments.hip.y, alignments.hip.severity, 80);

  // 6. KNEE POSITION
  const kneeSeverity = alignments.knee.status === 'neutral' ? 'good' :
    (Math.abs(alignments.knee.deviation) > POSTURE_THRESHOLDS.PLUMB_LINE.MODERATE * ctx.canvas.width ? 'moderate' : 'mild');
  drawAlignmentLine(ctx, alignments.knee.x, alignments.knee.y, alignments.ankle.x, alignments.ankle.y, kneeSeverity, lineWidth);

  // 7. KYPHOSIS
  if (alignments.kyphosis.severity !== 'good') {
    const midBackY = alignments.shoulder.y + (alignments.hip.y - alignments.shoulder.y) * 0.3;
    const curveDepth = alignments.kyphosis.severity === 'severe' ? 40 :
                      (alignments.kyphosis.severity === 'moderate' ? 25 : 15);
    const curveX = view === 'side-left' ? alignments.shoulder.x + curveDepth : alignments.shoulder.x - curveDepth;

    ctx.strokeStyle = getSeverityColor(alignments.kyphosis.severity);
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(alignments.shoulder.x, alignments.shoulder.y);
    ctx.quadraticCurveTo(curveX, midBackY, alignments.shoulder.x, alignments.shoulder.y + (alignments.hip.y - alignments.shoulder.y) * 0.5);
    ctx.stroke();
  }

  // 8. LORDOSIS
  if (alignments.lordosis.severity !== 'good') {
    const lowerBackY = alignments.shoulder.y + (alignments.hip.y - alignments.shoulder.y) * 0.7;
    const curveDepth = alignments.lordosis.severity === 'severe' ? 35 :
                      (alignments.lordosis.severity === 'moderate' ? 20 : 10);
    const curveX = view === 'side-left' ? alignments.hip.x - curveDepth : alignments.hip.x + curveDepth;

    ctx.strokeStyle = getSeverityColor(alignments.lordosis.severity);
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(alignments.shoulder.x, lowerBackY);
    ctx.quadraticCurveTo(curveX, (lowerBackY + alignments.hip.y) / 2, alignments.hip.x, alignments.hip.y);
    ctx.stroke();
  }

  // 9. PELVIC TILT
  if (alignments.pelvicTilt.type !== 'neutral') {
    const tiltAngle = alignments.pelvicTilt.type === 'anterior' ? 15 : -10;
    const tiltLength = 50;
    const tiltRad = (tiltAngle * Math.PI) / 180;
    const tiltDir = view === 'side-left' ? 1 : -1;

    ctx.strokeStyle = getSeverityColor(alignments.pelvicTilt.severity);
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(alignments.hip.x - tiltLength * tiltDir, alignments.hip.y + Math.sin(tiltRad) * tiltLength);
    ctx.lineTo(alignments.hip.x + tiltLength * tiltDir, alignments.hip.y - Math.sin(tiltRad) * tiltLength);
    ctx.stroke();
  }

  // 10. ARM
  const elbowIdx = view === 'side-left' ? 13 : 14;
  const wristIdx = view === 'side-left' ? 15 : 16;
  const shoulderIdx = view === 'side-left' ? 11 : 12;

  const elbow = landmarks[elbowIdx];
  const wrist = landmarks[wristIdx];
  const shoulder = landmarks[shoulderIdx];

  if (elbow && shoulder && (elbow.visibility ?? 1) > 0.3) {
    ctx.strokeStyle = ALIGNMENT_COLORS.NEUTRAL;
    ctx.lineWidth = lineWidth - 1;
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.moveTo((shoulder.x) * ctx.canvas.width, (shoulder.y) * ctx.canvas.height);
    ctx.lineTo((elbow.x) * ctx.canvas.width, (elbow.y) * ctx.canvas.height);
    ctx.stroke();

    if (wrist && (wrist.visibility ?? 1) > 0.3) {
      ctx.beginPath();
      ctx.moveTo((elbow.x) * ctx.canvas.width, (elbow.y) * ctx.canvas.height);
      ctx.lineTo((wrist.x) * ctx.canvas.width, (wrist.y) * ctx.canvas.height);
      ctx.stroke();
    }
  }

  // DRAW LANDMARK POINTS
  const sidePoints = [
    { x: alignments.ear.x, y: alignments.ear.y, severity: alignments.ear.severity },
    { x: alignments.shoulder.x, y: alignments.shoulder.y, severity: alignments.shoulder.severity },
    { x: alignments.hip.x, y: alignments.hip.y, severity: alignments.hip.severity },
    { x: alignments.knee.x, y: alignments.knee.y, severity: kneeSeverity as SeverityLevel },
    { x: alignments.ankle.x, y: alignments.ankle.y, severity: null },
  ];

  for (const point of sidePoints) {
    drawLandmarkPoint(ctx, point.x, point.y, point.severity, pointRadius);
  }
}

function drawHorizontalAlignmentLine(
  ctx: CanvasRenderingContext2D,
  posX: number,
  plumbX: number,
  y: number,
  severity: SeverityLevel,
  extend: number
): void {
  ctx.strokeStyle = getSeverityColor(severity);
  ctx.lineWidth = severity === 'good' ? 2 : 4;
  ctx.setLineDash(severity === 'good' ? [8, 8] : [6, 4]);
  ctx.beginPath();
  ctx.moveTo(Math.min(posX, plumbX) - extend, y);
  ctx.lineTo(Math.max(posX, plumbX) + extend, y);
  ctx.stroke();
  ctx.setLineDash([]);
}

/**
 * Generates a wireframe-only visualization (no background image)
 */
export function generateWireframeOnly(
  landmarks: Array<{ x: number; y: number; z?: number; visibility?: number }>,
  width: number = 400,
  height: number = 600,
  options: WireframeOnlyOptions = {}
): string {
  const {
    pointColor = '#00ff00',
    lineColor = 'rgba(0, 255, 0, 0.8)',
    backgroundColor = '#1a1a2e',
  } = options;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) return '';

  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';

  for (const [startIdx, endIdx] of DEBUG_POSE_CONNECTIONS) {
    const start = landmarks[startIdx];
    const end = landmarks[endIdx];

    if (!start || !end) continue;

    const startVis = start.visibility ?? 1;
    const endVis = end.visibility ?? 1;
    if (startVis < 0.3 || endVis < 0.3) continue;

    ctx.beginPath();
    ctx.moveTo(start.x * width, start.y * height);
    ctx.lineTo(end.x * width, end.y * height);
    ctx.stroke();
  }

  ctx.fillStyle = pointColor;
  landmarks.forEach((landmark) => {
    if (!landmark || (landmark.visibility ?? 1) < 0.3) return;

    ctx.beginPath();
    ctx.arc(landmark.x * width, landmark.y * height, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  return canvas.toDataURL('image/png');
}
