import type { Timestamp } from 'firebase/firestore';

/**
 * Safe conversion for client Timestamp fields (null, corrupt, or throwing toDate).
 */
export function safeFirestoreTimestampToDate(
  ts: Timestamp | null | undefined,
): Date | null {
  if (ts == null) return null;
  try {
    const d = ts.toDate();
    if (Number.isNaN(d.getTime())) return null;
    return d;
  } catch {
    return null;
  }
}

/**
 * Safe locale date string for dashboard tables (handles null and corrupt Timestamp without throwing).
 */
export function formatFirestoreTimestampLocale(ts: Timestamp | null | undefined): string {
  const d = safeFirestoreTimestampToDate(ts);
  if (d == null) return '—';
  return d.toLocaleDateString();
}
