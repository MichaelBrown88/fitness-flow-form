/**
 * Session Grouping
 *
 * Groups exercises by session type and creates priority groups.
 */

import type { PrioritizedExercise, ExerciseGroup, SessionGroup } from './types';

export function groupBySession(
  critical: PrioritizedExercise[],
  goalFocused: PrioritizedExercise[],
  important: PrioritizedExercise[],
  minor: PrioritizedExercise[]
): SessionGroup[] {
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

  return Object.entries(sessionMap)
    .filter(([_, exercises]) => exercises.length > 0)
    .map(([sessionType, exercises]) => ({
      sessionType,
      exercises
    }));
}

export function createPriorityGroups(
  critical: PrioritizedExercise[],
  goalFocused: PrioritizedExercise[],
  important: PrioritizedExercise[],
  minor: PrioritizedExercise[]
): ExerciseGroup[] {
  const groups: ExerciseGroup[] = [];

  if (critical.length > 0) {
    groups.push({
      priority: 'critical',
      title: 'URGENT: Critical Health & Injury Prevention',
      description: 'These issues must be addressed immediately to prevent injury and protect health. Focus here first.',
      exercises: critical,
      urgency: 'urgent'
    });
  }

  if (goalFocused.length > 0) {
    groups.push({
      priority: 'goal-focused',
      title: 'GOAL-FOCUSED: Direct Path to Your Goals',
      description: 'Exercises that directly support your primary goals. These drive your main results.',
      exercises: goalFocused,
      urgency: 'important'
    });
  }

  if (important.length > 0) {
    groups.push({
      priority: 'important',
      title: 'IMPORTANT: Significant Issues to Address',
      description: 'These issues should be addressed as they can hinder progress, but aren\'t immediately urgent.',
      exercises: important,
      urgency: 'moderate'
    });
  }

  if (minor.length > 0) {
    groups.push({
      priority: 'minor',
      title: 'MINOR: Optimizations & Refinements',
      description: 'Small corrections and optimizations to fine-tune your movement and performance.',
      exercises: minor,
      urgency: 'low'
    });
  }

  return groups;
}
