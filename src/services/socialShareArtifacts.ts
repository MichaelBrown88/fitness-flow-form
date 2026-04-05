/**
 * Callable: generate token-scoped social PNGs and merge URLs onto the public report doc.
 */

import { httpsCallable, type HttpsCallableResult } from 'firebase/functions';
import { getFirebaseFunctions } from '@/services/firebase';
import { logger } from '@/lib/utils/logger';

export type GenerateSocialShareArtifactsResponse = {
  socialShareArtifacts: {
    og1200x630Url: string;
    square1080Url: string;
    story1080x1920Url: string;
    contentHash: string;
  };
};

export async function generatePublicReportSocialShareArtifacts(params: {
  assessmentId: string;
}): Promise<GenerateSocialShareArtifactsResponse> {
  const fn = httpsCallable<{ assessmentId: string }, GenerateSocialShareArtifactsResponse>(
    getFirebaseFunctions(),
    'generatePublicReportSocialShareArtifacts',
  );
  let result: HttpsCallableResult<GenerateSocialShareArtifactsResponse>;
  try {
    result = await fn({ assessmentId: params.assessmentId.trim() });
  } catch (e) {
    logger.error('[generatePublicReportSocialShareArtifacts] callable failed', e);
    throw e;
  }
  const data = result.data;
  if (
    !data?.socialShareArtifacts?.og1200x630Url ||
    !data.socialShareArtifacts.square1080Url ||
    !data.socialShareArtifacts.story1080x1920Url
  ) {
    throw new Error('Invalid response from generatePublicReportSocialShareArtifacts');
  }
  return data;
}
