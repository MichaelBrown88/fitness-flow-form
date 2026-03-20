import { getAI, VertexAIBackend, getGenerativeModel } from "firebase/ai";
import { getApp } from "firebase/app";
import { CONFIG } from '@/config';
import { calculateFrontViewMetrics, calculateSideViewMetrics } from '@/lib/utils/postureMath';
import { buildPosturePrompt } from '@/lib/ai/prompts/posturePrompts';
import { logAIUsage } from '@/services/aiUsage';
import { getFirebaseFunctions, getStorage, auth } from '@/services/firebase';
import { logger } from '@/lib/utils/logger';
import { isFeatureEnabled } from '@/services/platform/platformConfig';

/** Error thrown when a feature is disabled via kill switch */
export class FeatureDisabledError extends Error {
  constructor(featureName: string) {
    super(`${featureName} is temporarily disabled for maintenance. Please try again later.`);
    this.name = 'FeatureDisabledError';
  }
}

export interface PostureAnalysisResult {
  // Body Landmarks (for overlay alignment)
  landmarks?: {
    shoulder_y_percent?: number; // Y position of shoulder line as % of image height (0-100)
    hip_y_percent?: number; // Y position of hip line as % of image height (0-100)
    head_y_percent?: number; // Y position of head/nose as % of image height (0-100)
    center_x_percent?: number; // X position of body center/midfoot as % of image width (0-100)
    midfoot_x_percent?: number; // X position of midfoot (for side views) as % of image width (0-100)
    raw?: import('@/lib/types/mediapipe').MediaPipeLandmark[]; // The raw MediaPipe landmarks for calculation
  };
  
  // Head Tilt (Ear-to-Ear level check) - Front/Back view
  head_alignment?: {
    status: 'Neutral' | 'Tilted Left' | 'Tilted Right';
    tilt_degrees: number;
    description: string;
    recommendation?: string;
  };
  
  // Lateral Head Position (nose/chin off midline) - Front view only
  lateral_head_position?: {
    status: 'Centered' | 'Shifted Left' | 'Shifted Right';
    shift_percent: number; // How far off midline as % of body width
    description: string;
    recommendation?: string;
  };
  
  // Head Up/Down Tilt - Side view only
  head_updown?: {
    status: 'Neutral' | 'Looking Up' | 'Looking Down';
    severity: 'Mild' | 'Moderate' | 'Severe';
    description: string;
    recommendation?: string;
  };
  // Forward Head Posture (FHP)
  forward_head: {
    status: 'Neutral' | 'Mild' | 'Moderate' | 'Severe';
    deviation_degrees: number; // Positive = forward
    deviation_cm?: number;
    description: string;
    recommendation?: string;
  };
  // Shoulder Alignment
  shoulder_alignment: {
    status: 'Neutral' | 'Elevated' | 'Depressed' | 'Asymmetric' | 'Rounded';
    left_elevation_cm?: number; // Positive = left higher
    right_elevation_cm?: number; // Positive = right higher
    height_difference_cm?: number;
    forward_position_cm?: number;
    rounded_forward: boolean; // Rounded shoulders
    description: string;
    recommendation?: string;
  };
  // Kyphosis (Thoracic Curve)
  kyphosis: {
    status: 'Normal' | 'Mild' | 'Moderate' | 'Severe';
    curve_degrees: number; // Increased thoracic curve
    description: string;
    recommendation?: string;
  };
  // Lordosis (Lumbar Curve)
  lordosis: {
    status: 'Normal' | 'Mild' | 'Moderate' | 'Severe';
    curve_degrees: number; // Increased lumbar curve
    description: string;
    recommendation?: string;
  };
  // Pelvic Position
  pelvic_tilt: {
    status: 'Neutral' | 'Anterior Tilt' | 'Posterior Tilt' | 'Lateral Tilt';
    anterior_tilt_degrees?: number; // Positive = anterior tilt
    lateral_tilt_degrees?: number; // Positive = left side down
    left_hip_elevation_cm?: number;
    right_hip_elevation_cm?: number;
    height_difference_cm?: number;
    hip_shift_cm?: number;
    lateral_shift_cm?: number;
    hip_shift_direction?: 'None' | 'Left' | 'Right';
    rotation_degrees?: number; // Pelvic rotation
    description: string;
    recommendation?: string;
  };
  // Hip Alignment
  hip_alignment: {
    status: 'Neutral' | 'Elevated' | 'Depressed' | 'Asymmetric';
    left_elevation_cm?: number;
    right_elevation_cm?: number;
    height_difference_cm?: number;
    description: string;
    recommendation?: string;
  };
  // Knee Position
  knee_position?: {
    status: 'Neutral' | 'Hyperextended' | 'Flexed';
    deviation_degrees: number;
    description: string;
    recommendation?: string;
  };
  // Knee Alignment (Front View) - General
  knee_alignment?: {
    status: 'Neutral' | 'Valgus' | 'Varus';
    deviation_degrees: number;
    description: string;
    recommendation?: string;
  };
  
