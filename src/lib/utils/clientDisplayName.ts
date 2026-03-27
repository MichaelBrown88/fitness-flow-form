function titleCaseWord(w: string): string {
  const s = w.trim();
  if (!s) return s;
  if (/^[a-z]{2}$/i.test(s)) return s.toUpperCase();
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

/**
 * Read-only formatting for dashboard labels when `clientName` is a slug, all-lowercase phrase,
 * or mixed. Prefer repairing Firestore; this improves readability until data is migrated.
 */
export function formatClientDisplayName(stored: string): string {
  const t = stored.trim();
  if (!t) return stored;
  if (t.includes(' ')) {
    return t.split(/\s+/g).filter(Boolean).map(titleCaseWord).join(' ');
  }
  if (/^[a-z0-9]+(?:-[a-z0-9]+)+$/i.test(t)) {
    return t
      .split(/-+/g)
      .filter(Boolean)
      .map(titleCaseWord)
      .join(' ');
  }
  return titleCaseWord(t);
}
