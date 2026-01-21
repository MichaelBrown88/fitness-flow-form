import { httpsCallable } from 'firebase/functions';
import { getFirebaseFunctions, getDb } from '@/services/firebase';
import { CONFIG } from '@/config';
import { publishPublicReport } from './publicReports';
import type { UserProfile } from '@/types/auth';

const functions = getFirebaseFunctions();

type ShareView = 'client' | 'coach';

export type ShareArtifacts = {
  shareUrl: string;
  whatsappText: string;
};

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
}): Promise<ShareArtifacts> {
  const { assessmentId, view, coachUid, formData, organizationId, profile } = params;
  
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
  const whatsappText = `Here is ${clientName}'s FitnessFlow assessment report:\n${shareUrl}`;

  return {
    shareUrl,
    whatsappText,
  };
}

export async function sendReportEmail(params: { assessmentId: string; view: ShareView; to: string; clientName?: string }) {
  const callable = httpsCallable(functions, CONFIG.AI.FUNCTIONS.EMAIL_REPORT);
  await callable(params);
}
