/**
 * Gemini (Vertex via Firebase AI) — unified coach assistant with JSON-shaped replies.
 */

import { getAI, VertexAIBackend, getGenerativeModel } from 'firebase/ai';
import { getApp } from 'firebase/app';
import { CONFIG } from '@/config';
import { COACH_ASSISTANT_COPY } from '@/constants/coachAssistantCopy';
import { ROUTES } from '@/constants/routes';
import {
  assistantPlanLimits,
  type AssistantAiPlanTier,
} from '@/constants/coachAssistantAiPlans';
import {
  buildAssistantCoachDataPayload,
  type AssistantPayloadDepth,
} from '@/lib/coachAssistant/assistantPayloadBuilder';
import { modelOutputToAssistantBlocks } from '@/lib/coachAssistant/assistantResponseBlocks';
import type { ClientGroup } from '@/hooks/dashboard/types';
import type { CoachTask } from '@/lib/tasks/generateTasks';
import type { UseReassessmentQueueResult } from '@/hooks/useReassessmentQueue';
import type {
  CoachAssistantBlock,
  CoachAssistantInteractionMode,
  CoachAssistantMessageProvenance,
} from '@/types/coachAssistant';
import {
  currentAssistantUsageMonthId,
  incrementOrgAssistantUsageMonth,
  readOrgAssistantUsageMonth,
} from '@/services/coachAssistantOrgUsage';
import { logAIUsage } from '@/services/aiUsage';
import { logger } from '@/lib/utils/logger';

/** Max user+assistant turns sent to the model (not UI thread length). */
const API_HISTORY_MAX_MESSAGES = 8;

