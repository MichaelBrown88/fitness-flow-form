import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import {
  assistantPlanLimits,
  subscriptionAiPlanTier,
} from '@/constants/coachAssistantAiPlans';
import { streamCoachAssistantResponse } from '@/lib/ai/coachAssistantWording';
import { runCoachAssistantIntent } from '@/lib/coachAssistant/runCoachAssistantIntent';
import { buildAssistantThinkingSteps } from '@/lib/coachAssistant/assistantThinkingSteps';
import { inferFetchClientIdsFromAssistantProse } from '@/lib/coachAssistant/assistantInferFetch';
import { formatClientDisplayName } from '@/lib/utils/clientDisplayName';
import { extractFormDataExcerptForAssistant } from '@/lib/coachAssistant/assistantFormExcerpt';
import { serialiseClientDetailForAssistant } from '@/lib/coachAssistant/assistantPayloadBuilder';
import { getCoachAssessment } from '@/services/coachAssessments';
import type { AssistantPayloadDepth } from '@/lib/coachAssistant/assistantPayloadBuilder';
import { flushNextFrame } from '@/lib/utils/flushNextFrame';
import type { ClientGroup } from '@/hooks/dashboard/types';
import type { UseReassessmentQueueResult } from '@/hooks/useReassessmentQueue';
import type { CoachTask } from '@/lib/tasks/generateTasks';
import type { OrgSubscriptionSnapshot } from '@/services/organizations';
import {
  currentAssistantUsageMonthId,
  readOrgAssistantUsageMonth,
} from '@/services/coachAssistantOrgUsage';
import type {
  CoachAssistantBlock,
  CoachAssistantInteractionMode,
  CoachAssistantMessage,
  CoachAssistantThread,
  CoachAssistantMessageProvenance,
  CoachAssistantThinkingPhase,
  CoachAssistantStreamPreview,
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

/** Extract plain text from a message's blocks (for conversation history). */
function messageToText(m: CoachAssistantMessage): string {
  return m.blocks
    .filter((b): b is Extract<typeof b, { type: 'text' }> => b.type === 'text')
    .map((b) => b.content)
    .join(' ')
    .trim();
}

function blocksToPlainText(blocks: CoachAssistantBlock[]): string {
  return blocks
    .filter((b): b is Extract<CoachAssistantBlock, { type: 'text' }> => b.type === 'text')
    .map((b) => b.content)
    .join(' ')
    .trim();
}

export type CoachAssistantUsageDisplay = {
  requestsUsed: number;
  requestsCap: number;
  tokensUsed: number;
  tokensCap: number | null;
};

export function useCoachAssistant(options: {
  coachUid: string | undefined;
  organizationId: string | undefined;
  tasks: CoachTask[];
  clients: ClientGroup[];
  reassessmentQueue: UseReassessmentQueueResult;
  orgSubscription?: OrgSubscriptionSnapshot;
}) {
  const { coachUid, organizationId, tasks, clients, reassessmentQueue, orgSubscription } = options;
  const [threads, setThreads] = useState<CoachAssistantThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [interactionMode, setInteractionModeState] = useState<CoachAssistantInteractionMode>('data');
  const [sending, setSending] = useState(false);
  const [thinkingPhase, setThinkingPhase] = useState<CoachAssistantThinkingPhase | null>(null);
  const [thinkingSteps, setThinkingSteps] = useState<readonly string[]>([]);
  const [thinkingSessionKey, setThinkingSessionKey] = useState<string | null>(null);
  const [streamPreview, setStreamPreview] = useState<CoachAssistantStreamPreview | null>(null);
  const [assistantTypewriterMessageId, setAssistantTypewriterMessageId] = useState<string | null>(null);
  const [usageSnapshot, setUsageSnapshot] = useState<{ totalRequests: number; totalTokens: number }>({
    totalRequests: 0,
    totalTokens: 0,
  });
  const hydratedRef = useRef(false);
  const generationRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const planTier = useMemo(() => subscriptionAiPlanTier(orgSubscription), [orgSubscription]);

  const onAssistantTypewriterComplete = useCallback((messageId: string) => {
    setAssistantTypewriterMessageId((prev) => (prev === messageId ? null : prev));
  }, []);

  const usageDisplay = useMemo((): CoachAssistantUsageDisplay | null => {
    if (planTier === 'studio') return null;
    const lim = assistantPlanLimits(planTier);
    if (lim.maxRequests === null) return null;
    return {
      requestsUsed: usageSnapshot.totalRequests,
      requestsCap: lim.maxRequests,
      tokensUsed: usageSnapshot.totalTokens,
      tokensCap: lim.maxTokens,
    };
  }, [planTier, usageSnapshot]);

  useEffect(() => {
    if (!organizationId) {
      setUsageSnapshot({ totalRequests: 0, totalTokens: 0 });
      return;
    }
    let cancelled = false;
    void (async () => {
      const monthId = currentAssistantUsageMonthId();
      const u = await readOrgAssistantUsageMonth(organizationId, monthId);
      if (!cancelled) setUsageSnapshot(u);
    })();
    return () => {
      cancelled = true;
    };
  }, [organizationId]);

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

      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      const signal = ac.signal;
      const myGen = ++generationRef.current;

      const activeThreadNow = threads.find((t) => t.id === threadId);
      const priorMessages = activeThreadNow?.messages ?? [];

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
      setStreamPreview(null);
      setAssistantTypewriterMessageId(null);

      const intent = runCoachAssistantIntent(text.trim(), { tasks, clients });
      const primarySteps = buildAssistantThinkingSteps({
        userText: text.trim(),
        intentFacts: intent.factsForModel,
        clients,
        isFirstMessageInThread: priorMessages.length === 0,
        interactionMode,
        context: 'primary',
      });
      setThinkingSteps(primarySteps);
      setThinkingSessionKey(newId());
      setThinkingPhase('fetching');

      const historyLines = priorMessages
        .map((m) => ({ role: m.role, content: messageToText(m) }))
        .filter((m) => m.content.length > 0);

      /** Always standard so the model sees per-client pillar scores + weaknesses on every turn (not only after the first message). */
      const payloadDepthFirst: AssistantPayloadDepth = 'standard';

      const appendAssistant = (
        blocks: CoachAssistantBlock[],
        provenance: CoachAssistantMessageProvenance,
        titleHint: string | undefined,
      ): string => {
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
            if (titleHint) title = titleHint;
            return { ...t, messages: next, title, updatedAt: Date.now() };
          }),
        );
        return assistantMsg.id;
      };

      const applyOptimisticUsage = (provenance: CoachAssistantMessageProvenance, tokensUsed: number) => {
        if (provenance !== 'data_plus_llm') return;
        setUsageSnapshot((prev) => ({
          totalRequests: prev.totalRequests + 1,
          totalTokens: prev.totalTokens + (tokensUsed > 0 ? tokensUsed : 0),
        }));
      };

      const runStream = async (
        userText: string,
        convo: Array<{ role: 'user' | 'assistant'; content: string }>,
        depth: AssistantPayloadDepth,
        injected: string | null,
        intentFacts: Record<string, unknown>,
      ) => {
        let firstChunk = true;
        return streamCoachAssistantResponse({
          coachUid: uid,
          organizationId: org,
          userText,
          intentFacts,
          conversationHistory: convo,
          clients,
          tasks,
          reassessmentQueue,
          interactionMode,
          payloadDepth: depth,
          injectedFullClientJson: injected,
          planTier,
          signal,
          onStreamProgress: () => {
            if (generationRef.current !== myGen) return;
            if (firstChunk) {
              firstChunk = false;
              setThinkingPhase(null);
            }
            setStreamPreview({ active: true });
          },
        });
      };

      try {
        await flushNextFrame();
        if (generationRef.current !== myGen) return;

        if (generationRef.current !== myGen) return;

        setThinkingPhase('generating');

        let blocks: CoachAssistantBlock[];
        let provenance: CoachAssistantMessageProvenance;
        let fetchIds: string[] = [];
        let tokensUsedRound = 0;

        try {
          const r1 = await runStream(text, historyLines, payloadDepthFirst, null, intent.factsForModel);
          if (generationRef.current !== myGen) return;
          setThinkingPhase(null);
          setStreamPreview(null);
          blocks = r1.blocks;
          provenance = r1.provenance;
          fetchIds = r1.fetchClientIds;
          tokensUsedRound = r1.tokensUsed;
          if (fetchIds.length === 0 && provenance === 'data_plus_llm') {
            const assistantPlain = blocksToPlainText(blocks);
            const inferred = inferFetchClientIdsFromAssistantProse({
              userText: text.trim(),
              assistantPlainText: assistantPlain,
              clients,
            });
            if (inferred.length > 0) {
              fetchIds = inferred;
            }
          }
        } catch (e) {
          logger.warn('[useCoachAssistant] AI stream failed', e);
          setThinkingPhase(null);
          setStreamPreview(null);
          blocks = [{ type: 'text', content: COACH_ASSISTANT_COPY.ASSISTANT_SOFT_FAILURE }];
          provenance = 'data_only';
          fetchIds = [];
          tokensUsedRound = 0;
        }

        if (generationRef.current !== myGen) return;

        const appendedId = appendAssistant(blocks, provenance, intent.threadTitleHint);
        const hasAssistantText = blocks.some((b) => b.type === 'text' && b.content.trim().length > 0);
        if (hasAssistantText) {
          setAssistantTypewriterMessageId(appendedId);
        }
        applyOptimisticUsage(provenance, tokensUsedRound);

        const primaryFetchId = fetchIds[0];
        if (
          primaryFetchId &&
          provenance === 'data_plus_llm' &&
          !signal.aborted &&
          generationRef.current === myGen
        ) {
          await flushNextFrame();
          if (generationRef.current !== myGen) return;

          const matchClient = clients.find((c) => c.id === primaryFetchId);
          const followSteps = buildAssistantThinkingSteps({
            userText: text.trim(),
            intentFacts: intent.factsForModel,
            clients,
            isFirstMessageInThread: priorMessages.length === 0,
            interactionMode,
            context: 'client_followup',
            followUpClientDisplayName: matchClient
              ? formatClientDisplayName(matchClient.name)
              : undefined,
          });
          setThinkingSteps(followSteps);
          setThinkingSessionKey(newId());
          setThinkingPhase('fetching');
          await flushNextFrame();
          setThinkingPhase('generating');
          setStreamPreview(null);

          const assistantLine = blocksToPlainText(blocks);
          const convo2: Array<{ role: 'user' | 'assistant'; content: string }> = [
            ...historyLines,
            { role: 'user', content: text.trim() },
            { role: 'assistant', content: assistantLine.length > 0 ? assistantLine : '…' },
          ];
          const injectedPayload: Record<string, unknown> = matchClient
            ? { ...serialiseClientDetailForAssistant(matchClient) }
            : { error: 'unknown_client_id', clientId: primaryFetchId };

          if (matchClient && org && uid) {
            try {
              const loaded = await getCoachAssessment(uid, matchClient.id, matchClient.name, org);
              if (loaded?.formData) {
                injectedPayload.assessmentFieldDetailsFromLatestRecord =
                  extractFormDataExcerptForAssistant(loaded.formData);
              } else {
                injectedPayload.assessmentFieldDetailsFromLatestRecord = {
                  note: 'Expanded form fields were not available from storage; use pillar scores and weaknesses in this payload.',
                };
              }
            } catch (loadErr) {
              logger.warn('[useCoachAssistant] Could not load assessment form for assistant follow-up', loadErr);
              injectedPayload.assessmentFieldDetailsFromLatestRecord = {
                note: 'Could not load expanded assessment fields; use scores and weaknesses above.',
              };
            }
          }

          const injected = JSON.stringify(injectedPayload);

          const followFacts: Record<string, unknown> = {
            ...intent.factsForModel,
            assistantLoadedClientIds: [primaryFetchId],
          };

          try {
            const r2 = await runStream(text.trim(), convo2, 'lightweight', injected, followFacts);
            if (generationRef.current !== myGen) return;
            setThinkingPhase(null);
            setStreamPreview(null);
            const followMsgId = appendAssistant(r2.blocks, r2.provenance, undefined);
            if (r2.blocks.some((b) => b.type === 'text' && b.content.trim().length > 0)) {
              setAssistantTypewriterMessageId(followMsgId);
            }
            applyOptimisticUsage(r2.provenance, r2.tokensUsed);
          } catch (e2) {
            logger.warn('[useCoachAssistant] AI follow-up stream failed', e2);
            setThinkingPhase(null);
            setStreamPreview(null);
          }
        }
      } finally {
        if (generationRef.current === myGen) {
          setSending(false);
          setThinkingPhase(null);
          setThinkingSteps([]);
          setThinkingSessionKey(null);
          setStreamPreview(null);
        }
      }
    },
    [
      coachUid,
      organizationId,
      activeThreadId,
      threads,
      tasks,
      clients,
      reassessmentQueue,
      interactionMode,
      planTier,
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
    thinkingPhase,
    thinkingSteps,
    thinkingSessionKey,
    streamPreview,
    assistantTypewriterMessageId,
    onAssistantTypewriterComplete,
    usageDisplay,
    interactionMode,
    setInteractionMode,
  };
}
