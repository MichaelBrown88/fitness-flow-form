/**
 * MediaPipe PoseLandmarker (Tasks Vision) singleton.
 *
 * One WASM/WebGL instance, serialized through queueDetection — same constraints as the legacy Pose stack.
 */

import { FilesetResolver, PoseLandmarker, type PoseLandmarker as PoseLandmarkerType } from '@mediapipe/tasks-vision';
import { CONFIG } from '@/config';
import type { MediaPipeLandmark } from '@/lib/types/mediapipe';
import { logger } from '@/lib/utils/logger';

let poseLandmarker: PoseLandmarkerType | null = null;
let isInitializing = false;
let initPromise: Promise<PoseLandmarkerType> | null = null;
let initFailed = false;

type QueuedRequest = { execute: () => void };
const requestQueue: QueuedRequest[] = [];
let isProcessingQueue = false;

export type PoseLandmarkerInstance = PoseLandmarkerType;

export function mapNormalizedLandmarksToMediaPipe(
  landmarks: ReadonlyArray<{ x: number; y: number; z: number; visibility?: number }>
): MediaPipeLandmark[] {
  return landmarks.map((l) => ({
    x: l.x,
    y: l.y,
    z: l.z,
    visibility: l.visibility,
  }));
}

export function detectPoseFromImageSource(
  source: HTMLVideoElement | HTMLImageElement,
  timestampMs: number
): MediaPipeLandmark[] | undefined {
  if (!poseLandmarker) {
    throw new Error('MediaPipe PoseLandmarker not initialized');
  }
  const result = poseLandmarker.detectForVideo(source, timestampMs);
  const first = result.landmarks[0];
  if (!first?.length) return undefined;
  return mapNormalizedLandmarksToMediaPipe(first);
}

async function createLandmarker(): Promise<PoseLandmarkerType> {
  const wasm = await FilesetResolver.forVisionTasks(CONFIG.AI.MEDIAPIPE.TASKS_WASM_BASE);
  const baseOptions = {
    modelAssetPath: CONFIG.AI.MEDIAPIPE.POSE_LANDMARKER_MODEL_URL,
  } as const;
  const common = {
    runningMode: 'VIDEO' as const,
    numPoses: 1,
    minPoseDetectionConfidence: CONFIG.AI.MEDIAPIPE.MIN_POSE_DETECTION_CONFIDENCE,
    minPosePresenceConfidence: CONFIG.AI.MEDIAPIPE.MIN_POSE_PRESENCE_CONFIDENCE,
    minTrackingConfidence: CONFIG.AI.MEDIAPIPE.MIN_TRACKING_CONFIDENCE,
  };
  try {
    return await PoseLandmarker.createFromOptions(wasm, {
      baseOptions: { ...baseOptions, delegate: 'GPU' },
      ...common,
    });
  } catch (gpuErr) {
    logger.warn('[SINGLETON] GPU delegate failed, falling back to CPU', 'MEDIAPIPE', gpuErr);
    return PoseLandmarker.createFromOptions(wasm, {
      baseOptions: { ...baseOptions, delegate: 'CPU' },
      ...common,
    });
  }
}

export async function getPoseInstance(): Promise<PoseLandmarkerType> {
  if (poseLandmarker) return poseLandmarker;
  if (initFailed) {
    throw new Error('MediaPipe initialization previously failed. Reload the page to retry.');
  }
  if (isInitializing && initPromise) return initPromise;

  isInitializing = true;
  logger.debug('[SINGLETON] Starting MediaPipe PoseLandmarker initialization...', 'MEDIAPIPE');

  initPromise = (async () => {
    try {
      poseLandmarker = await createLandmarker();
      logger.info('[SINGLETON] MediaPipe PoseLandmarker initialized successfully', 'MEDIAPIPE');
      return poseLandmarker;
    } catch (error) {
      logger.error('[SINGLETON] Failed to initialize MediaPipe', 'MEDIAPIPE', error);
      poseLandmarker = null;
      initFailed = true;
      throw error;
    } finally {
      isInitializing = false;
      initPromise = null;
    }
  })();

  return initPromise;
}

function processQueue(): void {
  if (isProcessingQueue || requestQueue.length === 0) return;
  isProcessingQueue = true;
  const request = requestQueue.shift();
  if (request) {
    request.execute();
  }
}

export function queueDetection<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const execute = async () => {
      try {
        const result = await fn();
        resolve(result);
      } catch (error) {
        reject(error);
      } finally {
        isProcessingQueue = false;
        setTimeout(() => processQueue(), 50);
      }
    };
    requestQueue.push({ execute });
    if (!isProcessingQueue) {
      processQueue();
    }
  });
}

export function isPoseReady(): boolean {
  return poseLandmarker !== null;
}

export async function prewarmMediaPipe(): Promise<void> {
  try {
    await getPoseInstance();
    logger.debug('[SINGLETON] MediaPipe pre-warmed and ready', 'MEDIAPIPE');
  } catch {
    logger.warn('[SINGLETON] Pre-warm failed (non-critical)', 'MEDIAPIPE');
  }
}

export function destroyPoseInstance(): void {
  if (poseLandmarker) {
    try {
      poseLandmarker.close();
      logger.debug('[SINGLETON] MediaPipe PoseLandmarker closed', 'MEDIAPIPE');
    } catch {
      logger.warn('[SINGLETON] Error closing MediaPipe', 'MEDIAPIPE');
    }
    poseLandmarker = null;
  }
  requestQueue.length = 0;
  isProcessingQueue = false;
  initFailed = false;
}
