import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { generateCoachAssistantWording } from '@/lib/ai/coachAssistantWording';
import { runCoachAssistantIntent } from '@/lib/coachAssistant/runCoachAssistantIntent';
import type { ClientGroup } from '@/hooks/dashboard/types';
import type { CoachTask } from '@/lib/tasks/generateTasks';
import type {
  CoachAssistantInteractionMode,
  CoachAssistantMessage,
  CoachAssistantThread,
  CoachAssistantMessageProvenance,
} from '@/types/coachAssistant';
import { COACH_ASSISTANT_COPY } from '@/constants/coachAssistantCopy';
import { logger } from '@/lib/utils/logger';

function storageThreadsKey(uid: string, orgId: string): string {
  return `${STORAGE_KEYS.COACH_ASSISTANT_THREADS}:${uid}:${orgId}`;
}

function storageModeKey(uid: string, orgId: string): string {
  return `${STORAGE_KEYS.COACH_ASSISTANT_INTERACTION_MODE}:${uid}:${orgId}`;
}

function newId(): string {
  return crypto.randomUUID();
}

function emptyThread(): CoachAssistantThread {
  const id = newId();
  return { id, title: COACH_ASSISTANT_COPY.THREAD_UNTITLED, updatedAt: Date.now(), messages: [] };
}

function loadThreads(uid: string, orgId: string): { threads: CoachAssistantThread[]; activeId: string } {
  try {
    const raw = localStorage.getItem(storageThreadsKey(uid, orgId));
    if (!raw) {
      const t = emptyThread();
      return { threads: [t], activeId: t.id };
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') {
      const t = emptyThread();
      return { threads: [t], activeId: t.id };
    }
    const rec = parsed as { threads?: CoachAssistantThread[]; activeId?: string };
    const threads = Array.isArray(rec.threads) && rec.threads.length > 0 ? rec.threads : [emptyThread()];
    const activeId = typeof rec.activeId === 'string' && threads.some((x) => x.id === rec.activeId)
      ? rec.activeId
      : threads[0].id;
    return { threads, activeId };
  } catch {
    const t = emptyThread();
    return { threads: [t], activeId: t.id };
  }
}

function loadMode(uid: string, orgId: string): CoachAssistantInteractionMode {
  try {
    const v = localStorage.getItem(storageModeKey(uid, orgId));
    return v === 'assist' ? 'assist' : 'data';
  } catch {
    return 'data';
  }
}

