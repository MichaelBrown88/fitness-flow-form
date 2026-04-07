/**
 * Critical Health Filter
 *
 * Detects critical health and injury risks that must be addressed immediately.
 * Priority 1 in the exercise prioritization system.
 */

import type { PrioritizedExercise, PrioritizationContext } from './types';

export function detectCriticalIssues(ctx: PrioritizationContext): {
  exercises: PrioritizedExercise[];
  issues: string[];
} {
  const { form, gender, bf, visceral, bmi, strengthScore } = ctx;
  const critical: PrioritizedExercise[] = [];
  const criticalIssues: string[] = [];

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
    const views = ['front', 'side-left', 'back', 'side-right'] as const;

    for (const view of views) {
      const analysis = ai[view];
      if (!analysis) continue;

      // Severe forward head (>15deg)
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

      // Severe kyphosis (>60deg)
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

      // Severe spinal curvature (scoliosis >20deg)
      if (analysis.spinal_curvature && analysis.spinal_curvature.curve_degrees > 20) {
        criticalIssues.push(`Severe spinal curvature (${(analysis.spinal_curvature.curve_degrees ?? 0).toFixed(1)}deg) - requires immediate attention`);
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

      // Severe head tilt (>10deg)
      if (analysis.head_alignment && analysis.head_alignment.tilt_degrees > 10) {
        criticalIssues.push(`Severe head tilt (${(analysis.head_alignment.tilt_degrees ?? 0).toFixed(1)}deg) - high neck/shoulder injury risk`);
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

  return { exercises: critical, issues: criticalIssues };
}
