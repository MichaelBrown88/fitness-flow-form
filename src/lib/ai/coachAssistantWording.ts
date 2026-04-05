/**
 * Gemini-backed coach assistant response generator (AI Assist mode).
 *
 * Replaces the old facts-only wording pass with a full conversational AI
 * that can: answer general fitness questions, summarise client data, and
 * maintain thread context across multiple turns.
 */

import { getAI, VertexAIBackend, getGenerativeModel } from 'firebase/ai';
import { getApp } from 'firebase/app';
import { CONFIG } from '@/config';
import { logAIUsage } from '@/services/aiUsage';
import { logger } from '@/lib/utils/logger';

const SYSTEM_PROMPT = `You are an expert fitness coaching assistant built into One Assess, a professional fitness assessment platform used by personal trainers and strength coaches.

Your role:
- Help coaches understand client assessment data, plan reassessments, and design programming
- Answer general fitness, programming, exercise science, and nutrition questions accurately
- Generate useful, actionable client summaries when asked about specific clients

Style:
- Direct and practical — 2–4 sentences unless more detail genuinely helps
- Plain prose; no markdown headers; use bullet points only when listing multiple distinct items
- Address the coach in second person ("You have 3 overdue clients…", "Her body comp score…")
- Never invent client names, scores, or dates not present in the data provided to you
- For general fitness and programming questions, answer confidently from exercise science knowledge
- Keep responses under 250 words`;

function buildPrompt(
  userText: string,
  facts: Record<string, unknown>,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
): string {
  const parts: string[] = [];

  // Include structured client/intent data when it contains useful context
  const intent = facts.intent as string | undefined;
  const hasClientData = intent && intent !== 'unknown' && Object.keys(facts).length > 1;
  if (hasClientData) {
    parts.push(`Client data context:\n${JSON.stringify(facts, null, 2)}`);
  }

  // Prior conversation turns for multi-turn context (last 8 messages)
  if (history.length > 0) {
    const recent = history.slice(-8);
    const lines = recent.map(
      (m) => `${m.role === 'user' ? 'Coach' : 'You'}: ${m.content}`,
    );
    parts.push(`Recent conversation:\n${lines.join('\n')}`);
  }

  parts.push(`Coach: ${userText}`);
  return parts.join('\n\n');
}

export async function generateCoachAssistantResponse(params: {
  coachUid: string;
  organizationId?: string;
  userText: string;
  intentFacts: Record<string, unknown>;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
}): Promise<string> {
  const { coachUid, organizationId, userText, intentFacts, conversationHistory } = params;

  const prompt = buildPrompt(userText, intentFacts, conversationHistory);

  try {
    const firebaseApp = getApp();
    const ai = getAI(firebaseApp, { backend: new VertexAIBackend() });
    const model = getGenerativeModel(ai, {
      model: CONFIG.AI.GEMINI.MODEL_NAME,
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      generationConfig: {
        maxOutputTokens: 350,
        temperature: 0.5,
      },
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const text = result.response.text().trim();
    await logAIUsage(coachUid, 'coach_assistant_response', 'ai_success', 'gemini', organizationId);
    return text;
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
  return generateCoachAssistantResponse({
    coachUid: params.coachUid,
    organizationId: params.organizationId,
    userText: '',
    intentFacts: params.facts,
    conversationHistory: [],
  });
}