  // Left Leg Alignment (Hip-Knee-Ankle straightness) - Front/Back view
  left_leg_alignment?: {
    status: 'Straight' | 'Valgus' | 'Varus';
    severity: 'Good' | 'Mild' | 'Moderate' | 'Severe';
    knee_deviation_percent: number; // How far knee deviates from hip-ankle line
    description: string;
    recommendation?: string;
  };
  
  // Right Leg Alignment (Hip-Knee-Ankle straightness) - Front/Back view
  right_leg_alignment?: {
    status: 'Straight' | 'Valgus' | 'Varus';
    severity: 'Good' | 'Mild' | 'Moderate' | 'Severe';
    knee_deviation_percent: number;
    description: string;
    recommendation?: string;
  };
  
  // Hip Shift (Pelvis lateral displacement) - Front/Back view
  hip_shift?: {
    status: 'Centered' | 'Shifted Left' | 'Shifted Right';
    severity: 'Good' | 'Mild' | 'Moderate' | 'Severe';
    shift_percent: number; // How far off midline as % of body width
    description: string;
    recommendation?: string;
  };
  
  // Spinal Curvature (Back View) - Scoliosis
  spinal_curvature?: {
    status: 'Normal' | 'Mild Scoliosis' | 'Moderate Scoliosis' | 'Severe Scoliosis';
    curve_degrees: number;
    curve_direction: 'Left' | 'Right' | 'S-Curve';
    description: string;
    recommendation?: string;
  };
  // Overall Postural Deviations
  deviations: string[]; // List of all identified deviations
  risk_flags: string[]; // Risk factors for injury/pain
  overall_assessment: string; // Comprehensive summary
  
  // MediaPipe-calculated severities (ground truth for wireframe colors)
  // These override AI determinations for label display
  calculated?: {
    shoulderSeverity?: 'good' | 'mild' | 'moderate' | 'severe';
    hipLevelSeverity?: 'good' | 'mild' | 'moderate' | 'severe';
    hipShiftSeverity?: 'good' | 'mild' | 'moderate' | 'severe';
    headTiltSeverity?: 'good' | 'mild' | 'moderate' | 'severe';
    leftLegSeverity?: 'good' | 'mild' | 'moderate' | 'severe';
    rightLegSeverity?: 'good' | 'mild' | 'moderate' | 'severe';
    forwardHeadSeverity?: 'good' | 'mild' | 'moderate' | 'severe';
    pelvicTiltSeverity?: 'good' | 'mild' | 'moderate' | 'severe';
    kyphosisSeverity?: 'good' | 'mild' | 'moderate' | 'severe';
    lordosisSeverity?: 'good' | 'mild' | 'moderate' | 'severe';
    spineSeverity?: 'good' | 'mild' | 'moderate' | 'severe';
  };
}

/**
 * Result from auto-detecting posture view orientation
 */
export interface PostureViewClassification {
  view: 'front' | 'back' | 'side-left' | 'side-right';
  confidence: number; // 0-1 confidence score
}

/**
 * Auto-detect posture image view orientation using Gemini AI
 * Uses JSON mode with structured schema for reliable parsing
 */
