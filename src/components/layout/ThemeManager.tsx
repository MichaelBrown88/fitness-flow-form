import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useThemeMode } from '@/contexts/ThemeModeContext';
import { getGradient, type GradientId } from '@/lib/design/gradients';
import { computeBrandCssVars } from '@/lib/design/brandTokens';

/**
 * ThemeManager
 * Applies the organisation's brand colour to global CSS variables so Tailwind
 * and components pick it up dynamically.
 *
 * Colour resolution order (highest priority first):
 *   1. orgSettings.brandHex  — coach-supplied custom hex (e.g. '#CC0000')
 *   2. orgSettings.gradientId — one of the curated gradient presets
 *   3. Hard-coded 'jewel-teal' default (One Assess brand)
 *
 * In light mode the colour is darkened to ~30 % lightness for legibility.
 * In dark mode it is applied at full brightness.
 * Button foreground (white vs charcoal) is chosen via WCAG contrast ratio.
 */
export const ThemeManager: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { orgSettings } = useAuth();
  const { theme } = useThemeMode();
  const isDark = theme === 'dark';

  useEffect(() => {
    const root = document.documentElement;
    // Mirror AppShell's grandfathered logic: undefined = legacy paying org, treat as enabled.
    const useOrgBranding =
      orgSettings?.customBrandingEnabled === true || orgSettings?.customBrandingEnabled === undefined;

    // Resolve brand hex: custom hex beats gradient preset beats default.
    const gradientId = (useOrgBranding ? (orgSettings?.gradientId || 'jewel-teal') : 'jewel-teal') as GradientId;
    const gradient = getGradient(gradientId);
    const customHex = useOrgBranding ? orgSettings?.brandHex?.trim() : '';
    const fromHex = customHex || gradient.fromHex;
    const toHex = customHex || gradient.toHex;

    // Always write raw hex vars (used in SVG fills / color-mix)
    root.style.setProperty('--gradient-from-hex', fromHex);
    root.style.setProperty('--gradient-to-hex', toHex);
    root.style.setProperty('--brand-primary', fromHex);

    // Compute and apply all HSL-based CSS variables
    const vars = computeBrandCssVars(fromHex, toHex, isDark);
    for (const [key, value] of Object.entries(vars)) {
      root.style.setProperty(key, value);
    }
  }, [
    orgSettings?.gradientId,
    orgSettings?.brandHex,
    orgSettings?.customBrandingEnabled,
    isDark,
  ]);

  return <>{children}</>;
};
