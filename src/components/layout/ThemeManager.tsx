import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useThemeMode } from '@/contexts/ThemeModeContext';
import { getGradient, type GradientId } from '@/lib/design/gradients';

/** WCAG-related luminance for sRGB hex (e.g. `#dfff00`). */
function relativeLuminanceFromHex(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const lin = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrastRatio(lumA: number, lumB: number): number {
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Dark text on primary buttons; matches `220 20% 8%` in index.css (charcoal). */
const PRIMARY_FG_DARK_HEX = '#0e1218';

/**
 * HSL tokens for `text-primary-foreground` on solid `bg-primary` / gradient start.
 * Picks white vs charcoal by whichever yields higher contrast on the brand color.
 */
function primaryForegroundHslFromBrandHex(brandHex: string): string {
  const bg = relativeLuminanceFromHex(brandHex);
  const lumWhite = 1;
  const lumCharcoal = relativeLuminanceFromHex(PRIMARY_FG_DARK_HEX);
  const whiteOnBrand = contrastRatio(bg, lumWhite);
  const charcoalOnBrand = contrastRatio(bg, lumCharcoal);
  return whiteOnBrand >= charcoalOnBrand ? '0 0% 100%' : '220 20% 8%';
}

/**
 * ThemeManager
 * Applies the organization's gradient selection to CSS variables
 * so Tailwind and components can use it dynamically.
 * 
 * Organizations can select from predefined gradients that work
 * cohesively with Apple's neutral color palette.
 * 
 * Sets:
 * - --gradient-from, --gradient-to (HSL values)
 * - --gradient-from-hex, --gradient-to-hex (for SVG/CSS)
 * - --gradient-light, --gradient-medium, --gradient-dark (tints)
 * - --primary, --ring (uses gradient-from)
 * - --primary-foreground (dark on volt, light on deep primaries)
 */
export const ThemeManager: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { orgSettings } = useAuth();
  const { theme } = useThemeMode();
  const isDark = theme === 'dark';

  useEffect(() => {
    const root = document.documentElement;
    // Only apply org gradient when custom branding is enabled; otherwise use One Assess default.
    const useOrgGradient = orgSettings?.customBrandingEnabled === true;
    const gradientId = (useOrgGradient ? (orgSettings?.gradientId || 'pear') : 'pear') as GradientId;
    const gradient = getGradient(gradientId);
    
    // Convert hex colors to HSL for CSS variables
    const hexToHsl = (hex: string): string => {
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
    };
    
    // Always set raw gradient hex vars (used in SVG fills / color-mix)
    root.style.setProperty('--gradient-from-hex', gradient.fromHex);
    root.style.setProperty('--gradient-to-hex', gradient.toHex);
    root.style.setProperty('--brand-primary', gradient.fromHex);

    const fromHsl = hexToHsl(gradient.fromHex).split(' ');
    const hue = fromHsl[0];
    const rawSat = parseInt(fromHsl[1], 10);
    const tintSat = `${Math.max(30, rawSat - 20)}%`;

    if (isDark) {
      /**
       * Dark mode — full-brightness brand colour everywhere.
       * Pear (#bcff00) pops on the rich-black base.
       */
      const brightHsl = hexToHsl(gradient.fromHex);
      const brightToHsl = hexToHsl(gradient.toHex);
      root.style.setProperty('--gradient-from', brightHsl);
      root.style.setProperty('--gradient-to', brightToHsl);
      root.style.setProperty('--primary', brightHsl);
      root.style.setProperty('--ring', brightHsl);
      root.style.setProperty('--sidebar-primary', brightHsl);
      root.style.setProperty('--sidebar-ring', brightHsl);
      root.style.setProperty('--gradient-light',  `${hue} 22% 11%`);
      root.style.setProperty('--gradient-medium', `${hue} 28% 16%`);
      root.style.setProperty('--gradient-dark',   `${hue} ${Math.min(65, rawSat + 10)}% 62%`);
      const fgDark = primaryForegroundHslFromBrandHex(gradient.fromHex);
      root.style.setProperty('--primary-foreground', fgDark);
      root.style.setProperty('--sidebar-primary-foreground', fgDark);
    } else {
      /**
       * Light mode — one unified mid-dark green applied everywhere.
       * Same hue family as the brand, darkened to ~30 % lightness so it
       * reads clearly on the ceiling-white (#e9ebe6) background while still
       * looking like the brand colour (not near-black).
       * Applied to --primary AND --gradient-dark so buttons, text accents,
       * icons and borders all share a single consistent green.
       */
      const unifiedGreen = `${hue} ${Math.min(rawSat, 80)}% 30%`;
      root.style.setProperty('--gradient-from', unifiedGreen);
      root.style.setProperty('--gradient-to',   `${hue} ${Math.min(rawSat, 80)}% 26%`);
      root.style.setProperty('--primary', unifiedGreen);
      root.style.setProperty('--ring', unifiedGreen);
      root.style.setProperty('--sidebar-primary', unifiedGreen);
      root.style.setProperty('--sidebar-ring', unifiedGreen);
      root.style.setProperty('--gradient-light',  `${hue} ${tintSat} 95%`);
      root.style.setProperty('--gradient-medium', `${hue} ${tintSat} 90%`);
      root.style.setProperty('--gradient-dark', unifiedGreen); // same token — one green in light mode
      // Dark green is dark enough for white foreground on buttons
      root.style.setProperty('--primary-foreground', '0 0% 100%');
      root.style.setProperty('--sidebar-primary-foreground', '0 0% 100%');
    }
    
  }, [
    orgSettings?.gradientId,
    orgSettings?.customBrandingEnabled,
    isDark,
  ]);

  return <>{children}</>;
};
