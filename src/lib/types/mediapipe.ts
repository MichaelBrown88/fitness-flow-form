/**
 * MediaPipe Pose Landmark Types
 * 
 * Strict typing for MediaPipe Pose detection results
 */

export interface MediaPipeLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface MediaPipePoseResults {
  poseLandmarks: MediaPipeLandmark[];
  poseWorldLandmarks?: MediaPipeLandmark[];
  segmentationMask?: ImageData;
}

export interface MediaPipePoseConfig {
  locateFile: (file: string) => string;
}

export interface MediaPipePoseOptions {
  modelComplexity: 0 | 1 | 2;
  smoothLandmarks?: boolean;
  enableSegmentation?: boolean;
  minDetectionConfidence?: number;
  minTrackingConfidence?: number;
}

export type MediaPipePoseCallback = (results: MediaPipePoseResults) => void;

