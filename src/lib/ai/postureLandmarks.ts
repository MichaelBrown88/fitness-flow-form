/**
 * MediaPipe-based landmark detection for image alignment
 * Uses MediaPipe Pose for accurate body landmark detection
 */

import { CONFIG } from '@/config';
import { logger } from '@/lib/utils/logger';

export interface LandmarkResult {
  shoulder_y_percent?: number; // Y position of shoulder center as % of image height (0-100)
  hip_y_percent?: number; // Y position of hip center as % of image height (0-100)
  head_y_percent?: number; // Y position of head center as % of image height (0-100)
  center_x_percent?: number; // X position of body midline (for front/back) as % of image width (0-100)
  midfoot_x_percent?: number; // X position of midfoot (for side views) as % of image width (0-100)
  raw?: import('@/lib/types/mediapipe').MediaPipeLandmark[]; // The raw pose landmarks from MediaPipe
}

/**
 * Convert image URL/data URL to HTMLImageElement
 */
function loadImage(imageUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      img.src = imageUrl;
    } else if (imageUrl.startsWith('data:')) {
      img.src = imageUrl;
    } else {
      // Assume it's base64
      img.src = `data:image/jpeg;base64,${imageUrl}`;
    }
  });
}

/**
 * Detect posture landmarks using MediaPipe Pose
 */
