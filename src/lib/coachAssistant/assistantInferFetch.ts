/**
 * When the model promises to load full client detail but omits fetch_client_data in JSON,
 * infer a single-client fetch from prose + roster name match so the follow-up stream still runs.
 */

import type { ClientGroup } from '@/hooks/dashboard/types';
import { findClientsMentionedInText } from '@/lib/coachAssistant/assistantThinkingSteps';
import { formatClientDisplayName } from '@/lib/utils/clientDisplayName';

function assistantSignalsImplicitFetch(assistantPlainText: string): boolean {
  const a = assistantPlainText;
  if (a.length < 14) return false;
  return (
    /\blet me\s+(pull up|open|load|fetch)\b/i.test(a) ||
    /\bI'll\s+(pull up|open|load|fetch)\b/i.test(a) ||
    /\bI\s+will\s+(pull up|open|load|fetch)\b/i.test(a) ||
    /\bpull up (his|her|their) full profile\b/i.test(a) ||
    /\b(open|load|fetch)\s+(his|her|their)\s+full (profile|details|file)\b/i.test(a) ||
    (/\bdive deeper\b/i.test(a) && /\b(profile|pillar|detail|full)\b/i.test(a))
  );
}

/** Match when a coach uses a first name or partial name (e.g. "Fawaz") — only safe when it resolves to one roster row. */
function findClientsByNameTokenOverlap(text: string, clients: ClientGroup[]): ClientGroup[] {
  const lower = text.toLowerCase();
  const hits: ClientGroup[] = [];
  for (const c of clients) {
    const display = formatClientDisplayName(c.name);
    const tokens = display
      .toLowerCase()
      .split(/\s+/g)
      .filter((t) => t.length >= 3);
    if (tokens.some((t) => lower.includes(t))) {
      hits.push(c);
    }
  }
  const seen = new Set<string>();
  const unique: ClientGroup[] = [];
  for (const c of hits) {
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    unique.push(c);
  }
  return unique;
}

function resolveSingleMentionedClient(
  userText: string,
  assistantPlainText: string,
  clients: ClientGroup[],
): ClientGroup | null {
  let mentioned = findClientsMentionedInText(userText, clients);
  if (mentioned.length !== 1) {
    mentioned = findClientsMentionedInText(assistantPlainText, clients);
  }
  if (mentioned.length !== 1) {
    mentioned = findClientsByNameTokenOverlap(userText, clients);
  }
  if (mentioned.length !== 1) {
    mentioned = findClientsByNameTokenOverlap(assistantPlainText, clients);
  }
  return mentioned.length === 1 ? mentioned[0] : null;
}

/**
 * Returns at most one client id when it is safe to auto-trigger fetch_client_data.
 */
export function inferFetchClientIdsFromAssistantProse(params: {
  userText: string;
  assistantPlainText: string;
  clients: ClientGroup[];
}): string[] {
  const { userText, assistantPlainText, clients } = params;
  if (!assistantSignalsImplicitFetch(assistantPlainText)) return [];

  const one = resolveSingleMentionedClient(userText, assistantPlainText, clients);
  return one ? [one.id] : [];
}
