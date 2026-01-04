/**
 * Apple Design Language - Neutral Colors
 * Standardized whites, greys, and blacks that match Apple's design system
 * These are fixed and not customizable per organization
 */

export const APPLE_NEUTRALS = {
  // Backgrounds (lightest to darkest)
  background: {
    primary: '#ffffff',      // Pure white for main backgrounds
    secondary: '#f5f5f7',     // Very light grey for secondary backgrounds
    tertiary: '#e5e5e7',      // Light grey for subtle backgrounds
  },
  
  // Text colors (darkest to lightest)
  text: {
    primary: '#1d1d1f',       // Almost black for primary text
    secondary: '#6e6e73',    // Medium grey for secondary text
    tertiary: '#86868b',     // Light grey for tertiary text
    quaternary: '#a1a1a6',   // Very light grey for disabled text
  },
  
  // Borders and dividers
  border: {
    light: '#d2d2d7',         // Light border
    medium: '#c7c7cc',       // Medium border
    dark: '#a1a1a6',         // Dark border
  },
  
  // Shadows (Apple-style soft shadows)
  shadow: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    colored: '0 10px 15px -3px rgba(99, 102, 241, 0.1), 0 4px 6px -2px rgba(99, 102, 241, 0.05)', // Default purple
  },
  
  // Card backgrounds
  card: {
    default: '#ffffff',
    elevated: '#ffffff',
    subtle: '#fafafa',
  },
} as const;

/**
 * Convert hex to HSL for CSS variables
 */
export function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

