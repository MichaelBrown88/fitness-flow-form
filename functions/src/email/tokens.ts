/**
 * Fixed light palette for transactional HTML email.
 * Aligns with docs/DESIGN_SYSTEM.md (email/PDF exception surfaces).
 * Volt accent matches light-mode --gradient-from-hex in src/index.css (~#dfff00).
 */

export const EMAIL_TOKENS = {
  pageBg: '#f4f4f5',
  cardBg: '#ffffff',
  textPrimary: '#18181b',
  textMuted: '#71717a',
  border: '#e4e4e7',
  /** Volt / chartreuse — primary brand accent */
  accent: '#dfff00',
  /** Text on accent CTA buttons */
  accentOnAccent: '#0f172a',
  headerBarBg: '#fafafa',
  fontStack: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
} as const;
