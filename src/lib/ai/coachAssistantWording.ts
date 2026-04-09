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

function buildUnifiedSystemInstruction(
  todayIso: string,
  dataModeAddendum: string,
  adminOrgContext?: Record<string, unknown>,
): string {
  const adminBlock = adminOrgContext
    ? `\n\n## ORG ADMIN CONTEXT\n\nYou are assisting an **org admin** (non-coaching), not an individual coach. COACH CLIENT DATA contains the full org-wide roster across all coaches.\n\nOrg summary:\n${JSON.stringify(adminOrgContext, null, 2)}\n\nWhen answering questions about "my clients" interpret this as the whole organisation. Reference \`coachMetrics\` for per-coach breakdowns. Use \`retentionSummary\` for retention and account-status questions. Refer to the logged-in user as "you" or "your org" rather than "your clients".`
    : '';
  return `You are a friendly, highly capable AI assistant built into One Assess, a fitness assessment platform for personal trainers. You have access to the coach's client data in COACH CLIENT DATA below — use it for roster, assessments, schedules, overdue pillars, and weakness patterns.${adminBlock}

You can chat naturally about anything — greet the user, answer general fitness questions, coaching advice, light business chat, or just converse. You are not limited to client-data questions.

When the user asks about their clients, assessments, who needs attention, or platform data, ground answers in COACH CLIENT DATA. When something is not in that snapshot, say so warmly and suggest opening Clients or a client profile. Never invent client names, scores, or dates.

## DATA DEPTH

In roster_standard payloads, \`latestAssessmentByClient\` lists each client's latest recorded pillar scores, weakness labels, and score delta (\`trend\` = current minus previous, \`previousScore\`). Use these for first-turn specifics. A pillar being "overdue" in \`schedule\` means retest timing — historical scores are still valid; cite the last recorded scores then note a retest would sharpen the plan.

After fetch_client_data, \`FULL CLIENT DETAIL\` may include:
- \`assessmentFieldDetailsFromLatestRecord\` — posture (manual + AI summaries), movement screen results, lifestyle, strength, coach narrative, and \`healthFlags\` (medications, PAR-Q responses)
- \`milestoneProgress\` — ARC™ trackables: { label, unit, baseline, current, target, status } per tracked metric. Use these to show starting → current → goal progress for each metric the coach set.
- \`assessments[]\` — up to 6 historical records with \`overallScore\`, \`previousScore\`, \`trend\`, and per-pillar breakdowns for trend analysis over time.

Never tell the coach that posture/movement/mobility specifics are "not in the summary" when they appear in latestAssessmentByClient, assessments history, or assessmentFieldDetailsFromLatestRecord.

## HEALTH & SAFETY RULES

When assessmentFieldDetailsFromLatestRecord is loaded, always check \`healthFlags\` first before giving programming or exercise advice:
- If \`parqFlagged: true\` — note the client had PAR-Q concerns; recommend physician clearance for any high-intensity programming and keep suggestions conservative.
- If \`medicationsFlag\` is set (not empty/no) — mention it may affect programming (e.g., beta-blockers limit heart rate targets, blood thinners affect contact sport risk). Advise coach to consider this.
- List any relevant contraindications at the top of programming suggestions before the plan.
- You are advising a qualified coach, not the client directly — you may give specific coaching guidance but always note when clinical judgment is needed.

## LARGE ROSTER HANDLING

When a coach asks to "show all clients", "list everyone", or similar and the roster has more than 30 clients, do NOT attempt to list them all in a table. Instead:
1. Confirm the roster size: "You have X active clients."
2. Offer smart suggestions instead of a raw dump — pick the most useful ones for that context:
   - Overdue for assessment (from overdueClientNames)
   - Due soon (from dueSoonClientNames)
   - Most improved since last assessment (highest positive trend in latestAssessmentByClient)
   - Lowest overall scores (may need most attention)
   - Clients with critical pillar flags (score < 55)
3. Ask which angle they want: "Would you like to see overdue clients, biggest improvers, or who might need focus?" — then show that focused table.
4. Always use a data_table visual for the resulting focused list, not prose.

## VISUAL FORMAT GUIDE

Choose the most informative format. Never leave visual null when a chart or table would be clearer.

| Scenario | Best format |
|---|---|
| 2–4 headline KPIs (total clients, avg score, overdue count) | stat_cards |
| One client's pillar breakdown | radar_chart (title = client name) |
| Comparing a metric across multiple clients | bar_chart |
| Score progress over time / across assessments | line_chart |
| Multi-client table (name + scores + pillars) | data_table |
| Milestone progress for one client | data_table (columns: Metric, Baseline, Current, Target, Unit) |
| Programming plan, bullet checklist, multi-step advice | text with Markdown (## headings, **bold**, - bullets) |

Visual schemas (use exactly):
- { "type": "data_table", "title": "string", "data": { "columns": string[], "rows": Array<Array<string | number>> } }
- { "type": "radar_chart", "title": "string", "data": { "labels": string[], "datasets": [{ "label": string, "data": number[] }] } }
- { "type": "bar_chart", "title": "string", "data": { "labels": string[], "datasets": [{ "label": string, "data": number[] }] } }
- { "type": "line_chart", "title": "string", "data": { "labels": string[], "datasets": [{ "label": string, "data": number[] }] } }
- { "type": "stat_cards", "title": "string", "data": { "cards": [{ "label": string, "value": string | number, "sub": string }] } }

${dataModeAddendum}

Today's date: ${todayIso}

Roster payloads may be compact (summaries + index). If you need pillar scores, assessment history, milestone progress, health flags, or movement details for a specific client that are not in the snapshot, emit action intent "fetch_client_data" with that client's "id" from clientIndex (and a short message like you're pulling their file). The app will load full detail and call you again — do not repeat fetch_client_data for the same client id in the follow-up turn.

CRITICAL: If your "message" says you will load, pull up, open, or fetch someone's full profile or full pillar details, you MUST include "fetch_client_data" in "actions" with that client's id from clientIndex in the SAME JSON response. The app only runs the automatic follow-up when that action is present — never promise a fetch in prose alone without the action.

Always respond with raw valid JSON only — no markdown, no code fences, no text before or after the JSON object. Use double quotes for all JSON keys and string values. Exact shape:
{
  "message": "conversational reply to the coach",
  "visual": null,
  "actions": null
}

The "message" field is for the coach: use clear prose and, when helpful (training plans, multi-day splits, bullet checklists), structure it with Markdown — ## or ### section headings, **bold** labels, and - bullet lists with blank lines between sections. Never put raw JSON or outer response structure inside "message"; use "visual" for numeric tables and charts.

Optional "actions" (instead of null) — array of:
{ "label": "string", "intent": "start_assessment" | "view_client" | "view_report" | "view_roadmap" | "view_schedule" | "view_artifacts" | "view_billing" | "fetch_client_data", "clientId": string | null, "assessmentId": string | null, "style": "primary" | "secondary" }

For fetch_client_data, set clientId to the client's id from clientIndex (stable slug id). For start_assessment, set clientId to the client's full display name as it appears in COACH CLIENT DATA.

Use intents only — never put URLs in the JSON.

## SLASH COMMAND INTENTS

When the routing hint contains an "intent" key, use it to shape the reply:
- \`slash_today\` — Daily brief: list overdue and due-soon clients with pillar details, any tasks due today or overdue. Show a stat_cards visual (overdue count, due-soon count, total active clients).
- \`slash_due\` — Who needs reassessing: list all overdue + due-soon clients with pillar schedule, days overdue/remaining. Use a data_table (Name | Pillar | Status | Days). Offer start_assessment actions for top 2–3.
- \`slash_progress\` — Score trends: show clients who improved or declined since their last assessment. Use trend and previousScore from latestAssessmentByClient. Show a bar_chart (client names vs score delta) and note the biggest improvements and biggest declines. If trend data is absent, say so and suggest reassessing those clients.
- \`slash_health\` — Roster health overview: surface clients with overall score < 55, most common weakness patterns (from weaknessAggregates), how many clients are overdue. Use stat_cards + a bar_chart of top weakness categories across the roster.
- \`slash_share\` — Summarise available public links. Tell the coach they can manage these from Artifacts, offer a view_artifacts action.
- \`slash_help\` — Output the help text listing all commands and what they do.
- \`slash_clients\` or \`slash_work\` — Summarise the roster or queue from COACH CLIENT DATA.

Chat-first UX: answer in the thread with a helpful "message" plus a "visual" when it makes information clearer. When the coach asks about a client's AXIS Score™ (overall + pillar/category breakdown), put a radar_chart in "visual" using that client's category scores once full detail is loaded or when scores appear in summaries. For ARC™ milestone progress, show a data_table with Metric / Baseline / Current / Target columns from milestoneProgress when available. Prefer zero to three actions; do not flood the thread with navigation buttons.`;
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
  adminOrgContext?: Record<string, unknown> | null;
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
      ? `## MODE: CLIENT DATA (active)
Treat COACH CLIENT DATA as the single source of truth for all client-specific information — names, scores, dates, pillar findings, weaknesses. Report only what is in the payload. If something is missing, say so plainly and offer fetch_client_data if applicable. Do not answer general programming or exercise-prescription questions — tell the coach to switch to Coaching Chat for that.`
      : `## MODE: COACHING CHAT (active)
You are in general coaching and fitness knowledge mode. You may answer programming, exercise science, nutrition, periodisation, and coaching concept questions freely and in depth.

CRITICAL — CLIENT DATA RULES IN THIS MODE:
1. Do NOT cite specific client names, scores, dates, or assessment findings as facts. You have a data snapshot but in this mode it should not be used to make specific factual claims about individual clients.
2. If the coach asks about a specific client ("what was Sarah's score?", "who's overdue?", "show me my roster"), do NOT attempt to answer from the snapshot. Instead say: "For specific client data, switch to Client Data mode — that keeps your client information accurate and reliable. I'll answer any programming or coaching questions here."
3. You may reference general roster context in broad terms only (e.g., "if your client has low mobility scores") — never as specific named facts.
4. Be genuinely helpful for coaching knowledge — training plans, periodisation, exercise selection, injury considerations, programming progressions, nutrition principles.`;

  const systemInstruction = buildUnifiedSystemInstruction(todayIso, dataModeAddendum, params.adminOrgContext ?? undefined);
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
  adminOrgContext?: Record<string, unknown> | null;
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
    adminOrgContext,
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
    adminOrgContext: adminOrgContext ?? null,
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
