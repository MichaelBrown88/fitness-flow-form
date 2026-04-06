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
    
    // Set gradient CSS variables
    root.style.setProperty('--gradient-from', hexToHsl(gradient.fromHex));
    root.style.setProperty('--gradient-to', hexToHsl(gradient.toHex));
    root.style.setProperty('--gradient-from-hex', gradient.fromHex);
    root.style.setProperty('--gradient-to-hex', gradient.toHex);
    
    // Set primary color to gradient-from
    root.style.setProperty('--primary', hexToHsl(gradient.fromHex));
    root.style.setProperty('--ring', hexToHsl(gradient.fromHex));
    root.style.setProperty('--sidebar-primary', hexToHsl(gradient.fromHex));
    root.style.setProperty('--sidebar-ring', hexToHsl(gradient.fromHex));
    
    // Set gradient tints (light, medium, dark)
    // These are approximate - we'll use Tailwind classes for exact values
    const fromHsl = hexToHsl(gradient.fromHex).split(' ');
    const hue = fromHsl[0];
    const sat = `${Math.max(30, parseInt(fromHsl[1], 10) - 20)}%`;
    const lightHsl = isDark
      ? `${hue} 22% 11%`
      : `${hue} ${sat} 97%`;
    const mediumHsl = isDark
      ? `${hue} 28% 16%`
      : `${hue} ${sat} 94%`;
    const darkHsl = isDark
      ? `${hue} ${Math.min(65, parseInt(fromHsl[1], 10) + 10)}% 62%`
      : `${hue} ${Math.min(parseInt(fromHsl[1], 10), 75)}% 22%`; // deep for text-on-light legibility
    
    root.style.setProperty('--gradient-light', lightHsl);
    root.style.setProperty('--gradient-medium', mediumHsl);
    root.style.setProperty('--gradient-dark', darkHsl);
    
    // Store original hex for any direct use
    root.style.setProperty('--brand-primary', gradient.fromHex);

    const primaryFg = primaryForegroundHslFromBrandHex(gradient.fromHex);
    root.style.setProperty('--primary-foreground', primaryFg);
    root.style.setProperty('--sidebar-primary-foreground', primaryFg);
    
  }, [
    orgSettings?.gradientId,
    orgSettings?.customBrandingEnabled,
    isDark,
  ]);

  return <>{children}</>;
};
