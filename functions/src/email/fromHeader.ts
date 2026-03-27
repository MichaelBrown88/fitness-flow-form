/**
 * Parse Resend-style From headers: "Name <email@domain>" or plain email.
 */

export function parseEmailFromFromField(from: string): string | null {
  const t = from.trim();
  const angle = t.match(/<([^>]+)>/);
  if (angle?.[1]) {
    const inner = angle[1].trim();
    return inner.length > 0 ? inner : null;
  }
  if (/^[^\s<>]+@[^\s<>]+\.[^\s<>]+$/.test(t)) {
    return t;
  }
  return null;
}

export function parseDisplayNameFromFromField(from: string): string | null {
  const t = from.trim();
  const m = t.match(/^(.+?)\s*</);
  if (!m?.[1]) return null;
  let n = m[1].trim();
  if (
    (n.startsWith('"') && n.endsWith('"')) ||
    (n.startsWith("'") && n.endsWith("'"))
  ) {
    n = n.slice(1, -1).trim();
  }
  return n.length > 0 ? n : null;
}
