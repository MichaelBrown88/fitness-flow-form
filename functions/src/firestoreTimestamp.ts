/**
 * Normalise Firestore timestamp-like values from documents (Timestamp, Date, plain { seconds }, or toDate()).
 */

import * as admin from 'firebase-admin';

export function firestoreValueToDate(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return value;
  if (value instanceof admin.firestore.Timestamp) return value.toDate();

  if (typeof value === 'object' && value !== null && 'seconds' in value) {
    const obj = value as { seconds: unknown; nanoseconds?: unknown };
    const sec = typeof obj.seconds === 'number' ? obj.seconds : Number(obj.seconds);
    if (!Number.isFinite(sec)) return null;
    const nano =
      typeof obj.nanoseconds === 'number' ? obj.nanoseconds : Number(obj.nanoseconds ?? 0);
    return new admin.firestore.Timestamp(sec, Number.isFinite(nano) ? nano : 0).toDate();
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { toDate?: () => Date }).toDate === 'function'
  ) {
    try {
      return (value as { toDate: () => Date }).toDate();
    } catch {
      return null;
    }
  }

  return null;
}
