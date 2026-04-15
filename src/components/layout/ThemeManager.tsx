import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useThemeMode } from '@/contexts/ThemeModeContext';
import { getGradient, type GradientId } from '@/lib/design/gradients';
import { computeBrandCssVars } from '@/lib/design/brandTokens';

/**
 * ThemeManager
 * Sets `--brand-accent` on `:root` when an org has paid custom branding enabled.
 * When branding is not enabled, the property is removed so the monochrome CSS
 * default from index.css takes over — no teal leaks to unbranded orgs.
 *
 * Colour resolution order (highest priority first):
 *   1. orgSettings.brandHex  — coach-supplied custom hex (e.g. '#CC0000')
 *   2. orgSettings.gradientId — one of the curated gradient presets
 *   3. Hard-coded 'jewel-teal' default (for paid orgs with no explicit choice)
 *
 * In dark mode the colour is boosted to at least 55% lightness for legibility.
 */
export const ThemeManager: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { orgSettings } = useAuth();
  const { theme } = useThemeMode();
  const isDark = theme === 'dark';

  useEffect(() => {
    const root = document.documentElement;
    const useOrgBranding =
      orgSettings?.customBrandingEnabled === true || orgSettings?.customBrandingEnabled === undefined;

    if (!useOrgBranding) {
      root.style.removeProperty('--brand-accent');
      return;
    }

    // Migrate legacy pear gradient id → jewel-teal.
    const storedGradientId = orgSettings?.gradientId === 'pear' ? 'jewel-teal' : orgSettings?.gradientId;

    const oldPearHexes = new Set(['#bcff00', '#BCFF00', '#a8e600', '#A8E600']);
    const storedBrandHex = orgSettings?.brandHex?.trim() ?? '';
    const isLegacyPear = oldPearHexes.has(storedBrandHex);

    const gradientId = (storedGradientId || 'jewel-teal') as GradientId;
    const gradient = getGradient(gradientId);
    const customHex = !isLegacyPear ? storedBrandHex : '';
    const fromHex = customHex || gradient.fromHex;

    const vars = computeBrandCssVars(fromHex, isDark);
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
