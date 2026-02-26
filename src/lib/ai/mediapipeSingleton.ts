/**
 * MediaPipe Pose Singleton
 * 
 * CRITICAL: MediaPipe WASM has global state and heavy WebGL context requirements.
 * Creating/destroying instances for every image causes:
 *   1. WebGL context thrashing (browser hangs)
 *   2. Memory leaks from unreleased WASM resources
 *   3. Race conditions in initialization
 * 
 * This singleton initializes MediaPipe ONCE and reuses it for all detections.
 * A request queue ensures only one detection runs at a time (MediaPipe limitation).
 */

import { CONFIG } from '@/config';
import { logger } from '@/lib/utils/logger';

// MediaPipe Pose instance types
type PoseInstance = {
  setOptions: (options: Record<string, unknown>) => void;
  onResults: (callback: (results: PoseResults) => void) => void;
  initialize: () => Promise<void>;
  send: (input: { image: HTMLImageElement }) => Promise<void>;
  close: () => void;
};

type PoseResults = {
  poseLandmarks?: Array<{ x: number; y: number; z: number; visibility?: number }>;
};

// Singleton state
let poseInstance: PoseInstance | null = null;
let isInitializing = false;
let initPromise: Promise<PoseInstance> | null = null;
let initFailed = false;

// Request queue to serialize detections (MediaPipe can't handle concurrent sends)
type QueuedRequest = {
  execute: () => void;
};
const requestQueue: QueuedRequest[] = [];
let isProcessingQueue = false;

/**
 * Get or create the singleton MediaPipe Pose instance
 * Thread-safe initialization with promise deduplication
 */
export async function getPoseInstance(): Promise<PoseInstance> {
  // Already initialized - return immediately
  if (poseInstance) {
    return poseInstance;
  }

  // Previous init failed — don't retry endlessly (WASM files missing, etc.)
  if (initFailed) {
    throw new Error('MediaPipe initialization previously failed. Reload the page to retry.');
  }
  
  // Initialization in progress - wait for it
  if (isInitializing && initPromise) {
    return initPromise;
  }
  
  // Start initialization
  isInitializing = true;
  logger.debug('[SINGLETON] Starting MediaPipe Pose initialization...', 'MEDIAPIPE');
  
  initPromise = (async () => {
    try {
      // Dynamic import - follows "Lazy Load Large Assets" rule
      const mpPose = await import('@mediapipe/pose');
      
      // Handle different import structures (ESM vs CommonJS)
      type MediaPipePoseModule = {
        Pose?: new (options: { locateFile: (file: string) => string }) => PoseInstance;
        default?: { Pose?: new (options: { locateFile: (file: string) => string }) => PoseInstance };
      };
      type WindowWithPose = Window & { 
        Pose?: new (options: { locateFile: (file: string) => string }) => PoseInstance 
      };
      
      const Pose = (mpPose as MediaPipePoseModule).Pose || 
                   (mpPose as MediaPipePoseModule).default?.Pose || 
                   (window as WindowWithPose).Pose;
      
      if (!Pose) {
        throw new Error('MediaPipe Pose constructor not found');
      }
      
      // Create instance with local assets (primary) or CDN fallback
      const instance = new Pose({
        locateFile: (file: string) => {
          const url = `${CONFIG.AI.MEDIAPIPE.POSE_CDN}/${file}`;
          logger.debug(`[SINGLETON] Loading: ${file}`, 'MEDIAPIPE');
          return url;
        }
      });
      
      // Configure for pose detection
      instance.setOptions({
        modelComplexity: CONFIG.AI.MEDIAPIPE.MODEL_COMPLEXITY,
        smoothLandmarks: true,
        enableSegmentation: false,
        minDetectionConfidence: CONFIG.AI.MEDIAPIPE.MIN_DETECTION_CONFIDENCE,
        minTrackingConfidence: CONFIG.AI.MEDIAPIPE.MIN_TRACKING_CONFIDENCE
      });
      
      // Initialize loads WASM and model files
      await instance.initialize();
      
      poseInstance = instance;
      logger.info('[SINGLETON] MediaPipe Pose initialized successfully', 'MEDIAPIPE');
      
      return instance;
    } catch (error) {
      logger.error('[SINGLETON] Failed to initialize MediaPipe', 'MEDIAPIPE', error);
      poseInstance = null;
      initFailed = true;
      throw error;
    } finally {
      isInitializing = false;
      initPromise = null;
    }
  })();
  
  return initPromise;
}

/**
 * Process the request queue one at a time
 * MediaPipe cannot handle concurrent `send()` calls - onResults gets overwritten
 */
function processQueue(): void {
  if (isProcessingQueue || requestQueue.length === 0) {
    return;
  }
  
  isProcessingQueue = true;
  const request = requestQueue.shift();
  
  if (request) {
    request.execute();
  }
}

/**
 * Queue a detection request
 * Ensures sequential execution while allowing parallel queuing
 */
export function queueDetection<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const execute = async () => {
      try {
        const result = await fn();
        resolve(result);
      } catch (error) {
        reject(error);
      } finally {
        // CRITICAL: Always release the queue, even on error
        isProcessingQueue = false;
        // Small delay to let browser breathe between detections
        setTimeout(() => processQueue(), 50);
      }
    };
    
    requestQueue.push({ execute });
    
    // Start processing if not already running
    if (!isProcessingQueue) {
      processQueue();
    }
  });
}

/**
 * Check if MediaPipe is ready for detections
 */
export function isPoseReady(): boolean {
  return poseInstance !== null;
}

/**
 * Pre-warm MediaPipe (call early to cache WASM files)
 * Unlike the old approach, this KEEPS the instance alive
 */
export async function prewarmMediaPipe(): Promise<void> {
  try {
    await getPoseInstance();
    logger.debug('[SINGLETON] MediaPipe pre-warmed and ready', 'MEDIAPIPE');
  } catch (error) {
    // Non-critical - detection will retry initialization
    logger.warn('[SINGLETON] Pre-warm failed (non-critical)', 'MEDIAPIPE');
  }
}

/**
 * Cleanup singleton (only call when completely done with pose detection)
 * NOTE: In most cases, you should NOT call this - keep the singleton alive
 */
export function destroyPoseInstance(): void {
  if (poseInstance) {
    try {
      poseInstance.close();
      logger.debug('[SINGLETON] MediaPipe Pose closed', 'MEDIAPIPE');
    } catch (error) {
      logger.warn('[SINGLETON] Error closing MediaPipe', 'MEDIAPIPE');
    }
    poseInstance = null;
  }
  
  // Clear any pending requests and reset failure state
  requestQueue.length = 0;
  isProcessingQueue = false;
  initFailed = false;
}
