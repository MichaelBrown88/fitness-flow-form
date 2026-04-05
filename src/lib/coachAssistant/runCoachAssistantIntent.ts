import { ROUTES, dashboardWorkPath } from '@/constants/routes';
import { COACH_ASSISTANT_COPY, COACH_ASSISTANT_SLASH } from '@/constants/coachAssistantCopy';
import { formatClientDisplayName } from '@/lib/utils/clientDisplayName';
import type { CoachAssistantBlock } from '@/types/coachAssistant';
import type { ClientGroup } from '@/hooks/dashboard/types';
import type { CoachTask } from '@/lib/tasks/generateTasks';

export type CoachAssistantIntentResult = {
  blocks: CoachAssistantBlock[];
  factsForModel: Record<string, unknown>;
  /** Optional in-app navigation after sending */
  navigateTo?: string;
  /** Update thread title from first user line */
  threadTitleHint?: string;
};

const STOP = new Set([
  'show', 'me', 'open', 'the', 'a', 'an', 'client', 'profile',
  'what', 'is', 'on', 'for', 'pull', 'up', 'find', 'about', 'whats', "what's",
  'are', 'you', 'your', 'how', 'why', 'can', 'do', 'does', 'tell',
  'get', 'my', 'i', 'its', 'it',
]);

/** Returns true if the message looks like a general question rather than a client name lookup. */
function looksLikeQuestion(text: string): boolean {
  const t = text.toLowerCase();
  return (
    t.endsWith('?') ||
    /^(are|can|could|did|do|does|have|has|how|is|should|tell|what|when|where|which|who|why|will|would|explain|give|help|list)\s/.test(t)
  );
}

function nameQueryFromMessage(raw: string): string {
  const parts = raw
    .trim()
    .toLowerCase()
    .replace(/^\/+/, '')
    .split(/\s+/)
    .filter(Boolean)
    .filter((w) => !STOP.has(w));
  // Names are 1–3 words; longer results are likely questions, not name lookups
  if (parts.length > 3) return '';
  return parts.join(' ').trim();
}

function matchClients(query: string, clients: ClientGroup[]): ClientGroup[] {
  if (!query) return [];
  const q = query.toLowerCase();
  return clients.filter((c) => {
    const n = c.name.toLowerCase();
    return n.includes(q) || q.split(/\s+/).every((p) => p.length > 0 && n.includes(p));
  });
}

function clientPath(name: string): string {
  const seg = encodeURIComponent(name);
  return `/client/${seg}`;
}

