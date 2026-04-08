/**
 * Short, contextual status lines for the assistant "thinking" UI (pre-stream).
 * Derived from the coach's message and workspace intent — not from the model.
 */

import type { CoachAssistantInteractionMode } from '@/types/coachAssistant';
import type { ClientGroup } from '@/hooks/dashboard/types';
import { formatClientDisplayName } from '@/lib/utils/clientDisplayName';

const MIN_STEPS = 4;
const MAX_STEPS = 8;

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

function dedupePreserveOrder(steps: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of steps) {
    const k = normalize(s);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(s.trim());
  }
  return out;
}

function padToMinimum(steps: string[]): string[] {
  const out = [...steps];
  const generic = ['Drafting your reply…', 'Almost done…'];
  let g = 0;
  while (out.length < MIN_STEPS && g < generic.length) {
    const next = generic[g];
    g += 1;
    if (!out.some((x) => normalize(x) === normalize(next))) out.push(next);
  }
  while (out.length < MIN_STEPS) {
    out.push('Finishing up…');
  }
  return out.slice(0, MAX_STEPS);
}

/** Clients whose display or legal name appears in the message (max 3). */
export function findClientsMentionedInText(userText: string, clients: ClientGroup[]): ClientGroup[] {
  const lower = userText.toLowerCase();
  const hits: ClientGroup[] = [];
  for (const c of clients) {
    const display = formatClientDisplayName(c.name);
    const dNorm = normalize(display);
    const nNorm = normalize(c.name);
    if (dNorm.length >= 2 && lower.includes(dNorm)) {
      hits.push(c);
      continue;
    }
    if (nNorm.length >= 2 && lower.includes(nNorm)) {
      hits.push(c);
    }
  }
  const seen = new Set<string>();
  const unique: ClientGroup[] = [];
  for (const c of hits) {
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    unique.push(c);
    if (unique.length >= 3) break;
  }
  return unique;
}

export type AssistantThinkingStepsContext = 'primary' | 'client_followup';

export function buildAssistantThinkingSteps(params: {
  userText: string;
  intentFacts: Record<string, unknown>;
  clients: ClientGroup[];
  isFirstMessageInThread: boolean;
  interactionMode: CoachAssistantInteractionMode;
  context: AssistantThinkingStepsContext;
  followUpClientDisplayName?: string;
}): string[] {
  const { userText, intentFacts, clients, isFirstMessageInThread, interactionMode, context, followUpClientDisplayName } =
    params;
  const t = userText.trim();

  if (context === 'client_followup') {
    const name = followUpClientDisplayName?.trim() || 'this client';
    const lines = [
      `Opening full details for ${name}…`,
      'Merging that with your question…',
      'Drafting a detailed answer…',
      'Almost done…',
    ];
    return padToMinimum(dedupePreserveOrder(lines));
  }

  const intent = typeof intentFacts.intent === 'string' ? intentFacts.intent : 'chat';
  const steps: string[] = [];

  if (interactionMode === 'data') {
    steps.push('Reading your live workspace data…');
  } else {
    steps.push('Connecting Fitness AI with your workspace…');
  }

  switch (intent) {
    case 'slash_today':
      steps.push("Gathering today's priorities…", 'Checking due dates and tasks…', 'Shaping your brief…');
      break;
    case 'slash_clients':
      steps.push('Scanning your client roster…', 'Spotting who needs attention…');
      break;
    case 'slash_work':
      steps.push('Loading reassessment queue & calendar…', 'Sorting by urgency…');
      break;
    case 'slash_share':
      steps.push('Collecting public report & ARC™ links…');
      break;
    case 'slash_help':
      steps.push('Loading command hints…');
      break;
    default:
      if (isFirstMessageInThread) {
        steps.push('Building a quick roster snapshot…');
      } else {
        steps.push('Factoring in recent chat…');
      }
      break;
  }

  const mentioned = findClientsMentionedInText(t, clients);
  for (const c of mentioned) {
    steps.push(`Pulling ${formatClientDisplayName(c.name)}'s latest info…`);
  }

  if (/\b(chart|radar|graph|table|visual|axis|score|pillar)\b/i.test(t)) {
    steps.push('Lining up numbers for visuals…');
  }
  if (/\b(arc|roadmap|milestone|phase)\b/i.test(t)) {
    steps.push('Checking ARC™ / roadmap context…');
  }
  if (/\b(assessment|reassess|retest|partial)\b/i.test(t)) {
    steps.push('Checking assessment cadence…');
  }
  if (/\b(overdue|due soon|schedule|calendar|queue)\b/i.test(t)) {
    steps.push('Cross-checking due dates…');
  }

  steps.push('Sending everything to the model…', 'Drafting your reply…', 'Almost done…');

  return padToMinimum(dedupePreserveOrder(steps));
}
