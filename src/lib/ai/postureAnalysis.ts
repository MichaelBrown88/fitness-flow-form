import { getAI, VertexAIBackend, getGenerativeModel } from "firebase/ai";
import { getApp } from "firebase/app";
import { CONFIG } from '@/config';
import { calculateFrontViewMetrics, calculateSideViewMetrics } from '@/lib/utils/postureMath';
import { logAIUsage } from '@/services/aiUsage';
import { getFirebaseFunctions, getStorage, auth } from '@/services/firebase';
import { logger } from '@/lib/utils/logger';

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

export async function analyzePostureImage(
  imageUrl: string, 
  view: 'front' | 'side-right' | 'side-left' | 'back',
  landmarks?: PostureAnalysisResult['landmarks']
): Promise<PostureAnalysisResult> {
  const coachUid = auth.currentUser?.uid || 'anonymous';
  
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
    
    // Log the data being sent to Gemini
    console.log(`\n🤖 [GEMINI INPUT - ${view.toUpperCase()}]`);
    console.log(`   ─────────────────────────────────────`);
    console.log(`   QUANTITATIVE CONTEXT SENT TO AI:`);
    console.log(quantitativeContext);
    console.log(`   ─────────────────────────────────────`);

    const viewSpecificInstructions = {
      'front': `
        FRONT VIEW METRIC USAGE:
        - Use headTiltDegrees to set head_alignment.status (Tilted Left/Right or Neutral).
        - Use shoulderSymmetryCm and shoulderSeverity for shoulder_alignment.status.
        - Use hipSymmetryCm and hipSeverity for hip_alignment.status.
        - Use hipShiftPercent and hipShiftDirection for hip_shift.status.
        - Use leftLegAlignmentStatus and leftLegSeverity for left_leg_alignment.status/severity.
        - Use rightLegAlignmentStatus and rightLegSeverity for right_leg_alignment.status/severity.
        - Use leftKneeDeviationPercent and rightKneeDeviationPercent for knee_deviation_percent.
        - Use kneeAlignmentStatus for knee_alignment.status.
        - If a metric is missing, return Neutral/Centered status for that field.
      `,
      'back': `
        BACK VIEW METRIC USAGE:
        - Use headTiltDegrees to set head_alignment.status (Tilted Left/Right or Neutral).
        - Use shoulderSymmetryCm and shoulderSeverity for shoulder_alignment.status.
        - Use hipSymmetryCm and hipSeverity for hip_alignment.status.
        - Use hipShiftPercent and hipShiftDirection for hip_shift.status.
        - Use leftLegAlignmentStatus and leftLegSeverity for left_leg_alignment.status/severity.
        - Use rightLegAlignmentStatus and rightLegSeverity for right_leg_alignment.status/severity.
        - Use leftKneeDeviationPercent and rightKneeDeviationPercent for knee_deviation_percent.
        - Use kneeAlignmentStatus for knee_alignment.status.
        - If a metric is missing, return Neutral/Centered status for that field.
      `,
      'side-right': `
        SIDE VIEW METRIC USAGE:
        - Use forwardHeadCm and headSeverity for forward_head.status.
        - Use headPitchDegrees and headPitchStatus for head_updown.
        - Use pelvicTiltDegrees and pelvicSeverity for pelvic_tilt.status.
        - If a metric is missing, return Neutral/Normal status for that field.
      `,
      'side-left': `
        SIDE VIEW METRIC USAGE:
        - Use forwardHeadCm and headSeverity for forward_head.status.
        - Use headPitchDegrees and headPitchStatus for head_updown.
        - Use pelvicTiltDegrees and pelvicSeverity for pelvic_tilt.status.
        - If a metric is missing, return Neutral/Normal status for that field.
      `
    };

    const prompt = `
      You are a clinical biomechanics reporter. Your ONLY input is the deterministic metrics below.
      Do not analyze the image visually. Ignore the image entirely even if provided.

      ${quantitativeContext}

      METRIC INTERPRETATION NOTES:
      ${viewSpecificInstructions[view]}

      RULES:
      - Use ONLY the metrics provided above. Do not infer or guess missing values.
      - If a metric is missing, return a Neutral/Normal/Centered/Straight status for that field.
      - Keep descriptions under 12 words. Keep recommendations to one sentence.
      - Do not include measurements (cm, degrees, percentages) in descriptions or recommendations.
      - Use the exact status values listed in the JSON schema below.

      Return ONLY a JSON object with this EXACT structure:
      ${view === 'front' || view === 'back' ? `
      {
        "landmarks": {
          "shoulder_y_percent": number,
          "hip_y_percent": number,
          "head_y_percent": number,
          "center_x_percent": number
        },
        "head_alignment": {
          "status": "Neutral | Tilted Left | Tilted Right",
          "tilt_degrees": number,
          "description": "ONE simple sentence. NO measurements. Example: 'Your head tilts slightly to the right.'",
          "recommendation": "ONE actionable sentence if needed."
        },
        ${view === 'front' ? `
        "lateral_head_position": {
          "status": "Centered | Shifted Left | Shifted Right",
          "shift_percent": number,
          "description": "ONE simple sentence. Example: 'Your head is centered on your body.' or 'Your head shifts slightly to the left.'",
          "recommendation": "ONE actionable sentence if deviation found."
        },
        ` : ''}
        "forward_head": null,
        "shoulder_alignment": {
          "status": "Neutral | Elevated | Depressed | Asymmetric",
          "left_elevation_cm": number,
          "right_elevation_cm": number,
          "height_difference_cm": number,
          "rounded_forward": false,
          "description": "ONE simple sentence. NO measurements. Example: 'Your right shoulder sits slightly higher than your left.'",
          "recommendation": "ONE actionable sentence if needed."
        },
        "kyphosis": null,
        "lordosis": null,
        "pelvic_tilt": {
          "status": "Neutral | Lateral Tilt",
          "lateral_tilt_degrees": number,
          "left_hip_elevation_cm": number,
          "right_hip_elevation_cm": number,
          "height_difference_cm": number,
          "description": "ONE simple sentence. NO measurements. Example: 'Your hips are level and well-aligned.'",
          "recommendation": "ONE actionable sentence if needed."
        },
        "hip_alignment": {
          "status": "Neutral | Elevated | Depressed | Asymmetric",
          "left_elevation_cm": number,
          "right_elevation_cm": number,
          "height_difference_cm": number,
          "description": "ONE simple sentence. NO measurements.",
          "recommendation": "ONE actionable sentence if needed."
        },
        "hip_shift": {
          "status": "Centered | Shifted Left | Shifted Right",
          "severity": "Good | Mild | Moderate | Severe",
          "shift_percent": number,
          "description": "ONE simple sentence. Example: 'Your hips are centered.' or 'Your pelvis shifts noticeably to the right.'",
          "recommendation": "ONE actionable sentence if deviation found."
        },
        "left_leg_alignment": {
          "status": "Straight | Valgus | Varus",
          "severity": "Good | Mild | Moderate | Severe",
          "knee_deviation_percent": number,
          "description": "ONE simple sentence. Example: 'Your left leg aligns well from hip to ankle.' or 'Your left knee angles inward (knock-knee).'",
          "recommendation": "ONE actionable sentence if deviation found."
        },
        "right_leg_alignment": {
          "status": "Straight | Valgus | Varus",
          "severity": "Good | Mild | Moderate | Severe",
          "knee_deviation_percent": number,
          "description": "ONE simple sentence. Example: 'Your right leg aligns well from hip to ankle.' or 'Your right knee angles outward (bow-legged).'",
          "recommendation": "ONE actionable sentence if deviation found."
        },
        "knee_alignment": {
          "status": "Neutral | Valgus | Varus",
          "deviation_degrees": number,
          "description": "ONE simple sentence. NO measurements. Example: 'Your knees align well with your hips.'",
          "recommendation": "ONE actionable sentence if needed."
        },
        ${view === 'back' ? `
        "spinal_curvature": {
          "status": "Normal | Mild Scoliosis | Moderate Scoliosis | Severe Scoliosis",
          "curve_degrees": number,
          "curve_direction": "Left | Right | S-Curve",
          "description": "ONE simple sentence. NO measurements. Example: 'Your spine appears straight.' or 'Your spine shows a slight lateral curve to the right.'",
          "recommendation": "ONE actionable sentence if scoliosis found."
        },
        ` : ''}
        "deviations": [
          "ONLY actual deviations - DO NOT list 'Neutral' or 'Normal' findings",
          "Max 3-4 items, sorted by severity (worst first)",
          "Use coaching language explaining WHY it matters",
          "If hip shift + shoulder asymmetry both present, combine as 'Compensation pattern: elevated [side] shoulder with [opposite] hip shift'",
          "If ALL metrics are normal, use: 'Your posture alignment is excellent'",
          "GOOD examples: 'Forward head posture (can lead to neck tension)', 'Compensation pattern with elevated left shoulder and right hip shift'",
          "BAD examples: 'Head: Neutral', 'Shoulders: Normal' (don't list these!)"
        ],
        "risk_flags": ["Brief risk factors - max 2-3 items, only if significant issues found"],
        "overall_assessment": "2-3 sentences MAX. Start with what's GOOD, then address deviations with biomechanical context, end with encouraging action step. Address as 'you'. NO measurements or jargon."
      }
      ` : `
      {
        "landmarks": {
          "shoulder_y_percent": number,
          "hip_y_percent": number,
          "midfoot_x_percent": number
        },
        "forward_head": {
          "status": "Neutral | Mild | Moderate | Severe",
          "deviation_degrees": number,
          "deviation_cm": number,
          "description": "ONE simple sentence about head position. NO measurements. Example: 'Your head sits forward of your shoulders.' or 'Your head aligns well with your body.'",
          "recommendation": "ONE actionable sentence. Example: 'Practice chin tucks daily.'"
        },
        "head_updown": {
          "status": "Neutral | Looking Up | Looking Down",
          "severity": "Mild | Moderate | Severe",
          "description": "ONE simple sentence. Example: 'Your head position is neutral.' or 'Your head tilts backward, as if looking up.'",
          "recommendation": "ONE actionable sentence if deviation found."
        },
        "shoulder_alignment": {
          "status": "Neutral | Rounded",
          "forward_position_cm": number,
          "rounded_forward": boolean,
          "description": "ONE simple sentence. NO measurements. Example: 'Your shoulders are noticeably rounded forward.' or 'Your shoulders align well.'",
          "recommendation": "ONE actionable sentence. Example: 'Stretch your chest and strengthen your upper back.'"
        },
        "kyphosis": {
          "status": "Normal | Mild | Moderate | Severe",
          "curve_degrees": number,
          "description": "ONE simple sentence. NO measurements. Example: 'Your upper back has an increased curve.'",
          "recommendation": "ONE actionable sentence."
        },
        "lordosis": {
          "status": "Normal | Mild | Moderate | Severe",
          "curve_degrees": number,
          "description": "ONE simple sentence. NO measurements. Example: 'Your lower back curve appears normal.'",
          "recommendation": "ONE actionable sentence if needed."
        },
        "pelvic_tilt": {
          "status": "Neutral | Anterior Tilt | Posterior Tilt",
          "anterior_tilt_degrees": number,
          "description": "ONE simple sentence. NO measurements. Example: 'Your pelvis tilts forward (anterior tilt).' or 'Your pelvis is in a neutral position.'",
          "recommendation": "ONE actionable sentence. Example: 'Strengthen your core and stretch your hip flexors.'"
        },
        "hip_alignment": {
          "status": "Neutral | Forward | Behind",
          "forward_of_plumb": boolean,
          "description": "ONE simple sentence. Example: 'Your hips align well with the plumb line.' or 'Your hips sit forward of ideal alignment.'",
          "recommendation": "ONE actionable sentence if deviation found."
        },
        "knee_position": {
          "status": "Neutral | Hyperextended | Flexed",
          "deviation_degrees": number,
          "description": "ONE simple sentence. NO measurements. Example: 'Your knees are in a neutral position.' or 'Your knees show slight hyperextension.'",
          "recommendation": "ONE actionable sentence if needed."
        },
        "deviations": [
          "ONLY actual deviations - DO NOT list 'Neutral' or 'Normal' findings",
          "Max 3-4 items, sorted by severity (worst first)",
          "Use coaching language explaining WHY it matters",
          "If head pitch was 'Looking Down', note this affected forward head reading",
          "If ALL metrics are normal, use: 'Your posture alignment is excellent'",
          "GOOD examples: 'Forward head posture (can lead to neck tension)', 'Anterior pelvic tilt (may inhibit glute activation)'",
          "BAD examples: 'Kyphosis: Normal', 'Knees: Neutral' (don't list these!)"
        ],
        "risk_flags": ["Brief risk factors - max 2-3 items, only if significant issues found"],
        "overall_assessment": "2-3 sentences MAX. Start with what's GOOD, then address deviations with biomechanical context, end with encouraging action step. Address as 'you'. NO measurements or jargon."
      }
      `}
    `;

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
          console.log(`⏳ Rate limited for ${view} (attempt ${attempt}/${MAX_RETRIES}). Retrying in ${delayMs/1000}s...`);
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

      // Log Gemini's response for debugging
      console.log(`\n🤖 [GEMINI RESPONSE - ${view.toUpperCase()}]`);
      console.log(`   ─────────────────────────────────────`);
      if (view === 'front' || view === 'back') {
        console.log(`   Head Alignment: ${data.head_alignment?.status} (${data.head_alignment?.tilt_degrees}°)`);
        console.log(`   Shoulder: ${data.shoulder_alignment?.status} (diff: ${data.shoulder_alignment?.height_difference_cm}cm)`);
        console.log(`   Hip: ${data.hip_alignment?.status} (diff: ${data.hip_alignment?.height_difference_cm}cm)`);
        console.log(`   Hip Shift: ${data.hip_shift?.status} (${data.hip_shift?.shift_percent}%)`);
        console.log(`   Left Leg: ${data.left_leg_alignment?.status} (${data.left_leg_alignment?.severity})`);
        console.log(`   Right Leg: ${data.right_leg_alignment?.status} (${data.right_leg_alignment?.severity})`);
        if (view === 'back') {
          console.log(`   Spine: ${data.spinal_curvature?.status} (${data.spinal_curvature?.curve_degrees}°)`);
        }
      } else {
        console.log(`   Forward Head: ${data.forward_head?.status} (${data.forward_head?.deviation_cm}cm)`);
        console.log(`   Head Up/Down: ${data.head_updown?.status} (${data.head_updown?.severity})`);
        console.log(`   Shoulders: ${data.shoulder_alignment?.status} (rounded: ${data.shoulder_alignment?.rounded_forward})`);
        console.log(`   Kyphosis: ${data.kyphosis?.status} (${data.kyphosis?.curve_degrees}°)`);
        console.log(`   Lordosis: ${data.lordosis?.status} (${data.lordosis?.curve_degrees}°)`);
        console.log(`   Pelvic Tilt: ${data.pelvic_tilt?.status} (${data.pelvic_tilt?.anterior_tilt_degrees}°)`);
      }
      console.log(`   Deviations: ${data.deviations?.join(', ')}`);
      console.log(`   ─────────────────────────────────────\n`);
      
      await logAIUsage(coachUid, 'posture_analysis', 'ai_success', 'gemini');
      logger.debug(`Analysis complete for ${view}`, ctx);
      return data;
    } catch (parseError) {
      logger.error('JSON parsing error', ctx, parseError);
      await logAIUsage(coachUid, 'posture_analysis', 'error', 'local');
      throw new Error(`Failed to parse AI response as JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }

  } catch (err) {
    logger.error('Posture Analysis Error', 'POSTURE_AI', err);
    try {
      await logAIUsage(coachUid, 'posture_analysis', 'error', 'local');
    } catch (logError) {
      logger.warn('Failed to log error', 'POSTURE_AI', logError);
    }
    if (err instanceof Error && err.message && !err.message.includes('Failed to analyze posture image')) {
      throw err;
    }
    throw new Error(`Failed to analyze posture image: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}
