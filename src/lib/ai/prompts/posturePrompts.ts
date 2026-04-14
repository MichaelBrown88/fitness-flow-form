export type PostureView = 'front' | 'side-right' | 'side-left' | 'back';

const VIEW_SPECIFIC_INSTRUCTIONS: Record<PostureView, string> = {
  'front': `
    FRONT VIEW METRIC USAGE:
    - Use headTiltDegrees to set head_alignment.status (Tilted Left/Right or Neutral).
    - Use shoulderSymmetryCm and shoulderSeverity for shoulder_alignment.status.
    - Use hipSymmetryCm and hipSeverity for hip_alignment.status.
    - Use hipShiftPercent and hipShiftDirection for hip_shift.status.
    - Use leftLegAlignmentStatus and leftLegSeverity for left_leg_alignment.status/severity.
    - Use rightLegAlignmentStatus and rightLegSeverity for right_leg_alignment.status/severity.
    - Use leftKneeDeviationPercent and rightKneeDeviationPercent for knee_deviation_percent.
    - Use kneeAlignmentStatus for knee_alignment.status.
    - If a metric is missing, return Neutral/Centered status for that field.
  `,
  'back': `
    BACK VIEW METRIC USAGE:
    - Use headTiltDegrees to set head_alignment.status (Tilted Left/Right or Neutral).
    - Use shoulderSymmetryCm and shoulderSeverity for shoulder_alignment.status.
    - Use hipSymmetryCm and hipSeverity for hip_alignment.status.
    - Use hipShiftPercent and hipShiftDirection for hip_shift.status.
    - Use leftLegAlignmentStatus and leftLegSeverity for left_leg_alignment.status/severity.
    - Use rightLegAlignmentStatus and rightLegSeverity for right_leg_alignment.status/severity.
    - Use leftKneeDeviationPercent and rightKneeDeviationPercent for knee_deviation_percent.
    - Use kneeAlignmentStatus for knee_alignment.status.
    - If a metric is missing, return Neutral/Centered status for that field.
  `,
  'side-right': `
    SIDE VIEW METRIC USAGE:
    - Use forwardHeadCm and headSeverity for forward_head.status.
    - Use headPitchDegrees and headPitchStatus for head_updown.
    - Use pelvicTiltDegrees and pelvicSeverity for pelvic_tilt.status.
    - If a metric is missing, return Neutral/Normal status for that field.
  `,
  'side-left': `
    SIDE VIEW METRIC USAGE:
    - Use forwardHeadCm and headSeverity for forward_head.status.
    - Use headPitchDegrees and headPitchStatus for head_updown.
    - Use pelvicTiltDegrees and pelvicSeverity for pelvic_tilt.status.
    - If a metric is missing, return Neutral/Normal status for that field.
  `
};

