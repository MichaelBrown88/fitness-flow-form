/**
 * Maps deterministic PostureAnalysisResult + landmarks into PostureFindingRecord[] via POSTURE_FEEDBACK_LIBRARY.
 */

import type { PostureAnalysisResult } from '@/lib/ai/postureAnalysis';
import {
  getPostureFeedbackDefinition,
  type PostureFeedbackDefinition,
  type PostureFeedbackSeverityTier,
} from '@/constants/postureFeedbackLibrary';
import type {
  PostureFindingRecord,
  PostureFindingSeverity,
  PostureFindingUnit,
  PostureFindingViewId,
} from '@/lib/types/postureFindings';
import { calculateDeviationsFromLandmarks, getSideViewPlumbSeverity } from '@/lib/utils/postureDeviation';
import type { Severity } from '@/lib/utils/postureDeviation';

function copyForTier(
  def: PostureFeedbackDefinition,
  tier: PostureFeedbackSeverityTier
): { whatItMeans: string; whatWellDo: string } {
  const row = def.feedback[tier];
  return { whatItMeans: row.what_it_means, whatWellDo: row.what_well_do };
}

function makeRecord(
  def: PostureFeedbackDefinition,
  view: PostureFindingViewId,
  measuredValue: number,
  unit: PostureFindingUnit,
  severity: PostureFindingSeverity
): PostureFindingRecord | null {
  if (severity === 'aligned') return null;
  const tier: PostureFeedbackSeverityTier = severity;
  const { whatItMeans, whatWellDo } = copyForTier(def, tier);
  return {
    id: def.id,
    view,
    measuredValue,
    unit,
    severity,
    name: def.name,
    whatItMeans,
    whatWellDo,
    priority: def.priority,
  };
}

function headSeverityFromStatus(status: string): PostureFindingSeverity {
  const s = status.toLowerCase();
  if (s === 'neutral' || s === 'normal') return 'aligned';
  if (s === 'mild') return 'mild';
  if (s === 'moderate') return 'moderate';
  return 'significant';
}

function goodMildModSevFromLeg(sev: string | undefined): PostureFindingSeverity {
  const s = (sev ?? 'Good').toLowerCase();
  if (s === 'good') return 'aligned';
  if (s === 'mild') return 'mild';
  if (s === 'moderate') return 'moderate';
  return 'significant';
}

function plumbSeverityToFinding(sev: Severity): PostureFindingSeverity {
  if (sev === 'good') return 'aligned';
  if (sev === 'mild') return 'mild';
  if (sev === 'moderate') return 'moderate';
  return 'significant';
}

function hipShiftSeverityToFinding(sev: string): PostureFindingSeverity {
  const s = sev.toLowerCase();
  if (s === 'good') return 'aligned';
  if (s === 'mild') return 'mild';
  if (s === 'moderate') return 'moderate';
  return 'significant';
}

function spinalStatusToSeverity(status: string | undefined): PostureFindingSeverity {
  if (!status) return 'aligned';
  const s = status.toLowerCase();
  if (s.includes('normal')) return 'aligned';
  if (s.includes('mild')) return 'mild';
  if (s.includes('moderate')) return 'moderate';
  return 'significant';
}

