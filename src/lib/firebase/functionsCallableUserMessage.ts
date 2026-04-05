/**
 * Map Firebase callable / HTTPS errors to coach-visible strings (no secrets).
 */
export function functionsCallableUserMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object') {
    const rec = err as Record<string, unknown>;
    const code = typeof rec.code === 'string' ? rec.code : '';

    if (code === 'functions/resource-exhausted') {
      return 'Too many requests. Please wait a moment and try again.';
    }
    if (code === 'functions/unauthenticated') {
      return 'Your session expired. Sign in again, then retry.';
    }
    if (code === 'functions/permission-denied') {
      return 'You do not have permission for this action.';
    }
    if (code === 'functions/not-found') {
      return 'The requested service is not available. Try again later.';
    }
    if (code === 'functions/internal') {
      return 'Something went wrong on our side. Please try again in a few minutes.';
    }

    const details = rec.details;
    if (typeof details === 'string' && details.trim()) {
      return details.trim();
    }
    if (details && typeof details === 'object' && details !== null) {
      const d = details as { message?: unknown };
      if (typeof d.message === 'string' && d.message.trim()) {
        return d.message.trim();
      }
    }

    if (typeof rec.message === 'string' && rec.message.trim()) {
      const m = rec.message.trim();
      if (!/^Firebase:\s/i.test(m)) {
        return m;
      }
      const paren = m.match(/\(([^)]+)\)\s*$/);
      if (paren && paren[1] && paren[1] !== 'internal') {
        return paren[1].replace(/-/g, ' ');
      }
    }
  }

  if (err instanceof Error && err.message.trim()) {
    return err.message.trim();
  }

  return fallback;
}
