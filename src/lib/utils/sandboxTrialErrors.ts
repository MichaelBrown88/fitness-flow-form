/**
 * User-facing and dev-hint messages for /try (anonymous sandbox) bootstrap failures.
 */

export function formatSandboxBootstrapError(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = String((err as { code: unknown }).code);
    if (code === 'auth/admin-restricted-operation' || code === 'auth/operation-not-allowed') {
      return 'Anonymous sign-in is not enabled for this project. Enable it in Firebase Console → Authentication → Sign-in method.';
    }
    if (code === 'permission-denied') {
      return import.meta.env.DEV
        ? 'Permission denied writing trial data. Check Firestore rules for organizations/{uid}_sandbox and coaches self-create.'
        : 'Could not start your trial. Please try again or create an account from the home page.';
    }
  }
  return 'Could not start your trial. Please try again.';
}
