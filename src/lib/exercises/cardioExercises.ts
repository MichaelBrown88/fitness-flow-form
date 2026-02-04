/**
 * Cardio Exercise Definitions
 *
 * Organized by intensity:
 * - Zone 2 / Low Intensity (walking, cycling, rowing)
 * - HIIT / High Intensity (sprints, burpees)
 * - Moderate Intensity (running, swimming)
 * - Circuits / Mixed Modalities
 */

import type { Exercise } from './types';

export const CARDIO_EXERCISES: Exercise[] = [
  // Zone 2 / Low Intensity
  {
    name: 'Zone 2 Walking',
    category: 'cardio',
    sessionTypes: ['cardio'],
    bodyParts: ['legs'],
    goals: ['weight-loss', 'improve-fitness', 'general-health'],
    prescription: { time: '30-60 min', notes: '2-4x/week, maintain conversation pace' },
    equipment: ['none'],
    impactLevel: 'low',
    genderSuitability: 'all',
    exclusions: {},
    description: 'Low-intensity steady state, excellent for fat loss and recovery'
  },
  {
    name: 'Zone 2 Cycling',
    category: 'cardio',
    sessionTypes: ['cardio'],
    bodyParts: ['legs'],
    goals: ['weight-loss', 'improve-fitness', 'general-health'],
    prescription: { time: '30-60 min', notes: '2-4x/week, low impact' },
    equipment: ['none'], // Stationary bike
    impactLevel: 'low',
    genderSuitability: 'all',
    exclusions: {},
    description: 'Low-impact Zone 2 cardio'
  },
  {
    name: 'Zone 2 Rowing',
    category: 'cardio',
    sessionTypes: ['cardio'],
    bodyParts: ['legs', 'core'],
    goals: ['weight-loss', 'improve-fitness', 'general-health'],
    prescription: { time: '20-40 min', notes: '2-3x/week, full body low impact' },
    equipment: ['machine'],
    impactLevel: 'low',
    genderSuitability: 'all',
    exclusions: {},
    description: 'Full-body Zone 2 cardio, low impact'
  },

  // HIIT / High Intensity
  {
    name: 'HIIT Cycling',
    category: 'cardio',
    sessionTypes: ['cardio'],
    bodyParts: ['legs'],
    goals: ['improve-fitness', 'weight-loss', 'build-muscle'],
    prescription: { sets: '6-8', time: '2-4 min intervals', notes: 'High intensity with rest periods' },
    equipment: ['none'], // Stationary bike
    impactLevel: 'moderate',
    genderSuitability: 'all',
    exclusions: { bodyComp: { sedentary: true, maxBMI: 35 } },
    description: 'High-intensity intervals on bike, lower impact than running'
  },
  {
    name: 'Sprint Intervals',
    category: 'cardio',
    sessionTypes: ['cardio'],
    bodyParts: ['legs'],
    goals: ['improve-fitness'],
    prescription: { sets: '6-10', time: '30s on / 90s off', notes: 'Max effort sprints' },
    equipment: ['none'],
    impactLevel: 'high',
    genderSuitability: 'male-preferred',
    exclusions: { bodyComp: { sedentary: true, maxBMI: 30 } },
    description: 'High-impact sprint training'
  },
  {
    name: 'Burpees',
    category: 'cardio',
    sessionTypes: ['cardio', 'full-body'],
    bodyParts: ['legs', 'core'],
    goals: ['improve-fitness', 'weight-loss'],
    prescription: { sets: '4-6', reps: '10-15', notes: 'Full body high intensity' },
    equipment: ['bodyweight'],
    impactLevel: 'high',
    genderSuitability: 'all',
    exclusions: { bodyComp: { sedentary: true, maxBMI: 30 } },
    description: 'High-impact full-body exercise'
  },

  // Circuits / Mixed Modalities
  {
    name: 'Circuit Training',
    category: 'cardio',
    sessionTypes: ['cardio', 'full-body'],
    bodyParts: ['legs', 'core'],
    goals: ['improve-fitness', 'build-muscle', 'weight-loss'],
    prescription: { sets: '3-5', time: '30-45s per exercise', notes: 'Multiple exercises, minimal rest' },
    equipment: ['dumbbells', 'bodyweight'],
    impactLevel: 'moderate',
    genderSuitability: 'all',
    exclusions: { bodyComp: { sedentary: true, maxBMI: 35 } },
    description: 'Combines strength and cardio in time-efficient format'
  },

  // Moderate Intensity
  {
    name: 'Moderate Pace Running',
    category: 'cardio',
    sessionTypes: ['cardio'],
    bodyParts: ['legs'],
    goals: ['improve-fitness', 'weight-loss'],
    prescription: { time: '20-40 min', notes: '3-4x/week, conversational pace' },
    equipment: ['none'],
    impactLevel: 'high',
    genderSuitability: 'all',
    exclusions: { bodyComp: { sedentary: true, maxBMI: 30 }, mobility: ['poor-ankle-mobility'] },
    description: 'Moderate intensity running'
  },
  {
    name: 'Swimming',
    category: 'cardio',
    sessionTypes: ['cardio'],
    bodyParts: ['legs', 'core'],
    goals: ['improve-fitness', 'weight-loss', 'build-muscle'],
    prescription: { time: '20-40 min', notes: '2-3x/week, low impact' },
    equipment: ['none'],
    impactLevel: 'low',
    genderSuitability: 'all',
    exclusions: {},
    description: 'Low-impact full-body cardio'
  },
];