export async function detectPostureLandmarks(
  imageUrl: string,
  view: 'front' | 'side-right' | 'side-left' | 'back'
): Promise<LandmarkResult> {
  try {
    logger.debug(`Starting landmark detection for ${view}`, 'MEDIAPIPE');
    logger.debug(`Image URL type: ${imageUrl.substring(0, 50)}...`, 'MEDIAPIPE');
    
    // Load the image
    const img = await loadImage(imageUrl);
    logger.debug(`Image loaded: ${img.width}x${img.height}`, 'MEDIAPIPE');
    
    // Dynamically import MediaPipe to avoid bloating the main bundle
    let mpPose;
    try {
      mpPose = await import('@mediapipe/pose');
    } catch (importError) {
      logger.error('Failed to import MediaPipe', 'LANDMARKS', importError);
      throw new Error('Failed to load MediaPipe library. Please check your internet connection and try again.');
    }
    
    type MediaPipePoseModule = {
      Pose?: typeof import('@mediapipe/pose').Pose;
      default?: { Pose?: typeof import('@mediapipe/pose').Pose };
    };
    type WindowWithPose = Window & { Pose?: typeof import('@mediapipe/pose').Pose };
    const Pose = (mpPose as MediaPipePoseModule).Pose || (mpPose as MediaPipePoseModule).default?.Pose || (window as WindowWithPose).Pose;
    
    if (!Pose) {
      throw new Error('MediaPipe Pose constructor not found. Check imports or CDN.');
    }
    
    // Initialize MediaPipe Pose with fallback CDN options
    const pose = new Pose({
      locateFile: (file: string) => {
        // Try primary CDN first
        const primaryUrl = `${CONFIG.AI.MEDIAPIPE.POSE_CDN}/${file}`;
        // Fallback to unpkg if jsdelivr fails
        const fallbackUrl = `https://unpkg.com/@mediapipe/pose/${file}`;
        logger.debug(`Loading MediaPipe file: ${file} from ${primaryUrl}`, 'LANDMARKS');
        return primaryUrl;
      }
    });
  
    pose.setOptions({
      modelComplexity: CONFIG.AI.MEDIAPIPE.MODEL_COMPLEXITY,
      enableSegmentation: false,
      smoothLandmarks: true,
      minDetectionConfidence: CONFIG.AI.MEDIAPIPE.MIN_DETECTION_CONFIDENCE,
      minTrackingConfidence: CONFIG.AI.MEDIAPIPE.MIN_TRACKING_CONFIDENCE
    });
    
    // Process the image and get landmarks
    return new Promise((resolve, reject) => {
      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          pose.close();
          reject(new Error('MediaPipe landmark detection timeout'));
        }
      }, CONFIG.AI.MEDIAPIPE.TIMEOUT_MS);
      
      pose.onResults((results: { poseLandmarks: Array<{ x: number; y: number; z: number; visibility?: number }> }) => {
        if (resolved) return;
        clearTimeout(timeout);
        resolved = true;
        
        try {
          if (!results.poseLandmarks || results.poseLandmarks.length === 0) {
            logger.warn(`No landmarks detected for ${view}`, 'MEDIAPIPE');
            pose.close();
            resolve({});
            return;
          }
          
          const landmarks = results.poseLandmarks;
          
          // Use indices directly as POSE_LANDMARKS might be missing due to import issues
          // Indices based on MediaPipe Pose topology:
          // 11: LEFT_SHOULDER, 12: RIGHT_SHOULDER
          // 23: LEFT_HIP, 24: RIGHT_HIP
          // 27: LEFT_ANKLE, 28: RIGHT_ANKLE
          // 31: LEFT_FOOT_INDEX, 32: RIGHT_FOOT_INDEX
          
          const nose = landmarks[0];
          const leftEye = landmarks[2];
          const rightEye = landmarks[5];
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
          
          // Calculate head center (average of nose/ears/eyes if available)
          let headCenterY: number | undefined;
          if (nose) {
            headCenterY = nose.y;
          } else if (leftEar && rightEar) {
            headCenterY = (leftEar.y + rightEar.y) / 2;
          }
          
          // Calculate shoulder center (average of left and right shoulders)
          let shoulderCenterX: number | undefined;
          let shoulderCenterY: number | undefined;
          
          if (leftShoulder && rightShoulder) {
            shoulderCenterX = (leftShoulder.x + rightShoulder.x) / 2;
            shoulderCenterY = (leftShoulder.y + rightShoulder.y) / 2;
          } else if (leftShoulder) {
            shoulderCenterX = leftShoulder.x;
            shoulderCenterY = leftShoulder.y;
          } else if (rightShoulder) {
            shoulderCenterX = rightShoulder.x;
            shoulderCenterY = rightShoulder.y;
          }
          
          // Calculate hip center (average of left and right hips)
          let hipCenterX: number | undefined;
          let hipCenterY: number | undefined;
          
          if (leftHip && rightHip) {
            hipCenterX = (leftHip.x + rightHip.x) / 2;
            hipCenterY = (leftHip.y + rightHip.y) / 2;
          } else if (leftHip) {
            hipCenterX = leftHip.x;
            hipCenterY = leftHip.y;
          } else if (rightHip) {
            hipCenterX = rightHip.x;
            hipCenterY = rightHip.y;
          }
          
          // For front/back views: calculate body midline (center between hips)
          // For side views: calculate midfoot position (average of ankle/foot positions)
          let centerX: number | undefined;
          let midfootX: number | undefined;
          
          if (view === 'front' || view === 'back') {
            // Body midline is the center X between the hips
            if (hipCenterX !== undefined) {
              centerX = hipCenterX;
            }
          } else {
            // For side views, anchor the plumb line to the ANKLE (Lateral Malleolus)
            // This is the clinical standard for a postural plumb line.
            const ankle = view === 'side-right' ? rightAnkle : leftAnkle;
            
            if (ankle) {
              midfootX = ankle.x;
            } else {
              // Fallback to average of whatever we have
              const foot = view === 'side-right' ? rightFootIndex : leftFootIndex;
              if (foot) {
                midfootX = foot.x;
              }
            }
          }
          
          // Convert to percentages (MediaPipe coordinates are normalized 0-1)
          const result: LandmarkResult = {
            raw: landmarks // Store raw points for calculation
          };
          
          if (shoulderCenterY !== undefined) {
            result.shoulder_y_percent = shoulderCenterY * 100;
          }
          if (hipCenterY !== undefined) {
            result.hip_y_percent = hipCenterY * 100;
          }
          if (headCenterY !== undefined) {
            result.head_y_percent = headCenterY * 100;
          }
          if (centerX !== undefined) {
            result.center_x_percent = centerX * 100;
          }
          if (midfootX !== undefined) {
            result.midfoot_x_percent = midfootX * 100;
          }
          
          
          logger.debug(`Success for ${view}: headY=${result.head_y_percent?.toFixed(1)}%, shoulderY=${result.shoulder_y_percent?.toFixed(1)}%, hipY=${result.hip_y_percent?.toFixed(1)}%, centerX=${result.center_x_percent?.toFixed(1)}%, midfootX=${result.midfoot_x_percent?.toFixed(1)}%`, 'MEDIAPIPE');
          pose.close();
          resolve(result);
        } catch (error) {
          logger.error(`Error processing landmarks:`, 'MEDIAPIPE', error);
          pose.close();
          reject(error);
        }
      });
      
      // Initialize and send the image
      pose.initialize().then(() => {
        pose.send({ image: img }).catch((error) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            pose.close();
            logger.error(`Error sending image:`, 'MEDIAPIPE', error);
            // Provide more helpful error message
            const errorMsg = error instanceof Error ? error.message : String(error);
            if (errorMsg.includes('fetch') || errorMsg.includes('Failed to fetch')) {
              reject(new Error('Failed to load MediaPipe model files. Please check your internet connection and try again.'));
            } else {
              reject(new Error(`MediaPipe processing failed: ${errorMsg}`));
            }
          }
        });
      }).catch((error) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          pose.close();
          logger.error(`Error initializing:`, 'MEDIAPIPE', error);
          const errorMsg = error instanceof Error ? error.message : String(error);
          if (errorMsg.includes('fetch') || errorMsg.includes('Failed to fetch')) {
            reject(new Error('Failed to load MediaPipe model files. Please check your internet connection and try again.'));
          } else {
            reject(new Error(`MediaPipe initialization failed: ${errorMsg}`));
          }
        }
      });
    });
  } catch (error) {
    logger.error(`Error detecting landmarks for ${view}:`, 'MEDIAPIPE', error);
    throw error;
  }
}
