/**
 * Important & Minor Filter
 *
 * Detects non-critical but significant issues (Priority 3)
 * and minor corrections/optimizations (Priority 4).
 */

import type { PrioritizedExercise, PrioritizationContext } from './types';

export function detectImportantMinorIssues(ctx: PrioritizationContext): {
  important: PrioritizedExercise[];
  minor: PrioritizedExercise[];
  importantIssues: string[];
  minorIssues: string[];
} {
  const { form, strengthScore, cardioScore, movementScore } = ctx;
  const important: PrioritizedExercise[] = [];
  const minor: PrioritizedExercise[] = [];
  const importantIssues: string[] = [];
  const minorIssues: string[] = [];

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

  // Small postural deviations
  if (form.postureAiResults) {
    const ai = form.postureAiResults;
    const views = ['front', 'side-left', 'back', 'side-right'] as const;

    for (const view of views) {
      const analysis = ai[view];
      if (!analysis) continue;

      // Mild forward head (<8deg)
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

  return { important, minor, importantIssues, minorIssues };
}