export function useCoachAssistant(options: {
  coachUid: string | undefined;
  organizationId: string | undefined;
  tasks: CoachTask[];
  filteredClients: ClientGroup[];
  navigate: NavigateFunction;
}) {
  const { coachUid, organizationId, tasks, filteredClients, navigate } = options;
  const [threads, setThreads] = useState<CoachAssistantThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [interactionMode, setInteractionModeState] = useState<CoachAssistantInteractionMode>('data');
  const [sending, setSending] = useState(false);
  const hydratedRef = useRef(false);

  useLayoutEffect(() => {
    if (!coachUid || !organizationId) {
      setThreads([]);
      setActiveThreadId(null);
      hydratedRef.current = false;
      return;
    }
    const { threads: t, activeId } = loadThreads(coachUid, organizationId);
    setThreads(t);
    setActiveThreadId(activeId);
    setInteractionModeState(loadMode(coachUid, organizationId));
    hydratedRef.current = true;
  }, [coachUid, organizationId]);

  useEffect(() => {
    if (!coachUid || !organizationId || !hydratedRef.current) return;
    try {
      localStorage.setItem(
        storageThreadsKey(coachUid, organizationId),
        JSON.stringify({ threads, activeId: activeThreadId }),
      );
    } catch {
      /* quota */
    }
  }, [threads, activeThreadId, coachUid, organizationId]);

  useLayoutEffect(() => {
    if (!coachUid || !organizationId) return;
    if (activeThreadId === null) return;
    if (threads.length === 0) return;
    if (!threads.some((t) => t.id === activeThreadId)) {
      setActiveThreadId(threads[0].id);
    }
  }, [threads, activeThreadId, coachUid, organizationId]);

  const setInteractionMode = useCallback(
    (mode: CoachAssistantInteractionMode) => {
      setInteractionModeState(mode);
      if (coachUid && organizationId) {
        try {
          localStorage.setItem(storageModeKey(coachUid, organizationId), mode);
        } catch {
          /* noop */
        }
      }
    },
    [coachUid, organizationId],
  );

  const activeThread = useMemo(
    () => threads.find((t) => t.id === activeThreadId) ?? null,
    [threads, activeThreadId],
  );

  const messages = activeThread?.messages ?? [];

  const createNewThread = useCallback(() => {
    if (!coachUid) return;
    const t = emptyThread();
    setThreads((prev) => [t, ...prev]);
    setActiveThreadId(t.id);
  }, [coachUid]);

  const selectThread = useCallback((id: string) => {
    setActiveThreadId(id);
  }, []);

  const deleteThread = useCallback((threadId: string) => {
    setThreads((prev) => {
      const filtered = prev.filter((t) => t.id !== threadId);
      return filtered.length > 0 ? filtered : [emptyThread()];
    });
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!coachUid || !text.trim()) return;
      const threadId = activeThreadId ?? threads[0]?.id ?? null;
      if (!threadId) return;
      if (activeThreadId !== threadId) {
        setActiveThreadId(threadId);
      }
      const uid = coachUid;
      const org = organizationId;

      const userMsg: CoachAssistantMessage = {
        id: newId(),
        role: 'user',
        createdAt: Date.now(),
        blocks: [{ type: 'text', content: text.trim() }],
      };

      setThreads((prev) =>
        prev.map((t) => {
          if (t.id !== threadId) return t;
          const nextMessages = [...t.messages, userMsg];
          let title = t.title;
          if (t.title === COACH_ASSISTANT_COPY.THREAD_UNTITLED && text.trim()) {
            title = text.trim().slice(0, 48) + (text.trim().length > 48 ? '…' : '');
          }
          return { ...t, messages: nextMessages, title, updatedAt: Date.now() };
        }),
      );

      setSending(true);
      try {
        const intent = runCoachAssistantIntent(text, { tasks, filteredClients });
        if (intent.navigateTo) {
          navigate(intent.navigateTo);
        }

        let blocks = intent.blocks;
        let provenance: CoachAssistantMessageProvenance = 'data_only';

        if (interactionMode === 'assist') {
          try {
            const wording = await generateCoachAssistantWording({
              coachUid: uid,
              organizationId: org,
              facts: intent.factsForModel,
            });
            blocks = [{ type: 'text', content: wording }, ...intent.blocks];
            provenance = 'data_plus_llm';
          } catch (e) {
            logger.warn('[useCoachAssistant] Assist wording failed, using data-only', e);
            blocks = intent.blocks;
            provenance = 'data_only';
          }
        }

        const assistantMsg: CoachAssistantMessage = {
          id: newId(),
          role: 'assistant',
          createdAt: Date.now(),
          blocks,
          provenance,
        };

        setThreads((prev) =>
          prev.map((t) => {
            if (t.id !== threadId) return t;
            const next = [...t.messages, assistantMsg];
            let title = t.title;
            if (intent.threadTitleHint) {
              title = intent.threadTitleHint;
            }
            return { ...t, messages: next, title, updatedAt: Date.now() };
          }),
        );
      } finally {
        setSending(false);
      }
    },
    [
      coachUid,
      organizationId,
      activeThreadId,
      threads,
      tasks,
      filteredClients,
      navigate,
      interactionMode,
    ],
  );

  return {
    threads,
    activeThreadId,
    activeThread,
    messages,
    createNewThread,
    selectThread,
    deleteThread,
    sendMessage,
    sending,
    interactionMode,
    setInteractionMode,
  };
}
