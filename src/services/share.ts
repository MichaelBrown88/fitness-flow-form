import { httpsCallable } from 'firebase/functions';
import { doc, updateDoc, collection, query, where, getDocs, limit, type Timestamp } from 'firebase/firestore';
import { getFirebaseFunctions, getDb } from '@/services/firebase';
import { CONFIG } from '@/config';
import { COLLECTIONS } from '@/constants/collections';
import { publishPublicReport } from './publicReports';
import type { UserProfile } from '@/types/auth';
import { logger } from '@/lib/utils/logger';

const functions = getFirebaseFunctions();

type ShareView = 'client' | 'coach';

export type ShareArtifacts = {
  shareUrl: string;
  whatsappText: string;
  /** Pre-composed message with score context — ready to copy and send via any channel */
  shareMessage: string;
};

export interface ShareTokenInfo {
  token: string;
  createdAt: Date;
  lastAccessed?: Date;
  revoked: boolean;
  clientName: string;
}

/**
 * Get share artifacts (URL, PDF, WhatsApp text) for an assessment
 * This will generate a secure token-based URL if one doesn't exist
 */
export async function requestShareArtifacts(params: { 
  assessmentId: string; 
  view: ShareView;
  coachUid: string;
  formData: import('@/contexts/FormContext').FormData;
  organizationId?: string;
  profile?: UserProfile | null;
  overallScore?: number;
  scoreDelta?: number;
}): Promise<ShareArtifacts> {
  const { assessmentId, view, coachUid, formData, organizationId, profile, overallScore, scoreDelta } = params;
  
  // First, ensure a public report exists (generates token if needed)
  const shareToken = await publishPublicReport({
    coachUid,
    assessmentId,
    formData,
    organizationId,
    profile,
  });

  // Generate the secure share URL using the token
  const shareUrl = `${CONFIG.APP.HOST}/r/${shareToken}`;

  const clientName = formData.fullName || 'your client';
  const firstName = clientName.split(' ')[0];

  let scoreContext = '';
  if (overallScore !== undefined) {
    scoreContext = `Your AXIS Score™: ${overallScore}/100`;
    if (scoreDelta !== undefined && scoreDelta !== 0) {
      const sign = scoreDelta > 0 ? '+' : '';
      scoreContext += ` (${sign}${scoreDelta} since last time)`;
    }
    scoreContext += '.\n';
  }

  const shareMessage = `Hi ${firstName} — your One Assess results are ready! 🎯\n${scoreContext}View your full report (AXIS Score™ & pillars) here: ${shareUrl}`;
  const whatsappText = shareMessage;

  // Notify the client that their report is ready (non-blocking, client view only)
  if (view === 'client') {
    try {
      const { writeNotification } = await import('@/services/notificationWriter');
      await writeNotification({
        shareToken,
        type: 'report_shared',
        title: 'Your report is ready',
        body: 'Your coach shared your latest assessment — open your AXIS Score™ and full report.',
        priority: 'medium',
        actionUrl: shareUrl,
      });
    } catch (err) {
      logger.warn('[Share] Failed to send report_shared notification (non-fatal):', err);
    }
  }

  return {
    shareUrl,
    whatsappText,
    shareMessage,
  };
}

export async function sendReportEmail(params: { assessmentId: string; view: ShareView; to: string; clientName?: string }) {
  const callable = httpsCallable(functions, CONFIG.AI.FUNCTIONS.EMAIL_REPORT);
  await callable(params);
}

/**
 * Fetch all share tokens for a given assessment owned by this coach.
 */
export async function getShareTokensForAssessment(
  coachUid: string,
  assessmentId: string,
): Promise<ShareTokenInfo[]> {
  const q = query(
    collection(getDb(), COLLECTIONS.PUBLIC_REPORTS),
    where('coachUid', '==', coachUid),
    where('assessmentId', '==', assessmentId),
    limit(20),
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((d) => {
    const data = d.data();
    const createdAt = data.createdAt as Timestamp | undefined;
    const lastAccessed = data.lastAccessed as Timestamp | undefined;
    return {
      token: d.id,
      createdAt: createdAt?.toDate?.() ?? new Date(),
      lastAccessed: lastAccessed?.toDate?.(),
      revoked: data.revoked === true,
      clientName: (data.clientName as string) || 'Unknown',
    };
  });
}

/**
 * Mark a share token as revoked so the public viewer shows "no longer available".
 */
export async function revokeShareToken(token: string): Promise<void> {
  const ref = doc(getDb(), COLLECTIONS.PUBLIC_REPORTS, token);
  await updateDoc(ref, { revoked: true });
}
