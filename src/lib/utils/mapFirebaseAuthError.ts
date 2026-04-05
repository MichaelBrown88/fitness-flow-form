/**
 * Map Firebase Auth error codes to coach-friendly copy (technical detail stays in logs).
 */
export function mapFirebaseAuthError(err: unknown, fallback: string): string {
  const code =
    err && typeof err === 'object' && 'code' in err && typeof (err as { code: unknown }).code === 'string'
      ? (err as { code: string }).code
      : '';

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Email or password is incorrect. Try again or use Forgot password.';
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Contact support if you need help.';
    case 'auth/too-many-requests':
      return 'Too many sign-in attempts. Wait a few minutes, then try again.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Sign-in was cancelled.';
    case 'auth/account-exists-with-different-credential':
      return 'An account with that email already exists. Try signing in with Google or Apple instead.';
    default:
      return fallback;
  }
}
