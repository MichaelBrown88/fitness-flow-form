import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, Timestamp, doc, getDoc } from 'firebase/firestore';
import { getDb } from '@/services/firebase';
import { estimateCostFils, PROVIDER_COST_USD, TOKENS_PER_REQUEST } from '@/lib/ai/aiPricing';
import { logger } from '@/lib/utils/logger';

export type AIUsageType = 'ocr_inbody' | 'posture_analysis' | 'exercise_recommendation' | 'comparison_narrative';
export type AIUsageStatus = 'local_success' | 'ai_fallback' | 'ai_success' | 'error';

export interface AIUsageLog {
  id?: string;
  timestamp: Timestamp;
  type: AIUsageType;
  status: AIUsageStatus;
  provider: 'local' | 'gemini' | 'mediapipe' | 'pattern';
  organizationId?: string;
  coachUid: string;
  costEstimate?: number;
  costFils?: number;
  tokensUsed?: number;
  metadata?: Record<string, unknown>;
}

const orgIdCache = new Map<string, string | null>();

async function resolveOrganizationId(coachUid: string): Promise<string | null> {
  if (orgIdCache.has(coachUid)) return orgIdCache.get(coachUid) ?? null;
  try {
    const db = getDb();
    const snap = await getDoc(doc(db, 'userProfiles', coachUid));
    const orgId = snap.exists() ? (snap.data().organizationId as string) || null : null;
    orgIdCache.set(coachUid, orgId);
    return orgId;
  } catch {
    return null;
  }
}

/**
 * Log an AI usage event.
 * Organization ID is cached per coach to avoid repeated Firestore reads.
 */
export async function logAIUsage(
  coachUid: string,
  type: AIUsageType,
  status: AIUsageStatus,
  provider: AIUsageLog['provider'],
  organizationId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const db = getDb();
    const usageRef = collection(db, 'ai_usage_logs');
    
    const finalOrganizationId = organizationId || await resolveOrganizationId(coachUid);
    
    const knownProvider =
      provider !== 'local' && provider !== 'mediapipe' && provider !== 'pattern';
    const costEstimate = knownProvider ? (PROVIDER_COST_USD[provider] ?? PROVIDER_COST_USD.gemini) : 0;
    const costFils = knownProvider ? estimateCostFils(provider) : 0;
    const tokensUsed = knownProvider ? TOKENS_PER_REQUEST : 0;

    await addDoc(usageRef, {
      timestamp: serverTimestamp(),
      type,
      status,
      provider,
      coachUid,
      organizationId: finalOrganizationId || null,
      costEstimate,
      costFils,
      tokensUsed,
      metadata: metadata || {}
    });
  } catch (err) {
    logger.warn('[AI-USAGE] Failed to log usage:', err);
  }
}

/**
 * Get AI usage stats for an organization or coach
 */
export async function getAIUsageStats(
  coachUid: string,
  organizationId?: string,
  days: number = 30
): Promise<{
  totalRequests: number;
  aiRequests: number;
  localRequests: number;
  savingsRate: number; // Percent of requests handled locally
  totalCost: number;
}> {
  const db = getDb();
  const usageRef = collection(db, 'ai_usage_logs');
  
  const startTime = new Date();
  startTime.setDate(startTime.getDate() - days);
  
  const q = query(
    usageRef,
    where('coachUid', '==', coachUid),
    where('timestamp', '>=', Timestamp.fromDate(startTime)),
    orderBy('timestamp', 'desc')
  );

  // If organizationId provided, we can filter by it too (if indexing allows)
  // Note: Firestore might require a composite index for this.
  
  const snap = await getDocs(q);
  const logs: AIUsageLog[] = [];
  snap.forEach(doc => logs.push({ id: doc.id, ...doc.data() } as AIUsageLog));

  const localProviders = new Set(['local', 'mediapipe', 'pattern']);
  const totalRequests = logs.length;
  const aiRequests = logs.filter(l => !localProviders.has(l.provider)).length;
  const localRequests = logs.filter(l => localProviders.has(l.provider)).length;
  const totalCost = logs.reduce((sum, l) => sum + (l.costEstimate || 0), 0);
  
  const savingsRate = totalRequests > 0 ? (localRequests / totalRequests) * 100 : 100;

  return {
    totalRequests,
    aiRequests,
    localRequests,
    savingsRate,
    totalCost
  };
}

