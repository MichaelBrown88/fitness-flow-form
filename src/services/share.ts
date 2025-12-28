import { httpsCallable } from 'firebase/functions';
import { getFirebaseFunctions } from '@/lib/firebase';
import { CONFIG } from '@/config';

const functions = getFirebaseFunctions();

type ShareView = 'client' | 'coach';

export type ShareArtifacts = {
  shareUrl: string;
  pdfUrl: string;
  whatsappText: string;
};

export async function requestShareArtifacts(params: { assessmentId: string; view: ShareView }): Promise<ShareArtifacts> {
  const callable = httpsCallable(functions, CONFIG.AI.FUNCTIONS.REQUEST_REPORT_SHARE);
  const result = await callable(params);
  return result.data as ShareArtifacts;
}

export async function sendReportEmail(params: { assessmentId: string; view: ShareView; to: string; clientName?: string }) {
  const callable = httpsCallable(functions, CONFIG.AI.FUNCTIONS.EMAIL_REPORT);
  await callable(params);
}







