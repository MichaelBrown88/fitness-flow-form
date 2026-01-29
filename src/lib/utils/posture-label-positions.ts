/**
 * POSTURE LABEL POSITIONS
 * Maps deviation keys to their visual position on the body image.
 * Uses percentage-based positioning for responsive design.
 * 
 * Position format:
 * - top: Y position as % from top (0-100)
 * - left/right: X position from edge as % (0-100)
 * - align: Which side of the image the label appears on
 */

export interface LabelPosition {
  top: number;        // Y position as % from top
  left?: number;      // X position from left edge (if align is 'left')
  right?: number;     // X position from right edge (if align is 'right')
  align: 'left' | 'right'; // Which side label appears on
  anchorPoint?: {     // Optional: where to draw line from label to body
    top: number;
    left: number;
  };
}

export interface DeviationLabelConfig {
  key: string;
  label: string;           // Short heading
  position: LabelPosition;
}

// Front View - Labels positioned on sides pointing to body parts
export const FRONT_VIEW_POSITIONS: Record<string, DeviationLabelConfig> = {
  head_alignment: {
    key: 'head_alignment',
    label: 'Head Tilt',
    position: { top: 8, right: 5, align: 'right', anchorPoint: { top: 12, left: 50 } }
  },
  lateral_head_position: {
    key: 'lateral_head_position',
    label: 'Head Position',
    position: { top: 8, left: 5, align: 'left', anchorPoint: { top: 12, left: 50 } }
  },
  shoulder_alignment: {
    key: 'shoulder_alignment',
    label: 'Shoulders',
    position: { top: 22, left: 5, align: 'left', anchorPoint: { top: 25, left: 35 } }
  },
  hip_alignment: {
    key: 'hip_alignment',
    label: 'Hips',
    position: { top: 45, right: 5, align: 'right', anchorPoint: { top: 48, left: 55 } }
  },
  hip_shift: {
    key: 'hip_shift',
    label: 'Hip Shift',
    position: { top: 50, left: 5, align: 'left', anchorPoint: { top: 50, left: 50 } }
  },
  pelvic_tilt: {
    key: 'pelvic_tilt',
    label: 'Pelvis',
    position: { top: 52, right: 5, align: 'right', anchorPoint: { top: 52, left: 50 } }
  },
  left_leg_alignment: {
    key: 'left_leg_alignment',
    label: 'Left Knee',
    position: { top: 68, left: 5, align: 'left', anchorPoint: { top: 68, left: 40 } }
  },
  right_leg_alignment: {
    key: 'right_leg_alignment',
    label: 'Right Knee',
    position: { top: 68, right: 5, align: 'right', anchorPoint: { top: 68, left: 60 } }
  },
  knee_alignment: {
    key: 'knee_alignment',
    label: 'Knees',
    position: { top: 72, left: 5, align: 'left', anchorPoint: { top: 72, left: 50 } }
  }
};

// Back View - Similar to front but includes spinal curvature
export const BACK_VIEW_POSITIONS: Record<string, DeviationLabelConfig> = {
  head_alignment: {
    key: 'head_alignment',
    label: 'Head Tilt',
    position: { top: 8, right: 5, align: 'right', anchorPoint: { top: 12, left: 50 } }
  },
  shoulder_alignment: {
    key: 'shoulder_alignment',
    label: 'Shoulders',
    position: { top: 22, left: 5, align: 'left', anchorPoint: { top: 25, left: 35 } }
  },
  spinal_curvature: {
    key: 'spinal_curvature',
    label: 'Spine',
    position: { top: 35, right: 5, align: 'right', anchorPoint: { top: 38, left: 50 } }
  },
  hip_alignment: {
    key: 'hip_alignment',
    label: 'Hips',
    position: { top: 45, left: 5, align: 'left', anchorPoint: { top: 48, left: 45 } }
  },
  hip_shift: {
    key: 'hip_shift',
    label: 'Hip Shift',
    position: { top: 50, right: 5, align: 'right', anchorPoint: { top: 50, left: 50 } }
  },
  pelvic_tilt: {
    key: 'pelvic_tilt',
    label: 'Pelvis',
    position: { top: 52, left: 5, align: 'left', anchorPoint: { top: 52, left: 50 } }
  },
  left_leg_alignment: {
    key: 'left_leg_alignment',
    label: 'Left Knee',
    position: { top: 68, right: 5, align: 'right', anchorPoint: { top: 68, left: 60 } }  // Mirrored from front
  },
  right_leg_alignment: {
    key: 'right_leg_alignment',
    label: 'Right Knee',
    position: { top: 68, left: 5, align: 'left', anchorPoint: { top: 68, left: 40 } }  // Mirrored from front
  },
  knee_alignment: {
    key: 'knee_alignment',
    label: 'Knees',
    position: { top: 72, right: 5, align: 'right', anchorPoint: { top: 72, left: 50 } }
  }
};

