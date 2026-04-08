/**
 * Monthly org-level AI assistant usage (requests + tokens) for quota enforcement.
 * Path: organizations/{orgId}/aiUsage/{YYYY-MM}
 */

import { doc, getDoc, increment, serverTimestamp, setDoc } from 'firebase/firestore';
import { getDb } from '@/services/firebase';
import { ORGANIZATION } from '@/lib/database/paths';
import { logger } from '@/lib/utils/logger';

export function currentAssistantUsageMonthId(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function usageDocRef(orgId: string, monthId: string) {
  return doc(getDb(), ORGANIZATION.collection(), orgId, 'aiUsage', monthId);
}

export type OrgAssistantUsageMonth = {
  totalTokens: number;
  totalRequests: number;
};

export async function readOrgAssistantUsageMonth(
  orgId: string,
  monthId: string,
): Promise<OrgAssistantUsageMonth> {
  try {
    const snap = await getDoc(usageDocRef(orgId, monthId));
    if (!snap.exists()) return { totalTokens: 0, totalRequests: 0 };
    const d = snap.data();
    return {
      totalTokens: typeof d.totalTokens === 'number' && Number.isFinite(d.totalTokens) ? d.totalTokens : 0,
      totalRequests:
        typeof d.totalRequests === 'number' && Number.isFinite(d.totalRequests) ? d.totalRequests : 0,
    };
  } catch (e) {
    logger.warn('[coachAssistantOrgUsage] read failed', e);
    return { totalTokens: 0, totalRequests: 0 };
  }
}

export async function incrementOrgAssistantUsageMonth(
  orgId: string,
  monthId: string,
  tokensDelta: number,
): Promise<void> {
  const safeTokens = Number.isFinite(tokensDelta) && tokensDelta >= 0 ? Math.floor(tokensDelta) : 0;
  try {
    await setDoc(
      usageDocRef(orgId, monthId),
      {
        totalTokens: increment(safeTokens),
        totalRequests: increment(1),
        lastUpdated: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (e) {
    logger.warn('[coachAssistantOrgUsage] increment failed', e);
  }
}
