/**
 * Deeply sanitize an object for Firestore by converting all undefined values to null
 */
export function sanitizeForFirestore(obj: unknown): unknown {
  if (obj === undefined) return null;
  if (typeof obj === 'number' && !Number.isFinite(obj)) return null;
  if (obj === null || typeof obj !== 'object') return obj;
  
  // Handle common non-plain objects that shouldn't be recursed
  if (obj instanceof Date) return obj;
  
  // Handle Firestore sentinels (serverTimestamp, etc)
  // These often have a specific constructor or internal property
  const constructorName = obj.constructor?.name;
  if (
    constructorName === 'FieldValue' || 
    constructorName === 'Timestamp' ||
    '_methodName' in obj // internal marker for some sentinels
  ) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForFirestore(item));
  }
  
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    // skip internal firebase properties if any leaked in
    if (key.startsWith('_')) continue;

    // OPTIMIZATION: Strip large base64 strings to prevent Firestore 1MB limit errors
    // These should be stored in Firebase Storage instead.
    if (typeof value === 'string' && value.startsWith('data:image/') && value.length > 10000) {
      sanitized[key] = '(base64_removed_for_storage_limit)';
      continue;
    }

    sanitized[key] = sanitizeForFirestore(value);
  }
  return sanitized;
}

