/**
 * Brand token computation — pure functions used by both ThemeManager (live CSS vars)
 * and BrandingPreview (scoped inline-style mockup).
 *
 * All functions are side-effect free so they can be called during render.
 *
 * ─── Core principle ────────────────────────────────────────────────────────
 *
 * Bright neon colours (volt, pear) CAN work in light mode — you just flip
 * which element carries the colour:
 *
 *   ❌ White bg + volt text              → fails contrast (~1.3:1)
 *   ✅ Volt bg + dark charcoal text      → passes (14:1)
 *
 * So --primary stays vivid in BOTH modes. --primary-foreground is computed
 * by WCAG contrast (dark text on bright colours, white on dark colours).
 *
 * --gradient-dark is the contrast-safe darkened version, used ONLY when the
 * brand colour must appear AS TEXT on a white/light surface (links, labels).
 */

// ---------------------------------------------------------------------------
// Colour math
// ---------------------------------------------------------------------------

/** WCAG relative luminance for a sRGB hex string (e.g. `#bcff00`). */
export function relativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const lin = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrastRatio(lumA: number, lumB: number): number {
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

const CHARCOAL_HEX = '#0e1218';

/**
 * Returns '#ffffff' or CHARCOAL_HEX — whichever has higher contrast on `brandHex`.
 * e.g. volt (#bcff00) → charcoal   |   navy → white
 */
export function primaryFgForBrand(brandHex: string): string {
  const bg = relativeLuminance(brandHex);
  const whiteContrast = contrastRatio(bg, 1);
  const charcoalContrast = contrastRatio(bg, relativeLuminance(CHARCOAL_HEX));
  return whiteContrast >= charcoalContrast ? '#ffffff' : CHARCOAL_HEX;
}

/** Convert hex to { h (0–360), s (0–100), l (0–100) }. */
export function hexToHsl(hex: string): { h: number; s: number; l: number } {
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
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/** Convert HSL integers back to a hex string. */
export function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

/** Convert hex to the `"H S% L%"` string format used by Tailwind/shadcn CSS variables. */
export function hexToHslString(hex: string): string {
  const { h, s, l } = hexToHsl(hex);
  return `${h} ${s}% ${l}%`;
}

// ---------------------------------------------------------------------------
// Accessibility helpers
// ---------------------------------------------------------------------------

/**
 * Binary-searches for the HIGHEST lightness value (most vivid) at a given
 * hue+saturation that still achieves `minRatio` contrast against `bgLuminance`.
 *
 * Used for --gradient-dark (text-on-white) and similar text-colour use cases.
 * Never used for button/badge backgrounds — those use the vivid colour directly.
 */
function findMaxPassingLightness(
  h: number,
  s: number,
  bgLuminance: number,
  minRatio: number,
  maxL = 55,
): number {
  let lo = 0;
  let hi = maxL;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    const lum = relativeLuminance(hslToHex(h, s, mid));
    if (contrastRatio(bgLuminance, lum) >= minRatio) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return Math.floor(lo);
}

/**
 * Ensure a colour is light enough to be visible on a dark background.
 * Dark inputs (navy, forest green) are boosted; bright inputs untouched.
 */
function ensureDarkModeLightness(hex: string, minL = 55): string {
  const { h, s, l } = hexToHsl(hex);
  if (l >= minL) return hex;
  return hslToHex(h, s, minL);
}

// ---------------------------------------------------------------------------
// Preview tokens — self-contained colour set for BrandingPreview mockup.
// Uses vivid primary for buttons/filled elements, accessible version for text.
// ---------------------------------------------------------------------------

export interface BrandPreviewTokens {
  bg: string;
  surface: string;
  border: string;
  text: string;
  textMuted: string;
  /** Vivid brand colour — used as bg for buttons, badges, active indicators. */
  primary: string;
  /** Text/icon colour ON top of primary-coloured backgrounds (auto WCAG). */
  primaryFg: string;
  /** Accessible darkened colour for brand text on white (links, inline labels). */
  primaryText: string;
  /** Very light brand tint for nav item backgrounds, card accents. */
  primarySubtle: string;
}

export function computePreviewTokens(brandHex: string, isDark: boolean): BrandPreviewTokens {
  const safeHex = /^#[0-9a-fA-F]{6}$/.test(brandHex) ? brandHex : '#bcff00';
  const { h, s } = hexToHsl(safeHex);

  if (isDark) {
    const primary = ensureDarkModeLightness(safeHex);
    const { h: ph } = hexToHsl(primary);
    return {
      bg: '#0d1117',
      surface: '#161b22',
      border: '#21262d',
      text: '#e6edf3',
      textMuted: '#7d8590',
      primary,
      primaryFg: primaryFgForBrand(primary),
      primaryText: primary,  // vivid colour IS accessible on dark bg
      primarySubtle: hslToHex(ph, Math.max(20, s - 35), 14),
    };
  }

  // Light mode: primary stays vivid — buttons/badges are volt/brand-coloured.
  // primaryFg is dark charcoal for bright hues (auto-computed).
  // primaryText is the darkened version for text-on-white contexts.
  const bgLuminance = relativeLuminance('#f6f8fa');
  const textL = findMaxPassingLightness(h, s, bgLuminance, 4.5); // AA for text
  return {
    bg: '#f6f8fa',
    surface: '#ffffff',
    border: '#d0d7de',
    text: '#1f2328',
    textMuted: '#656d76',
    primary: safeHex,                         // VIVID — volt stays volt
    primaryFg: primaryFgForBrand(safeHex),    // dark charcoal for bright, white for dark
    primaryText: hslToHex(h, s, textL),       // AA-safe for text-on-white
    primarySubtle: hslToHex(h, Math.max(45, s - 15), 93),
  };
}

// ---------------------------------------------------------------------------
// CSS variable map — used by ThemeManager to inject live app-wide tokens.
// ---------------------------------------------------------------------------

/**
 * Returns a map of CSS variable name → HSL value string to set on `:root`.
 *
 * Variable roles:
 *
 *   --primary              Vivid brand colour in both modes.
 *                          Used for: button bg, badge bg, active indicator bg,
 *                          focus ring, progress bar fill.
 *
 *   --primary-foreground   Text on --primary surfaces. Auto WCAG:
 *                          dark charcoal on volt/yellow, white on blue/navy.
 *
 *   --gradient-dark        Accessible darkened version of the brand hue.
 *                          Used for: text links, inline text accents,
 *                          any place the brand colour appears AS text on white.
 *
 *   --brand-accent         Alias for --primary (vivid). Useful for decorative
 *                          SVG fills and colour-mix() expressions.
 *
 *   --gradient-light/medium   Recognisable light tints of the brand hue,
 *                              for card/nav active backgrounds.
 */
export function computeBrandCssVars(
  brandHex: string,
  toHex: string,
  isDark: boolean,
): Record<string, string> {
  const { h, s } = hexToHsl(brandHex);

  if (isDark) {
    const primary = ensureDarkModeLightness(brandHex);
    const primaryTo = ensureDarkModeLightness(toHex);
    const primaryHsl = hexToHslString(primary);
    const primaryToHsl = hexToHslString(primaryTo);
    const fg = primaryFgForBrand(primary);
    const fgHsl = fg === '#ffffff' ? '0 0% 100%' : '220 20% 8%';
    const { h: ph, s: ps } = hexToHsl(primary);
    return {
      '--gradient-from': primaryHsl,
      '--gradient-to': primaryToHsl,
      '--primary': primaryHsl,
      '--ring': primaryHsl,
      '--sidebar-primary': primaryHsl,
      '--sidebar-ring': primaryHsl,
      '--brand-accent': primaryHsl,
      '--gradient-light': `${ph} ${Math.max(18, ps - 35)}% 12%`,
      '--gradient-medium': `${ph} ${Math.max(22, ps - 28)}% 17%`,
      '--gradient-dark': `${ph} ${Math.min(70, ps + 5)}% 60%`,
      '--primary-foreground': fgHsl,
      '--sidebar-primary-foreground': fgHsl,
    };
  }

  // ── Light mode ────────────────────────────────────────────────────────────
  // --primary  = vivid brand hex. Volt stays volt, blue stays blue.
  // Buttons are brand-coloured with auto-computed dark/light text on top.
  const primaryHsl = hexToHslString(brandHex);
  const primaryToHsl = hexToHslString(toHex);
  const fg = primaryFgForBrand(brandHex);
  const fgHsl = fg === '#ffffff' ? '0 0% 100%' : '220 20% 8%';

  // --gradient-dark: the accessible darkened version for text-on-white contexts.
  // Uses strict AA (4.5:1) so it's safe for body-size text.
  const bgLuminance = relativeLuminance('#f6f8fa');
  const textL = findMaxPassingLightness(h, s, bgLuminance, 4.5);
  const gradientDark = `${h} ${s}% ${textL}%`;

  // Tints — strongly saturated so they feel like the brand, not grey.
  const lightTint = `${h} ${Math.max(50, s - 15)}% 93%`;
  const mediumTint = `${h} ${Math.max(55, s - 10)}% 87%`;

  return {
    '--gradient-from': primaryHsl,
    '--gradient-to': primaryToHsl,
    '--primary': primaryHsl,           // VIVID
    '--ring': primaryHsl,
    '--sidebar-primary': primaryHsl,
    '--sidebar-ring': primaryHsl,
    '--brand-accent': primaryHsl,
    '--gradient-light': lightTint,
    '--gradient-medium': mediumTint,
    '--gradient-dark': gradientDark,   // accessible, text-on-white only
    '--primary-foreground': fgHsl,     // dark charcoal for volt/yellow, white for navy
    '--sidebar-primary-foreground': fgHsl,
  };
}
