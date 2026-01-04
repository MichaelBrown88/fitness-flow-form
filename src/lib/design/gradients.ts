/**
 * Standardized Gradient System
 * Organizations can select from these predefined gradients
 * All gradients are designed to work cohesively with Apple's neutral color palette
 */

export type GradientId = 
  | 'purple-indigo'    // Default: indigo-500 to purple-500
  | 'blue-cyan'        // Blue to cyan
  | 'emerald-teal'     // Green to teal
  | 'rose-pink'        // Rose to pink
  | 'amber-orange'     // Amber to orange
  | 'violet-purple'    // Violet to purple
  | 'sky-blue'         // Sky to blue
  | 'indigo-blue';     // Indigo to blue

export interface GradientDefinition {
  id: GradientId;
  name: string;
  from: string;  // Tailwind color class (e.g., 'indigo-500')
  to: string;    // Tailwind color class (e.g., 'purple-500')
  fromHex: string; // Hex color for SVG/CSS
  toHex: string;   // Hex color for SVG/CSS
  light: string;    // Light tint for backgrounds
  medium: string;   // Medium tint for borders/accents
  dark: string;     // Dark tint for text
}

/**
 * Predefined gradient collection
 * Each gradient is carefully chosen to work with Apple's neutral palette
 */
export const GRADIENT_PALETTE: Record<GradientId, GradientDefinition> = {
  'purple-indigo': {
    id: 'purple-indigo',
    name: 'Purple Indigo',
    from: 'indigo-500',
    to: 'purple-500',
    fromHex: '#6366f1',
    toHex: '#a855f7',
    light: 'indigo-50',
    medium: 'indigo-100',
    dark: 'indigo-600',
  },
  'blue-cyan': {
    id: 'blue-cyan',
    name: 'Blue Cyan',
    from: 'blue-500',
    to: 'cyan-500',
    fromHex: '#3b82f6',
    toHex: '#06b6d4',
    light: 'blue-50',
    medium: 'blue-100',
    dark: 'blue-600',
  },
  'emerald-teal': {
    id: 'emerald-teal',
    name: 'Emerald Teal',
    from: 'emerald-500',
    to: 'teal-500',
    fromHex: '#10b981',
    toHex: '#14b8a6',
    light: 'emerald-50',
    medium: 'emerald-100',
    dark: 'emerald-600',
  },
  'rose-pink': {
    id: 'rose-pink',
    name: 'Rose Pink',
    from: 'rose-500',
    to: 'pink-500',
    fromHex: '#f43f5e',
    toHex: '#ec4899',
    light: 'rose-50',
    medium: 'rose-100',
    dark: 'rose-600',
  },
  'amber-orange': {
    id: 'amber-orange',
    name: 'Amber Orange',
    from: 'amber-500',
    to: 'orange-500',
    fromHex: '#f59e0b',
    toHex: '#f97316',
    light: 'amber-50',
    medium: 'amber-100',
    dark: 'amber-600',
  },
  'violet-purple': {
    id: 'violet-purple',
    name: 'Violet Purple',
    from: 'violet-500',
    to: 'purple-500',
    fromHex: '#8b5cf6',
    toHex: '#a855f7',
    light: 'violet-50',
    medium: 'violet-100',
    dark: 'violet-600',
  },
  'sky-blue': {
    id: 'sky-blue',
    name: 'Sky Blue',
    from: 'sky-400',
    to: 'blue-500',
    fromHex: '#38bdf8',
    toHex: '#3b82f6',
    light: 'sky-50',
    medium: 'sky-100',
    dark: 'sky-600',
  },
  'indigo-blue': {
    id: 'indigo-blue',
    name: 'Indigo Blue',
    from: 'indigo-600',
    to: 'blue-600',
    fromHex: '#4f46e5',
    toHex: '#2563eb',
    light: 'indigo-50',
    medium: 'indigo-100',
    dark: 'indigo-700',
  },
};

/**
 * Get gradient definition by ID
 */
export function getGradient(id: GradientId = 'purple-indigo'): GradientDefinition {
  return GRADIENT_PALETTE[id] || GRADIENT_PALETTE['purple-indigo'];
}

/**
 * Get all available gradients for selection UI
 */
export function getAllGradients(): GradientDefinition[] {
  return Object.values(GRADIENT_PALETTE);
}

