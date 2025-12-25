import type { FormData } from '@/contexts/FormContext';
import type { ScoreSummary } from './scoring';
import type { CoachPlan } from './recommendations';

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
        criticalIssues.push('Significant spinal curvature - requires immediate attention');
        critical.push({
          name: 'Unilateral Core Work',
          setsReps: '3 x 8-12/side',
          notes: 'Focus on weaker side to address curvature',
          priority: 'critical',
          reason: 'Significant spinal curvature increases injury risk',
          sessionTypes: ['full-body', 'core'],
          addresses: ['spinal curvature', 'injury prevention']
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
  // PRIORITY 2: GOAL-FOCUSED EXERCISES
  // ============================================
  
  if (primaryGoal === 'weight-loss') {
    goalExercises.push('Weight loss is primary goal');
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
  
  if (primaryGoal === 'build-muscle' || primaryGoal === 'build-strength') {
    goalExercises.push(primaryGoal === 'build-muscle' ? 'Muscle building is primary goal' : 'Strength building is primary goal');
    goalFocused.push({
      name: 'Compound Lifts',
      setsReps: '3-4 x 6-12',
      notes: 'Squat, Deadlift, Bench, Row variations',
      priority: 'goal-focused',
      reason: 'Compound movements are most effective for muscle/strength gains',
      sessionTypes: ['full-body', 'legs', 'push', 'pull'],
      addresses: [primaryGoal === 'build-muscle' ? 'muscle growth' : 'strength']
    });
    goalFocused.push({
      name: 'Progressive Overload',
      setsReps: 'Increase weight/reps weekly',
      notes: 'Track and progress systematically',
      priority: 'goal-focused',
      reason: 'Essential for continued muscle/strength development',
      sessionTypes: ['full-body', 'legs', 'push', 'pull'],
      addresses: [primaryGoal === 'build-muscle' ? 'muscle growth' : 'strength']
    });
  }
  
  if (primaryGoal === 'improve-fitness') {
    goalExercises.push('Fitness improvement is primary goal');
    goalFocused.push({
      name: 'Interval Training',
      setsReps: '6-8 x 2-4 min intervals',
      notes: 'Mix of Zone 2 and higher intensity',
      priority: 'goal-focused',
      reason: 'Improves cardiovascular fitness and VO2 max',
      sessionTypes: ['cardio', 'full-body'],
      addresses: ['fitness', 'cardio capacity']
    });
  }

  // ============================================
  // PRIORITY 3: IMPORTANT (NOT URGENT)
  // ============================================
  
  // Moderate postural issues
  if (form.postureAiResults) {
    const ai = form.postureAiResults;
    const views = ['front', 'back', 'side-left', 'side-right'] as const;
    
    for (const view of views) {
      const analysis = ai[view];
      if (!analysis) continue;
      
      // Moderate forward head (8-15°)
      if (analysis.forward_head && 
          analysis.forward_head.deviation_degrees >= 8 && 
          analysis.forward_head.deviation_degrees <= 15 &&
          analysis.forward_head.status !== 'Neutral') {
        importantIssues.push('Forward head posture - should be addressed');
        important.push({
          name: 'Wall Angels',
          setsReps: '3 x 10-12',
          notes: 'Improve upper back and neck alignment',
          priority: 'important',
          reason: 'Addresses forward head to improve movement quality',
          sessionTypes: ['upper-body', 'pull'],
          addresses: ['forward head', 'posture']
        });
      }
      
      // Moderate kyphosis (40-60°)
      if (analysis.kyphosis && 
          analysis.kyphosis.curve_degrees >= 40 && 
          analysis.kyphosis.curve_degrees <= 60 &&
          analysis.kyphosis.status !== 'Normal') {
        importantIssues.push('Moderate thoracic kyphosis');
        important.push({
          name: 'Prone Y/T/W',
          setsReps: '3 x 8 each',
          notes: 'Strengthen upper back extensors',
          priority: 'important',
          reason: 'Improves upper back posture and reduces rounding',
          sessionTypes: ['upper-body', 'pull'],
          addresses: ['kyphosis', 'upper back']
        });
      }
      
      // Shoulder asymmetry
      if (analysis.shoulder_alignment && 
          analysis.shoulder_alignment.status === 'Asymmetric') {
        const diff = Math.abs(analysis.shoulder_alignment.height_difference_cm || 0);
        if (diff >= 1.0) {
          importantIssues.push(`Shoulder asymmetry (${diff.toFixed(1)}cm)`);
          important.push({
            name: 'Unilateral Rows',
            setsReps: '3 x 8-12/side',
            notes: 'Focus on weaker/elevated side',
            priority: 'important',
            reason: 'Addresses shoulder imbalance to prevent compensation patterns',
            sessionTypes: ['upper-body', 'pull'],
            addresses: ['shoulder asymmetry', 'posture']
          });
        }
      }
      
      // Hip/pelvic issues
      if (analysis.hip_alignment && analysis.hip_alignment.status === 'Asymmetric') {
        const diff = Math.abs(analysis.hip_alignment.height_difference_cm || 0);
        if (diff >= 1.0) {
          importantIssues.push(`Hip asymmetry (${diff.toFixed(1)}cm)`);
          important.push({
            name: 'Single-Leg Work',
            setsReps: '3 x 8-12/side',
            notes: 'Split squats, step-ups - focus on weaker side',
            priority: 'important',
            reason: 'Addresses hip imbalance to improve movement patterns',
            sessionTypes: ['legs', 'lower-body'],
            addresses: ['hip asymmetry', 'pelvic alignment']
          });
        }
      }
      
      // Pelvic tilt
      if (analysis.pelvic_tilt && analysis.pelvic_tilt.status !== 'Neutral') {
        const tilt = Math.abs(analysis.pelvic_tilt.anterior_tilt_degrees || 0);
        if (tilt >= 5 && tilt < 15) {
          importantIssues.push('Pelvic tilt - affects lower back alignment');
          important.push({
            name: 'Posterior Pelvic Tilts',
            setsReps: '3 x 10-12',
            notes: 'Improve pelvic control',
            priority: 'important',
            reason: 'Addresses pelvic tilt to improve lower back alignment',
            sessionTypes: ['legs', 'lower-body', 'core'],
            addresses: ['pelvic tilt', 'lower back']
          });
        }
      }
    }
  }
  
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
  // GROUP BY SESSION TYPE
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
        sessionMap[sessionType].push(ex);
      }
    });
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