function buildUnifiedSystemInstruction(todayIso: string, dataModeAddendum: string): string {
  return `You are a friendly, highly capable AI assistant built into One Assess, a fitness assessment platform for personal trainers. You have access to the coach's client data in COACH CLIENT DATA below — use it for roster, assessments, schedules, overdue pillars, and weakness patterns.

You can chat naturally about anything — greet the user, answer general fitness questions, coaching advice, light business chat, or just converse. You are not limited to client-data questions.

When the user asks about their clients, assessments, who needs attention, or platform data, ground answers in COACH CLIENT DATA. When something is not in that snapshot, say so warmly and suggest opening Clients or a client profile. Never invent client names, scores, or dates.

Data depth: In roster_standard payloads, \`latestAssessmentByClient\` lists each client's latest recorded pillar scores and weakness labels — use them on the first turn for specifics. A pillar being "overdue" in \`schedule\` means **retest timing**, not that historical scores disappear: you should still cite the last recorded scores and findings, then note when a retest would refine the plan. After fetch_client_data, \`FULL CLIENT DETAIL\` may include \`assessmentFieldDetailsFromLatestRecord\` with posture (manual + AI summaries), movement screen results, lifestyle, strength, and coach narrative excerpts — quote those for concrete programming detail. Never tell the coach that posture/movement/mobility specifics are "not in the summary" when they appear in \`latestAssessmentByClient\`, assessments history, or assessmentFieldDetailsFromLatestRecord.

If asked to do something you cannot do (send email, access external systems, change billing), explain kindly what you can do instead.

${dataModeAddendum}

Today's date: ${todayIso}

Roster payloads may be compact (summaries + index). If you need pillar scores, assessment history, or weaknesses for a specific client that are not in the snapshot, emit action intent "fetch_client_data" with that client's "id" from clientIndex (and a short message like you're pulling their file). The app will load full detail and call you again — do not repeat fetch_client_data for the same client id in the follow-up turn.

CRITICAL: If your "message" says you will load, pull up, open, or fetch someone's full profile or full pillar details, you MUST include "fetch_client_data" in "actions" with that client's id from clientIndex in the SAME JSON response. The app only runs the automatic follow-up when that action is present — never promise a fetch in prose alone without the action.

Always respond with raw valid JSON only — no markdown, no code fences, no text before or after the JSON object. Use double quotes for all JSON keys and string values. Exact shape:
{
  "message": "conversational reply to the coach",
  "visual": null,
  "actions": null
}

The "message" field is for the coach: use clear prose and, when helpful (training plans, multi-day splits, bullet checklists), structure it with Markdown — ## or ### section headings, **bold** labels, and - bullet lists with blank lines between sections. Never put raw JSON or outer response structure inside "message"; use "visual" for numeric tables and charts.

Visual-first: whenever comparing two or more clients, listing three or more numeric facts, showing roster-level AXIS or pillar scores, trends over time, or anything easier to scan visually, set "visual" to the most suitable type (do not leave visual null for those cases). Prefer:
- data_table for multi-client grids (e.g. each row = one client, columns = name, overall AXIS, then pillar scores from the snapshot)
- bar_chart when comparing one metric across many clients (labels = client names or categories)
- line_chart for progress or trends over ordered labels (e.g. dates or assessment order)
- stat_cards for a few headline KPIs (totals, averages, counts)
- radar_chart only for a single client's pillar/category breakdown; set "title" to that client's name as shown in COACH CLIENT DATA so the app can align data

Optional "visual" (instead of null) — one of:
- { "type": "data_table", "title": "string", "data": { "columns": string[], "rows": Array<Array<string | number>> } } — each row same length as columns; use numbers for scores where possible
- { "type": "radar_chart", "title": "string", "data": { "labels": string[], "datasets": [{ "label": string, "data": number[] }] } }
- { "type": "bar_chart", "title": "string", "data": { "labels": string[], "datasets": [{ "label": string, "data": number[] }] } }
- { "type": "line_chart", "title": "string", "data": { "labels": string[], "datasets": [{ "label": string, "data": number[] }] } }
- { "type": "stat_cards", "title": "string", "data": { "cards": [{ "label": string, "value": string | number, "sub": string }] } }

Optional "actions" (instead of null) — array of:
{ "label": "string", "intent": "start_assessment" | "view_client" | "view_report" | "view_roadmap" | "view_schedule" | "view_artifacts" | "view_billing" | "fetch_client_data", "clientId": string | null, "assessmentId": string | null, "style": "primary" | "secondary" }

For fetch_client_data, set clientId to the client's id from clientIndex (stable slug id). For start_assessment, set clientId to the client's full display name as it appears in COACH CLIENT DATA.

Use intents only — never put URLs in the JSON.

Chat-first UX: answer in the thread with a helpful "message" plus a "visual" when it makes information clearer. When the coach asks about a client's AXIS Score™ (overall + pillar/category breakdown), put a radar_chart in "visual" using that client's category scores once full detail is loaded or when scores appear in summaries. For ARC™ (the client's phased roadmap), summarize from generatedTasks and schedule when relevant; only add view_roadmap or view_client as optional buttons with labels like "Open ARC™" or "Open full profile" — the coach stays in chat until they tap. Prefer zero to three actions; do not flood the thread with navigation.`;
}

function buildUserTurn(params: {
  coachClientDataJson: string;
  intentFacts: Record<string, unknown>;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  userText: string;
  injectedFullClientJson?: string | null;
}): string {
  const parts: string[] = [];
  parts.push(`COACH CLIENT DATA:\n${params.coachClientDataJson}`);
  if (params.injectedFullClientJson?.trim()) {
    parts.push(`FULL CLIENT DETAIL (loaded for this request):\n${params.injectedFullClientJson.trim()}`);
  }
  parts.push(`Slash / routing hint (may be empty):\n${JSON.stringify(params.intentFacts, null, 2)}`);

  if (params.conversationHistory.length > 0) {
    const recent = params.conversationHistory.slice(-API_HISTORY_MAX_MESSAGES);
    const lines = recent.map(
      (m) => `${m.role === 'user' ? 'Coach' : 'Assistant'}: ${m.content}`,
    );
    parts.push(`Recent conversation:\n${lines.join('\n')}`);
  }

  parts.push(`Coach: ${params.userText}`);
  return parts.join('\n\n');
}

