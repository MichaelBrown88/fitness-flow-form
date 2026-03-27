/**
 * Shared invite email normalization and validation for coach invites.
 */

/** RFC 5322–style practical check; avoids obviously invalid addresses. */
const COACH_INVITE_EMAIL_PATTERN =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function normalizeCoachInviteEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidCoachInviteEmail(email: string): boolean {
  const n = normalizeCoachInviteEmail(email);
  return n.length > 3 && n.length <= 254 && COACH_INVITE_EMAIL_PATTERN.test(n);
}

const ORG_ADMIN_ROLES = new Set(['owner', 'admin', 'org_admin']);

/**
 * True if the auth user may send coach invites for this org (owner or org admin role on roster).
 */
export function canSendCoachInvites(params: {
  orgOwnerId: string | undefined;
  coachRole: string | undefined;
  authUid: string;
}): boolean {
  const { orgOwnerId, coachRole, authUid } = params;
  if (orgOwnerId === authUid) return true;
  if (coachRole && ORG_ADMIN_ROLES.has(coachRole)) return true;
  return false;
}

/**
 * When allowedDomains is non-empty, the invitee must use an address at one of these hostnames
 * (lowercase, no @ prefix). Empty allowlist = any valid domain (default).
 */
export function isCoachInviteEmailDomainAllowed(
  normalizedEmail: string,
  allowedDomains: readonly string[],
): boolean {
  if (allowedDomains.length === 0) return true;
  const at = normalizedEmail.lastIndexOf('@');
  if (at < 1 || at === normalizedEmail.length - 1) return false;
  const domain = normalizedEmail.slice(at + 1);
  return allowedDomains.includes(domain);
}
