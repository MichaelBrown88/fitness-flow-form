/**
 * AI Pricing Constants (frontend)
 *
 * Single source of truth for all AI cost calculations in the client app.
 * Mirrors functions/src/aiPricing.ts on the backend.
 *
 * All USD costs are converted to KWD fils for storage:
 *   fils = Math.ceil(usdCost * USD_TO_KWD_RATE * 1000)
 */

export const USD_TO_KWD_RATE = 0.305;
export const TOKENS_PER_REQUEST = 7_000;

/**
 * Cost per request in USD for each AI provider.
 * These are conservative estimates; actual cost is logged when available.
 */
export const PROVIDER_COST_USD: Record<string, number> = {
  gemini: 0.000675,
  openai: 0.001,
  anthropic: 0.0015,
};

/**
 * Convert a USD cost estimate to KWD fils.
 */
export function usdToFils(usdCost: number): number {
  return Math.ceil(usdCost * USD_TO_KWD_RATE * 1_000);
}

/**
 * Estimate the cost in KWD fils for a given provider.
 * Falls back to Gemini pricing if the provider is unknown.
 */
export function estimateCostFils(provider: string): number {
  const usd = PROVIDER_COST_USD[provider] ?? PROVIDER_COST_USD.gemini;
  return usdToFils(usd);
}

/**
 * Resolve actual cost in KWD fils from a log document.
 * Checks all known field shapes (root, metadata, token-based fallback).
 */
export function getLogCostFils(data: Record<string, unknown>): number {
  const meta = data.metadata as Record<string, unknown> | undefined;

  let costFils = Number(data.costFils ?? 0);
  if (costFils === 0 && typeof data.costEstimate === 'number') {
    costFils = usdToFils(data.costEstimate);
  }
  if (costFils === 0 && meta) {
    costFils = Number(meta.costFils ?? 0);
    if (costFils === 0 && typeof meta.costEstimate === 'number') {
      costFils = usdToFils(meta.costEstimate);
    }
  }
  const tokens = Number(data.tokensUsed ?? meta?.tokensUsed ?? 0);
  if (costFils === 0 && tokens > 0) {
    const provider = typeof data.provider === 'string' ? data.provider : 'gemini';
    const costPerRequest = PROVIDER_COST_USD[provider] ?? PROVIDER_COST_USD.gemini;
    const usd = (tokens / TOKENS_PER_REQUEST) * costPerRequest;
    costFils = usdToFils(usd);
  }
  return costFils;
}