export function prepareCoachAssistantTurn(params: {
  userText: string;
  intentFacts: Record<string, unknown>;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  clients: ClientGroup[];
  tasks: CoachTask[];
  reassessmentQueue: UseReassessmentQueueResult;
  interactionMode: CoachAssistantInteractionMode;
  payloadDepth: AssistantPayloadDepth;
  injectedFullClientJson?: string | null;
}): { systemInstruction: string; userTurn: string } {
  const todayIso = new Date().toISOString();
  const payloadObj = buildAssistantCoachDataPayload({
    clients: params.clients,
    coachTasks: params.tasks,
    queue: params.reassessmentQueue.queue,
    summary: params.reassessmentQueue.summary,
    depth: params.payloadDepth,
  });
  const coachClientDataJson = JSON.stringify(payloadObj, null, 2);

  const dataModeAddendum =
    params.interactionMode === 'data'
      ? 'Data AI mode: treat COACH CLIENT DATA as the source of truth for counts, names, scores, and dates. Do not give general programming or exercise-prescription advice — suggest switching to Fitness AI for that.'
      : 'Fitness AI mode: you may answer general programming and exercise science questions; still never invent roster facts.';

  const systemInstruction = buildUnifiedSystemInstruction(todayIso, dataModeAddendum);
  const userTurn = buildUserTurn({
    coachClientDataJson,
    intentFacts: params.intentFacts,
    conversationHistory: params.conversationHistory,
    userText: params.userText,
    injectedFullClientJson: params.injectedFullClientJson ?? null,
  });

  return { systemInstruction, userTurn };
}

function createCoachGenerativeModel(
  systemInstruction: string,
  interactionMode: CoachAssistantInteractionMode,
) {
  const firebaseApp = getApp();
  const ai = getAI(firebaseApp, { backend: new VertexAIBackend() });
  return getGenerativeModel(ai, {
    model: CONFIG.AI.GEMINI.MODEL_NAME,
    systemInstruction: { role: 'system', parts: [{ text: systemInstruction }] },
    generationConfig: {
      maxOutputTokens: 2048,
      temperature: interactionMode === 'data' ? 0.35 : 0.55,
    },
  });
}

async function checkAssistantQuota(
  organizationId: string | undefined,
  planTier: AssistantAiPlanTier,
): Promise<'ok' | 'requests' | 'tokens'> {
  if (!organizationId) return 'ok';
  if (planTier === 'studio') return 'ok';
  const lim = assistantPlanLimits(planTier);
  const monthId = currentAssistantUsageMonthId();
  const usage = await readOrgAssistantUsageMonth(organizationId, monthId);
  if (lim.maxRequests !== null && usage.totalRequests >= lim.maxRequests) return 'requests';
  if (lim.maxTokens !== null && usage.totalTokens >= lim.maxTokens) return 'tokens';
  return 'ok';
}

function quotaExceededBlocks(kind: 'requests' | 'tokens'): CoachAssistantBlock[] {
  const reset = COACH_ASSISTANT_COPY.AI_ASSISTANT_QUOTA_RESET_HINT();
  const body =
    kind === 'requests'
      ? COACH_ASSISTANT_COPY.AI_ASSISTANT_QUOTA_REQUESTS_EXCEEDED(reset)
      : COACH_ASSISTANT_COPY.AI_ASSISTANT_QUOTA_TOKENS_EXCEEDED(reset);
  return [
    { type: 'text', content: body },
    {
      type: 'actions',
      actions: [
        {
          kind: 'navigate',
          label: COACH_ASSISTANT_COPY.AI_ASSISTANT_UPGRADE_CTA,
          to: ROUTES.SETTINGS_BILLING,
          variant: 'primary',
        },
      ],
    },
  ];
}

