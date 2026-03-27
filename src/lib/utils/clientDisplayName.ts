/**
 * Read-only formatting when `clientName` was stored as a URL slug (hyphenated, no spaces).
 * Prefer fixing Firestore; this improves dashboard readability until data is repaired.
 */
export function formatClientDisplayName(stored: string): string {
  const t = stored.trim();
  if (!t) return stored;
  if (t.includes(' ')) return t;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)+$/i.test(t)) return t;
  return t
    .split(/-+/g)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}
