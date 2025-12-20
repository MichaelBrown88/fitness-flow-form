import { FormData } from '../../contexts/FormContext';

// MediaPipe Pose landmarks
export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export interface PostureAnalysisResult {
  suggestions: Partial<FormData>;
  metrics: Record<string, number>;
}

// Landmark indices for MediaPipe Pose
const NOSE = 0;
const LEFT_EYE = 2;
const RIGHT_EYE = 5;
const LEFT_SHOULDER = 11;
const RIGHT_SHOULDER = 12;
const LEFT_HIP = 23;
const RIGHT_HIP = 24;
const LEFT_KNEE = 25;
const RIGHT_KNEE = 26;
const LEFT_ANKLE = 27;
const RIGHT_ANKLE = 28;
const LEFT_EAR = 7;
const RIGHT_EAR = 8;

export function analyzePosture(landmarks: Landmark[], view: 'front' | 'back' | 'left' | 'right'): PostureAnalysisResult {
  const suggestions: Partial<FormData> = {};
  const metrics: Record<string, number> = {};

  if (view === 'front' || view === 'back') {
    // Shoulder tilt
    const shoulderAngle = Math.atan2(
      landmarks[RIGHT_SHOULDER].y - landmarks[LEFT_SHOULDER].y,
      landmarks[RIGHT_SHOULDER].x - landmarks[LEFT_SHOULDER].x
    ) * (180 / Math.PI);
    
    metrics.shoulderTilt = shoulderAngle;
    if (Math.abs(shoulderAngle) > 3) {
      suggestions.postureShouldersOverall = 'elevated';
    }

    // Hip tilt
    const hipAngle = Math.atan2(
      landmarks[RIGHT_HIP].y - landmarks[LEFT_HIP].y,
      landmarks[RIGHT_HIP].x - landmarks[LEFT_HIP].x
    ) * (180 / Math.PI);
    
    metrics.hipTilt = hipAngle;
    if (Math.abs(hipAngle) > 3) {
      suggestions.postureHipsOverall = 'neutral'; // We don't have a 'tilted' option for hips currently, using neutral or we could add more
    }

    // Knee alignment (Valgus)
    const leftHipToAnkle = landmarks[LEFT_ANKLE].x - landmarks[LEFT_HIP].x;
    const leftKneeToHip = landmarks[LEFT_KNEE].x - landmarks[LEFT_HIP].x;
    const rightHipToAnkle = landmarks[RIGHT_ANKLE].x - landmarks[RIGHT_HIP].x;
    const rightKneeToHip = landmarks[RIGHT_KNEE].x - landmarks[RIGHT_HIP].x;

    metrics.leftKneeValgus = leftKneeToHip - leftHipToAnkle;
    metrics.rightKneeValgus = rightKneeToHip - rightHipToAnkle;

    if (metrics.leftKneeValgus > 0.05 || metrics.rightKneeValgus < -0.05) {
      suggestions.postureKneesOverall = 'valgus-knee';
    }
  }

  if (view === 'left' || view === 'right') {
    // Forward Head (Ear relative to Shoulder)
    const ear = view === 'left' ? landmarks[LEFT_EAR] : landmarks[RIGHT_EAR];
    const shoulder = view === 'left' ? landmarks[LEFT_SHOULDER] : landmarks[RIGHT_SHOULDER];
    
    const headForwardness = view === 'left' ? shoulder.x - ear.x : ear.x - shoulder.x;
    metrics.headForwardness = headForwardness;
    
    if (headForwardness > 0.05) {
      suggestions.postureHeadOverall = 'forward-head';
    }

    // Kyphosis (Shoulder relative to Hip - very simplified)
    const hip = view === 'left' ? landmarks[LEFT_HIP] : landmarks[RIGHT_HIP];
    const shoulderRelToHip = view === 'left' ? shoulder.x - hip.x : hip.x - shoulder.x;
    metrics.shoulderRelToHip = shoulderRelToHip;

    if (shoulderRelToHip > 0.08) {
      suggestions.postureBackOverall = 'increased-kyphosis';
    } else if (shoulderRelToHip < -0.05) {
      // Potentially lordosis or sway back, simplified
      suggestions.postureBackOverall = 'increased-lordosis';
    }
  }

  return { suggestions, metrics };
}
