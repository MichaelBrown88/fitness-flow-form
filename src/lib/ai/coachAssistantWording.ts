/**
 * Optional Gemini pass for coach assistant (Assist mode).
 * Input is a strict JSON fact sheet assembled by the app — the model must not invent facts.
 */

import { getAI, VertexAIBackend, getGenerativeModel } from 'firebase/ai';
import { getApp } from 'firebase/app';
import { CONFIG } from '@/config';
import { logAIUsage } from '@/services/aiUsage';
import { logger } from '@/lib/utils/logger';

export async function generateCoachAssistantWording(params: {
  coachUid: string;
  organizationId?: string;
  /** Whitelisted serializable facts only */
  facts: Record<string, unknown>;
}): Promise<string> {
  const { coachUid, organizationId, facts } = params;
  const json = JSON.stringify(facts, null, 0);

  const prompt = `You are a concise assistant for a fitness coach app. Rewrite the following JSON facts into 2–4 short sentences for the coach. Use second person where natural ("You have…").

FACTS (JSON — this is the only source of truth):
${json}

Rules:
- Do not add clients, dates, scores, medical claims, or URLs that are not in the JSON.
- If facts are empty or intent is "unknown", say briefly that you could not find a match and suggest /help.
- Under 120 words. Plain text only, no markdown headings.`;

  try {
    const firebaseApp = getApp();
    const ai = getAI(firebaseApp, { backend: new VertexAIBackend() });
    const model = getGenerativeModel(ai, {
      model: CONFIG.AI.GEMINI.MODEL_NAME,
      generationConfig: {
        maxOutputTokens: 200,
        temperature: 0.35,
      },
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const text = result.response.text().trim();
    await logAIUsage(coachUid, 'coach_assistant_wording', 'ai_success', 'gemini', organizationId);
    return text;
  } catch (error) {
    await logAIUsage(coachUid, 'coach_assistant_wording', 'error', 'gemini', organizationId);
    logger.error('[coachAssistantWording] Generation failed:', error);
    throw error;
  }
}
