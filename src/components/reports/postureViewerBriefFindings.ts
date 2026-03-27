import type { PostureAnalysisResult } from '@/lib/ai/postureAnalysis';
import { calculateDeviationsFromLandmarks } from '@/lib/utils/postureDeviation';
import type { PostureView } from './postureViewerTypes';

/**
 * Brief findings for the preview card — any deviation that shows a red line on the wireframe.
 */
export function getBriefFindings(analysis: PostureAnalysisResult, view: PostureView): string[] {
  const brief: string[] = [];
  const calc = calculateDeviationsFromLandmarks(analysis.landmarks?.raw, view);

  if (calc.forwardHead !== 'good') {
    brief.push('Forward Head');
  }
  if (analysis.head_updown?.status && analysis.head_updown.status !== 'Neutral') {
    brief.push(analysis.head_updown.status === 'Looking Down' ? 'Head Pitch Down' : 'Head Pitch Up');
  }
  if (analysis.shoulder_alignment?.rounded_forward || analysis.shoulder_alignment?.status === 'Rounded') {
    brief.push('Rounded Shoulders');
  }
  if (analysis.kyphosis && analysis.kyphosis.status !== 'Normal') {
    brief.push('Kyphosis');
  }
  if (analysis.lordosis && analysis.lordosis.status !== 'Normal') {
    brief.push('Lordosis');
  }
  if (calc.pelvicTilt !== 'good') {
    brief.push('Pelvic Tilt');
  }

  if (calc.headTilt !== 'good') {
    brief.push('Head Tilt');
  }
  if (calc.shoulder !== 'good') {
    brief.push('Shoulder Asymmetry');
  }
  if (calc.hipShift !== 'good') {
    brief.push('Hip Shift');
  }
  if (analysis.spinal_curvature && analysis.spinal_curvature.status !== 'Normal') {
    brief.push('Spinal Curvature');
  }

  if (calc.leftKneeDirection !== 'straight') {
    brief.push(`Left Knee ${calc.leftKneeDirection === 'valgus' ? 'Valgus' : 'Varus'}`);
  }
  if (calc.rightKneeDirection !== 'straight') {
    brief.push(`Right Knee ${calc.rightKneeDirection === 'valgus' ? 'Valgus' : 'Varus'}`);
  }

  return brief.length > 0 ? brief : ['Neutral Alignment'];
}
