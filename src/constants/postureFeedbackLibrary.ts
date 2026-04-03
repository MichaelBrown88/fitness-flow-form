/**
 * Deterministic copy + thresholds for posture findings (placeholder copy — replace with approved studio copy).
 */

import type { PostureFindingViewId } from '@/lib/types/postureFindings';

export type PostureFeedbackSeverityTier = 'mild' | 'moderate' | 'significant';

export interface PostureFeedbackTierCopy {
  what_it_means: string;
  what_well_do: string;
}

export interface PostureFeedbackDefinition {
  id: string;
  name: string;
  views: PostureFindingViewId[];
  thresholds: { mild: number; moderate: number; significant: number };
  priority: 'high' | 'medium' | 'low';
  feedback: Record<PostureFeedbackSeverityTier, PostureFeedbackTierCopy>;
}

const tier = (means: string, plan: string): PostureFeedbackTierCopy => ({
  what_it_means: means,
  what_well_do: plan,
});

export const POSTURE_FEEDBACK_LIBRARY = {
  forward_head: {
    id: 'forward_head',
    name: 'Forward Head',
    views: ['side-left', 'side-right'],
    thresholds: { mild: 8, moderate: 15, significant: 25 },
    priority: 'high',
    feedback: {
      mild: tier('Placeholder: mild forward head — head sits slightly ahead of ideal alignment.', 'Placeholder: chin tucks and upper-back mobility.'),
      moderate: tier('Placeholder: moderate forward head.', 'Placeholder: prioritise neck flexor strength and thoracic extension.'),
      significant: tier('Placeholder: significant forward head.', 'Placeholder: coach-led neck and upper-back programme.'),
    },
  },
  head_pitch_up: {
    id: 'head_pitch_up',
    name: 'Head Pitch Up',
    views: ['side-left', 'side-right'],
    thresholds: { mild: 12, moderate: 22, significant: 35 },
    priority: 'medium',
    feedback: {
      mild: tier('Placeholder: chin is lifted slightly.', 'Placeholder: cue a soft nod to bring gaze level.'),
      moderate: tier('Placeholder: noticeable upward head tilt.', 'Placeholder: deep neck flexor endurance and desk ergonomics.'),
      significant: tier('Placeholder: strong upward head tilt.', 'Placeholder: guided neck positioning and mobility work.'),
    },
  },
  rounded_shoulders: {
    id: 'rounded_shoulders',
    name: 'Rounded Shoulders',
    views: ['side-left', 'side-right'],
    thresholds: { mild: 0.02, moderate: 0.04, significant: 0.07 },
    priority: 'high',
    feedback: {
      mild: tier('Placeholder: mild shoulder rounding.', 'Placeholder: thoracic extension and pec mobility.'),
      moderate: tier('Placeholder: moderate rounding.', 'Placeholder: add rows, face pulls, and scapular control.'),
      significant: tier('Placeholder: significant rounding.', 'Placeholder: structured upper-cross syndrome plan.'),
    },
  },
  shoulder_asymmetry: {
    id: 'shoulder_asymmetry',
    name: 'Shoulder Asymmetry',
    views: ['front', 'back'],
    thresholds: { mild: 0.4, moderate: 0.8, significant: 1.2 },
    priority: 'medium',
    feedback: {
      mild: tier('Placeholder: slight shoulder height difference.', 'Placeholder: unilateral activation and stretch balance.'),
      moderate: tier('Placeholder: visible shoulder imbalance.', 'Placeholder: assess side dominance and overhead patterns.'),
      significant: tier('Placeholder: marked shoulder asymmetry.', 'Placeholder: refer to corrective strategy for rib/shoulder complex.'),
    },
  },
  anterior_pelvic_tilt: {
    id: 'anterior_pelvic_tilt',
    name: 'Anterior Pelvic Tilt',
    views: ['side-left', 'side-right'],
    thresholds: { mild: 5, moderate: 12, significant: 20 },
    priority: 'high',
    feedback: {
      mild: tier('Placeholder: mild anterior tilt.', 'Placeholder: glute and core endurance; hip flexor length.'),
      moderate: tier('Placeholder: moderate anterior tilt.', 'Placeholder: 9090 breathing and hip flexor stretching.'),
      significant: tier('Placeholder: strong anterior tilt.', 'Placeholder: comprehensive lumbopelvic programme.'),
    },
  },
  posterior_pelvic_tilt: {
    id: 'posterior_pelvic_tilt',
    name: 'Posterior Pelvic Tilt',
    views: ['side-left', 'side-right'],
    thresholds: { mild: 5, moderate: 12, significant: 20 },
    priority: 'medium',
    feedback: {
      mild: tier('Placeholder: mild posterior tilt.', 'Placeholder: hip hinge patterning and hamstring care.'),
      moderate: tier('Placeholder: moderate posterior tilt.', 'Placeholder: glute activation and thoracic mobility.'),
      significant: tier('Placeholder: strong posterior tilt.', 'Placeholder: coach-led lumbopelvic reset.'),
    },
  },
  lateral_pelvic_shift: {
    id: 'lateral_pelvic_shift',
    name: 'Lateral Pelvic Shift',
    views: ['front', 'back'],
    thresholds: { mild: 3, moderate: 6, significant: 10 },
    priority: 'high',
    feedback: {
      mild: tier('Placeholder: pelvis shifts slightly sideways.', 'Placeholder: single-leg stability and lateral core.'),
      moderate: tier('Placeholder: clear lateral shift.', 'Placeholder: step-downs and hip abductor strength.'),
      significant: tier('Placeholder: strong lateral shift.', 'Placeholder: gait and stance assessment with coach.'),
    },
  },
  left_knee_valgus: {
    id: 'left_knee_valgus',
    name: 'Left Knee Valgus',
    views: ['front'],
    thresholds: { mild: 2, moderate: 5, significant: 9 },
    priority: 'high',
    feedback: {
      mild: tier('Placeholder: left knee tracks slightly inward.', 'Placeholder: glute med activation and knee tracking cues.'),
      moderate: tier('Placeholder: visible left valgus.', 'Placeholder: lateral hip strength and ankle mobility.'),
      significant: tier('Placeholder: strong left valgus.', 'Placeholder: reduce valgus load in squat/lunge until improved.'),
    },
  },
  right_knee_valgus: {
    id: 'right_knee_valgus',
    name: 'Right Knee Valgus',
    views: ['front'],
    thresholds: { mild: 2, moderate: 5, significant: 9 },
    priority: 'high',
    feedback: {
      mild: tier('Placeholder: right knee tracks slightly inward.', 'Placeholder: glute med activation and knee tracking cues.'),
      moderate: tier('Placeholder: visible right valgus.', 'Placeholder: lateral hip strength and ankle mobility.'),
      significant: tier('Placeholder: strong right valgus.', 'Placeholder: reduce valgus load in squat/lunge until improved.'),
    },
  },
  left_knee_varus: {
    id: 'left_knee_varus',
    name: 'Left Knee Varus',
    views: ['front'],
    thresholds: { mild: 2, moderate: 5, significant: 9 },
    priority: 'medium',
    feedback: {
      mild: tier('Placeholder: mild left varus tendency.', 'Placeholder: lateral chain mobility check.'),
      moderate: tier('Placeholder: visible left varus.', 'Placeholder: hip external rotation control.'),
      significant: tier('Placeholder: strong left varus.', 'Placeholder: coach review of loading patterns.'),
    },
  },
  right_knee_varus: {
    id: 'right_knee_varus',
    name: 'Right Knee Varus',
    views: ['front'],
    thresholds: { mild: 2, moderate: 5, significant: 9 },
    priority: 'medium',
    feedback: {
      mild: tier('Placeholder: mild right varus tendency.', 'Placeholder: lateral chain mobility check.'),
      moderate: tier('Placeholder: visible right varus.', 'Placeholder: hip external rotation control.'),
      significant: tier('Placeholder: strong right varus.', 'Placeholder: coach review of loading patterns.'),
    },
  },
  spinal_lateral_shift: {
    id: 'spinal_lateral_shift',
    name: 'Spinal Lateral Shift',
    views: ['front', 'back'],
    thresholds: { mild: 4, moderate: 8, significant: 14 },
    priority: 'high',
    feedback: {
      mild: tier('Placeholder: mild lateral trunk shift.', 'Placeholder: core bracing and unilateral carries.'),
      moderate: tier('Placeholder: noticeable lateral shift.', 'Placeholder: assess rotation and hip hike patterns.'),
      significant: tier('Placeholder: marked lateral shift.', 'Placeholder: structured scoliosis-aware screening with coach.'),
    },
  },
  uneven_hip_height: {
    id: 'uneven_hip_height',
    name: 'Uneven Hip Height',
    views: ['front', 'back'],
    thresholds: { mild: 0.5, moderate: 1.0, significant: 1.5 },
    priority: 'medium',
    feedback: {
      mild: tier('Placeholder: small hip height difference.', 'Placeholder: single-leg work and QL care.'),
      moderate: tier('Placeholder: visible hip height difference.', 'Placeholder: assess leg length and daily stance.'),
      significant: tier('Placeholder: large hip height difference.', 'Placeholder: referral pathway if pain or limp.'),
    },
  },
  forward_trunk_lean: {
    id: 'forward_trunk_lean',
    name: 'Forward Trunk Lean',
    views: ['side-left', 'side-right'],
    thresholds: { mild: 0.02, moderate: 0.045, significant: 0.08 },
    priority: 'medium',
    feedback: {
      mild: tier('Placeholder: trunk sits slightly forward over feet.', 'Placeholder: ankle mobility and hip hinge drills.'),
      moderate: tier('Placeholder: noticeable forward lean.', 'Placeholder: core anti-extension and calf length.'),
      significant: tier('Placeholder: strong forward lean.', 'Placeholder: full kinetic chain assessment.'),
    },
  },
  ankle_pronation_left: {
    id: 'ankle_pronation_left',
    name: 'Left Ankle Pronation',
    views: ['front', 'back'],
    thresholds: { mild: 4, moderate: 7, significant: 11 },
    priority: 'low',
    feedback: {
      mild: tier('Placeholder: left arch shows mild collapse pattern.', 'Placeholder: short-foot drill and hip control.'),
      moderate: tier('Placeholder: visible left pronation.', 'Placeholder: single-leg balance and tibialis strength.'),
      significant: tier('Placeholder: strong left pronation.', 'Placeholder: footwear review and progressive foot strength.'),
    },
  },
  ankle_pronation_right: {
    id: 'ankle_pronation_right',
    name: 'Right Ankle Pronation',
    views: ['front', 'back'],
    thresholds: { mild: 4, moderate: 7, significant: 11 },
    priority: 'low',
    feedback: {
      mild: tier('Placeholder: right arch shows mild collapse pattern.', 'Placeholder: short-foot drill and hip control.'),
      moderate: tier('Placeholder: visible right pronation.', 'Placeholder: single-leg balance and tibialis strength.'),
      significant: tier('Placeholder: strong right pronation.', 'Placeholder: footwear review and progressive foot strength.'),
    },
  },
} as const satisfies Record<string, PostureFeedbackDefinition>;

export type PostureFeedbackLibraryId = keyof typeof POSTURE_FEEDBACK_LIBRARY;

export function getPostureFeedbackDefinition(id: string): PostureFeedbackDefinition | undefined {
  return POSTURE_FEEDBACK_LIBRARY[id as PostureFeedbackLibraryId];
}
