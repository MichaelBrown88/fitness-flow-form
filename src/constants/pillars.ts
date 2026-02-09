/**
 * Pillar Display Names & ID Mapping
 *
 * Single source of truth for pillar naming across the app.
 * - Use `.full` in reports, detail views, and settings.
 * - Use `.short` in tables, buttons, badges, and compact UI.
 */

export const PILLAR_DISPLAY = {
  bodyComp:        { short: 'Body Comp',  full: 'Body Composition' },
  cardio:          { short: 'Cardio',     full: 'Metabolic Fitness' },
  strength:        { short: 'Strength',   full: 'Functional Strength' },
  movementQuality: { short: 'Movement',   full: 'Movement Quality' },
  lifestyle:       { short: 'Lifestyle',  full: 'Lifestyle Factors' },
} as const;

export type ScoringPillarId = keyof typeof PILLAR_DISPLAY;

/**
 * Maps retest/partial assessment IDs to scoring category IDs.
 * Use this when translating between the two ID systems.
 */
export const PILLAR_ID_MAP: Record<string, ScoringPillarId> = {
  inbody:   'bodyComp',
  posture:  'movementQuality',
  fitness:  'cardio',
  strength: 'strength',
  lifestyle:'lifestyle',
} as const;

/** Reverse map: scoring ID → partial assessment ID */
export const SCORING_TO_PARTIAL_MAP: Record<ScoringPillarId, string> = {
  bodyComp:        'inbody',
  movementQuality: 'posture',
  cardio:          'fitness',
  strength:        'strength',
  lifestyle:       'lifestyle',
} as const;

/**
 * Get the display name for a pillar by either its scoring ID or partial ID.
 * Falls back to the raw id if not found.
 */
export function getPillarLabel(id: string, variant: 'short' | 'full' = 'short'): string {
  // Check if it's a scoring ID directly
  if (id in PILLAR_DISPLAY) {
    return PILLAR_DISPLAY[id as ScoringPillarId][variant];
  }
  // Check if it's a partial/retest ID
  const scoringId = PILLAR_ID_MAP[id];
  if (scoringId) {
    return PILLAR_DISPLAY[scoringId][variant];
  }
  return id;
}
