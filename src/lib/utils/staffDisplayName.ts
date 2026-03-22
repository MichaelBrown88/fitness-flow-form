/**
 * Staff (coach/admin) display names: Firebase Auth often has no displayName for email/password
 * sign-in, so we historically stored the literal "Coach". Prefer real names, then email-derived labels.
 */

import type { User } from 'firebase/auth';
import type { UserProfile } from '@/types/auth';

/** Firestore / Auth fallback used when no name was available at signup. */
export const GENERIC_STAFF_DISPLAY_PLACEHOLDER = 'Coach';

function humanizeEmailLocalPart(local: string): string {
  const cleaned = local.replace(/[._-]+/g, ' ').trim();
  if (!cleaned) return '';
  return cleaned
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * When the local part is generic (e.g. "coach"), disambiguate with the mail host so the UI is not
 * identical for every staff account.
 */
function displayNameFromEmailFallback(email: string): string {
  const [localRaw, domainRaw] = email.split('@');
  const local = localRaw?.trim() ?? '';
  if (!local) return GENERIC_STAFF_DISPLAY_PLACEHOLDER;
  const human = humanizeEmailLocalPart(local);
  if (human && !/^coach$/i.test(human)) return human;
  const host = domainRaw?.split('.')[0]?.trim();
  if (host && !/^(coach|mail|email|hello|info|admin)$/i.test(host)) {
    return `${human || local} @ ${host}`;
  }
  return email;
}

/** Initial displayName when creating a userProfiles row (staff). */
export function deriveInitialStaffDisplayName(
  email: string | null | undefined,
  authDisplayName: string | null | undefined,
): string {
  const ad = authDisplayName?.trim();
  if (ad && ad !== GENERIC_STAFF_DISPLAY_PLACEHOLDER) return ad;
  if (email?.trim()) {
    const fromE = displayNameFromEmailFallback(email.trim());
    if (fromE && fromE !== GENERIC_STAFF_DISPLAY_PLACEHOLDER) return fromE;
  }
  return GENERIC_STAFF_DISPLAY_PLACEHOLDER;
}

/** Full name for greetings and headers (profile + Auth + email). */
export function staffPreferredFullDisplayName(
  profile: UserProfile | null | undefined,
  firebaseUser: User | null | undefined,
): string {
  const pd = profile?.displayName?.trim();
  if (pd && pd !== GENERIC_STAFF_DISPLAY_PLACEHOLDER) return pd;
  const ad = firebaseUser?.displayName?.trim();
  if (ad && ad !== GENERIC_STAFF_DISPLAY_PLACEHOLDER) return ad;
  if (firebaseUser?.email?.trim()) {
    return displayNameFromEmailFallback(firebaseUser.email.trim());
  }
  return pd || GENERIC_STAFF_DISPLAY_PLACEHOLDER;
}

/** First token for “Hi, {name}” style copy. */
export function staffPreferredFirstName(
  profile: UserProfile | null | undefined,
  firebaseUser: User | null | undefined,
): string {
  const full = staffPreferredFullDisplayName(profile, firebaseUser);
  return full.split(/\s+/)[0] || GENERIC_STAFF_DISPLAY_PLACEHOLDER;
}

/** Coach roster / org subcollection rows (may only have displayName + email). */
export function resolveStaffRosterDisplayName(
  displayName: string | undefined,
  email: string | undefined,
): string {
  const d = displayName?.trim();
  if (d && d !== GENERIC_STAFF_DISPLAY_PLACEHOLDER) return d;
  if (email?.trim()) return displayNameFromEmailFallback(email.trim());
  if (d) return d;
  return 'Unknown';
}
