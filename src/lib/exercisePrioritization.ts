import type { FormData } from '@/contexts/FormContext';
import type { ScoreSummary } from './scoring';
import type { CoachPlan } from './recommendations';
import { MOVEMENT_LOGIC_DB } from './clinical-data';

export type ExercisePriority = 'critical' | 'goal-focused' | 'important' | 'minor';

export type PrioritizedExercise = {
  name: string;
  setsReps?: string;
  notes?: string;
  priority: ExercisePriority;
  reason: string; // Why this exercise is needed
  sessionTypes: string[]; // Which session types this fits: 'pull', 'push', 'legs', 'upper-body', 'lower-body', 'full-body'
  addresses: string[]; // What issues this addresses
};

export type ExerciseGroup = {
  priority: ExercisePriority;
  title: string;
  description: string;
  exercises: PrioritizedExercise[];
  urgency: 'urgent' | 'important' | 'moderate' | 'low';
};

export type SessionGroup = {
  sessionType: string; // 'pull', 'push', 'legs', 'upper-body', 'lower-body', 'full-body'
  exercises: PrioritizedExercise[];
};

/**
 * Comprehensive exercise prioritization system
 * Priority order:
 * 1. Critical: Health risks, high injury risk (obesity, severe postural issues)
 * 2. Goal-focused: Exercises directly supporting client goals
 * 3. Important: Significant issues that need attention but aren't urgent
 * 4. Minor: Small corrections and optimizations
 */
