/**
 * User-facing messages for /try (anonymous sandbox) bootstrap failures.
 * Never show raw Firebase Console instructions to end users.
 */

export const SANDBOX_TRY_COPY = {
  USER_AUTH_UNAVAILABLE:
    'The instant try experience is not available right now. You can still get started with a free account — it only takes a minute.',
  USER_GENERIC: 'We could not start your trial. Please try again, or create a free account to continue.',
  USER_PERMISSION:
    'We could not set up your trial workspace. Please try again in a moment, or create a free account instead.',
  CTA_CREATE_ACCOUNT: 'Create free account',
} as const;

export function formatSandboxBootstrapError(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = String((err as { code: unknown }).code);
    if (code === 'auth/admin-restricted-operation' || code === 'auth/operation-not-allowed') {
      return SANDBOX_TRY_COPY.USER_AUTH_UNAVAILABLE;
    }
    if (code === 'permission-denied') {
      return import.meta.env.DEV
        ? 'Permission denied writing trial data. Deploy Firestore rules for sandbox orgs and coach self-create, or create an account.'
        : SANDBOX_TRY_COPY.USER_PERMISSION;
    }
  }
  return SANDBOX_TRY_COPY.USER_GENERIC;
}
