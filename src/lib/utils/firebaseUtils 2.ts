/**
 * Deeply sanitize an object for Firestore by converting all undefined values to null
 */
export function sanitizeForFirestore(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object') return obj;
  
  // Handle common non-plain objects that shouldn't be recursed
  if (obj instanceof Date) return obj;
  
  // Handle Firestore sentinels (serverTimestamp, etc)
  // These often have a specific constructor or internal property
  if (obj.constructor && (
    obj.constructor.name === 'FieldValue' || 
    obj.constructor.name === 'Timestamp' ||
    obj._methodName !== undefined // internal marker for some sentinels
  )) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForFirestore(item));
  }
  
  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    // skip internal firebase properties if any leaked in
    if (key.startsWith('_')) continue;
    sanitized[key] = sanitizeForFirestore(value);
  }
  return sanitized;
}