export function buildStructuredPostureFindings(
  view: PostureFindingViewId,
  analysis: PostureAnalysisResult
): PostureFindingRecord[] {
  const raw = analysis.landmarks?.raw;
  const out: PostureFindingRecord[] = [];
  const push = (rec: PostureFindingRecord | null) => {
    if (rec) out.push(rec);
  };

  const isSide = view === 'side-left' || view === 'side-right';
  const isFrontBack = view === 'front' || view === 'back';

  if (isSide) {
    const fh = getPostureFeedbackDefinition('forward_head');
    if (fh) {
      const sev = headSeverityFromStatus(analysis.forward_head.status);
      push(
        makeRecord(fh, view, analysis.forward_head.deviation_degrees, 'degrees', sev)
      );
    }

    const hpu = getPostureFeedbackDefinition('head_pitch_up');
    if (hpu && analysis.head_updown?.status === 'Looking Up') {
      const sev: PostureFindingSeverity =
        analysis.head_updown.severity === 'Severe'
          ? 'significant'
          : analysis.head_updown.severity === 'Moderate'
            ? 'moderate'
            : 'mild';
      const deg =
        analysis.head_updown.severity === 'Severe'
          ? 30
          : analysis.head_updown.severity === 'Moderate'
            ? 20
            : 12;
      push(makeRecord(hpu, view, deg, 'degrees', sev));
    }

    const rs = getPostureFeedbackDefinition('rounded_shoulders');
    if (rs && raw) {
      const shoulderIdx = view === 'side-left' ? 11 : 12;
      const plumbSev = getSideViewPlumbSeverity(raw, view, shoulderIdx);
      const findingSev = plumbSeverityToFinding(plumbSev);
      const dev = Math.abs((raw[shoulderIdx]?.x ?? 0.5) - (raw[view === 'side-left' ? 27 : 28]?.x ?? 0.5));
      push(makeRecord(rs, view, dev, 'pixels', findingSev));
    }

    const apt = getPostureFeedbackDefinition('anterior_pelvic_tilt');
    if (apt && analysis.pelvic_tilt.status === 'Anterior Tilt') {
      const deg = Math.abs(analysis.pelvic_tilt.anterior_tilt_degrees ?? 8);
      const t = apt.thresholds;
      const sev: PostureFindingSeverity =
        deg >= t.significant ? 'significant' : deg >= t.moderate ? 'moderate' : deg >= t.mild ? 'mild' : 'aligned';
      push(makeRecord(apt, view, deg, 'degrees', sev));
    }

    const ppt = getPostureFeedbackDefinition('posterior_pelvic_tilt');
    if (ppt && analysis.pelvic_tilt.status === 'Posterior Tilt') {
      const deg = Math.abs(analysis.pelvic_tilt.anterior_tilt_degrees ?? 8) || 8;
      const t = ppt.thresholds;
      const sev: PostureFindingSeverity =
        deg >= t.significant ? 'significant' : deg >= t.moderate ? 'moderate' : deg >= t.mild ? 'mild' : 'aligned';
      push(makeRecord(ppt, view, deg, 'degrees', sev));
    }

    const ftl = getPostureFeedbackDefinition('forward_trunk_lean');
    if (ftl && raw) {
      const shoulder = view === 'side-left' ? raw[11] : raw[12];
      const hip = view === 'side-left' ? raw[23] : raw[24];
      const ankle = view === 'side-left' ? raw[27] : raw[28];
      if (shoulder && hip && ankle) {
        const midX = (hip.x + ankle.x) / 2;
        const lean = Math.abs(shoulder.x - midX);
        const t = ftl.thresholds;
        const sev: PostureFindingSeverity =
          lean >= t.significant
            ? 'significant'
            : lean >= t.moderate
              ? 'moderate'
              : lean >= t.mild
                ? 'mild'
                : 'aligned';
        push(makeRecord(ftl, view, lean, 'pixels', sev));
      }
    }
  }

  if (isFrontBack) {
    const sa = getPostureFeedbackDefinition('shoulder_asymmetry');
    if (sa && analysis.shoulder_alignment.status === 'Asymmetric') {
      const cm = analysis.shoulder_alignment.height_difference_cm ?? 0;
      const t = sa.thresholds;
      const sev: PostureFindingSeverity =
        cm >= t.significant ? 'significant' : cm >= t.moderate ? 'moderate' : cm >= t.mild ? 'mild' : 'aligned';
      push(makeRecord(sa, view, cm, 'pixels', sev));
    }

    const lps = getPostureFeedbackDefinition('lateral_pelvic_shift');
    if (lps && analysis.hip_shift && analysis.hip_shift.status !== 'Centered') {
      const pct = analysis.hip_shift.shift_percent;
      const sev = hipShiftSeverityToFinding(analysis.hip_shift.severity);
      push(makeRecord(lps, view, pct, 'pixels', sev));
    }

    const uhh = getPostureFeedbackDefinition('uneven_hip_height');
    if (uhh && analysis.hip_alignment.status === 'Asymmetric') {
      const cm = analysis.hip_alignment.height_difference_cm ?? 0;
      const t = uhh.thresholds;
      const sev: PostureFindingSeverity =
        cm >= t.significant ? 'significant' : cm >= t.moderate ? 'moderate' : cm >= t.mild ? 'mild' : 'aligned';
      push(makeRecord(uhh, view, cm, 'pixels', sev));
    }

    if (view === 'front') {
      const lk = analysis.left_leg_alignment;
      if (lk) {
        const sev = goodMildModSevFromLeg(lk.severity);
        if (lk.status === 'Valgus') {
          const def = getPostureFeedbackDefinition('left_knee_valgus');
          if (def) push(makeRecord(def, view, lk.knee_deviation_percent, 'pixels', sev));
        }
        if (lk.status === 'Varus') {
          const def = getPostureFeedbackDefinition('left_knee_varus');
          if (def) push(makeRecord(def, view, lk.knee_deviation_percent, 'pixels', sev));
        }
      }
      const rk = analysis.right_leg_alignment;
      if (rk) {
        const sev = goodMildModSevFromLeg(rk.severity);
        if (rk.status === 'Valgus') {
          const def = getPostureFeedbackDefinition('right_knee_valgus');
          if (def) push(makeRecord(def, view, rk.knee_deviation_percent, 'pixels', sev));
        }
        if (rk.status === 'Varus') {
          const def = getPostureFeedbackDefinition('right_knee_varus');
          if (def) push(makeRecord(def, view, rk.knee_deviation_percent, 'pixels', sev));
        }
      }

      const calc = raw ? calculateDeviationsFromLandmarks(raw, view) : null;
      if (calc) {
        const apL = getPostureFeedbackDefinition('ankle_pronation_left');
        if (apL && calc.leftKneeDirection === 'valgus') {
          const sev = plumbSeverityToFinding(calc.leftLeg);
          const dev = analysis.left_leg_alignment?.knee_deviation_percent ?? 5;
          push(makeRecord(apL, view, dev, 'pixels', sev));
        }
        const apR = getPostureFeedbackDefinition('ankle_pronation_right');
        if (apR && calc.rightKneeDirection === 'valgus') {
          const sev = plumbSeverityToFinding(calc.rightLeg);
          const dev = analysis.right_leg_alignment?.knee_deviation_percent ?? 5;
          push(makeRecord(apR, view, dev, 'pixels', sev));
        }
      }
    }

    const sps = getPostureFeedbackDefinition('spinal_lateral_shift');
    if (sps && raw) {
      if (analysis.spinal_curvature) {
        const sev = spinalStatusToSeverity(analysis.spinal_curvature.status);
        const deg = analysis.spinal_curvature.curve_degrees;
        push(makeRecord(sps, view, deg, 'degrees', sev));
      } else {
        const calc = calculateDeviationsFromLandmarks(raw, view);
        if (calc.headTilt !== 'good') {
          const deg = Math.abs(analysis.head_alignment?.tilt_degrees ?? 0);
          const sev = plumbSeverityToFinding(calc.headTilt);
          push(makeRecord(sps, view, deg, 'degrees', sev));
        }
      }
    }
  }

  return out;
}
