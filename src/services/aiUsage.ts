import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  Timestamp,
  doc,
  getDoc,
} from 'firebase/firestore';
import { getDb } from '@/services/firebase';
import { AI_USAGE_STATS_QUERY_LIMIT } from '@/constants/firestoreQueryLimits';
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

const AI_USAGE_TYPES = new Set<AIUsageType>([
  'ocr_inbody',
  'posture_analysis',
  'exercise_recommendation',
  'comparison_narrative',
]);

const AI_USAGE_STATUSES = new Set<AIUsageStatus>(['local_success', 'ai_fallback', 'ai_success', 'error']);

const AI_USAGE_PROVIDERS = new Set<AIUsageLog['provider']>(['local', 'gemini', 'mediapipe', 'pattern']);

const orgIdCache = new Map<string, string | null>();

async function resolveOrganizationId(coachUid: string): Promise<string | null> {
  if (orgIdCache.has(coachUid)) return orgIdCache.get(coachUid) ?? null;
  try {
    const db = getDb();
    const snap = await getDoc(doc(db, 'userProfiles', coachUid));
    const rawOrg = snap.exists() ? snap.data().organizationId : undefined;
    const orgId = typeof rawOrg === 'string' && rawOrg.length > 0 ? rawOrg : null;
    orgIdCache.set(coachUid, orgId);
    return orgId;
  } catch {
    return null;
  }
}

function isFirestoreDataRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseMetadata(raw: unknown): Record<string, unknown> | undefined {
  if (raw === undefined || raw === null) return undefined;
  return isFirestoreDataRecord(raw) ? raw : undefined;
}

function parseAIUsageLogDoc(docId: string, data: Record<string, unknown>): AIUsageLog | null {
  const ts = data.timestamp;
  if (!(ts instanceof Timestamp)) return null;

  const type = data.type;
  if (typeof type !== 'string' || !AI_USAGE_TYPES.has(type as AIUsageType)) return null;

  const status = data.status;
  if (typeof status !== 'string' || !AI_USAGE_STATUSES.has(status as AIUsageStatus)) return null;

  const provider = data.provider;
  if (typeof provider !== 'string' || !AI_USAGE_PROVIDERS.has(provider as AIUsageLog['provider'])) {
    return null;
  }

  const coachUid = data.coachUid;
  if (typeof coachUid !== 'string') return null;

  const organizationIdRaw = data.organizationId;
  let orgParsed: string | undefined;
  if (organizationIdRaw === undefined || organizationIdRaw === null) {
    orgParsed = undefined;
  } else if (typeof organizationIdRaw === 'string') {
    orgParsed = organizationIdRaw;
  } else {
    return null;
  }

  const costEstimate = data.costEstimate;
  const costFils = data.costFils;
  const tokensUsed = data.tokensUsed;

  return {
    id: docId,
    timestamp: ts,
    type: type as AIUsageType,
    status: status as AIUsageStatus,
    provider: provider as AIUsageLog['provider'],
    organizationId: orgParsed,
    coachUid,
    costEstimate: typeof costEstimate === 'number' ? costEstimate : undefined,
    costFils: typeof costFils === 'number' ? costFils : undefined,
    tokensUsed: typeof tokensUsed === 'number' ? tokensUsed : undefined,
    metadata: parseMetadata(data.metadata),
  };
}

/**
 * Log an AI usage event.
 * Organization ID is cached per coach to avoid repeated Firestore reads.
 * Skips write when org cannot be resolved (Firestore rules require organizationId for coach-created logs).
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
    const finalOrganizationId = organizationId || (await resolveOrganizationId(coachUid));
    if (!finalOrganizationId) {
      logger.warn('[AI-USAGE] Skipping log: no organizationId for coach', { coachUid, type });
      return;
    }

    const db = getDb();
    const usageRef = collection(db, 'ai_usage_logs');

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
      organizationId: finalOrganizationId,
      costEstimate,
      costFils,
      tokensUsed,
      metadata: metadata ?? {},
    });
  } catch (err) {
    logger.warn('[AI-USAGE] Failed to log usage:', err);
  }
}

/**
 * Recent AI usage stats for a coach within an organization (bounded read).
 */
export async function getAIUsageStats(
  coachUid: string,
  organizationId: string,
  days: number = 30
): Promise<{
  totalRequests: number;
  aiRequests: number;
  localRequests: number;
  savingsRate: number;
  totalCost: number;
}> {
  const db = getDb();
  const usageRef = collection(db, 'ai_usage_logs');

  const startTime = new Date();
  startTime.setDate(startTime.getDate() - days);

  const q = query(
    usageRef,
    where('organizationId', '==', organizationId),
    where('coachUid', '==', coachUid),
    where('timestamp', '>=', Timestamp.fromDate(startTime)),
    orderBy('timestamp', 'desc'),
    limit(AI_USAGE_STATS_QUERY_LIMIT)
  );

  const snap = await getDocs(q);
  const logs: AIUsageLog[] = [];
  snap.forEach((d) => {
    const raw = d.data();
    if (!isFirestoreDataRecord(raw)) return;
    const parsed = parseAIUsageLogDoc(d.id, raw);
    if (parsed) logs.push(parsed);
  });

  const localProviders = new Set(['local', 'mediapipe', 'pattern']);
  const totalRequests = logs.length;
  const aiRequests = logs.filter((l) => !localProviders.has(l.provider)).length;
  const localRequests = logs.filter((l) => localProviders.has(l.provider)).length;
  const totalCost = logs.reduce((sum, l) => sum + (l.costEstimate || 0), 0);

  const savingsRate = totalRequests > 0 ? (localRequests / totalRequests) * 100 : 100;

  return {
    totalRequests,
    aiRequests,
    localRequests,
    savingsRate,
    totalCost,
  };
}