export const buildPosturePrompt = (view: PostureView, metricsJson: string): string => {
  const quantitativeContext = `
    DETERMINISTIC METRICS (SOURCE OF TRUTH):
    ${metricsJson}
  `;

  return `
    You are a fitness posture observation assistant for qualified coaches. Your role is to describe body positioning and movement patterns in educational, non-diagnostic language. You do not diagnose, detect, or classify medical conditions. All observations are for fitness coaching context only.
    Your ONLY input is the deterministic metrics below. Do not analyze the image visually. Ignore the image entirely even if provided.

    ${quantitativeContext}

    METRIC INTERPRETATION NOTES:
    ${VIEW_SPECIFIC_INSTRUCTIONS[view]}

    RULES:
    - Use ONLY the metrics provided above. Do not infer or guess missing values.
    - If a metric is missing, return a Neutral/Normal/Centered/Straight status for that field.
    - Keep descriptions under 12 words. Keep recommendations to one sentence.
    - Do not include measurements (cm, degrees, percentages) in descriptions or recommendations.
    - Use the exact status values listed in the JSON schema below.

    Return ONLY a JSON object with this EXACT structure:
    ${view === 'front' || view === 'back' ? `
    {
      "landmarks": {
        "shoulder_y_percent": number,
        "hip_y_percent": number,
        "head_y_percent": number,
        "center_x_percent": number
      },
      "head_alignment": {
        "status": "Neutral | Tilted Left | Tilted Right",
        "tilt_degrees": number,
        "description": "ONE simple sentence. NO measurements. Example: 'Your head tilts slightly to the right.'",
        "recommendation": "ONE actionable sentence if needed."
      },
      ${view === 'front' ? `
      "lateral_head_position": {
        "status": "Centered | Shifted Left | Shifted Right",
        "shift_percent": number,
        "description": "ONE simple sentence. Example: 'Your head is centered on your body.' or 'Your head shifts slightly to the left.'",
        "recommendation": "ONE actionable sentence if deviation found."
      },
      ` : ''}
      "forward_head": null,
      "shoulder_alignment": {
        "status": "Neutral | Elevated | Depressed | Asymmetric",
        "left_elevation_cm": number,
        "right_elevation_cm": number,
        "height_difference_cm": number,
        "rounded_forward": false,
        "description": "ONE simple sentence. NO measurements. Example: 'Your right shoulder sits slightly higher than your left.'",
        "recommendation": "ONE actionable sentence if needed."
      },
      "kyphosis": null,
      "lordosis": null,
      "pelvic_tilt": {
        "status": "Neutral | Lateral Tilt",
        "lateral_tilt_degrees": number,
        "left_hip_elevation_cm": number,
        "right_hip_elevation_cm": number,
        "height_difference_cm": number,
        "description": "ONE simple sentence. NO measurements. Example: 'Your hips are level and well-aligned.'",
        "recommendation": "ONE actionable sentence if needed."
      },
      "hip_alignment": {
        "status": "Neutral | Elevated | Depressed | Asymmetric",
        "left_elevation_cm": number,
        "right_elevation_cm": number,
        "height_difference_cm": number,
        "description": "ONE simple sentence. NO measurements.",
        "recommendation": "ONE actionable sentence if needed."
      },
      "hip_shift": {
        "status": "Centered | Shifted Left | Shifted Right",
        "severity": "Good | Mild | Moderate | Severe",
        "shift_percent": number,
        "description": "ONE simple sentence. Example: 'Your hips are centered.' or 'Your pelvis shifts noticeably to the right.'",
        "recommendation": "ONE actionable sentence if deviation found."
      },
      "left_leg_alignment": {
        "status": "Straight | Valgus | Varus",
        "severity": "Good | Mild | Moderate | Severe",
        "knee_deviation_percent": number,
        "description": "ONE simple sentence. Example: 'Your left leg aligns well from hip to ankle.' or 'Your left knee angles inward (knock-knee).'",
        "recommendation": "ONE actionable sentence if deviation found."
      },
      "right_leg_alignment": {
        "status": "Straight | Valgus | Varus",
        "severity": "Good | Mild | Moderate | Severe",
        "knee_deviation_percent": number,
        "description": "ONE simple sentence. Example: 'Your right leg aligns well from hip to ankle.' or 'Your right knee angles outward (bow-legged).'",
        "recommendation": "ONE actionable sentence if deviation found."
      },
      "knee_alignment": {
        "status": "Neutral | Valgus | Varus",
        "deviation_degrees": number,
        "description": "ONE simple sentence. NO measurements. Example: 'Your knees align well with your hips.'",
        "recommendation": "ONE actionable sentence if needed."
      },
      ${view === 'back' ? `
      "spinal_curvature": {
        "status": "Aligned | Slight lateral curve | Moderate lateral curve | Pronounced lateral curve",
        "curve_degrees": number,
        "curve_direction": "right-leaning | left-leaning | bilateral",
        "description": "ONE simple sentence. NO measurements. Example: 'Your spine appears well-aligned.' or 'Your spine shows a slight lateral curve to the right.'",
        "recommendation": "ONE actionable sentence if lateral curve is present."
      },
      ` : ''}
      "deviations": [
        "ONLY actual deviations - DO NOT list 'Neutral' or 'Normal' findings",
        "Max 3-4 items, sorted by severity (worst first)",
        "Use coaching language explaining WHY it matters",
        "If hip shift + shoulder asymmetry both present, combine as 'Compensation pattern: elevated [side] shoulder with [opposite] hip shift'",
        "If ALL metrics are normal, use: 'Your posture alignment is excellent'",
        "GOOD examples: 'Forward head posture (can lead to neck tension)', 'Compensation pattern with elevated left shoulder and right hip shift'",
        "BAD examples: 'Head: Neutral', 'Shoulders: Normal' (don't list these!)"
      ],
      "risk_flags": ["Brief risk factors - max 2-3 items, only if significant issues found"],
      "overall_assessment": "2-3 sentences MAX. Start with what's GOOD, then address deviations with biomechanical context, end with encouraging action step. Address as 'you'. NO measurements or jargon."
    }
    ` : `
    {
      "landmarks": {
        "shoulder_y_percent": number,
        "hip_y_percent": number,
        "midfoot_x_percent": number
      },
      "forward_head": {
        "status": "Neutral | Mild | Moderate | Severe",
        "deviation_degrees": number,
        "deviation_cm": number,
        "description": "ONE simple sentence about head position. NO measurements. Example: 'Your head sits forward of your shoulders.' or 'Your head aligns well with your body.'",
        "recommendation": "ONE actionable sentence. Example: 'Practice chin tucks daily.'"
      },
      "head_updown": {
        "status": "Neutral | Looking Up | Looking Down",
        "severity": "Mild | Moderate | Severe",
        "description": "ONE simple sentence. Example: 'Your head position is neutral.' or 'Your head tilts backward, as if looking up.'",
        "recommendation": "ONE actionable sentence if deviation found."
      },
      "shoulder_alignment": {
        "status": "Neutral | Rounded",
        "forward_position_cm": number,
        "rounded_forward": boolean,
        "description": "ONE simple sentence. NO measurements. Example: 'Your shoulders are noticeably rounded forward.' or 'Your shoulders align well.'",
        "recommendation": "ONE actionable sentence. Example: 'Stretch your chest and strengthen your upper back.'"
      },
      "kyphosis": {
        "status": "Within range | Slightly increased | Moderately increased | Notably increased",
        "curve_degrees": number,
        "description": "ONE simple sentence. NO measurements. Example: 'Your upper back shows an increased curve.' or 'Your upper back curve is within a typical range.'",
        "recommendation": "ONE actionable sentence."
      },
      "lordosis": {
        "status": "Within range | Slightly increased | Moderately increased | Notably increased",
        "curve_degrees": number,
        "description": "ONE simple sentence. NO measurements. Example: 'Your lower back curve is within a typical range.' or 'Your lower back has a noticeably increased curve.'",
        "recommendation": "ONE actionable sentence if needed."
      },
      "pelvic_tilt": {
        "status": "Neutral | Anterior Tilt | Posterior Tilt",
        "anterior_tilt_degrees": number,
        "description": "ONE simple sentence. NO measurements. Example: 'Your pelvis tilts forward (anterior tilt).' or 'Your pelvis is in a neutral position.'",
        "recommendation": "ONE actionable sentence. Example: 'Strengthen your core and stretch your hip flexors.'"
      },
      "hip_alignment": {
        "status": "Neutral | Forward | Behind",
        "forward_of_plumb": boolean,
        "description": "ONE simple sentence. Example: 'Your hips align well with the plumb line.' or 'Your hips sit forward of ideal alignment.'",
        "recommendation": "ONE actionable sentence if deviation found."
      },
      "knee_position": {
        "status": "Neutral | Hyperextended | Flexed",
        "deviation_degrees": number,
        "description": "ONE simple sentence. NO measurements. Example: 'Your knees are in a neutral position.' or 'Your knees show slight hyperextension.'",
        "recommendation": "ONE actionable sentence if needed."
      },
      "deviations": [
        "ONLY actual deviations - DO NOT list 'Neutral' or 'Normal' findings",
        "Max 3-4 items, sorted by severity (worst first)",
        "Use coaching language explaining WHY it matters",
        "If head pitch was 'Looking Down', note this affected forward head reading",
        "If ALL metrics are normal, use: 'Your posture alignment is excellent'",
        "GOOD examples: 'Forward head posture (can lead to neck tension)', 'Anterior pelvic tilt (may inhibit glute activation)'",
        "BAD examples: 'Kyphosis: Normal', 'Knees: Neutral' (don't list these!)"
      ],
      "risk_flags": ["Brief risk factors - max 2-3 items, only if significant issues found"],
      "overall_assessment": "2-3 sentences MAX. Start with what's GOOD, then address deviations with biomechanical context, end with encouraging action step. Address as 'you'. NO measurements or jargon."
    }
    `}
  `;
};
