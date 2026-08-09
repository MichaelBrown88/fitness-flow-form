/**
 * Client-facing copy scrubber: strips legacy dev prefixes, translates clinical
 * movement labels into plain language, and removes lab units clients don't need.
 */

/** Ordered clinical → plain-language replacements (longest/most specific first). */
const PLAIN_LANGUAGE_MAP: ReadonlyArray<[RegExp, string]> = [
  [/knee valgus \(knees cave inward\)/gi, 'Knees cave inward'],
  [/knee varus \(knees bow outward\)/gi, 'Knees bow outward'],
  [/valgus \(knees cave in\)/gi, 'Knees cave inward'],
  [/varus \(knees bow out\)/gi, 'Knees bow outward'],
  [/\bexcessive pronation\b/gi, 'Arches roll inward'],
  [/\bkyphosis\b/gi, 'rounded upper back'],
  [/\blordosis\b/gi, 'arched lower back'],
];

export function sanitizeClientReportCopy(text: string): string {
  let out = text
    .replace(/^Placeholder:\s*/i, '')
    .replace(/\bPlaceholder:\s*/gi, '');

  for (const [pattern, replacement] of PLAIN_LANGUAGE_MAP) {
    out = out.replace(pattern, replacement);
  }

  // Lab units mean nothing to clients — the plain "Fitness level" framing carries the number.
  out = out.replace(/\s*ml\/kg\/min/gi, '');

  return out.trim();
}