export function runCoachAssistantIntent(
  userText: string,
  ctx: {
    tasks: CoachTask[];
    filteredClients: ClientGroup[];
  },
): CoachAssistantIntentResult {
  const trimmed = userText.trim();
  const lower = trimmed.toLowerCase();

  if (
    lower === COACH_ASSISTANT_SLASH.HELP.slice(1) ||
    trimmed === COACH_ASSISTANT_SLASH.HELP ||
    lower === 'help'
  ) {
    return {
      blocks: [{ type: 'text', content: COACH_ASSISTANT_COPY.HELP_TEXT }],
      factsForModel: { intent: 'help' },
    };
  }

  if (
    lower === COACH_ASSISTANT_SLASH.TODAY.slice(1) ||
    trimmed === COACH_ASSISTANT_SLASH.TODAY ||
    lower.includes('on my plate') ||
    lower === 'today'
  ) {
    const { tasks } = ctx;
    const lines =
      tasks.length === 0
        ? [COACH_ASSISTANT_COPY.TODAY_EMPTY]
        : tasks.slice(0, 12).map((t) => `• ${t.title} — ${formatClientDisplayName(t.clientName)}${t.dueDate ? ` (due ${t.dueDate.toLocaleDateString()})` : ''}`);
    const body = [COACH_ASSISTANT_COPY.TODAY_INTRO, ...lines].join('\n');
    return {
      blocks: [
        { type: 'text', content: body },
        {
          type: 'actions',
          actions: [
            { label: 'Open Work (tasks)', to: dashboardWorkPath('tasks') },
            { label: 'Open calendar', to: dashboardWorkPath('calendar') },
          ],
        },
      ],
      factsForModel: {
        intent: 'today',
        taskCount: tasks.length,
        sample: tasks.slice(0, 5).map((t) => ({ title: t.title, client: t.clientName })),
      },
    };
  }

  if (trimmed === COACH_ASSISTANT_SLASH.CLIENTS || lower === COACH_ASSISTANT_SLASH.CLIENTS.slice(1)) {
    return {
      blocks: [
        { type: 'text', content: 'Opening your client directory.' },
        { type: 'actions', actions: [{ label: 'Clients', to: ROUTES.DASHBOARD_CLIENTS }] },
      ],
      factsForModel: { intent: 'navigate_clients' },
      navigateTo: ROUTES.DASHBOARD_CLIENTS,
    };
  }

  if (trimmed === COACH_ASSISTANT_SLASH.WORK || lower === COACH_ASSISTANT_SLASH.WORK.slice(1)) {
    return {
      blocks: [
        { type: 'text', content: 'Opening Work — tasks and calendar.' },
        { type: 'actions', actions: [{ label: 'Work', to: ROUTES.DASHBOARD_WORK }] },
      ],
      factsForModel: { intent: 'navigate_work' },
      navigateTo: ROUTES.DASHBOARD_WORK,
    };
  }

  if (trimmed === COACH_ASSISTANT_SLASH.SHARE || lower === COACH_ASSISTANT_SLASH.SHARE.slice(1)) {
    return {
      blocks: [
        {
          type: 'text',
          content: 'Opening Artifacts — your public report, roadmap, and achievements links in a grid.',
        },
        {
          type: 'actions',
          actions: [{ label: COACH_ASSISTANT_COPY.ARTIFACTS_PAGE_TITLE, to: ROUTES.DASHBOARD_ARTIFACTS }],
        },
      ],
      factsForModel: { intent: 'share_hint' },
      navigateTo: ROUTES.DASHBOARD_ARTIFACTS,
    };
  }

  // @mention — treat as an explicit client name lookup, bypass question heuristics
  if (trimmed.startsWith('@')) {
    const mentionQuery = trimmed.slice(1).trim().toLowerCase();
    if (mentionQuery.length >= 2) {
      const matches = matchClients(mentionQuery, ctx.filteredClients);
      if (matches.length === 1) {
        const c = matches[0];
        const displayName = formatClientDisplayName(c.name);
        const path = clientPath(c.name);
        const scoreBit =
          c.latestDate != null
            ? `Latest assessment: ${c.latestDate.toLocaleDateString()}. Overall score: ${c.latestScore ?? '—'}.`
            : 'No completed assessment on file yet.';
        return {
          blocks: [
            { type: 'text', content: `${displayName}\n${scoreBit}` },
            { type: 'actions', actions: [{ label: COACH_ASSISTANT_COPY.CLIENT_OPEN, to: path }] },
          ],
          factsForModel: {
            intent: 'client_snapshot',
            clientName: displayName,
            latestScore: c.latestScore,
            latestDate: c.latestDate?.toISOString() ?? null,
          },
          threadTitleHint: displayName,
        };
      }
      if (matches.length > 1) {
        return {
          blocks: [
            { type: 'text', content: COACH_ASSISTANT_COPY.CLIENT_AMBIGUOUS },
            {
              type: 'actions',
              actions: matches.slice(0, 6).map((m) => ({
                label: formatClientDisplayName(m.name),
                to: clientPath(m.name),
              })),
            },
          ],
          factsForModel: {
            intent: 'client_ambiguous',
            matches: matches.slice(0, 6).map((m) => formatClientDisplayName(m.name)),
          },
        };
      }
      return {
        blocks: [{ type: 'text', content: COACH_ASSISTANT_COPY.CLIENT_NONE }],
        factsForModel: { intent: 'client_none', query: mentionQuery },
      };
    }
  }

  const nameQuery = nameQueryFromMessage(trimmed);
  if (nameQuery.length >= 2) {
    const matches = matchClients(nameQuery, ctx.filteredClients);
    if (matches.length === 1) {
      const c = matches[0];
      const displayName = formatClientDisplayName(c.name);
      const path = clientPath(c.name);
      const scoreBit =
        c.latestDate != null
          ? `Latest assessment: ${c.latestDate.toLocaleDateString()}. Overall score: ${c.latestScore ?? '—'}.`
          : 'No completed assessment on file yet.';
      // Enrich with per-category scores if available (from latest assessment scoresSummary)
      const latestAssessment = c.assessments?.[0];
      const categoryScores = latestAssessment?.scoresSummary?.categories?.map((cat) => ({
        category: cat.id,
        score: cat.score,
        assessed: cat.assessed,
        weaknesses: cat.weaknesses?.slice(0, 3) ?? [],
      }));
      return {
        blocks: [
          { type: 'text', content: `${displayName}\n${scoreBit}` },
          { type: 'actions', actions: [{ label: COACH_ASSISTANT_COPY.CLIENT_OPEN, to: path }] },
        ],
        factsForModel: {
          intent: 'client_snapshot',
          userQuestion: trimmed,
          clientName: displayName,
          latestScore: c.latestScore,
          latestDate: c.latestDate?.toISOString() ?? null,
          assessmentCount: c.assessments?.length ?? 0,
          goals: latestAssessment?.goals ?? [],
          categoryScores: categoryScores ?? null,
          notes: c.notes ?? null,
          activePillars: c.activePillars ?? null,
        },
        threadTitleHint: displayName,
      };
    }
    if (matches.length > 1) {
      return {
        blocks: [
          { type: 'text', content: COACH_ASSISTANT_COPY.CLIENT_AMBIGUOUS },
          {
            type: 'actions',
            actions: matches.slice(0, 6).map((m) => ({
              label: formatClientDisplayName(m.name),
              to: clientPath(m.name),
            })),
          },
        ],
        factsForModel: {
          intent: 'client_ambiguous',
          matches: matches.slice(0, 6).map((m) => formatClientDisplayName(m.name)),
        },
      };
    }
    // No client match — distinguish a genuine name lookup from a general question
    if (looksLikeQuestion(trimmed)) {
      return {
        blocks: [{ type: 'text', content: COACH_ASSISTANT_COPY.DEFAULT_REPLY }],
        factsForModel: { intent: 'unknown', userText: trimmed.slice(0, 200) },
      };
    }
    return {
      blocks: [{ type: 'text', content: COACH_ASSISTANT_COPY.CLIENT_NONE }],
      factsForModel: { intent: 'client_none', query: nameQuery },
    };
  }

  return {
    blocks: [{ type: 'text', content: COACH_ASSISTANT_COPY.DEFAULT_REPLY }],
    factsForModel: { intent: 'unknown', userQuestion: trimmed.slice(0, 400) },
  };
}