export function prioritizeExercises(
  form: FormData,
  scores: ScoreSummary,
  plan: CoachPlan
): {
  groups: ExerciseGroup[];
  bySession: SessionGroup[];
  criticalIssues: string[];
  goalExercises: string[];
  importantIssues: string[];
  minorIssues: string[];
} {
  const critical: PrioritizedExercise[] = [];
  const goalFocused: PrioritizedExercise[] = [];
  const important: PrioritizedExercise[] = [];
  const minor: PrioritizedExercise[] = [];
  
  const criticalIssues: string[] = [];
  const goalExercises: string[] = [];
  const importantIssues: string[] = [];
  const minorIssues: string[] = [];

  const gender = (form.gender || '').toLowerCase();
  const bf = parseFloat(form.inbodyBodyFatPct || '0');
  const visceral = parseFloat(form.visceralFatLevel || '0');
  const w = parseFloat(form.inbodyWeightKg || '0');
  const h = (parseFloat(form.heightCm || '0') || 0) / 100;
  const healthyMax = h > 0 ? 25 * h * h : 0;
  const bmi = h > 0 ? w / (h * h) : 0;
  
  const goals = Array.isArray(form.clientGoals) ? form.clientGoals : [];
  const primaryGoal = goals[0] || 'general-health';
  
  const bodyCompScore = scores.categories.find(c => c.id === 'bodyComp')?.score || 0;
  const movementScore = scores.categories.find(c => c.id === 'movementQuality')?.score || 0;
  const strengthScore = scores.categories.find(c => c.id === 'strength')?.score || 0;
  const cardioScore = scores.categories.find(c => c.id === 'cardio')?.score || 0;

  // ============================================
  // PRIORITY 1: CRITICAL HEALTH/INJURY RISK
  // ============================================
  
  // Pain Flags (Highest Priority Safety Warning)
  const painMovements: string[] = [];
  if (form.ohsHasPain === 'yes') painMovements.push('Overhead Squat');
  if (form.hingeHasPain === 'yes') painMovements.push('Hip Hinge');
  if (form.lungeHasPain === 'yes') painMovements.push('Lunge');

  painMovements.forEach(m => {
    criticalIssues.push(`REPORTED PAIN during ${m} assessment.`);
    critical.push({
      name: `STOP: ${m} Loading`,
      priority: 'critical',
      reason: 'Pain reported during movement. Do not apply external load until cleared by a medical professional or physical therapist.',
      sessionTypes: ['full-body', 'strength'],
      addresses: ['pain', 'injury prevention']
    });
  });

  // Obesity / High body fat (critical health risk)
  if (bf > (gender === 'male' ? 30 : 38) || bmi > 35 || visceral >= 15) {
    criticalIssues.push('High body fat/obesity - significant health risk');
    critical.push({
      name: 'Zone 2 Cardio',
      setsReps: '20-40 min, 3-4x/week',
      notes: 'Low-intensity steady state to improve metabolic health',
      priority: 'critical',
      reason: 'Reducing body fat is critical for health and reduces injury risk',
      sessionTypes: ['full-body', 'cardio'],
      addresses: ['obesity', 'metabolic health', 'injury prevention']
    });
    critical.push({
      name: 'Walking / Daily Movement',
      setsReps: '6-10k steps/day',
      notes: 'Increase daily activity to support fat loss',
      priority: 'critical',
      reason: 'Low activity is a significant barrier to fat loss and overall health',
      sessionTypes: ['full-body', 'cardio'],
      addresses: ['obesity', 'metabolic health']
    });
  }
  
  // Severe postural issues (high injury risk)
  if (form.postureAiResults) {
    const ai = form.postureAiResults;
    const views = ['front', 'back', 'side-left', 'side-right'] as const;
    
    for (const view of views) {
      const analysis = ai[view];
      if (!analysis) continue;
      
      // Severe forward head (>15°)
      if (analysis.forward_head && analysis.forward_head.deviation_degrees > 15) {
        criticalIssues.push('Severe forward head posture - high neck/upper back injury risk');
        critical.push({
          name: 'Chin Tucks',
          setsReps: '3 x 10-15',
          notes: 'Slow, controlled - address forward head immediately',
          priority: 'critical',
          reason: 'Severe forward head increases injury risk and must be addressed first',
          sessionTypes: ['upper-body', 'pull', 'full-body'],
          addresses: ['forward head', 'neck pain', 'injury prevention']
        });
      }
      
      // Severe kyphosis (>60°)
      if (analysis.kyphosis && analysis.kyphosis.curve_degrees > 60) {
        criticalIssues.push('Severe thoracic kyphosis - high injury risk');
        critical.push({
          name: 'Thoracic Extensions',
          setsReps: '3 x 8-10',
          notes: 'Over foam roller - critical for reducing injury risk',
          priority: 'critical',
          reason: 'Severe kyphosis significantly increases injury risk',
          sessionTypes: ['upper-body', 'pull', 'full-body'],
          addresses: ['kyphosis', 'upper back pain', 'injury prevention']
        });
      }
      
      // Severe spinal curvature (scoliosis >20°)
      if (analysis.spinal_curvature && analysis.spinal_curvature.curve_degrees > 20) {
        criticalIssues.push(`Severe spinal curvature (${analysis.spinal_curvature.curve_degrees.toFixed(1)}°) - requires immediate attention`);
        critical.push({
          name: 'Side-Specific Core Stabilization',
          setsReps: '3 x 10-15/side',
          notes: 'Focus on strengthening the convex side of the curve',
          priority: 'critical',
          reason: 'Severe scoliosis significantly increases injury risk and requires targeted core stabilization',
          sessionTypes: ['full-body', 'core'],
          addresses: ['spinal curvature', 'scoliosis', 'injury prevention']
        });
      }

      // Severe head tilt (>10°)
      if (analysis.head_alignment && analysis.head_alignment.tilt_degrees > 10) {
        criticalIssues.push(`Severe head tilt (${analysis.head_alignment.tilt_degrees.toFixed(1)}°) - high neck/shoulder injury risk`);
        critical.push({
          name: 'Isolateral Neck Stabilization',
          setsReps: '3 x 10-12/side',
          notes: 'Gentle isometric holds to correct head tilt',
          priority: 'critical',
          reason: 'Severe head tilt can lead to chronic neck pain and shoulder compensation',
          sessionTypes: ['upper-body', 'full-body'],
          addresses: ['head tilt', 'neck pain', 'injury prevention']
        });
      }
    }
  }
  
  // Very low strength (high injury risk)
  if (strengthScore > 0 && strengthScore < 30) {
    criticalIssues.push('Very low strength - high injury risk with any loading');
    critical.push({
      name: 'Bodyweight Foundation',
      setsReps: '3 x 8-12',
      notes: 'Master bodyweight movements before adding load',
      priority: 'critical',
      reason: 'Must build foundational strength before loading to prevent injury',
      sessionTypes: ['full-body', 'strength'],
      addresses: ['strength', 'injury prevention']
    });
  }

  // ============================================
  // PRIORITY 2: GOAL-FOCUSED EXERCISES (All Goals)
  // ============================================
  
  goals.forEach(goal => {
    if (goal === 'weight-loss') {
      goalExercises.push('Weight loss');
      goalFocused.push({
        name: 'Metabolic Circuit Training',
        setsReps: '3-4 rounds, 30-45s work / 15s rest',
        notes: 'Supersets to maximize calorie burn',
        priority: 'goal-focused',
        reason: 'Directly supports weight loss goal through increased calorie expenditure',
        sessionTypes: ['full-body', 'cardio'],
        addresses: ['weight loss', 'calorie burn']
      });
      goalFocused.push({
        name: 'Zone 2 Cardio',
        setsReps: '30-45 min, 3-4x/week',
        notes: 'Builds aerobic base for fat loss',
        priority: 'goal-focused',
        reason: 'Essential for sustainable fat loss',
        sessionTypes: ['cardio', 'full-body'],
        addresses: ['weight loss', 'fat loss']
      });
    }
    
    if (goal === 'build-muscle' || goal === 'build-strength') {
      const isMuscle = goal === 'build-muscle';
      goalExercises.push(isMuscle ? 'Muscle building' : 'Strength building');
      
      // Personalized based on InBody SMM
      const smm = parseFloat(form.skeletalMuscleMassKg || '0');
      const weight = parseFloat(form.inbodyWeightKg || '0');
      const smmPct = weight > 0 ? (smm / weight) * 100 : 0;
      
      const repRange = isMuscle ? '8-12 reps' : '3-6 reps';
      const intensity = isMuscle ? 'Moderate intensity, high volume' : 'High intensity, moderate volume';

      goalFocused.push({
        name: isMuscle ? 'Hypertrophy-Focused Compound Lifts' : 'Absolute Strength Compound Lifts',
        setsReps: isMuscle ? `3-4 x 8-12` : `4-5 x 3-6`,
        notes: `Focus on ${isMuscle ? 'time under tension' : 'explosive concentric'} for ${isMuscle ? 'growth' : 'neuromuscular drive'}.`,
        priority: 'goal-focused',
        reason: `${isMuscle ? 'Hypertrophy' : 'Strength'} protocols tailored to your current muscle mass profile (${smmPct.toFixed(1)}% SMM).`,
        sessionTypes: ['full-body', 'legs', 'push', 'pull', 'strength'],
        addresses: [isMuscle ? 'muscle growth' : 'strength']
      });

      // Add specific lift variations based on goals
      if (isMuscle) {
        goalFocused.push({
          name: 'Mechanical Tension Isolation',
          setsReps: '3 x 12-15',
          notes: 'Target specific lagging muscle groups',
          priority: 'goal-focused',
          reason: 'Accessory work to drive local hypertrophy in addition to main lifts.',
          sessionTypes: ['upper-body', 'lower-body', 'push', 'pull'],
          addresses: ['muscle growth']
        });
      } else {
        goalFocused.push({
          name: 'Heavy Primary Lift Variation',
          setsReps: '3 x 5',
          notes: 'Focus on perfect technique under 80%+ 1RM load',
          priority: 'goal-focused',
          reason: 'Strength development requires specific heavy loading phases.',
          sessionTypes: ['strength', 'full-body'],
          addresses: ['strength']
        });
      }
    }
    
    if (goal === 'improve-fitness') {
      goalExercises.push('Fitness improvement');
      goalFocused.push({
        name: 'High Intensity Interval Training (HIIT)',
        setsReps: '6-8 x 2-4 min intervals',
        notes: 'Mix of Zone 2 and higher intensity',
        priority: 'goal-focused',
        reason: 'Improves cardiovascular fitness and VO2 max to move you toward "Elite" status.',
        sessionTypes: ['cardio', 'full-body'],
        addresses: ['fitness', 'cardio capacity']
      });
    }

    if (goal === 'improve-mobility') {
      goalExercises.push('Mobility improvement');
      goalFocused.push({
        name: 'Dynamic Joint Mobilization',
        setsReps: '2 x 10-12 reps',
        notes: 'Controlled Articular Rotations (CARs) for major joints',
        priority: 'goal-focused',
        reason: 'Systematic mobility work to improve active range of motion.',
        sessionTypes: ['full-body', 'upper-body', 'lower-body'],
        addresses: ['mobility', 'joint health']
      });
    }
  });

  // ============================================
  // INBODY-SPECIFIC PERSONALIZATION (Asymmetry & Distribution)
  // ============================================
  
  const ra = parseFloat(form.segmentalArmRightKg || '0');
  const la = parseFloat(form.segmentalArmLeftKg || '0');
  const rl = parseFloat(form.segmentalLegRightKg || '0');
  const ll = parseFloat(form.segmentalLegLeftKg || '0');
  const trunk = parseFloat(form.segmentalTrunkKg || '0');

  // Asymmetry Detection (>10% difference)
  if (ra > 0 && la > 0) {
    const armDiff = Math.abs(ra - la) / Math.max(ra, la);
    if (armDiff > 0.1) {
      importantIssues.push(`Significant arm muscle imbalance (${(armDiff * 100).toFixed(1)}%)`);
      important.push({
        name: 'Unilateral Upper Body Focus',
        setsReps: '3 x 10-12 per side',
        notes: 'Use dumbbells or cables to ensure equal loading and fix asymmetry',
        priority: 'important',
        reason: 'Dumbbell-only upper body work to correct the 10%+ muscle imbalance between arms.',
        sessionTypes: ['upper-body', 'push', 'pull'],
        addresses: ['muscle imbalance', 'asymmetry']
      });
    }
  }

  if (rl > 0 && ll > 0) {
    const legDiff = Math.abs(rl - ll) / Math.max(rl, ll);
    if (legDiff > 0.1) {
      importantIssues.push(`Significant leg muscle imbalance (${(legDiff * 100).toFixed(1)}%)`);
      important.push({
        name: 'Unilateral Lower Body Focus (Split Squats)',
        setsReps: '3 x 10-12 per side',
        notes: 'Prioritize the weaker leg to balance muscle mass',
        priority: 'important',
        reason: 'Single-leg variations (split squats, step-ups) to address the significant lower body asymmetry.',
        sessionTypes: ['lower-body', 'legs'],
        addresses: ['muscle imbalance', 'asymmetry']
      });
    }
  }

  // Trunk/Limb Distribution focus
  const totalLimbMuscle = ra + la + rl + ll;
  if (totalLimbMuscle > 0 && trunk > 0) {
    const trunkToLimbRatio = trunk / totalLimbMuscle;
    // Standard ratio is roughly 1.0 - 1.2. If trunk is significantly higher, focus on limbs.
    if (trunkToLimbRatio > 1.3) {
      minorIssues.push('Relatively higher trunk muscle mass vs limbs');
      minor.push({
        name: 'Isolation Limb Volume',
        setsReps: '2-3 x 12-15',
        notes: 'Add specific focus to arm/leg development',
        priority: 'minor',
        reason: 'Your trunk muscle is very developed; adding isolation work will balance your overall profile.',
        sessionTypes: ['upper-body', 'lower-body', 'push', 'pull'],
        addresses: ['muscle distribution']
      });
    } else if (trunkToLimbRatio < 0.8) {
      minorIssues.push('Relatively lower trunk muscle mass vs limbs');
      minor.push({
        name: 'Heavy Axial Loading (Core/Trunk)',
        setsReps: '3 x 8-10',
        notes: 'Loaded carries and heavy compounds',
        priority: 'minor',
        reason: 'Strengthening the trunk/core will provide a more stable base for your strong limbs.',
        sessionTypes: ['full-body', 'core', 'strength'],
        addresses: ['muscle distribution', 'core stability']
      });
    }
  }

  // Specific Limb Focus (Lower vs Upper)
  const totalArms = ra + la;
  const totalLegs = rl + ll;
  if (totalArms > 0 && totalLegs > 0) {
    const upperToLowerRatio = totalArms / totalLegs;
    // Standard ratio is roughly 0.2 - 0.25 for most athletes. 
    // If arms are very low, suggest upper body focus.
    if (upperToLowerRatio < 0.18) {
      minorIssues.push('Relatively lower upper body muscle mass');
      minor.push({
        name: 'Upper Body Hypertrophy Focus',
        setsReps: '3 x 10-12',
        notes: 'Vertical and horizontal pressing/pulling',
        priority: 'minor',
        reason: 'Your upper body muscle mass is lower relative to your legs; adding volume here will improve balance.',
        sessionTypes: ['upper-body', 'push', 'pull'],
        addresses: ['muscle distribution']
      });
    } else if (upperToLowerRatio > 0.3) {
      minorIssues.push('Relatively lower lower body muscle mass');
      minor.push({
        name: 'Lower Body Hypertrophy Focus',
        setsReps: '3 x 10-12',
        notes: 'Squat and hinge variations',
        priority: 'minor',
        reason: 'Your lower body muscle mass is lower relative to your upper body; prioritize leg volume.',
        sessionTypes: ['lower-body', 'legs'],
        addresses: ['muscle distribution']
      });
    }
  }

  // Clinical Postural Corrections (Important Priority)
  const movementFindings = new Set<string>();
  const headPos = Array.isArray(form.postureHeadOverall) ? form.postureHeadOverall : [form.postureHeadOverall];
  const shoulderPos = Array.isArray(form.postureShouldersOverall) ? form.postureShouldersOverall : [form.postureShouldersOverall];
  const backPos = Array.isArray(form.postureBackOverall) ? form.postureBackOverall : [form.postureBackOverall];
  const hipPos = Array.isArray(form.postureHipsOverall) ? form.postureHipsOverall : [form.postureHipsOverall];
  const kneePos = Array.isArray(form.postureKneesOverall) ? form.postureKneesOverall : [form.postureKneesOverall];

  if (headPos.includes('forward-head')) movementFindings.add('upper_crossed');
  if (shoulderPos.includes('rounded')) movementFindings.add('upper_crossed');
  if (backPos.includes('increased-kyphosis')) movementFindings.add('upper_crossed');
  if (backPos.includes('increased-lordosis')) movementFindings.add('lower_crossed');
  if (backPos.includes('flat-back')) movementFindings.add('posterior_pelvic_tilt');
  if (hipPos.includes('anterior-tilt')) movementFindings.add('lower_crossed');
  if (hipPos.includes('posterior-tilt')) movementFindings.add('posterior_pelvic_tilt');
  if (kneePos.includes('valgus-knee') || form.ohsKneeAlignment === 'valgus' || form.lungeLeftKneeAlignment === 'valgus' || form.lungeRightKneeAlignment === 'valgus') {
    movementFindings.add('knee_valgus');
  }
  if (form.ohsFeetPosition === 'pronation') movementFindings.add('feet_pronation');

  movementFindings.forEach(id => {
    const deviation = MOVEMENT_LOGIC_DB[id];
    if (deviation) {
      importantIssues.push(`Clinical Correction: ${deviation.name}`);
      
      // Add Stretch
      important.push({
        name: deviation.primaryStretch,
        setsReps: '2-3 x 30-45s',
        notes: `Correction for ${deviation.name}. Targets overactive: ${deviation.overactiveMuscles.join(', ')}`,
        priority: 'important',
        reason: `Releases tight muscles identified in manual posture assessment.`,
        sessionTypes: ['full-body', 'upper-body', 'lower-body'],
        addresses: [deviation.name, 'posture']
      });

      // Add Activation
      important.push({
        name: deviation.primaryActivation,
        setsReps: '2-3 x 12-15',
        notes: `Correction for ${deviation.name}. Targets underactive: ${deviation.underactiveMuscles.join(', ')}`,
        priority: 'important',
        reason: `Strengthens weak muscles to stabilize and correct ${deviation.name}.`,
        sessionTypes: ['full-body', 'upper-body', 'lower-body'],
        addresses: [deviation.name, 'posture']
      });
    }
  });

  // ============================================
  // PRIORITY 3: IMPORTANT (NOT URGENT)
  // ============================================
  
  // Low strength (but not critical)
  if (strengthScore >= 30 && strengthScore < 50) {
    importantIssues.push('Low strength - needs improvement');
    important.push({
      name: 'Foundational Strength',
      setsReps: '3 x 8-12',
      notes: 'Build base strength before advanced training',
      priority: 'important',
      reason: 'Improves strength foundation for better performance',
      sessionTypes: ['full-body', 'strength'],
      addresses: ['strength']
    });
  }
  
  // Low cardio
  if (cardioScore > 0 && cardioScore < 50) {
    importantIssues.push('Low cardiovascular fitness');
    important.push({
      name: 'Aerobic Base Building',
      setsReps: '20-30 min, 2-3x/week',
      notes: 'Build cardiovascular foundation',
      priority: 'important',
      reason: 'Improves recovery and workout capacity',
      sessionTypes: ['cardio', 'full-body'],
      addresses: ['cardio', 'recovery']
    });
  }

  // ============================================
  // PRIORITY 4: MINOR CORRECTIONS
  // ============================================
  
  // Small postural deviations
  if (form.postureAiResults) {
    const ai = form.postureAiResults;
    const views = ['front', 'back', 'side-left', 'side-right'] as const;
    
    for (const view of views) {
      const analysis = ai[view];
      if (!analysis) continue;
      
      // Mild forward head (<8°)
      if (analysis.forward_head && 
          analysis.forward_head.deviation_degrees > 0 && 
          analysis.forward_head.deviation_degrees < 8 &&
          analysis.forward_head.status !== 'Neutral') {
        minorIssues.push('Mild forward head - minor correction');
        minor.push({
          name: 'Posture Awareness',
          setsReps: 'Throughout day',
          notes: 'Regular chin tucks and posture checks',
          priority: 'minor',
          reason: 'Small correction to optimize posture',
          sessionTypes: ['full-body'],
          addresses: ['forward head']
        });
      }
      
      // Small shoulder differences (<1cm)
      if (analysis.shoulder_alignment && 
          analysis.shoulder_alignment.status === 'Asymmetric') {
        const diff = Math.abs(analysis.shoulder_alignment.height_difference_cm || 0);
        if (diff > 0 && diff < 1.0) {
          minorIssues.push('Minor shoulder asymmetry');
          minor.push({
            name: 'Postural Corrections',
            setsReps: 'As needed',
            notes: 'Minor adjustments during training',
            priority: 'minor',
            reason: 'Small correction to optimize alignment',
            sessionTypes: ['upper-body'],
            addresses: ['shoulder alignment']
          });
        }
      }
    }
  }
  
  // Good scores but room for optimization
  if (movementScore >= 70 && movementScore < 85) {
    minorIssues.push('Good movement quality - minor optimizations');
    minor.push({
      name: 'Movement Refinement',
      setsReps: 'As part of warm-up',
      notes: 'Fine-tune movement patterns',
      priority: 'minor',
      reason: 'Optimize already good movement quality',
      sessionTypes: ['full-body'],
      addresses: ['movement quality']
    });
  }

  // ============================================
  // GROUP BY SESSION TYPE (Intelligent Distribution)
  // ============================================
  
  const sessionMap: Record<string, PrioritizedExercise[]> = {
    'pull': [],
    'push': [],
    'legs': [],
    'upper-body': [],
    'lower-body': [],
    'full-body': [],
    'cardio': [],
    'core': [],
    'strength': []
  };
  
  const allExercises = [...critical, ...goalFocused, ...important, ...minor];
  
  allExercises.forEach(ex => {
    ex.sessionTypes.forEach(sessionType => {
      if (sessionMap[sessionType]) {
        // Prevent duplicate exercises in the same session
        if (!sessionMap[sessionType].some(e => e.name === ex.name)) {
          // Intelligent Filtering: Only add relevant correctives to specific days
          const isCorrective = ex.priority === 'important' || ex.priority === 'minor';
          const isGoal = ex.priority === 'goal-focused' || ex.priority === 'critical';
          
          if (isGoal) {
            sessionMap[sessionType].push(ex);
          } else if (isCorrective) {
            // Only add upper body correctives to upper/full body days, etc.
            const isUpperCorrective = ex.sessionTypes.includes('upper-body') || ex.addresses.some(a => a.toLowerCase().includes('head') || a.toLowerCase().includes('shoulder') || a.toLowerCase().includes('kyphosis'));
            const isLowerCorrective = ex.sessionTypes.includes('lower-body') || ex.addresses.some(a => a.toLowerCase().includes('hip') || a.toLowerCase().includes('knee') || a.toLowerCase().includes('ankle') || a.toLowerCase().includes('pelvic'));
            
            if (sessionType === 'upper-body' && isUpperCorrective) sessionMap[sessionType].push(ex);
            else if (sessionType === 'lower-body' && isLowerCorrective) sessionMap[sessionType].push(ex);
            else if (sessionType === 'full-body') sessionMap[sessionType].push(ex);
            else if (sessionType === 'core' && ex.addresses.some(a => a.toLowerCase().includes('core') || a.toLowerCase().includes('pelvic'))) sessionMap[sessionType].push(ex);
            else if (sessionType === 'cardio' && ex.addresses.some(a => a.toLowerCase().includes('cardio') || a.toLowerCase().includes('recovery'))) sessionMap[sessionType].push(ex);
          }
        }
      }
    });
  });
  
  // Final cleanup: Limit correctives per session so they don't overwhelm the workout
  Object.keys(sessionMap).forEach(key => {
    const exercises = sessionMap[key];
    const goals = exercises.filter(e => e.priority === 'critical' || e.priority === 'goal-focused');
    const correctives = exercises.filter(e => e.priority === 'important' || e.priority === 'minor');
    
    // Max 3 correctives per session to avoid "physio feel"
    sessionMap[key] = [...goals, ...correctives.slice(0, 3)];
  });

  const bySession: SessionGroup[] = Object.entries(sessionMap)
    .filter(([_, exercises]) => exercises.length > 0)
    .map(([sessionType, exercises]) => ({
      sessionType,
      exercises
    }));

  // ============================================
  // CREATE PRIORITY GROUPS
  // ============================================
  
  const groups: ExerciseGroup[] = [];
  
  if (critical.length > 0) {
    groups.push({
      priority: 'critical',
      title: '🚨 URGENT: Critical Health & Injury Prevention',
      description: 'These issues must be addressed immediately to prevent injury and protect health. Focus here first.',
      exercises: critical,
      urgency: 'urgent'
    });
  }
  
  if (goalFocused.length > 0) {
    groups.push({
      priority: 'goal-focused',
      title: '🎯 GOAL-FOCUSED: Direct Path to Your Goals',
      description: 'Exercises that directly support your primary goals. These drive your main results.',
      exercises: goalFocused,
      urgency: 'important'
    });
  }
  
  if (important.length > 0) {
    groups.push({
      priority: 'important',
      title: '⚡ IMPORTANT: Significant Issues to Address',
      description: 'These issues should be addressed as they can hinder progress, but aren\'t immediately urgent.',
      exercises: important,
      urgency: 'moderate'
    });
  }
  
  if (minor.length > 0) {
    groups.push({
      priority: 'minor',
      title: '✨ MINOR: Optimizations & Refinements',
      description: 'Small corrections and optimizations to fine-tune your movement and performance.',
      exercises: minor,
      urgency: 'low'
    });
  }

  return {
    groups,
    bySession,
    criticalIssues,
    goalExercises,
    importantIssues,
    minorIssues
  };
}

