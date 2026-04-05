/**
 * True when a Firestore or transport error is worth retrying (queue for later / user retry).
 * Does not include permission or validation failures.
 */
export function isRetryableFirestoreOrNetworkError(err: unknown): boolean {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = String((err as { code: unknown }).code);
    switch (code) {
      case 'unavailable':
      case 'deadline-exceeded':
      case 'resource-exhausted':
      case 'aborted':
      case 'cancelled':
      case 'internal':
      case 'network-request-failed':
        return true;
      default:
        break;
    }
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return true;
  }

  const msg =
    err instanceof Error
      ? err.message.toLowerCase()
      : typeof err === 'string'
        ? err.toLowerCase()
        : '';
  if (msg.includes('network') || msg.includes('failed to fetch')) {
    return true;
  }
  if (err instanceof TypeError && msg.includes('fetch')) {
    return true;
  }
  return false;
}
