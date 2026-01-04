import { httpsCallable } from 'firebase/functions';
import { getFirebaseFunctions } from '@/lib/firebase';
import { CONFIG } from '@/config';
import { publishPublicReport } from './publicReports';

const functions = getFirebaseFunctions();

type ShareView = 'client' | 'coach';

export type ShareArtifacts = {
  shareUrl: string;
  pdfUrl: string;
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
}): Promise<ShareArtifacts> {
  const { assessmentId, view, coachUid, formData, organizationId } = params;
  
  // First, ensure a public report exists (generates token if needed)
  const shareToken = await publishPublicReport({
    coachUid,
    assessmentId,
    formData,
    organizationId,
  });
  
  // Generate the secure share URL using the token
  const shareUrl = `${CONFIG.APP.HOST}/r/${shareToken}`;
  
  // Get PDF URL from Cloud Function (if available)
  let pdfUrl = '';
  try {
    const callable = httpsCallable(functions, CONFIG.AI.FUNCTIONS.REQUEST_REPORT_SHARE);
    const result = await callable({ assessmentId, view });
    const artifacts = result.data as ShareArtifacts;
    pdfUrl = artifacts.pdfUrl || '';
  } catch (err) {
    console.warn('[SHARE] PDF generation not available:', err);
  }
  
  const clientName = formData.fullName || 'your client';
  const whatsappText = `Here is ${clientName}'s One Fitness assessment report:\n${shareUrl}`;
  
  return {
    shareUrl,
    pdfUrl,
    whatsappText,
  };
}

export async function sendReportEmail(params: { assessmentId: string; view: ShareView; to: string; clientName?: string }) {
  const callable = httpsCallable(functions, CONFIG.AI.FUNCTIONS.EMAIL_REPORT);
  await callable(params);
}