export async function classifyPostureView(
  imageBase64: string
): Promise<PostureViewClassification> {
  const coachUid = auth.currentUser?.uid || 'anonymous';

  // Check if posture analysis feature is enabled (kill switch check)
  const postureEnabled = await isFeatureEnabled('posture_enabled');
  if (!postureEnabled) {
    logger.warn('Posture classification feature is disabled via kill switch', 'POSTURE_AI');
    throw new FeatureDisabledError('AI Posture Analysis');
  }

  try {
    const firebaseApp = getApp();
    const ai = getAI(firebaseApp, {
      backend: new VertexAIBackend()
    });

    const model = getGenerativeModel(ai, {
      model: CONFIG.AI.GEMINI.MODEL_NAME,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            view: {
              type: "string",
              enum: ["front", "back", "side-left", "side-right"]
            },
            confidence: {
              type: "number"
            }
          },
          required: ["view", "confidence"]
        }
      }
    });

    const prompt = `Analyze this posture photo and determine the camera angle/view orientation.

Classify as one of:
- "front": Person is facing the camera (can see face, chest)
- "back": Person is facing away from camera (can see back of head, back)
- "side-left": Person's LEFT side is toward camera (their left arm/leg visible in foreground)
- "side-right": Person's RIGHT side is toward camera (their right arm/leg visible in foreground)

Key indicators:
- Front: Face visible, shoulders squared toward camera
- Back: Back of head visible, spine/shoulder blades visible
- Side-left: Left ear visible, left shoulder forward, left hip visible
- Side-right: Right ear visible, right shoulder forward, right hip visible

Return a JSON object with "view" (the classification) and "confidence" (0-1 score).`;

    // Clean base64 if it has data URL prefix
    const cleanBase64 = imageBase64.includes('base64,')
      ? imageBase64.split('base64,')[1]
      : imageBase64;

    const imagePart = {
      inlineData: {
        mimeType: "image/jpeg",
        data: cleanBase64
      }
    };

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [imagePart, { text: prompt }] }]
    });

    const responseText = result.response.text();
    const parsed = JSON.parse(responseText) as PostureViewClassification;

    // Validate the response
    const validViews = ['front', 'back', 'side-left', 'side-right'];
    if (!validViews.includes(parsed.view)) {
      throw new Error(`Invalid view classification: ${parsed.view}`);
    }

    return {
      view: parsed.view,
      confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5))
    };
  } catch (error) {
    logger.error('[classifyPostureView] Classification failed:', error);
    // Default to front view with low confidence on error
    return { view: 'front', confidence: 0.3 };
  }
}

