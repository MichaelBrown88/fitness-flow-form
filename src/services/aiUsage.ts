import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import { getDb } from '@/lib/firebase';

export type AIUsageType = 'ocr_inbody' | 'posture_analysis' | 'exercise_recommendation';
export type AIUsageStatus = 'local_success' | 'ai_fallback' | 'ai_success' | 'error';

export interface AIUsageLog {
  id?: string;
  timestamp: Timestamp;
  type: AIUsageType;
  status: AIUsageStatus;
  provider: 'local' | 'gemini' | 'tesseract' | 'mediapipe';
  organizationId?: string;
  coachUid: string;
  costEstimate?: number; // Estimated cost in USD
  metadata?: Record<string, any>;
}

/**
 * Log an AI usage event
 */
export async function logAIUsage(
  coachUid: string,
  type: AIUsageType,
  status: AIUsageStatus,
  provider: AIUsageLog['provider'],
  organizationId?: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const db = getDb();
    const usageRef = collection(db, 'ai_usage_logs');
    
    // Simple cost estimation for Gemini 2.0 Flash
    let costEstimate = 0;
    if (provider === 'gemini') {
      costEstimate = 0.0001; // Rough average per request
    }

    await addDoc(usageRef, {
      timestamp: serverTimestamp(),
      type,
      status,
      provider,
      coachUid,
      organizationId: organizationId || null,
      costEstimate,
      metadata: metadata || {}
    });
  } catch (err) {
    console.warn('[AI-USAGE] Failed to log usage:', err);
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
  
  let q = query(
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

