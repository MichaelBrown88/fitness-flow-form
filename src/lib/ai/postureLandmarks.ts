/**
 * MediaPipe-based landmark detection for posture analysis
 *
 * Uses a SINGLETON PoseLandmarker instance (Tasks Vision) and queues detection requests.
 */

import { CONFIG } from '@/config';
import { logger } from '@/lib/utils/logger';
import { detectPoseFromImageSource, getPoseInstance, queueDetection } from './mediapipeSingleton';

export interface LandmarkResult {
  shoulder_y_percent?: number;
  hip_y_percent?: number;
  head_y_percent?: number;
  center_x_percent?: number;
  midfoot_x_percent?: number;
  raw?: import('@/lib/types/mediapipe').MediaPipeLandmark[];
}

function loadImage(imageUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));

    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://') || imageUrl.startsWith('data:')) {
      img.src = imageUrl;
    } else {
      img.src = `data:image/jpeg;base64,${imageUrl}`;
    }
  });
}

function processLandmarks(
  landmarks: Array<{ x: number; y: number; z: number; visibility?: number }>,
  view: string
): LandmarkResult {
  const nose = landmarks[0];
  const leftEar = landmarks[7];
  const rightEar = landmarks[8];
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];
  const leftAnkle = landmarks[27];
  const rightAnkle = landmarks[28];
  const leftFootIndex = landmarks[31];
  const rightFootIndex = landmarks[32];

  const result: LandmarkResult = {
    raw: landmarks,
  };

  if (nose) {
    result.head_y_percent = nose.y * 100;
  } else if (leftEar && rightEar) {
    result.head_y_percent = ((leftEar.y + rightEar.y) / 2) * 100;
  }

  if (leftShoulder && rightShoulder) {
    result.shoulder_y_percent = ((leftShoulder.y + rightShoulder.y) / 2) * 100;
  } else if (leftShoulder) {
    result.shoulder_y_percent = leftShoulder.y * 100;
  } else if (rightShoulder) {
    result.shoulder_y_percent = rightShoulder.y * 100;
  }

  let hipCenterX: number | undefined;
  if (leftHip && rightHip) {
    result.hip_y_percent = ((leftHip.y + rightHip.y) / 2) * 100;
    hipCenterX = (leftHip.x + rightHip.x) / 2;
  } else if (leftHip) {
    result.hip_y_percent = leftHip.y * 100;
    hipCenterX = leftHip.x;
  } else if (rightHip) {
    result.hip_y_percent = rightHip.y * 100;
    hipCenterX = rightHip.x;
  }

  if (view === 'front' || view === 'back') {
    if (hipCenterX !== undefined) {
      result.center_x_percent = hipCenterX * 100;
    }
  } else {
    const ankle = view === 'side-right' ? rightAnkle : leftAnkle;
    const foot = view === 'side-right' ? rightFootIndex : leftFootIndex;

    if (ankle) {
      result.midfoot_x_percent = ankle.x * 100;
    } else if (foot) {
      result.midfoot_x_percent = foot.x * 100;
    }
  }

  return result;
}

export async function detectPostureLandmarks(
  imageUrl: string,
  view: 'front' | 'side-right' | 'side-left' | 'back'
): Promise<LandmarkResult> {
  return queueDetection(async () => detectPostureLandmarksInternal(imageUrl, view));
}

async function detectPostureLandmarksInternal(imageUrl: string, view: string): Promise<LandmarkResult> {
  const ctx = 'MEDIAPIPE';

  try {
    logger.debug(`[DETECT] Starting detection for ${view}`, ctx);

    await getPoseInstance();
    const img = await loadImage(imageUrl);
    logger.debug(`[DETECT] Image loaded: ${img.width}x${img.height}`, ctx);

    return await new Promise((resolve, reject) => {
      let settled = false;

      const timeoutId = setTimeout(() => {
        if (!settled) {
          settled = true;
          logger.error(`[DETECT] Timeout for ${view}`, ctx);
          reject(new Error(`Landmark detection timed out for ${view}`));
        }
      }, CONFIG.AI.MEDIAPIPE.TIMEOUT_MS);

      try {
        const raw = detectPoseFromImageSource(img, performance.now());
        clearTimeout(timeoutId);
        if (!settled) {
          settled = true;
          if (!raw || raw.length === 0) {
            logger.warn(`[DETECT] No landmarks found for ${view}`, ctx);
            resolve({});
            return;
          }
          const result = processLandmarks(raw, view);
          logger.debug(
            `[DETECT] Success for ${view}: headY=${result.head_y_percent?.toFixed(1)}%, shoulderY=${result.shoulder_y_percent?.toFixed(1)}%`,
            ctx
          );
          resolve(result);
        }
      } catch (err) {
        clearTimeout(timeoutId);
        if (!settled) {
          settled = true;
          reject(err);
        }
      }
    });
  } catch (error) {
    logger.error(`[DETECT] Detection failed for ${view}`, ctx, error);
    throw error;
  }
}
