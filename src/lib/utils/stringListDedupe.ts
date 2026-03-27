/**
 * Dedupe trimmed strings case-insensitively, preserving first-seen casing.
 * Optional max length stops after N unique items.
 */
export function dedupeTrimmedStrings(list: string[], max?: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of list) {
    const n = item.trim().toLowerCase();
    if (n && !seen.has(n)) {
      seen.add(n);
      out.push(item.trim());
      if (max != null && out.length >= max) break;
    }
  }
  return out;
}