// Side View (Left) - Labels along sagittal plane
export const SIDE_LEFT_VIEW_POSITIONS: Record<string, DeviationLabelConfig> = {
  forward_head: {
    key: 'forward_head',
    label: 'Forward Head',
    position: { top: 8, left: 5, align: 'left', anchorPoint: { top: 12, left: 40 } }
  },
  head_updown: {
    key: 'head_updown',
    label: 'Head Tilt',
    position: { top: 12, right: 5, align: 'right', anchorPoint: { top: 14, left: 45 } }
  },
  shoulder_alignment: {
    key: 'shoulder_alignment',
    label: 'Shoulders',
    position: { top: 24, left: 5, align: 'left', anchorPoint: { top: 26, left: 45 } }
  },
  kyphosis: {
    key: 'kyphosis',
    label: 'Upper Back',
    position: { top: 30, right: 5, align: 'right', anchorPoint: { top: 32, left: 55 } }
  },
  lordosis: {
    key: 'lordosis',
    label: 'Lower Back',
    position: { top: 42, right: 5, align: 'right', anchorPoint: { top: 45, left: 52 } }
  },
  pelvic_tilt: {
    key: 'pelvic_tilt',
    label: 'Pelvis',
    position: { top: 50, left: 5, align: 'left', anchorPoint: { top: 52, left: 48 } }
  },
  hip_alignment: {
    key: 'hip_alignment',
    label: 'Hip Position',
    position: { top: 48, right: 5, align: 'right', anchorPoint: { top: 50, left: 50 } }
  },
  knee_position: {
    key: 'knee_position',
    label: 'Knee',
    position: { top: 70, left: 5, align: 'left', anchorPoint: { top: 72, left: 48 } }
  }
};

// Side View (Right) - Mirror of left
export const SIDE_RIGHT_VIEW_POSITIONS: Record<string, DeviationLabelConfig> = {
  forward_head: {
    key: 'forward_head',
    label: 'Forward Head',
    position: { top: 8, right: 5, align: 'right', anchorPoint: { top: 12, left: 60 } }
  },
  head_updown: {
    key: 'head_updown',
    label: 'Head Tilt',
    position: { top: 12, left: 5, align: 'left', anchorPoint: { top: 14, left: 55 } }
  },
  shoulder_alignment: {
    key: 'shoulder_alignment',
    label: 'Shoulders',
    position: { top: 24, right: 5, align: 'right', anchorPoint: { top: 26, left: 55 } }
  },
  kyphosis: {
    key: 'kyphosis',
    label: 'Upper Back',
    position: { top: 30, left: 5, align: 'left', anchorPoint: { top: 32, left: 45 } }
  },
  lordosis: {
    key: 'lordosis',
    label: 'Lower Back',
    position: { top: 42, left: 5, align: 'left', anchorPoint: { top: 45, left: 48 } }
  },
  pelvic_tilt: {
    key: 'pelvic_tilt',
    label: 'Pelvis',
    position: { top: 50, right: 5, align: 'right', anchorPoint: { top: 52, left: 52 } }
  },
  hip_alignment: {
    key: 'hip_alignment',
    label: 'Hip Position',
    position: { top: 48, left: 5, align: 'left', anchorPoint: { top: 50, left: 50 } }
  },
  knee_position: {
    key: 'knee_position',
    label: 'Knee',
    position: { top: 70, right: 5, align: 'right', anchorPoint: { top: 72, left: 52 } }
  }
};

/**
 * Get label positions for a specific view
 */
export function getLabelPositionsForView(view: 'front' | 'back' | 'side-left' | 'side-right'): Record<string, DeviationLabelConfig> {
  switch (view) {
    case 'front':
      return FRONT_VIEW_POSITIONS;
    case 'back':
      return BACK_VIEW_POSITIONS;
    case 'side-left':
      return SIDE_LEFT_VIEW_POSITIONS;
    case 'side-right':
      return SIDE_RIGHT_VIEW_POSITIONS;
    default:
      return FRONT_VIEW_POSITIONS;
  }
}

/**
 * Neutral statuses that should NOT show labels
 */
export const NEUTRAL_STATUSES = [
  'Neutral',
  'Normal',
  'Good',
  'Centered',
  'Straight',
  'Level'
];

/**
 * Check if a status indicates a deviation (not neutral)
 */
export function isDeviation(status: string | undefined): boolean {
  if (!status) return false;
  return !NEUTRAL_STATUSES.includes(status);
}
