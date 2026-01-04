/**
 * Shared constants and utilities for CoachReport components
 */

export function niceLabel(id: string): string {
  switch (id) {
    case 'bodyComp':
      return 'Body Composition';
    case 'strength':
      return 'Functional Strength';
    case 'cardio':
      return 'Metabolic Fitness';
    case 'movementQuality':
      return 'Movement Quality';
    case 'lifestyle':
      return 'Lifestyle Factors';
    default:
      return id;
  }
}

