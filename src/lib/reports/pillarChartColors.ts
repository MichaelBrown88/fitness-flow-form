/**
 * Pillar hue helpers for axis-explorations / legacy bloom SVG only.
 * Production UI uses CHART_PILLAR_COLOR_ORDER from chartColors.ts.
 */

interface PillarHue {
  h: number;
  alias: string;
}

const PILLAR_HUES: Record<string, PillarHue> = {
  'Body Composition': { h: 188, alias: 'Cyan' },
  'Functional Strength': { h: 350, alias: 'Rose' },
  'Metabolic Fitness': { h: 28, alias: 'Amber' },
  'Movement Quality': { h: 262, alias: 'Indigo' },
  'Lifestyle Factors': { h: 152, alias: 'Emerald' },
  Body: { h: 188, alias: 'Cyan' },
  Strength: { h: 350, alias: 'Rose' },
  Cardio: { h: 28, alias: 'Amber' },
  Movement: { h: 262, alias: 'Indigo' },
  Lifestyle: { h: 152, alias: 'Emerald' },
  bodyComp: { h: 188, alias: 'Cyan' },
  strength: { h: 350, alias: 'Rose' },
  cardio: { h: 28, alias: 'Amber' },
  movementQuality: { h: 262, alias: 'Indigo' },
  lifestyle: { h: 152, alias: 'Emerald' },
};

const FALLBACK_HUES = [188, 350, 28, 262, 152];

const FIXED_LIGHTNESS = 45;
const FIXED_SATURATION = 72;

export function pillarHueAt(name: string, fullLabel: string, index: number): number {
  return (
    PILLAR_HUES[fullLabel]?.h ??
    PILLAR_HUES[name]?.h ??
    FALLBACK_HUES[index % FALLBACK_HUES.length]
  );
}

export function pillarColor(hue: number, alpha = 1): string {
  return alpha === 1
    ? `hsl(${hue} ${FIXED_SATURATION}% ${FIXED_LIGHTNESS}%)`
    : `hsl(${hue} ${FIXED_SATURATION}% ${FIXED_LIGHTNESS}% / ${alpha})`;
}
