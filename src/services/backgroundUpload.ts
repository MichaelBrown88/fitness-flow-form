import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { updateDoc, DocumentReference } from 'firebase/firestore';
import { storage } from '@/services/firebase';
import { logger } from '@/lib/utils/logger';
import { BODY_COMP_SCAN_FIRESTORE } from '@/lib/utils/liveSessionBodyComp';

/**
 * Retry a Firestore update with exponential backoff
 * Handles transient network errors like QUIC_TOO_MANY_RTOS
 */
export async function updateDocWithRetry(
  docRef: DocumentReference,
  data: Record<string, unknown>,
  maxRetries: number = 3,
  context: string = 'update'
): Promise<void> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await updateDoc(docRef, data);
      if (attempt > 1) {
        logger.debug(`${context} succeeded on attempt ${attempt}`, 'FIRESTORE_RETRY');
      }
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on permission errors or document not found
      const errorMessage = lastError.message.toLowerCase();
      if (errorMessage.includes('permission') || errorMessage.includes('not found')) {
        throw lastError;
      }

      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // 1s, 2s, 4s (max 5s)
        logger.warn(`${context} failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms`, 'FIRESTORE_RETRY', error);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  logger.error(`${context} failed after ${maxRetries} attempts`, 'FIRESTORE_RETRY', lastError);
  throw lastError;
}

export const uploadPostureImageFullSize = async ({
  sessionRef,
  sessionId,
  view,
  fullSizeImage,
  clientId,
  organizationId
}: {
  sessionRef: DocumentReference;
  sessionId: string;
  view: 'front' | 'back' | 'side-left' | 'side-right';
  fullSizeImage: string;
  clientId: string;
  organizationId: string;
}): Promise<void> => {
  const storagePath = `organizations/${organizationId}/clients/${clientId}/sessions/${sessionId}/${view}_full.jpg`;
  const storageRef = ref(storage, storagePath);
  const fullSizeBase64 = fullSizeImage.split(',')[1] || fullSizeImage;

  try {
    const snapshot = await uploadString(storageRef, fullSizeBase64, 'base64', { contentType: 'image/jpeg' });
    const downloadUrl = await getDownloadURL(snapshot.ref);

    await updateDocWithRetry(
      sessionRef,
      {
        [`postureImagesFull_${view}`]: downloadUrl,
        [`postureImagesStorage_${view}`]: downloadUrl
      },
      3,
      `storage URL update for ${view}`
    );
  } catch (storageError) {
    logger.error(`Failed to upload ${view} to Storage`, 'LIVE_SESSIONS', storageError);
  }
};

export const uploadBodyCompScanFullSize = async ({
  sessionRef,
  sessionId,
  fullSizeImage,
  clientId,
  organizationId
}: {
  sessionRef: DocumentReference;
  sessionId: string;
  fullSizeImage: string;
  clientId: string;
  organizationId: string;
}): Promise<void> => {
  const storagePath = `organizations/${organizationId}/clients/${clientId}/sessions/${sessionId}/body_comp_scan.jpg`;
  const storageRef = ref(storage, storagePath);
  const fullSizeBase64 = fullSizeImage.split(',')[1] || fullSizeImage;

  try {
    const snapshot = await uploadString(storageRef, fullSizeBase64, 'base64', { contentType: 'image/jpeg' });
    const downloadUrl = await getDownloadURL(snapshot.ref);

    await updateDocWithRetry(sessionRef, {
      [BODY_COMP_SCAN_FIRESTORE.imageFull]: downloadUrl,
      [BODY_COMP_SCAN_FIRESTORE.imageStorage]: downloadUrl,
    });
  } catch (storageError) {
    logger.error('Failed to upload body comp scan to Storage', 'LIVE_SESSIONS', storageError);
  }
};
