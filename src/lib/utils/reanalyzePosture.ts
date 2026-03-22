/**
 * Utility function to re-analyze posture images for a client
 * Can be called from browser console or integrated into UI
 */

import {
  getClientPostureImages,
  LIVE_SESSION_PLACEHOLDER_CLIENT_ID,
  reanalyzePostureImage,
} from '@/services/liveSessions';
import { updatePostureAnalysis } from '@/services/assessmentHistory';
import { auth, storage } from '@/services/firebase';
import { ref, getDownloadURL, getBytes } from 'firebase/storage';
import { logger } from '@/lib/utils/logger';

/**
 * Re-analyze all posture images for a client
 * This will update both live sessions and assessment documents
 */
export async function reanalyzeClientPosture(
  clientName: string,
  organizationId?: string
): Promise<{ success: number; failed: number; errors: string[] }> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User must be logged in');
  }

  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[],
  };

  try {
    // First, try to get images from the assessment document
    const { getCurrentAssessment } = await import('@/services/assessmentHistory');
    const current = await getCurrentAssessment(user.uid, clientName, organizationId);
    
    const views: Array<'front' | 'back' | 'side-left' | 'side-right'> = ['front', 'back', 'side-left', 'side-right'];
    let hasImagesFromAssessment = false;
    
    // Check if assessment document has posture images
    if (current?.formData) {
      const postureImages = current.formData.postureImagesStorage || current.formData.postureImages;
      if (postureImages && typeof postureImages === 'object' && Object.keys(postureImages).length > 0) {
        hasImagesFromAssessment = true;
        logger.debug('[REANALYZE] Found posture images in assessment document');
        
        const { processPostureImage } = await import('@/services/postureProcessing');
        
        for (const view of views) {
          const imageUrl = postureImages[view];
          if (imageUrl && typeof imageUrl === 'string') {
            try {
              logger.debug(`[REANALYZE] Re-analyzing ${view} view from assessment document...`);
              
              let imageDataUrl: string;
              
              if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
                try {
                  const urlMatch = imageUrl.match(/\/o\/(.+?)\?/);
                  if (urlMatch) {
                    const storagePath = decodeURIComponent(urlMatch[1]);
                    const storageRef = ref(storage, storagePath);
                    const bytes = await getBytes(storageRef);
                    const blob = new Blob([bytes]);
                    imageDataUrl = await new Promise((resolve, reject) => {
                      const reader = new FileReader();
                      reader.onloadend = () => resolve(reader.result as string);
                      reader.onerror = reject;
                      reader.readAsDataURL(blob);
                    });
                  } else {
                    const response = await fetch(imageUrl);
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const blob = await response.blob();
                    imageDataUrl = await new Promise((resolve, reject) => {
                      const reader = new FileReader();
                      reader.onloadend = () => resolve(reader.result as string);
                      reader.onerror = reject;
                      reader.readAsDataURL(blob);
                    });
                  }
                } catch (fetchError) {
                  logger.warn(`[REANALYZE] SDK fetch failed, trying direct URL:`, fetchError);
                  imageDataUrl = imageUrl;
                }
              } else {
                imageDataUrl = imageUrl;
              }
              
              const processed = await processPostureImage(imageDataUrl, view);
              const analysis = processed.analysis;
              
              // Update the assessment document with new analysis
              await updatePostureAnalysis(
                user.uid,
                clientName,
                view,
                analysis,
                organizationId
              );
              
              results.success++;
              logger.debug(`[REANALYZE] ✓ Successfully re-analyzed ${view} view from assessment`);
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : String(error);
              results.failed++;
              results.errors.push(`${view}: ${errorMsg}`);
              logger.error(`[REANALYZE] ✗ Failed to re-analyze ${view} view:`, error);
            }
          }
        }
      }
    }
    
    // If no images in assessment, try live sessions
    if (!hasImagesFromAssessment) {
      logger.debug('[REANALYZE] No images in assessment, checking live sessions...');
      if (!organizationId) {
        throw new Error('organizationId is required to load live session posture data');
      }
      const sessions = await getClientPostureImages(LIVE_SESSION_PLACEHOLDER_CLIENT_ID, organizationId);
      
      if (Object.keys(sessions).length === 0) {
        throw new Error(`No posture images found for client: ${clientName}`);
      }

      // Get the most recent session
      const sessionEntries = Object.values(sessions).sort(
        (a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()
      );
      const latestSession = sessionEntries[0];

      if (!latestSession) {
        throw new Error('No sessions found');
      }

      // Re-analyze each view that has an image
      for (const view of views) {
        if (latestSession.images[view]) {
          try {
            logger.debug(`[REANALYZE] Re-analyzing ${view} view from live session...`);
            await reanalyzePostureImage(latestSession.sessionId, view, organizationId);
            results.success++;
            logger.debug(`[REANALYZE] ✓ Successfully re-analyzed ${view} view`);
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            results.failed++;
            results.errors.push(`${view}: ${errorMsg}`);
            logger.error(`[REANALYZE] ✗ Failed to re-analyze ${view} view:`, error);
          }
        }
      }
    }

    return results;
  } catch (error) {
    throw new Error(`Failed to re-analyze posture: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Make it available globally for console access (dev only)
 */
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as Window & typeof globalThis & { reanalyzeClientPosture?: typeof reanalyzeClientPosture }).reanalyzeClientPosture = reanalyzeClientPosture;
  logger.info('💡 Re-analysis utility loaded! Use: reanalyzeClientPosture("Client Name")');
}

