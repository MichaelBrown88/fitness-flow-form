/**
 * Deterministic client-facing copy + thresholds for posture scan findings.
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
      mild: tier(
        'Your head sits slightly ahead of your shoulders — common with desk work and phone use.',
        'Chin tucks, upper-back mobility, and screen height so your ears stack over your shoulders.',
      ),
      moderate: tier(
        'A clear forward-head position adds load on the neck and upper back.',
        'Prioritise deep neck flexor endurance, thoracic extension, and breaks from prolonged sitting.',
      ),
      significant: tier(
        'A pronounced forward-head posture can contribute to neck tension and upper-back fatigue.',
        'A structured neck and upper-back plan with your coach before heavy overhead loading.',
      ),
    },
  },
  head_pitch_up: {
    id: 'head_pitch_up',
    name: 'Head Pitch Up',
    views: ['side-left', 'side-right'],
    thresholds: { mild: 12, moderate: 22, significant: 35 },
    priority: 'medium',
    feedback: {
      mild: tier(
        'Your chin lifts slightly, which can shorten muscles at the front of the neck.',
        'Cue a soft nod to level your gaze and practise relaxed neck positioning.',
      ),
      moderate: tier(
        'An upward head tilt is visible — often linked to tight chest/neck and weak deep neck flexors.',
        'Deep neck flexor work, desk ergonomics, and thoracic mobility in warm-ups.',
      ),
      significant: tier(
        'A strong upward head tilt increases strain through the cervical spine.',
        'Guided positioning drills and progressive neck endurance with your coach.',
      ),
    },
  },
  rounded_shoulders: {
    id: 'rounded_shoulders',
    name: 'Rounded Shoulders',
    views: ['side-left', 'side-right'],
    thresholds: { mild: 0.02, moderate: 0.04, significant: 0.07 },
    priority: 'high',
    feedback: {
      mild: tier(
        'Mild shoulder rounding — shoulders sit slightly forward of your ribcage.',
        'Thoracic extension, pec mobility, and rowing patterns in your programme.',
      ),
      moderate: tier(
        'Moderate rounding pulls the shoulder girdle forward and can limit overhead reach.',
        'Rows, face pulls, and scapular control work on most training days.',
      ),
      significant: tier(
        'Marked rounding often pairs with tight chest and a stiff upper back.',
        'A focused upper-back and shoulder programme before max-effort pressing.',
      ),
    },
  },
  shoulder_asymmetry: {
    id: 'shoulder_asymmetry',
    name: 'Shoulder Asymmetry',
    views: ['front', 'back'],
    thresholds: { mild: 0.4, moderate: 0.8, significant: 1.2 },
    priority: 'medium',
    feedback: {
      mild: tier(
        'One shoulder sits slightly higher than the other.',
        'Balance unilateral activation and stretching so both sides share the load.',
      ),
      moderate: tier(
        'A visible height difference between shoulders — worth tracking over time.',
        'Review daily habits (bag, mouse hand, sport dominance) and add unilateral strength.',
      ),
      significant: tier(
        'A marked shoulder imbalance can affect pressing, pulling, and posture.',
        'Coach-led assessment of rib position, rotation, and side-dominant patterns.',
      ),
    },
  },
  anterior_pelvic_tilt: {
    id: 'anterior_pelvic_tilt',
    name: 'Anterior Pelvic Tilt',
    views: ['side-left', 'side-right'],
    thresholds: { mild: 5, moderate: 12, significant: 20 },
    priority: 'high',
    feedback: {
      mild: tier(
        'A mild forward tilt of the pelvis — common and not always problematic on its own.',
        'Glute and core endurance plus hip-flexor length in your warm-up routine.',
      ),
      moderate: tier(
        'A moderate anterior tilt can pair with an arched lower back in standing.',
        'Breathing drills, hip-flexor stretching, and glute-focused strength work.',
      ),
      significant: tier(
        'A strong anterior tilt increases extension through the lower back during standing and lifting.',
        'A structured lumbopelvic programme before heavy squats and hinges.',
      ),
    },
  },
  posterior_pelvic_tilt: {
    id: 'posterior_pelvic_tilt',
    name: 'Posterior Pelvic Tilt',
    views: ['side-left', 'side-right'],
    thresholds: { mild: 5, moderate: 12, significant: 20 },
    priority: 'medium',
    feedback: {
      mild: tier(
        'A slight backward tilt of the pelvis — sometimes seen with tight hamstrings.',
        'Hip-hinge patterning, hamstring care, and glute activation before loading.',
      ),
      moderate: tier(
        'A noticeable posterior tilt can limit hip extension in walking and lifting.',
        'Glute activation, thoracic mobility, and gradual hip-extension drills.',
      ),
      significant: tier(
        'A strong posterior tilt may flatten the lower back and restrict hip movement.',
        'Coach-led reset of pelvic position with progressive hinge and squat work.',
      ),
    },
  },
  lateral_pelvic_shift: {
    id: 'lateral_pelvic_shift',
    name: 'Lateral Pelvic Shift',
    views: ['front', 'back'],
    thresholds: { mild: 3, moderate: 6, significant: 10 },
    priority: 'high',
    feedback: {
      mild: tier(
        'Your pelvis shifts slightly to one side when you stand — often a habit from how you bear weight.',
        'Single-leg stability, lateral core work, and even loading in daily stance.',
      ),
      moderate: tier(
        'A clear sideways shift can show up in squats, lunges, and how you stand at rest.',
        'Step-downs, hip abductor strength, and conscious weight distribution.',
      ),
      significant: tier(
        'A strong lateral shift suggests uneven hip and core control under load.',
        'Gait and stance review with your coach; build symmetry before heavy bilateral lifts.',
      ),
    },
  },
  left_knee_valgus: {
    id: 'left_knee_valgus',
    name: 'Left Knee Valgus',
    views: ['front'],
    thresholds: { mild: 2, moderate: 5, significant: 9 },
    priority: 'high',
    feedback: {
      mild: tier(
        'The left knee tracks slightly inward during movement — early coaching cue territory.',
        'Glute med activation, knee-over-toe alignment, and controlled squats.',
      ),
      moderate: tier(
        'Visible inward collapse on the left — increases stress on the knee and hip.',
        'Lateral hip strength, ankle mobility, and tempo work on split squats.',
      ),
      significant: tier(
        'A strong inward collapse on the left — reduce depth or load until tracking improves.',
        'Regression to bodyweight patterns and targeted hip control before progressing load.',
      ),
    },
  },
  right_knee_valgus: {
    id: 'right_knee_valgus',
    name: 'Right Knee Valgus',
    views: ['front'],
    thresholds: { mild: 2, moderate: 5, significant: 9 },
    priority: 'high',
    feedback: {
      mild: tier(
        'The right knee tracks slightly inward during movement.',
        'Glute med activation, knee-over-toe alignment, and controlled squats.',
      ),
      moderate: tier(
        'Visible inward collapse on the right — worth addressing before adding load.',
        'Lateral hip strength, ankle mobility, and tempo work on split squats.',
      ),
      significant: tier(
        'A strong inward collapse on the right — ease depth on squats and lunges until control improves.',
        'Bodyweight progressions and hip control work with your coach.',
      ),
    },
  },
  left_knee_varus: {
    id: 'left_knee_varus',
    name: 'Left Knee Varus',
    views: ['front'],
    thresholds: { mild: 2, moderate: 5, significant: 9 },
    priority: 'medium',
    feedback: {
      mild: tier(
        'A mild outward bow at the left knee — may be structural or habitual.',
        'Check lateral hip and ankle mobility; avoid forcing the knee inward.',
      ),
      moderate: tier(
        'Visible varus alignment on the left during standing or squatting.',
        'Hip external-rotation control and balanced loading in single-leg work.',
      ),
      significant: tier(
        'A marked varus pattern on the left — your coach will review loading and footwear.',
        'Structured lower-limb assessment before high-impact or heavy squat volume.',
      ),
    },
  },
  right_knee_varus: {
    id: 'right_knee_varus',
    name: 'Right Knee Varus',
    views: ['front'],
    thresholds: { mild: 2, moderate: 5, significant: 9 },
    priority: 'medium',
    feedback: {
      mild: tier(
        'A mild outward bow at the right knee.',
        'Lateral chain mobility and hip control on single-leg exercises.',
      ),
      moderate: tier(
        'Visible varus alignment on the right.',
        'Hip external-rotation control and even loading between sides.',
      ),
      significant: tier(
        'A marked varus pattern on the right.',
        'Coach review of squat stance, footwear, and progressive loading.',
      ),
    },
  },
  spinal_lateral_shift: {
    id: 'spinal_lateral_shift',
    name: 'Spinal Lateral Shift',
    views: ['front', 'back'],
    thresholds: { mild: 4, moderate: 8, significant: 14 },
    priority: 'high',
    feedback: {
      mild: tier(
        'Your trunk leans slightly to one side — often linked to how you stand or sit.',
        'Core bracing, carries on both sides, and awareness of midline position.',
      ),
      moderate: tier(
        'A noticeable side shift through the spine or ribs when standing.',
        'Assess rotation, hip hike, and daily asymmetries with your coach.',
      ),
      significant: tier(
        'A marked lateral shift — monitor over repeat scans and adjust loading if pain appears.',
        'Structured follow-up on spinal positioning, breathing, and unilateral strength.',
      ),
    },
  },
  uneven_hip_height: {
    id: 'uneven_hip_height',
    name: 'Uneven Hip Height',
    views: ['front', 'back'],
    thresholds: { mild: 0.5, moderate: 1.0, significant: 1.5 },
    priority: 'medium',
    feedback: {
      mild: tier(
        'A small difference in hip height — common and not always clinically significant.',
        'Single-leg work and side-core care to keep both hips level under load.',
      ),
      moderate: tier(
        'A visible hip height difference — consider leg dominance and daily posture.',
        'Assess stance habits, unilateral strength, and whether one side fatigues faster.',
      ),
      significant: tier(
        'A large hip height difference — discuss with your coach, especially if you have pain or a limp.',
        'Further assessment of leg length, pelvic control, and referral if symptoms warrant.',
      ),
    },
  },
  forward_trunk_lean: {
    id: 'forward_trunk_lean',
    name: 'Forward Trunk Lean',
    views: ['side-left', 'side-right'],
    thresholds: { mild: 0.02, moderate: 0.045, significant: 0.08 },
    priority: 'medium',
    feedback: {
      mild: tier(
        'Your upper body sits slightly forward over your feet when standing.',
        'Ankle mobility, hip-hinge drills, and stacked posture when lifting.',
      ),
      moderate: tier(
        'A noticeable forward lean — can show up in squats and daily standing.',
        'Core anti-extension work, calf length, and squat technique review.',
      ),
      significant: tier(
        'A strong forward lean shifts load toward the toes and lower back.',
        'Full-chain movement screen with your coach before heavy compound lifts.',
      ),
    },
  },
  ankle_pronation_left: {
    id: 'ankle_pronation_left',
    name: 'Left Ankle Pronation',
    views: ['front', 'back'],
    thresholds: { mild: 4, moderate: 7, significant: 11 },
    priority: 'low',
    feedback: {
      mild: tier(
        'The left arch shows a mild collapse pattern when weight-bearing.',
        'Short-foot drills, hip control, and supportive footwear when needed.',
      ),
      moderate: tier(
        'Visible pronation on the left — can affect knee tracking upstream.',
        'Single-leg balance, tibialis strength, and gradual foot conditioning.',
      ),
      significant: tier(
        'Strong pronation on the left — footwear and foot strength are priorities.',
        'Progressive foot and ankle programme; review shoes for your activity level.',
      ),
    },
  },
  ankle_pronation_right: {
    id: 'ankle_pronation_right',
    name: 'Right Ankle Pronation',
    views: ['front', 'back'],
    thresholds: { mild: 4, moderate: 7, significant: 11 },
    priority: 'low',
    feedback: {
      mild: tier(
        'The right arch shows a mild collapse pattern when weight-bearing.',
        'Short-foot drills, hip control, and supportive footwear when needed.',
      ),
      moderate: tier(
        'Visible pronation on the right.',
        'Single-leg balance, tibialis strength, and gradual foot conditioning.',
      ),
      significant: tier(
        'Strong pronation on the right.',
        'Footwear review and a progressive foot and ankle strength plan.',
      ),
    },
  },
} as const satisfies Record<string, PostureFeedbackDefinition>;

export type PostureFeedbackLibraryId = keyof typeof POSTURE_FEEDBACK_LIBRARY;

export function getPostureFeedbackDefinition(id: string): PostureFeedbackDefinition | undefined {
  return POSTURE_FEEDBACK_LIBRARY[id as PostureFeedbackLibraryId];
}
