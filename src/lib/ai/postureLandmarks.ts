/**
 * MediaPipe-based landmark detection for posture analysis
 * 
 * Uses a SINGLETON MediaPipe Pose instance to avoid WebGL context thrashing.
 * All detections are queued and processed sequentially (MediaPipe limitation).
 * 
 * @see ./mediapipeSingleton.ts for the singleton implementation
 */

import { CONFIG } from '@/config';
import { logger } from '@/lib/utils/logger';
import { getPoseInstance, queueDetection } from './mediapipeSingleton';

export interface LandmarkResult {
  shoulder_y_percent?: number;
  hip_y_percent?: number;
  head_y_percent?: number;
  center_x_percent?: number;
  midfoot_x_percent?: number;
  raw?: import('@/lib/types/mediapipe').MediaPipeLandmark[];
}

/**
 * Load an image from URL or data URL into an HTMLImageElement
 */
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

/**
 * Extract structured landmark data from raw MediaPipe results
 */
function processLandmarks(
  landmarks: Array<{ x: number; y: number; z: number; visibility?: number }>,
  view: string
): LandmarkResult {
  // MediaPipe Pose landmark indices:
  // 0: NOSE, 2: LEFT_EYE, 5: RIGHT_EYE, 7: LEFT_EAR, 8: RIGHT_EAR
  // 11: LEFT_SHOULDER, 12: RIGHT_SHOULDER
  // 23: LEFT_HIP, 24: RIGHT_HIP
  // 27: LEFT_ANKLE, 28: RIGHT_ANKLE
  // 31: LEFT_FOOT_INDEX, 32: RIGHT_FOOT_INDEX
  
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
    raw: landmarks
  };
  
  // Head center (nose or average of ears)
  if (nose) {
    result.head_y_percent = nose.y * 100;
  } else if (leftEar && rightEar) {
    result.head_y_percent = ((leftEar.y + rightEar.y) / 2) * 100;
  }
  
  // Shoulder center
  if (leftShoulder && rightShoulder) {
    result.shoulder_y_percent = ((leftShoulder.y + rightShoulder.y) / 2) * 100;
  } else if (leftShoulder) {
    result.shoulder_y_percent = leftShoulder.y * 100;
  } else if (rightShoulder) {
    result.shoulder_y_percent = rightShoulder.y * 100;
  }
  
  // Hip center
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
  
  // View-specific calculations
  if (view === 'front' || view === 'back') {
    // Body midline = hip center X
    if (hipCenterX !== undefined) {
      result.center_x_percent = hipCenterX * 100;
    }
  } else {
    // Side views: plumb line anchored at ankle (clinical standard)
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

/**
 * Detect posture landmarks using MediaPipe Pose
 * 
 * Uses the singleton instance and queues detection requests.
 * Only one detection runs at a time to prevent onResults callback conflicts.
 */
export async function detectPostureLandmarks(
  imageUrl: string,
  view: 'front' | 'side-right' | 'side-left' | 'back'
): Promise<LandmarkResult> {
  // Queue this detection to run after any pending ones
  return queueDetection(async () => {
    return detectPostureLandmarksInternal(imageUrl, view);
  });
}

/**
 * Internal detection implementation
 * Called through the queue to ensure sequential execution
 */
async function detectPostureLandmarksInternal(
  imageUrl: string,
  view: string
): Promise<LandmarkResult> {
  const ctx = 'MEDIAPIPE';
  
  try {
    logger.debug(`[DETECT] Starting detection for ${view}`, ctx);
    
    // Get the singleton instance (initializes on first call)
    const pose = await getPoseInstance();
    
    // Load the image
    const img = await loadImage(imageUrl);
    logger.debug(`[DETECT] Image loaded: ${img.width}x${img.height}`, ctx);
    
    // Process with timeout
    return new Promise((resolve, reject) => {
      let resolved = false;
      
      // Detection timeout
      const timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          logger.error(`[DETECT] Timeout for ${view}`, ctx);
          reject(new Error(`Landmark detection timed out for ${view}`));
        }
      }, CONFIG.AI.MEDIAPIPE.TIMEOUT_MS);
      
      // Set up result handler (will be called when detection completes)
      pose.onResults((results) => {
        if (resolved) return;
        
        clearTimeout(timeoutId);
        resolved = true;
        
        if (!results.poseLandmarks || results.poseLandmarks.length === 0) {
          logger.warn(`[DETECT] No landmarks found for ${view}`, ctx);
          resolve({});
          return;
        }
        
        const result = processLandmarks(results.poseLandmarks, view);
        
        // Detailed landmark logging for debugging
        const landmarks = results.poseLandmarks;
        console.log(`\n📍 [MEDIAPIPE RAW LANDMARKS - ${view.toUpperCase()}]`);
        console.log(`   Nose (0):        x=${landmarks[0]?.x.toFixed(3)}, y=${landmarks[0]?.y.toFixed(3)}`);
        console.log(`   Left Eye (2):    x=${landmarks[2]?.x.toFixed(3)}, y=${landmarks[2]?.y.toFixed(3)}`);
        console.log(`   Right Eye (5):   x=${landmarks[5]?.x.toFixed(3)}, y=${landmarks[5]?.y.toFixed(3)}`);
        console.log(`   Left Ear (7):    x=${landmarks[7]?.x.toFixed(3)}, y=${landmarks[7]?.y.toFixed(3)}`);
        console.log(`   Right Ear (8):   x=${landmarks[8]?.x.toFixed(3)}, y=${landmarks[8]?.y.toFixed(3)}`);
        console.log(`   Left Shoulder (11):  x=${landmarks[11]?.x.toFixed(3)}, y=${landmarks[11]?.y.toFixed(3)}`);
        console.log(`   Right Shoulder (12): x=${landmarks[12]?.x.toFixed(3)}, y=${landmarks[12]?.y.toFixed(3)}`);
        console.log(`   Left Hip (23):   x=${landmarks[23]?.x.toFixed(3)}, y=${landmarks[23]?.y.toFixed(3)}`);
        console.log(`   Right Hip (24):  x=${landmarks[24]?.x.toFixed(3)}, y=${landmarks[24]?.y.toFixed(3)}`);
        console.log(`   Left Knee (25):  x=${landmarks[25]?.x.toFixed(3)}, y=${landmarks[25]?.y.toFixed(3)}`);
        console.log(`   Right Knee (26): x=${landmarks[26]?.x.toFixed(3)}, y=${landmarks[26]?.y.toFixed(3)}`);
        console.log(`   Left Ankle (27): x=${landmarks[27]?.x.toFixed(3)}, y=${landmarks[27]?.y.toFixed(3)}`);
        console.log(`   Right Ankle (28):x=${landmarks[28]?.x.toFixed(3)}, y=${landmarks[28]?.y.toFixed(3)}`);
        
        logger.debug(`[DETECT] Success for ${view}: headY=${result.head_y_percent?.toFixed(1)}%, shoulderY=${result.shoulder_y_percent?.toFixed(1)}%`, ctx);
        resolve(result);
      });
      
      // Send image for detection
      pose.send({ image: img }).catch((error) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          logger.error(`[DETECT] Send failed for ${view}`, ctx, error);
          reject(error);
        }
      });
    });
  } catch (error) {
    logger.error(`[DETECT] Detection failed for ${view}`, ctx, error);
    throw error;
  }
}