export async function analyzePostureImage(
  imageUrl: string,
  view: 'front' | 'side-right' | 'side-left' | 'back',
  landmarks?: PostureAnalysisResult['landmarks']
): Promise<PostureAnalysisResult> {
  const coachUid = auth.currentUser?.uid || 'anonymous';
  
  // Check if posture analysis feature is enabled (kill switch check)
  const postureEnabled = await isFeatureEnabled('posture_enabled');
  if (!postureEnabled) {
    logger.warn('Posture analysis feature is disabled via kill switch', 'POSTURE_AI');
    throw new FeatureDisabledError('AI Posture Analysis');
  }
  
  try {
    // 1. CALCULATE DETERMINISTIC METRICS FIRST (Free)
    let calculated: Partial<import('@/lib/utils/postureMath').CalculatedPostureMetrics> = {};
    if (landmarks?.raw) {
      if (view === 'front' || view === 'back') {
        calculated = calculateFrontViewMetrics(landmarks.raw, view);
      } else {
        calculated = calculateSideViewMetrics(landmarks.raw, view);
      }
    }

    // Local metrics calculated

    // 2. USE AI ONLY TO CONVERT NUMBERS → USER-FRIENDLY DESCRIPTIONS
    const ctx = 'POSTURE_AI';
    
    logger.debug(`Initializing Firebase AI for ${view}`, ctx);
    let firebaseApp;
    try {
      firebaseApp = getApp();
    } catch (appError) {
      logger.error('Failed to get Firebase app', ctx, appError);
      throw new Error(`Firebase app initialization failed: ${appError instanceof Error ? appError.message : 'Unknown error'}`);
    }
    
    let ai;
    try {
      ai = getAI(firebaseApp, { backend: new VertexAIBackend() });
    } catch (aiError) {
      logger.error('Failed to get AI instance', ctx, aiError);
      throw new Error(`AI initialization failed: ${aiError instanceof Error ? aiError.message : 'Unknown error'}`);
    }
    
    let model;
    try {
      model = getGenerativeModel(ai, { 
        model: CONFIG.AI.GEMINI.MODEL_NAME,
        generationConfig: {
          responseMimeType: "application/json",
        }
      });
      logger.debug(`Model initialized: ${CONFIG.AI.GEMINI.MODEL_NAME}`, ctx);
    } catch (modelError) {
      logger.error('Failed to get generative model', ctx, modelError);
      throw new Error(`Model initialization failed: ${modelError instanceof Error ? modelError.message : 'Unknown error'}`);
    }

    const metricsJson = JSON.stringify(calculated ?? {}, null, 2);
    const quantitativeContext = `
      DETERMINISTIC METRICS (SOURCE OF TRUTH):
      ${metricsJson}
    `;
    
    logger.debug(`GEMINI INPUT ${view.toUpperCase()}: ${quantitativeContext}`, ctx);

    const prompt = buildPosturePrompt(view, metricsJson);

    // Handle different image formats:
    // 1. Storage URL (https://...) - fetch and convert to base64
    // 2. Data URL (data:image/...) - extract base64
    // 3. Raw base64 - use as-is
    let base64Data: string;
    
    logger.debug(`Processing image data for ${view}`, ctx);
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      try {
        logger.debug(`Fetching image from URL`, ctx);
        const response = await fetch(imageUrl);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const blob = await response.blob();
        base64Data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            const base64Part = result.split(',')[1] || result;
            if (!base64Part) {
              reject(new Error('Failed to extract base64 data from fetched image'));
              return;
            }
            resolve(base64Part);
          };
          reader.onerror = (err) => reject(new Error(`FileReader error: ${err}`));
          reader.readAsDataURL(blob);
        });
        logger.debug(`Successfully fetched image`, ctx);
      } catch (error) {
        logger.error('Failed to fetch image from Storage URL', ctx, error);
        throw new Error(`Failed to fetch full-size image from Storage: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else if (imageUrl.startsWith('data:')) {
      const parts = imageUrl.split(',');
      if (parts.length < 2 || !parts[1]) {
        throw new Error('Invalid data URL format - missing base64 data');
      }
      base64Data = parts[1];
      logger.debug(`Extracted base64 from data URL`, ctx);
    } else {
      if (!imageUrl || imageUrl.trim().length === 0) {
        throw new Error('Empty image data provided');
      }
      base64Data = imageUrl;
      logger.debug(`Using raw base64 data`, ctx);
    }

    if (!base64Data || base64Data.length < 100) {
      throw new Error('Image data is too small or invalid');
    }

    // Retry logic for rate limiting (429) and transient errors
    const MAX_RETRIES = 3;
    const INITIAL_DELAY_MS = 2000; // 2 seconds initial delay
    
    logger.debug(`Calling Gemini API for ${view}`, ctx);
    let result;
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        result = await model.generateContent([
          { text: prompt },
          {
            inlineData: {
              data: base64Data,
              mimeType: "image/jpeg",
            },
          },
        ]);
        logger.debug(`Gemini API call successful for ${view} (attempt ${attempt})`, ctx);
        break; // Success, exit retry loop
      } catch (apiError) {
        lastError = apiError instanceof Error ? apiError : new Error(String(apiError));
        const errorMessage = lastError.message;
        
        // Check for rate limiting (429)
        const isRateLimited = errorMessage.includes('429') || 
                              errorMessage.includes('Too Many Requests') || 
                              errorMessage.includes('RESOURCE_EXHAUSTED');
        
        // Check for billing issues (don't retry)
        if (errorMessage.includes('BILLING_DISABLED') || errorMessage.includes('billing to be enabled')) {
          const projectMatch = errorMessage.match(/project[#\s]+([a-z0-9-]+)/i);
          const projectId = projectMatch ? projectMatch[1] : 'your project';
          throw new Error(`Billing is not enabled for your Google Cloud project "${projectId}". Please enable billing in the Google Cloud Console to use AI posture analysis. Visit: https://console.developers.google.com/billing/enable?project=${projectId}`);
        }
        
        // Retry only for rate limiting or transient errors
        if (isRateLimited && attempt < MAX_RETRIES) {
          const delayMs = INITIAL_DELAY_MS * Math.pow(2, attempt - 1); // Exponential backoff
          logger.warn(`Rate limited for ${view} (attempt ${attempt}/${MAX_RETRIES}). Retrying in ${delayMs / 1000}s...`, ctx);
          logger.warn(`Rate limited, retrying in ${delayMs}ms (attempt ${attempt}/${MAX_RETRIES})`, ctx);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          continue;
        }
        
        // Non-retryable error
        logger.error(`Gemini API call failed for ${view} (attempt ${attempt})`, ctx, apiError);
        throw new Error(`AI API call failed: ${errorMessage}`);
      }
    }
    
    // Check if we exhausted all retries
    if (!result && lastError) {
      logger.error(`All ${MAX_RETRIES} retry attempts failed for ${view}`, ctx, lastError);
      throw new Error(`AI API call failed after ${MAX_RETRIES} attempts: ${lastError.message}`);
    }

    let aiResponse;
    try {
      aiResponse = await result.response;
      logger.debug(`Received response from Gemini for ${view}`, ctx);
    } catch (responseError) {
      logger.error('Failed to get response from Gemini', ctx, responseError);
      throw new Error(`Failed to get AI response: ${responseError instanceof Error ? responseError.message : 'Unknown error'}`);
    }
    
    // Parse JSON response
    try {
      const text = aiResponse.text();
      if (!text || text.trim().length === 0) {
        throw new Error('AI returned empty response');
      }
      logger.debug(`Parsing JSON response for ${view}`, ctx);
      
      let data: PostureAnalysisResult;
      try {
        data = JSON.parse(text);
        logger.debug(`Successfully parsed JSON for ${view}`, ctx);
      } catch (parseErr) {
        logger.warn('Direct JSON parse failed, trying to extract JSON from text', ctx, parseErr);
        const startIdx = text.indexOf('{');
        const endIdx = text.lastIndexOf('}');
        if (startIdx === -1 || endIdx === -1) {
          logger.error('No JSON found in response', ctx);
          throw new Error(`Invalid AI response format - no JSON found. Response: ${text.substring(0, 100)}...`);
        }
        const jsonString = text.substring(startIdx, endIdx + 1);
        data = JSON.parse(jsonString);
        logger.debug(`Successfully extracted and parsed JSON for ${view}`, ctx);
      }

      logger.debug(`GEMINI RESPONSE ${view.toUpperCase()}`, ctx);
      if (view === 'front' || view === 'back') {
        logger.debug(`Head Alignment: ${data.head_alignment?.status} (${data.head_alignment?.tilt_degrees}°)`, ctx);
        logger.debug(`Shoulder: ${data.shoulder_alignment?.status} (diff: ${data.shoulder_alignment?.height_difference_cm}cm)`, ctx);
        logger.debug(`Hip: ${data.hip_alignment?.status} (diff: ${data.hip_alignment?.height_difference_cm}cm)`, ctx);
        logger.debug(`Hip Shift: ${data.hip_shift?.status} (${data.hip_shift?.shift_percent}%)`, ctx);
        logger.debug(`Left Leg: ${data.left_leg_alignment?.status} (${data.left_leg_alignment?.severity})`, ctx);
        logger.debug(`Right Leg: ${data.right_leg_alignment?.status} (${data.right_leg_alignment?.severity})`, ctx);
        if (view === 'back') {
          logger.debug(`Spine: ${data.spinal_curvature?.status} (${data.spinal_curvature?.curve_degrees}°)`, ctx);
        }
      } else {
        logger.debug(`Forward Head: ${data.forward_head?.status} (${data.forward_head?.deviation_cm}cm)`, ctx);
        logger.debug(`Head Up/Down: ${data.head_updown?.status} (${data.head_updown?.severity})`, ctx);
        logger.debug(`Shoulders: ${data.shoulder_alignment?.status} (rounded: ${data.shoulder_alignment?.rounded_forward})`, ctx);
        logger.debug(`Kyphosis: ${data.kyphosis?.status} (${data.kyphosis?.curve_degrees}°)`, ctx);
        logger.debug(`Lordosis: ${data.lordosis?.status} (${data.lordosis?.curve_degrees}°)`, ctx);
        logger.debug(`Pelvic Tilt: ${data.pelvic_tilt?.status} (${data.pelvic_tilt?.anterior_tilt_degrees}°)`, ctx);
      }
      logger.debug(`Deviations: ${data.deviations?.join(', ')}`, ctx);
      
      await logAIUsage(coachUid, 'posture_analysis', 'ai_success', 'gemini');
      logger.debug(`Analysis complete for ${view}`, ctx);
      return data;
    } catch (parseError) {
      logger.error('JSON parsing error', ctx, parseError);
      await logAIUsage(coachUid, 'posture_analysis', 'error', 'gemini');
      throw new Error(`Failed to parse AI response as JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }

  } catch (err) {
    logger.error('Posture Analysis Error', 'POSTURE_AI', err);
    try {
      await logAIUsage(coachUid, 'posture_analysis', 'error', 'gemini');
    } catch (logError) {
      logger.warn('Failed to log error', 'POSTURE_AI', logError);
    }
    if (err instanceof Error && err.message && !err.message.includes('Failed to analyze posture image')) {
      throw err;
    }
    throw new Error(`Failed to analyze posture image: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}