function tokensFromUsageMetadata(meta: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number } | undefined): number {
  if (!meta) return 0;
  const p = meta.promptTokenCount ?? 0;
  const c = meta.candidatesTokenCount ?? 0;
  if (p + c > 0) return p + c;
  const t = meta.totalTokenCount ?? 0;
  return t > 0 ? t : 0;
}

export type StreamCoachAssistantResult = {
  blocks: CoachAssistantBlock[];
  fetchClientIds: string[];
  provenance: CoachAssistantMessageProvenance;
  streamHadError: boolean;
  tokensUsed: number;
};

export async function streamCoachAssistantResponse(params: {
  coachUid: string;
  organizationId?: string;
  userText: string;
  intentFacts: Record<string, unknown>;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  clients: ClientGroup[];
  tasks: CoachTask[];
  reassessmentQueue: UseReassessmentQueueResult;
  interactionMode: CoachAssistantInteractionMode;
  payloadDepth: AssistantPayloadDepth;
  injectedFullClientJson?: string | null;
  planTier: AssistantAiPlanTier;
  /** Fired as chunks arrive — use for UI progress only; raw text is not passed (JSON is parsed after the stream completes). */
  onStreamProgress?: () => void;
  signal?: AbortSignal;
}): Promise<StreamCoachAssistantResult> {
  const {
    coachUid,
    organizationId,
    userText,
    intentFacts,
    conversationHistory,
    clients,
    tasks,
    reassessmentQueue,
    interactionMode,
    payloadDepth,
    injectedFullClientJson,
    planTier,
    onStreamProgress,
    signal,
  } = params;

  const quota = await checkAssistantQuota(organizationId, planTier);
  if (quota !== 'ok') {
    await logAIUsage(coachUid, 'coach_assistant_response', 'error', 'gemini', organizationId, {
      reason: 'assistant_quota',
      quotaKind: quota,
    });
    return {
      blocks: quotaExceededBlocks(quota),
      fetchClientIds: [],
      provenance: 'data_only',
      streamHadError: false,
      tokensUsed: 0,
    };
  }

  const { systemInstruction, userTurn } = prepareCoachAssistantTurn({
    userText,
    intentFacts,
    conversationHistory,
    clients,
    tasks,
    reassessmentQueue,
    interactionMode,
    payloadDepth,
    injectedFullClientJson: injectedFullClientJson ?? null,
  });

  const model = createCoachGenerativeModel(systemInstruction, interactionMode);

  let fullText = '';
  let streamHadError = false;

  try {
    const { stream, response } = await model.generateContentStream({
      contents: [{ role: 'user', parts: [{ text: userTurn }] }],
    });

    for await (const chunk of stream) {
      if (signal?.aborted) {
        streamHadError = true;
        break;
      }
      let piece = '';
      try {
        piece = chunk.text();
      } catch (textErr) {
        logger.warn('[coachAssistantWording] Stream chunk text() failed', textErr);
        streamHadError = true;
        break;
      }
      if (piece) {
        fullText += piece;
        onStreamProgress?.();
      }
    }

    let usageMeta: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number } | undefined;
    try {
      const agg = await response;
      usageMeta = agg.usageMetadata;
    } catch (usageErr) {
      logger.warn('[coachAssistantWording] Aggregated response / usage failed', usageErr);
    }

    const trimmed = fullText.trim();
    if (!trimmed) {
      await logAIUsage(coachUid, 'coach_assistant_response', 'error', 'gemini', organizationId);
      return {
        blocks: [{ type: 'text', content: COACH_ASSISTANT_COPY.ASSISTANT_SOFT_FAILURE }],
        fetchClientIds: [],
        provenance: 'data_only',
        streamHadError: true,
        tokensUsed: 0,
      };
    }

    const rawForParse = streamHadError
      ? `${trimmed}\n\n${COACH_ASSISTANT_COPY.STREAM_INCOMPLETE_NOTE}`
      : trimmed;

    const { blocks, fetchClientIds } = modelOutputToAssistantBlocks(rawForParse, clients);

    const tokensUsed = tokensFromUsageMetadata(usageMeta);
    if (organizationId && tokensUsed >= 0) {
      await incrementOrgAssistantUsageMonth(organizationId, currentAssistantUsageMonthId(), tokensUsed);
    }

    await logAIUsage(coachUid, 'coach_assistant_response', 'ai_success', 'gemini', organizationId, {
      tokensReported: tokensUsed,
    });

    return {
      blocks,
      fetchClientIds,
      provenance: 'data_plus_llm',
      streamHadError,
      tokensUsed,
    };
  } catch (error) {
    streamHadError = true;
    logger.error('[coachAssistantWording] Stream generation failed:', error);
    await logAIUsage(coachUid, 'coach_assistant_response', 'error', 'gemini', organizationId);
    return {
      blocks: [{ type: 'text', content: COACH_ASSISTANT_COPY.ASSISTANT_SOFT_FAILURE }],
      fetchClientIds: [],
      provenance: 'data_only',
      streamHadError: true,
      tokensUsed: 0,
    };
  }
}

