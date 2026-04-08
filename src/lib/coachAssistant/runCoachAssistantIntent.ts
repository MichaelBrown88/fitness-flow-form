import { COACH_ASSISTANT_SLASH } from '@/constants/coachAssistantCopy';
import type { CoachAssistantBlock } from '@/types/coachAssistant';
import type { ClientGroup } from '@/hooks/dashboard/types';
import type { CoachTask } from '@/lib/tasks/generateTasks';

export type CoachAssistantIntentResult = {
  /** Placeholder only — assistant content comes from the model. */
  blocks: CoachAssistantBlock[];
  factsForModel: Record<string, unknown>;
  threadTitleHint?: string;
};

const PLACEHOLDER: CoachAssistantBlock[] = [{ type: 'text', content: '' }];

/**
 * Slash hints only — no client-name interception; natural language goes to Gemini with full context.
 * Navigation is never automatic; the model suggests actions the user can tap.
 */
export function runCoachAssistantIntent(
  userText: string,
  ctx: {
    tasks: CoachTask[];
    clients: ClientGroup[];
  },
): CoachAssistantIntentResult {
  const trimmed = userText.trim();
  const lower = trimmed.toLowerCase();

  if (lower === COACH_ASSISTANT_SLASH.HELP || lower === COACH_ASSISTANT_SLASH.HELP.slice(1)) {
    return { blocks: PLACEHOLDER, factsForModel: { intent: 'slash_help' } };
  }

  if (lower === COACH_ASSISTANT_SLASH.TODAY || lower === COACH_ASSISTANT_SLASH.TODAY.slice(1)) {
    const { tasks } = ctx;
    return {
      blocks: PLACEHOLDER,
      factsForModel: {
        intent: 'slash_today',
        taskCount: tasks.length,
        tasks: tasks.slice(0, 20).map((t) => ({
          title: t.title,
          client: t.clientName,
          dueDate: t.dueDate?.toISOString() ?? null,
        })),
      },
      threadTitleHint: 'Today',
    };
  }

  if (lower === COACH_ASSISTANT_SLASH.CLIENTS || lower === COACH_ASSISTANT_SLASH.CLIENTS.slice(1)) {
    return { blocks: PLACEHOLDER, factsForModel: { intent: 'slash_clients' } };
  }

  if (lower === COACH_ASSISTANT_SLASH.WORK || lower === COACH_ASSISTANT_SLASH.WORK.slice(1)) {
    return { blocks: PLACEHOLDER, factsForModel: { intent: 'slash_work' } };
  }

  if (lower === COACH_ASSISTANT_SLASH.SHARE || lower === COACH_ASSISTANT_SLASH.SHARE.slice(1)) {
    return { blocks: PLACEHOLDER, factsForModel: { intent: 'slash_share' } };
  }

  return { blocks: PLACEHOLDER, factsForModel: { intent: 'chat' } };
}
