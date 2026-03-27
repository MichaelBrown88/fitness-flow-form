/**
 * Chart / Recharts colours as hex (Recharts does not resolve Tailwind classes).
 * Derived from the same palette as `src/index.css` score + border tokens — update together.
 *
 * CSS HSL references in index.css:
 * - --score-green 160 84% 39%
 * - --score-amber 38 92% 50%
 * - --score-red 0 84% 60%
 * - --border (light) ~ neutral grid lines
 */
export const CHART_HEX = {
  scoreGreen: '#059669',
  scoreAmber: '#f59e0b',
  scoreRed: '#ef4444',
  /** Sky accent for metabolic / cardio series (distinct from volt) */
  sky: '#0ea5e9',
  /** Indigo for strength pillar contrast */
  indigo: '#6366f1',
  /** Purple for lifestyle pillar */
  purple: '#a855f7',
  /** Polar grid / guides — light mode border-adjacent */
  gridLight: '#e4e4e7',
  gridLightAlt: '#e2e8f0',
  tickMuted: '#94a3b8',
  tickMutedAlt: '#71717a',
  neutralStroke: '#d4d4d8',
  neutralDark: '#18181b',
  /** SVG track behind score ring (light neutral) */
  ringTrackLight: '#f1f5f9',
  neutralTrend: '#cbd5e1',
} as const;

/** Overall / multi-pillar radar: Body, Strength, Cardio, Movement, Lifestyle */
export const CHART_PILLAR_COLOR_ORDER = [
  CHART_HEX.scoreGreen,
  CHART_HEX.indigo,
  CHART_HEX.sky,
  CHART_HEX.scoreAmber,
  CHART_HEX.purple,
] as const;

/** Category radar tab colours — Functional Strength uses brand gradient token in SVG */
export const CATEGORY_RADAR_COLOR_MAP: Record<string, string> = {
  'Body Composition': CHART_HEX.scoreGreen,
  'Functional Strength': 'var(--gradient-from-hex)',
  'Metabolic Fitness': CHART_HEX.sky,
  'Movement Quality': CHART_HEX.scoreAmber,
  'Lifestyle Factors': CHART_HEX.purple,
};

export const CATEGORY_RADAR_FALLBACK = '#3b82f6';

/** Lifestyle radar fill (teal aligned to score-green family) */
export const LIFESTYLE_RADAR_FILL = '#0f766e';

export const AXIS_TICK_SLATE_SUBSTITUTE = '#475569';
