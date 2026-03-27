import type { Timestamp } from 'firebase/firestore';

/**
 * Safe locale date string for dashboard tables (handles null and corrupt Timestamp without throwing).
 */
export function formatFirestoreTimestampLocale(ts: Timestamp | null | undefined): string {
  if (ts == null) return '—';
  try {
    const d = ts.toDate();
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString();
  } catch {
    return '—';
  }
}