export type CoachAssistantGenerationResult = {
  blocks: CoachAssistantBlock[];
};

export async function generateCoachAssistantResponse(params: {
  coachUid: string;
  organizationId?: string;
  userText: string;
  intentFacts: Record<string, unknown>;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  clients: ClientGroup[];
  tasks: CoachTask[];
  reassessmentQueue: UseReassessmentQueueResult;
  interactionMode: CoachAssistantInteractionMode;
  planTier?: AssistantAiPlanTier;
}): Promise<CoachAssistantGenerationResult> {
  const {
    coachUid,
    organizationId,
    userText,
    intentFacts,
    conversationHistory,
    clients,
    tasks,
    reassessmentQueue,
    interactionMode,
    planTier: planTierParam,
  } = params;

  const quota = await checkAssistantQuota(organizationId, planTierParam ?? 'starter');
  if (quota !== 'ok') {
    return { blocks: quotaExceededBlocks(quota) };
  }

  const { systemInstruction, userTurn } = prepareCoachAssistantTurn({
    userText,
    intentFacts,
    conversationHistory,
    clients,
    tasks,
    reassessmentQueue,
    interactionMode,
    payloadDepth: 'standard',
    injectedFullClientJson: null,
  });

  try {
    const model = createCoachGenerativeModel(systemInstruction, interactionMode);

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: userTurn }] }],
    });

    const raw = result.response.text().trim();
    const { blocks } = modelOutputToAssistantBlocks(raw, clients);
    const tokensUsed = tokensFromUsageMetadata(result.response.usageMetadata);
    if (organizationId) {
      await incrementOrgAssistantUsageMonth(organizationId, currentAssistantUsageMonthId(), tokensUsed);
    }
    await logAIUsage(coachUid, 'coach_assistant_response', 'ai_success', 'gemini', organizationId, {
      tokensReported: tokensUsed,
    });
    return { blocks };
  } catch (error) {
    await logAIUsage(coachUid, 'coach_assistant_response', 'error', 'gemini', organizationId);
    logger.error('[coachAssistantWording] Generation failed:', error);
    throw error;
  }
}

/** @deprecated Use generateCoachAssistantResponse */
export async function generateCoachAssistantWording(params: {
  coachUid: string;
  organizationId?: string;
  facts: Record<string, unknown>;
}): Promise<string> {
  const { blocks } = await generateCoachAssistantResponse({
    coachUid: params.coachUid,
    organizationId: params.organizationId,
    userText: '',
    intentFacts: params.facts,
    conversationHistory: [],
    clients: [],
    tasks: [],
    reassessmentQueue: {
      queue: [],
      summary: { totalClients: 0, overdue: 0, dueSoon: 0, upToDate: 0 },
    },
    interactionMode: 'assist',
  });
  const text = blocks
    .filter((b): b is Extract<CoachAssistantBlock, { type: 'text' }> => b.type === 'text')
    .map((b) => b.content)
    .join('\n')
    .trim();
  return text || '…';
}
