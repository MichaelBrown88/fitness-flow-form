import * as fs from 'node:fs';
import * as path from 'node:path';
import { config as loadEnv } from 'dotenv';

const functionsRoot = path.resolve(__dirname, '..');

function loadFunctionsEnvFiles(): void {
  const primaryEnv = path.join(functionsRoot, '.env');
  const primaryLocal = path.join(functionsRoot, '.env.local');
  const cwdEnv = path.join(process.cwd(), '.env');
  const cwdLocal = path.join(process.cwd(), '.env.local');

  if (fs.existsSync(primaryEnv)) {
    loadEnv({ path: primaryEnv, override: true });
  } else if (fs.existsSync(cwdEnv)) {
    loadEnv({ path: cwdEnv, override: true });
  }

  if (fs.existsSync(primaryLocal)) {
    loadEnv({ path: primaryLocal, override: true });
  } else if (fs.existsSync(cwdLocal)) {
    loadEnv({ path: cwdLocal, override: true });
  }
}

loadFunctionsEnvFiles();

export const APP_HOST =
  process.env.PUBLIC_APP_HOST ||
  process.env.VITE_PUBLIC_APP_HOST ||
  'https://app.one-assess.com';

export const STORAGE_REPORT_PREFIX = 'reports';

/** Strip whitespace, first line only, quotes, and invisible chars (bad pastes). */
function normalizeEnvSecret(raw: string | undefined): string {
  if (!raw) return '';
  let t = raw.trim().split(/\r?\n/)[0]?.trim() ?? '';
  t = t.replace(/[\u200B-\u200D\uFEFF]/g, '');
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    t = t.slice(1, -1).trim();
  }
  return t;
}

export const RESEND_API_KEY = normalizeEnvSecret(process.env.RESEND_API_KEY);
export const RESEND_FROM =
  normalizeEnvSecret(process.env.RESEND_FROM) || 'noreply@one-assess.com';

/**
 * Optional. When set, the onboarding welcome email is sent from this address (must be a verified
 * sender/domain in Resend), e.g. `Michael <michael@one-assess.com>`. Uses personal founder copy.
 * When unset, the product welcome uses `RESEND_FROM` and the shorter activation template.
 */
export const FOUNDER_WELCOME_FROM = (process.env.FOUNDER_WELCOME_FROM || '').trim();

/** Closing line of the founder welcome (e.g. `Michael`). Falls back to display name in FOUNDER_WELCOME_FROM. */
export const FOUNDER_SIGN_OFF_NAME = (process.env.FOUNDER_SIGN_OFF_NAME || '').trim();

/** Optional explicit inbox for the “Send feedback” mailto link; defaults to the email in FOUNDER_WELCOME_FROM. */
export const FOUNDER_FEEDBACK_EMAIL = normalizeEnvSecret(process.env.FOUNDER_FEEDBACK_EMAIL);

/** Absolute HTTPS URL to logo image for HTML email header; omit to use text-only masthead. */
export const EMAIL_ASSETS_LOGO_URL = (process.env.EMAIL_ASSETS_LOGO_URL || '').trim();

export const SIGNED_URL_TTL_HOURS = Number(process.env.SIGNED_URL_TTL_HOURS || 24);

function parseCommaSeparatedDomains(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase().replace(/^@+/u, ''))
    .filter((d) => d.length > 0 && !d.includes(' '));
}

/**
 * When non-empty, coach invite emails must be at one of these domains (exact hostname match).
 * Comma-separated, e.g. `one-assess.com,partner.org`. Unset = no domain restriction.
 */
export const COACH_INVITE_ALLOWED_EMAIL_DOMAINS = parseCommaSeparatedDomains(
  process.env.COACH_INVITE_ALLOWED_EMAIL_DOMAINS,
);







