import type { SeverityLevel } from '@/lib/utils/postureAlignment';
import { ALIGNMENT_COLORS } from './types';

/**
 * Get color based on severity level
 */
export function getSeverityColor(severity: SeverityLevel): string {
  switch (severity) {
    case 'good': return ALIGNMENT_COLORS.GOOD_LINE;
    case 'mild': return ALIGNMENT_COLORS.MILD_LINE;
    case 'moderate':
    case 'severe': return ALIGNMENT_COLORS.DEVIATION_LINE;
  }
}

/**
 * Get point color based on severity level
 */
export function getSeverityPointColor(severity: SeverityLevel): string {
  switch (severity) {
    case 'good': return ALIGNMENT_COLORS.POINT_GOOD;
    case 'mild': return ALIGNMENT_COLORS.POINT_MILD;
    case 'moderate':
    case 'severe': return ALIGNMENT_COLORS.POINT_DEVIATION;
  }
}

/**
 * Helper to draw a dashed control line (ideal alignment reference)
 */
export function drawControlLine(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number,
  x2: number, y2: number,
  color: string = ALIGNMENT_COLORS.CONTROL
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.setLineDash(ALIGNMENT_COLORS.CONTROL_DASHED);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

/**
 * Helper to draw an alignment line (actual position)
 */
export function drawAlignmentLine(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number,
  x2: number, y2: number,
  severity: SeverityLevel,
  lineWidth: number = 4
): void {
  ctx.strokeStyle = getSeverityColor(severity);
  ctx.lineWidth = lineWidth;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

/**
 * Helper to draw a landmark point
 */
export function drawLandmarkPoint(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  severity: SeverityLevel | null,
  radius: number = 8
): void {
  // Outline
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Fill
  ctx.fillStyle = severity !== null ? getSeverityPointColor(severity) : ALIGNMENT_COLORS.POINT_NEUTRAL;
  ctx.beginPath();
  ctx.arc(x, y, radius - 1, 0, Math.PI * 2);
  ctx.fill();
}
