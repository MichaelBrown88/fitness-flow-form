import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, limit, Timestamp, doc, getDoc } from 'firebase/firestore';
import { getDb } from '@/services/firebase';
import { logger } from '@/lib/utils/logger';

export type AIUsageType = 'ocr_inbody' | 'posture_analysis' | 'exercise_recommendation';
export type AIUsageStatus = 'local_success' | 'ai_fallback' | 'ai_success' | 'error';

export interface AIUsageLog {
  id?: string;
  timestamp: Timestamp;
  type: AIUsageType;
  status: AIUsageStatus;
  provider: 'local' | 'gemini' | 'mediapipe';
  organizationId?: string;
  coachUid: string;
  costEstimate?: number; // Estimated cost in USD (legacy)
  costFils?: number; // Cost in fils (1 KWD = 1000 fils) - for aggregation
  tokensUsed?: number; // Token count (if available)
  metadata?: Record<string, unknown>;
}

/**
 * Log an AI usage event
 * 
 * Automatically looks up organizationId from coach's profile if not provided.
 * This ensures all AI usage is properly tracked per organization.
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
    
    // If organizationId not provided, look it up from coach's user profile
    let finalOrganizationId = organizationId;
    if (!finalOrganizationId) {
      try {
        const userProfileRef = doc(db, 'userProfiles', coachUid);
        const userProfileSnap = await getDoc(userProfileRef);
        if (userProfileSnap.exists()) {
          finalOrganizationId = userProfileSnap.data().organizationId || null;
        }
      } catch (e) {
        // If lookup fails, continue without organizationId (will be backfilled later)
        logger.warn('[AI-USAGE] Failed to lookup organizationId for coach:', coachUid, e);
      }
    }
    
    // Simple cost estimation for Gemini 2.0 Flash
    // Gemini 2.0 Flash pricing: ~$0.075 per 1M input tokens, ~$0.30 per 1M output tokens
    // Average request: ~5k input tokens, ~2k output tokens = ~$0.000675 per request
    // Converting to KWD (1 USD ≈ 0.305 KWD) then to fils (1 KWD = 1000 fils)
    let costEstimate = 0; // USD (legacy)
    let costFils = 0; // Fils (for aggregation)
    let tokensUsed = 0;
    
    if (provider === 'gemini') {
      costEstimate = 0.000675; // Rough average per request in USD
      // Convert USD to KWD, then to fils: 0.000675 USD * 0.305 KWD/USD * 1000 fils/KWD
      // Use Math.ceil to ensure we don't lose cost (0.205875 fils rounds to 1, not 0)
      costFils = Math.ceil(costEstimate * 0.305 * 1000); // ~1 fil per request (rounded up)
      tokensUsed = 7000; // Average tokens per request (5k input + 2k output)
    }

    await addDoc(usageRef, {
      timestamp: serverTimestamp(),
      type,
      status,
      provider,
      coachUid,
      organizationId: finalOrganizationId || null,
      costEstimate, // Legacy field (USD)
      costFils, // New field (fils) - used by Cloud Functions for aggregation
      tokensUsed, // Token count for tracking
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

  const totalRequests = logs.length;
  const aiRequests = logs.filter(l => l.provider === 'gemini').length;
  const localRequests = logs.filter(l => l.provider !== 'gemini').length;
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

