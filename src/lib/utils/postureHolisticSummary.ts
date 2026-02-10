/**
 * HOLISTIC POSTURE SUMMARY
 * Analyzes patterns across all posture views and generates a cohesive narrative
 * that connects the dots between related deviations.
 */

import { PostureAnalysisResult } from '@/lib/ai/postureAnalysis';

export interface HolisticSummary {
  headline: string;          // Main takeaway (1 sentence)
  patterns: PatternFinding[]; // Connected findings
  priorityAction: string;    // Single most important recommendation
  positives: string[];       // What's working well
  narrative: string;         // Single paragraph summary
}

export interface PatternFinding {
  title: string;
  description: string;
  relatedDeviations: string[];
  recommendation?: string;
}

/**
 * Generate holistic summary from all posture analysis results
 */
export function generateHolisticSummary(
  results: Record<string, PostureAnalysisResult>
): HolisticSummary {
  const patterns: PatternFinding[] = [];
  const positives: string[] = [];
  
  const front = results['front'];
  const back = results['back'];
  const sideLeft = results['side-left'];
  const sideRight = results['side-right'];

  const frontLandmarks = front?.landmarks?.raw;
  const rotationIndicator = (() => {
    if (!frontLandmarks || frontLandmarks.length < 25) return null;
    const leftShoulder = frontLandmarks[11];
    const rightShoulder = frontLandmarks[12];
    const leftHip = frontLandmarks[23];
    const rightHip = frontLandmarks[24];
    if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) return null;

    const hipMidX = (leftHip.x + rightHip.x) / 2;
    const leftShoulderDist = Math.abs(leftShoulder.x - hipMidX);
    const rightShoulderDist = Math.abs(rightShoulder.x - hipMidX);
    const leftHipDist = Math.abs(leftHip.x - hipMidX);
    const rightHipDist = Math.abs(rightHip.x - hipMidX);

    const shoulderRatio = Math.min(leftShoulderDist, rightShoulderDist) / Math.max(leftShoulderDist, rightShoulderDist);
    const hipRatio = Math.min(leftHipDist, rightHipDist) / Math.max(leftHipDist, rightHipDist);

    const isRotation = shoulderRatio < 0.75 && hipRatio > 0.85;
    const rotatedToward = leftShoulderDist < rightShoulderDist ? 'left' : 'right';

    return { isRotation, rotatedToward };
  })();
  
  // --- PATTERN 1: Upper Crossed Syndrome ---
  // Forward head + rounded shoulders + kyphosis often occur together
  const hasForwardHead = sideLeft?.forward_head?.status !== 'Neutral' || 
                         sideRight?.forward_head?.status !== 'Neutral';
  const hasRoundedShoulders = sideLeft?.shoulder_alignment?.rounded_forward || 
                              sideRight?.shoulder_alignment?.rounded_forward;
  const hasKyphosis = sideLeft?.kyphosis?.status !== 'Normal' || 
                      sideRight?.kyphosis?.status !== 'Normal';
  
  if ((hasForwardHead && hasRoundedShoulders) || (hasForwardHead && hasKyphosis) || (hasRoundedShoulders && hasKyphosis)) {
    patterns.push({
      title: 'Upper Body Pattern',
      description: 'Your head, shoulders, and upper back show signs of forward positioning. This is common from desk work and can create tension in your neck and upper back.',
      relatedDeviations: ['forward_head', 'shoulder_alignment', 'kyphosis'].filter(d => {
        if (d === 'forward_head') return hasForwardHead;
        if (d === 'shoulder_alignment') return hasRoundedShoulders;
        if (d === 'kyphosis') return hasKyphosis;
        return false;
      }),
      recommendation: 'Focus on chin tucks, chest stretches, and upper back strengthening (rows, face pulls).'
    });
  }
  
  // --- PATTERN 2: Lower Crossed Syndrome ---
  // Anterior pelvic tilt + lordosis + tight hip flexors
  const hasAnteriorTilt = sideLeft?.pelvic_tilt?.status === 'Anterior Tilt' || 
                          sideRight?.pelvic_tilt?.status === 'Anterior Tilt';
  const hasLordosis = sideLeft?.lordosis?.status !== 'Normal' || 
                      sideRight?.lordosis?.status !== 'Normal';
  
  if (hasAnteriorTilt || hasLordosis) {
    patterns.push({
      title: 'Lower Body Pattern',
      description: 'Your pelvis tilts forward with an increased lower back curve. This often indicates tight hip flexors and can affect how your glutes and core engage.',
      relatedDeviations: ['pelvic_tilt', 'lordosis'].filter(d => {
        if (d === 'pelvic_tilt') return hasAnteriorTilt;
        if (d === 'lordosis') return hasLordosis;
        return false;
      }),
      recommendation: 'Stretch your hip flexors daily and strengthen your glutes and core (dead bugs, bridges).'
    });
  }
  
  // --- PATTERN 3: Compensation Pattern (Lateral) ---
  // Hip shift in one direction + opposite shoulder elevation
  const frontHipShift = front?.hip_shift;
  const backHipShift = back?.hip_shift;
  const frontShoulder = front?.shoulder_alignment;
  const backShoulder = back?.shoulder_alignment;
  
  const hipShiftDirection = frontHipShift?.status !== 'Centered' ? frontHipShift?.status : 
                            backHipShift?.status !== 'Centered' ? backHipShift?.status : null;
  const hasShoulderAsymmetry = frontShoulder?.status === 'Asymmetric' || 
                               backShoulder?.status === 'Asymmetric';
  
  if (hipShiftDirection && hasShoulderAsymmetry) {
    // Classic compensation: hips shift one way, opposite shoulder elevates
    patterns.push({
      title: 'Compensation Pattern',
      description: `Your body shows a lateral compensation—your hips shift to one side while your shoulders adjust to maintain balance. This suggests your body may be favoring one side for stability.`,
      relatedDeviations: ['hip_shift', 'shoulder_alignment'],
      recommendation: 'Work on single-leg exercises (lunges, step-ups) to improve balance between sides.'
    });
  }
  
  // --- PATTERN 4: Scoliosis Indicator ---
  const hasSpinalCurve = back?.spinal_curvature?.status && 
                         back.spinal_curvature.status !== 'Normal';
  
  if (hasSpinalCurve) {
    patterns.push({
      title: 'Spinal Alignment',
      description: `Your spine shows a lateral curve. This may be structural or functional (from muscle imbalances). Core strengthening and flexibility work can help manage functional curves.`,
      relatedDeviations: ['spinal_curvature'],
      recommendation: 'Focus on core stability exercises that don\'t overload one side (planks, bird-dogs).'
    });
  }
  
  // --- PATTERN 5: Knee Alignment Issues ---
  const hasKneeIssue = front?.left_leg_alignment?.status !== 'Straight' || 
                       front?.right_leg_alignment?.status !== 'Straight' ||
                       back?.left_leg_alignment?.status !== 'Straight' ||
                       back?.right_leg_alignment?.status !== 'Straight';
  
  if (hasKneeIssue) {
    const leftStatus = front?.left_leg_alignment?.status || back?.left_leg_alignment?.status;
    const rightStatus = front?.right_leg_alignment?.status || back?.right_leg_alignment?.status;
    const isValgus = leftStatus === 'Valgus' || rightStatus === 'Valgus';
    
    patterns.push({
      title: 'Knee Tracking',
      description: isValgus 
        ? 'Your knees tend to angle inward. This can affect how force travels through your legs during movement and may increase stress on your knees.'
        : 'Your knee alignment shows some deviation from ideal tracking. This can affect your movement efficiency.',
      relatedDeviations: ['left_leg_alignment', 'right_leg_alignment', 'knee_alignment'],
      recommendation: isValgus 
        ? 'Strengthen your hip abductors (clamshells, side-lying leg raises) and focus on keeping knees tracking over toes during squats.'
        : 'Work on hip and ankle mobility, and practice squats in front of a mirror to monitor knee tracking.'
    });
  }

  // --- PATTERN 6: Rotation Indicator (Front vs Side Mismatch) ---
  if (rotationIndicator?.isRotation) {
    patterns.push({
      title: 'Rotation Check',
      description: `Your front view suggests a slight torso rotation toward the ${rotationIndicator.rotatedToward} side. This can exaggerate differences between left and right side profiles.`,
      relatedDeviations: ['front_view_rotation'],
      recommendation: 'Retake photos square to the camera, and prioritize balanced rotational stability work (pallof press, dead bug variations).'
    });
  }

  const leftFhp = sideLeft?.forward_head?.deviation_cm;
  const rightFhp = sideRight?.forward_head?.deviation_cm;
  const fhpDiff = leftFhp !== undefined && rightFhp !== undefined ? Math.abs(leftFhp - rightFhp) : null;

  if (fhpDiff !== null && fhpDiff > 2) {
    patterns.push({
      title: 'Side View Mismatch',
      description: rotationIndicator?.isRotation
        ? 'Your side views differ more than expected, which often happens when the torso is rotated during capture.'
        : 'Your side views show different forward-head readings, which suggests an asymmetry in how you carry your head.',
      relatedDeviations: ['forward_head'],
      recommendation: 'Aim for a neutral head position and re-check both sides to confirm symmetry.'
    });
  }
  
  // --- COLLECT POSITIVES ---
  if (!hasForwardHead) {
    positives.push('Your head position is well-aligned');
  }
  if (!hasRoundedShoulders && !hasKyphosis) {
    positives.push('Your upper back and shoulders show good alignment');
  }
  if (!hasAnteriorTilt && !hasLordosis) {
    positives.push('Your pelvis and lower back are in a neutral position');
  }
  if (!hipShiftDirection && !hasShoulderAsymmetry) {
    positives.push('Your left-right balance is symmetrical');
  }
  
  // --- GENERATE HEADLINE ---
  let headline: string;
  if (patterns.length === 0) {
    headline = 'Your posture shows excellent alignment across all views. Keep up the great work!';
  } else if (patterns.length === 1) {
    headline = `We identified one main area to focus on: ${patterns[0].title.toLowerCase()}.`;
  } else {
    const mainPatterns = patterns.slice(0, 2).map(p => p.title.toLowerCase()).join(' and ');
    headline = `Your assessment highlights ${mainPatterns} as key areas for improvement.`;
  }
  
  // --- DETERMINE PRIORITY ACTION ---
  let priorityAction: string;
  if (patterns.length === 0) {
    priorityAction = 'Maintain your current routine and focus on balanced strength training.';
  } else {
    // Prioritize: Upper body > Lower body > Compensation > Knee
    const upperPattern = patterns.find(p => p.title === 'Upper Body Pattern');
    const lowerPattern = patterns.find(p => p.title === 'Lower Body Pattern');
    
    if (upperPattern && upperPattern.recommendation) {
      priorityAction = upperPattern.recommendation;
    } else if (lowerPattern && lowerPattern.recommendation) {
      priorityAction = lowerPattern.recommendation;
    } else if (patterns[0]?.recommendation) {
      priorityAction = patterns[0].recommendation;
    } else {
      priorityAction = 'Focus on core stability and balanced strength training.';
    }
  }

  const narrative = (() => {
    if (patterns.length === 0) {
      return 'Your posture shows good alignment across all views with no significant deviations noted.';
    }

    const positiveSentence = positives.length > 0
      ? `On the positive side, ${positives.slice(0, 2).join(', ')}. `
      : '';

    const issueSentence = patterns.map(p => p.description).join(' ');
    return `${positiveSentence}${issueSentence}`;
  })();
  
  return {
    headline,
    patterns,
    priorityAction,
    positives,
    narrative
  };
}

/**
 * Get severity color class based on number of patterns found
 */
export function getSeverityColor(patternCount: number): string {
  if (patternCount === 0) return 'text-score-green-fg';
  if (patternCount === 1) return 'text-score-amber-fg';
  return 'text-score-red-fg';
}

/**
 * Get severity background class
 */
export function getSeverityBgClass(patternCount: number): string {
  if (patternCount === 0) return 'bg-score-green-light border-score-green-muted';
  if (patternCount === 1) return 'bg-score-amber-light border-score-amber-muted';
  return 'bg-score-red-light border-score-red-muted';
}
