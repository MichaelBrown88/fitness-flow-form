/**
 * Reclassify stored posture results using current industry-standard thresholds
 * (CVA bands for FHP, shoulder <1 cm for Normal). No MediaPipe or images needed.
 * Used by backfill to align historical posture data with new bands.
 */

import type { PostureAnalysisResult } from '@/lib/ai/postureAnalysis';
import { POSTURE_STANDARD } from '@/lib/utils/postureAlignment';

/**
 * Reclassify status fields in posture results from stored numeric values.
 * - Shoulder: Neutral when height_difference_cm < 1 cm.
 * - Forward head: if result has cva_degrees, map to CVA bands; otherwise leave as-is.
 */
export function reclassifyPostureInFormData(
  postureAiResults: Record<string, PostureAnalysisResult> | null
): Record<string, PostureAnalysisResult> | null {
  if (!postureAiResults || typeof postureAiResults !== 'object') return postureAiResults;

  const out: Record<string, PostureAnalysisResult> = {};
  for (const [view, result] of Object.entries(postureAiResults)) {
    if (!result || typeof result !== 'object') {
      out[view] = result;
      continue;
    }
    const next = { ...result } as PostureAnalysisResult;

    if (result.shoulder_alignment && typeof result.shoulder_alignment.height_difference_cm === 'number') {
      const diff = Math.abs(result.shoulder_alignment.height_difference_cm);
      next.shoulder_alignment = {
        ...result.shoulder_alignment,
        status: diff < POSTURE_STANDARD.SHOULDER_NORMAL_CM ? 'Neutral' : 'Asymmetric',
      };
    }

    const fh = result.forward_head;
    if (fh && 'cva_degrees' in fh && typeof (fh as { cva_degrees?: number }).cva_degrees === 'number') {
      const cva = (fh as { cva_degrees: number }).cva_degrees;
      next.forward_head = {
        ...fh,
        status: cva >= POSTURE_STANDARD.CVA_NEUTRAL_MIN ? 'Neutral'
          : cva >= POSTURE_STANDARD.CVA_MILD_MIN ? 'Mild'
          : cva >= POSTURE_STANDARD.CVA_MODERATE_MIN ? 'Moderate'
          : 'Severe',
      };
    }

    out[view] = next;
  }
  return out;
}
