/**
 * What Changed Narrative
 *
 * Generates a 2-sentence plain-English summary of score changes between
 * two assessment sessions. Computed at share time (coach is authenticated),
 * cached in publicReports/{token}.changeNarrative, read by the client portal.
 */

import { getAI, VertexAIBackend, getGenerativeModel } from 'firebase/ai';
import { getApp } from 'firebase/app';
import { CONFIG } from '@/config';
import { logAIUsage } from '@/services/aiUsage';
import { logger } from '@/lib/utils/logger';
import type { ScoreSummary } from '@/lib/scoring/types';

const CATEGORY_DISPLAY: Record<string, string> = {
  bodyComp: 'Body Composition',
  cardio: 'Metabolic Fitness',
  strength: 'Functional Strength',
  movementQuality: 'Movement Quality',
  lifestyle: 'Lifestyle',
};

interface CategoryDelta {
  label: string;
  current: number;
  previous: number;
  delta: number;
}

export async function generateWhatChangedNarrative(params: {
  coachUid: string;
  organizationId?: string;
  clientName: string;
  currentScores: ScoreSummary;
  previousScores: ScoreSummary;
}): Promise<string> {
  const { coachUid, organizationId, clientName, currentScores, previousScores } = params;

  const overallDelta = currentScores.overall - previousScores.overall;

  const categoryDeltas: CategoryDelta[] = currentScores.categories.map((cat) => {
    const prev = previousScores.categories.find((c) => c.id === cat.id);
    const prevScore = prev?.score ?? 0;
    return {
      label: CATEGORY_DISPLAY[cat.id] ?? cat.title,
      current: cat.score,
      previous: prevScore,
      delta: cat.score - prevScore,
    };
  });

  const sorted = [...categoryDeltas].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const topChange = sorted[0];
  const improved = categoryDeltas.filter((c) => c.delta > 0);
  const declined = categoryDeltas.filter((c) => c.delta < 0);

  const prompt = `You are a fitness coach writing a short 2-sentence progress update for a client named ${clientName.split(' ')[0]}.

Assessment data (current vs. previous):
- Overall score: ${previousScores.overall} → ${currentScores.overall} (${overallDelta >= 0 ? '+' : ''}${overallDelta} points)
${categoryDeltas.map((c) => `- ${c.label}: ${c.previous} → ${c.current} (${c.delta >= 0 ? '+' : ''}${c.delta})`).join('\n')}

Most changed area: ${topChange?.label} (${topChange?.delta >= 0 ? '+' : ''}${topChange?.delta} pts)
Improved areas: ${improved.map((c) => c.label).join(', ') || 'none'}
Declined areas: ${declined.map((c) => c.label).join(', ') || 'none'}

Write exactly 2 sentences:
1. Describe the overall progress (positive or constructive tone)
2. Highlight the biggest change (most improved or most declined pillar) and what to focus on next

Rules:
- Write in second person ("Your...")
- Keep it under 60 words total
- Be specific and data-driven (mention actual score numbers)
- Do not use the word "assessment" more than once
- Sound encouraging regardless of whether scores improved or declined`;

  try {
    const firebaseApp = getApp();
    const ai = getAI(firebaseApp, { backend: new VertexAIBackend() });
    const model = getGenerativeModel(ai, {
      model: CONFIG.AI.GEMINI.MODEL_NAME,
      generationConfig: {
        maxOutputTokens: 150,
        temperature: 0.4,
      },
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const narrative = result.response.text().trim();
    await logAIUsage(coachUid, 'comparison_narrative', 'ai_success', 'gemini', organizationId);
    return narrative;
  } catch (error) {
    await logAIUsage(coachUid, 'comparison_narrative', 'error', 'gemini', organizationId);
    logger.error('[whatChangedNarrative] Generation failed:', error);
    throw error;
  }
}
