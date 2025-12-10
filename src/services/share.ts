import { httpsCallable } from 'firebase/functions';
import { getFirebaseFunctions } from '@/lib/firebase';

const functions = getFirebaseFunctions();

type ShareView = 'client' | 'coach';

export type ShareArtifacts = {
  shareUrl: string;
  pdfUrl: string;
  whatsappText: string;
};

export async function requestShareArtifacts(params: { assessmentId: string; view: ShareView }): Promise<ShareArtifacts> {
  const callable = httpsCallable(functions, 'requestReportShare');
  const result = await callable(params);
  return result.data as ShareArtifacts;
}

export async function sendReportEmail(params: { assessmentId: string; view: ShareView; to: string; clientName?: string }) {
  const callable = httpsCallable(functions, 'emailReport');
  await callable(params);
}







