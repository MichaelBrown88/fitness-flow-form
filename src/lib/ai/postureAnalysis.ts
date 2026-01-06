import { getAI, VertexAIBackend, getGenerativeModel } from "firebase/ai";
import { getApp } from "firebase/app";
import { CONFIG } from '@/config';
import { calculateFrontViewMetrics, calculateSideViewMetrics } from '@/lib/utils/postureMath';
import { logAIUsage } from '@/services/aiUsage';
import { auth } from '@/lib/firebase';
import { logger } from '@/lib/utils/logger';

export interface PostureAnalysisResult {
  // Body Landmarks (for overlay alignment) - NEW
  landmarks?: {
    shoulder_y_percent?: number; // Y position of shoulder line as % of image height (0-100)
    hip_y_percent?: number; // Y position of hip line as % of image height (0-100)
    head_y_percent?: number; // Y position of head/nose as % of image height (0-100)
    center_x_percent?: number; // X position of body center/midfoot as % of image width (0-100)
    midfoot_x_percent?: number; // X position of midfoot (for side views) as % of image width (0-100)
    raw?: import('@/lib/types/mediapipe').MediaPipeLandmark[]; // The raw MediaPipe landmarks for calculation
  };
  // ...
  // Head Position
  head_alignment?: {
    status: 'Neutral' | 'Tilted Left' | 'Tilted Right';
    tilt_degrees: number;
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
  // Knee Alignment (Front View)
  knee_alignment?: {
    status: 'Neutral' | 'Valgus' | 'Varus';
    deviation_degrees: number;
    description: string;
    recommendation?: string;
  };
  // Spinal Curvature (Back View)
  spinal_curvature?: {
    status: 'Normal' | 'Mild Scoliosis' | 'Moderate Scoliosis' | 'Severe Scoliosis';
    curve_degrees: number;
    description: string;
    recommendation?: string;
  };
  // Overall Postural Deviations
  deviations: string[]; // List of all identified deviations
  risk_flags: string[]; // Risk factors for injury/pain
  overall_assessment: string; // Comprehensive summary
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
        calculated = calculateFrontViewMetrics(landmarks.raw);
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

    const quantitativeContext = `
      LOCAL CALCULATIONS (Deterministic):
      ${calculated.headTiltDegrees !== undefined ? `- Head Tilt: ${calculated.headTiltDegrees.toFixed(1)}°` : ''}
      ${calculated.forwardHeadCm !== undefined ? `- Forward Head: ${calculated.forwardHeadCm.toFixed(1)}cm (${calculated.headSeverity})` : ''}
      ${calculated.shoulderSymmetryCm !== undefined ? `- Shoulder Diff: ${calculated.shoulderSymmetryCm.toFixed(1)}cm` : ''}
      ${calculated.hipSymmetryCm !== undefined ? `- Hip Diff: ${calculated.hipSymmetryCm.toFixed(1)}cm` : ''}
      ${calculated.pelvicTiltDegrees !== undefined ? `- Pelvic Angle: ${calculated.pelvicTiltDegrees.toFixed(1)}°` : ''}
      
      Use these values as your primary source of truth for severity levels.
    `;

    const viewSpecificInstructions = {
      'front': `
        FRONT VIEW ANALYSIS - CRITICAL SKELETAL CHECKS:
        - Use the provided MediaPipe coordinates as your skeletal "ground truth".
        - Vertical midline: Draw through nose, sternum, and center of feet.
        - Analyze HEAD TILT: Look at eye level and ear alignment. Only report if visually noticeable (≥3 degrees). Minor tilts < 3 degrees should be considered "Neutral".
        - Analyze SHOULDER ASYMMETRY: Measure height difference between acromion processes. 
        - Analyze HIP ASYMMETRY: Measure height difference between iliac crests. 
        - Analyze PELVIC SHIFT: Check if the pelvis is shifted left or right of the vertical midline.
        - CRITICAL: Do not default to "Neutral" if you see any asymmetry. Report exact degrees and cm.
        - LANDMARK PERCENTAGES:
          * center_x_percent: X position of midline as % of image width (0-100)
          * shoulder_y_percent: Y position of shoulder center as % of image height (0-100)
          * hip_y_percent: Y position of hip center as % of image height (0-100)
          * head_y_percent: Y position of nose as % of image height (0-100)
      `,
      'back': `
        BACK VIEW ANALYSIS:
        
        ⚠️ HEAD TILT - BE CONSERVATIVE ⚠️
        - ONLY report head tilt if it is CLEARLY VISIBLE (one ear noticeably lower than the other)
        - Most heads appear slightly tilted due to camera angle - this is NOT a real tilt
        - If unsure, report "Neutral" - false positives are worse than false negatives
        - RULE: If tilt is < 5 degrees visually, report "Neutral"
        
        HEAD TILT DIRECTION (BACK VIEW):
        - When viewing someone's BACK, client-left = screen-left, client-right = screen-right
        - "Tilted Right" means the client's RIGHT EAR is LOWER (right side of head drops)
        - "Tilted Left" means the client's LEFT EAR is LOWER (left side of head drops)
        - Look at which EAR is lower to determine direction
        
        OTHER CHECKS:
        - Vertical midline: Along the spine to center of heels
        - Shoulder asymmetry: Which shoulder is higher?
        - Hip asymmetry: Which hip is higher?
        - Spinal curvature: Any lateral deviation from the midline?
        
        LANDMARK PERCENTAGES:
          * center_x_percent: X position of spine as % of image width (0-100)
          * shoulder_y_percent: Y position of shoulder center as % of image height (0-100)
          * hip_y_percent: Y position of hip center as % of image height (0-100)
          * head_y_percent: Y position of head as % of image height (0-100)
      `,
      'side-right': `
        RIGHT SIDE VIEW ANALYSIS:
        
        CLIENT ORIENTATION:
        - Client's RIGHT side faces camera (right shoulder visible)
        - Face points RIGHT (nose points to right edge of image)
        - RIGHT EAR is visible (behind the jaw, to the LEFT of the nose in image)
        
        ⚠️ CONSISTENCY REQUIREMENT ⚠️
        - Your findings should be SIMILAR to the left side view (same person!)
        - If left side showed "Moderate" FHP, right side should be similar
        - Kyphosis, lordosis, pelvic tilt should match between views
        - Don't report dramatically different findings between sides
        
        PLUMB LINE: Center of image (50% width)
        - Compare EAR position (not eye!) to this line
      `,
      'side-left': `
        LEFT SIDE VIEW ANALYSIS:
        
        CLIENT ORIENTATION:
        - Client's LEFT side faces camera (left shoulder visible)
        - Face points LEFT (nose points to left edge of image)
        - LEFT EAR is visible (behind the jaw, to the RIGHT of the nose in image)
        
        ⚠️ CONSERVATIVE ASSESSMENT REQUIRED ⚠️
        - This view often causes FALSE SEVERE readings
        - The EAR is BEHIND the jaw - do NOT use nose/eye position
        - If unsure about severity, choose the LOWER option
        - "Severe" FHP should be RARE - only use for obvious cases
        
        PLUMB LINE: Center of image (50% width)
        - Compare EAR position (not eye!) to this line
        - Most people will be "Neutral" or "Mild"
      `
    };

    const prompt = `
      You are an expert Biomechanics and Posture Analyst with 20+ years of clinical experience.
      Analyze the attached image of a person from the ${view} view for comprehensive postural assessment.
      
      ${quantitativeContext}
      
      REFERENCE LINES TO USE:
      ${viewSpecificInstructions[view]}
      
      POSTURE ANALYSIS GUIDELINES:
      
      ⚠️ OUTPUT FORMAT - KEEP IT SIMPLE ⚠️
      - Use SIMPLE, everyday language a client would understand
      - NEVER include measurements (cm, degrees, angles, "180 degrees", percentages) in description or recommendation
      - Keep descriptions to ONE SHORT SENTENCE maximum
      - Keep recommendations to ONE actionable sentence
      - Address the client as "you"
      - Use terms like: "forward," "tilted," "shifted," "rounded," "leaning," "curved"
      - For technical terms, ALWAYS add a simple explanation: "Anterior Tilt (forward hip lean)"
      
      EXAMPLE GOOD OUTPUT:
      - description: "Your head sits noticeably forward of your shoulders."
      - recommendation: "Practice chin tucks to strengthen your neck muscles."
      
      EXAMPLE BAD OUTPUT (DO NOT DO THIS):
      - description: "Your head deviates 15 degrees forward with 4.2cm displacement..."
      - recommendation: "Perform cervical retraction exercises at 10-15 degree angles..."
      
      CRITICAL LANDMARK ACCURACY (SIDE VIEWS): 
      - EAR CANAL (TRAGUS) is your ONLY head landmark - it is BEHIND the jawline
      - The ear is 6-10cm behind the eye. If your identified point is near the eye/nose/forehead, it is WRONG
      - LEFT SIDE VIEW: Person faces LEFT, ear is to the RIGHT of the eye in the image
      - RIGHT SIDE VIEW: Person faces RIGHT, ear is to the LEFT of the eye in the image
      
      VIEW-SPECIFIC ANALYSIS REQUIRED:
      
      ${view === 'front' || view === 'back' ? `
      FRONT/BACK VIEW SPECIFIC CHECKS:
      1. HEAD TILT ASYMMETRY:
         - ONLY report head tilt if ONE EAR IS CLEARLY LOWER than the other
         - When in doubt, report "Neutral" - most apparent tilts are camera angle artifacts
         - Normal: < 7 degrees = "Neutral" status (DEFAULT TO THIS)
         - Mild: 7-10 degrees = "Tilted" status (visually noticeable)
         - Moderate: 10-15 degrees = "Tilted" status (clearly visible)
         - Severe: > 15 degrees = "Tilted" status (obvious)
         - CRITICAL: 90% of heads should be "Neutral". Only report tilt if OBVIOUSLY visible.
      
      2. SHOULDER ELEVATION ASYMMETRY:
         - Measure vertical height difference between left and right shoulders (in cm)
         - Report the height_difference_cm (absolute value of difference)
         - Normal: < 1.0cm difference = "Neutral" status (not visually noticeable)
         - Mild: 1.0-1.5cm difference = "Asymmetric" status (barely noticeable)
         - Moderate: 1.5-2.5cm difference = "Asymmetric" status (clearly visible)
         - Severe: > 2.5cm difference = "Asymmetric" status (very obvious)
         - Identify which shoulder is elevated in description
         - CRITICAL: Only report "Asymmetric" if the difference is ≥1.0cm and visually noticeable. Differences < 1.0cm should always be "Neutral" to avoid alarming clients unnecessarily.
      
      2. HIP ELEVATION ASYMMETRY:
         - Measure vertical height difference between left and right hips (in cm)
         - Normal: < 1.0cm difference (not visually noticeable)
         - Mild: 1.0-1.5cm difference (barely noticeable)
         - Moderate: 1.5-2.5cm difference (clearly visible)
         - Severe: > 2.5cm difference (very obvious)
         - Identify which hip is elevated
         - CRITICAL: Only report asymmetry if ≥1.0cm and visually noticeable. Differences < 1.0cm should be considered normal.
      
      3. LATERAL PELVIC TILT:
         - Measure tilt angle in degrees
         - Normal: < 2 degrees
         - Mild: 2-5 degrees
         - Moderate: 5-8 degrees
         - Severe: > 8 degrees
      
      4. HIP SHIFT:
         - Measure horizontal displacement of hips from midline (in cm)
         - Left shift: hips shifted to left
         - Right shift: hips shifted to right
         - Normal: < 1cm displacement
      
      5. SHOULDER ROUNDING (Front view only):
         - Check if shoulders are forward/protracted
         - Normal: shoulders aligned with body
         - Rounded: shoulders forward of ideal alignment
      
      6. KNEE ALIGNMENT (Front/Back view):
         - Check for valgus (knees pointing inward) or varus (knees pointing outward)
         - Measure deviation angle in degrees from ideal alignment
         - Normal: knees aligned = "Neutral" status
         - Valgus: knees pointing inward = "Valgus" status
         - Varus: knees pointing outward = "Varus" status
         - Report deviation_degrees (angle of deviation)
      
      7. SPINAL CURVATURE (Back view only):
         - Check for scoliosis indicators (lateral spinal curvature)
         - Look for lateral deviation of the spine from the midline
         - Measure curve angle in degrees (Cobb angle estimation)
         - Normal: straight spine = "Normal" status
         - Mild Scoliosis: 5-15 degrees = "Mild Scoliosis" status
         - Moderate Scoliosis: 15-30 degrees = "Moderate Scoliosis" status
         - Severe Scoliosis: > 30 degrees = "Severe Scoliosis" status
         - Report curve_degrees (positive for right-side bulge, negative for left-side bulge)
         - CRITICAL: If you see ANY lateral deviation, you MUST report it here, not just in overall_assessment.
      
      IMPORTANT: You MUST analyze ALL of the above checks (shoulders, hips, pelvic tilt, hip shift, knee alignment, and spinal curvature for back view).
      DO NOT analyze forward head posture, kyphosis, or lordosis from this view - these require side view.
      ` : `
      SIDE VIEW SPECIFIC CHECKS (using center of mass plumb line):
      1. FORWARD HEAD POSTURE (FHP):
         - CRITICAL: Locate the EAR CANAL (tragus). It is BEHIND the jawline, NOT at the eye.
         - Compare ear position to the vertical plumb line at center of image.
         
         ⚠️ SEVERITY GUIDELINES - BE CONSERVATIVE ⚠️
         - "Neutral": Ear is within 2cm of plumb line (DEFAULT - use this if unsure)
         - "Mild": Ear is 2-4cm forward of plumb line (slight forward position)
         - "Moderate": Ear is 4-6cm forward of plumb line (noticeable forward head)
         - "Severe": Ear is >6cm forward of plumb line (RARE - only obvious cases)
         
         ⚠️ CRITICAL: "Severe" should be RARE. Most people are Neutral or Mild.
         If left and right side views show different severities, use the LOWER severity.
         When in doubt, choose the less severe option.
      
      2. THORACIC KYPHOSIS (Upper Back Curve):
         - Identify the curve of the upper back.
         - NO NUMBERS in output. Use "Normal" or "Increased" (Hyperkyphosis).
      
      3. LUMBAR LORDOSIS (Lower Back Curve):
         - Identify the curve of the lower back.
         - NO NUMBERS in output. Use "Normal", "Increased" (Hyperlordosis), or "Decreased" (Flat Back).
      
      4. PELVIC TILT (Hip Lean):
         - Identify if the pelvis is rotated forward (Anterior) or backward (Posterior).
         - NO NUMBERS. Use "Anterior Tilt (forward hip lean)" or "Posterior Tilt (backward hip lean)".
      
      5. SHOULDER POSITION:
         - Identify if shoulders are rolled forward (Rounded) or neutral.
         - NO NUMBERS. Use "Rounded" or "Neutral".
      
      4. ANTERIOR/POSTERIOR PELVIC TILT:
         - Measure the angle between shoulder-hip-knee (or use provided pelvic angle if available)
         - CRITICAL INTERPRETATION:
           * If the angle is LESS than 180° (e.g., 171°), this indicates ANTERIOR TILT (pelvis rotated forward, tailbone out)
           * If the angle is MORE than 180° (e.g., 189°), this indicates POSTERIOR TILT (pelvis rotated backward, tailbone tucked)
           * If the angle is approximately 180° (±5°), this is NEUTRAL
         - Calculate deviation: |angle - 180°|
         - Anterior tilt: angle < 175° (pelvis rotated forward, increased lumbar lordosis)
         - Posterior tilt: angle > 185° (pelvis rotated backward, flattened lumbar curve)
         - Normal: 175° to 185° (within ±5° of 180°)
         - Mild: 5-10° deviation from 180°
         - Moderate: 10-15° deviation from 180°
         - Severe: > 15° deviation from 180°
         - IMPORTANT: If you see increased lumbar lordosis (curved lower back), this is ANTERIOR tilt, not posterior
      
      5. ROUNDED SHOULDERS:
         - Measure forward position of shoulders relative to plumb line (in cm)
         - Normal: shoulders aligned with plumb line
         - Mild: 1-2cm forward
         - Moderate: 2-4cm forward
         - Severe: > 4cm forward
      
      6. KNEE POSITION:
         - Check for hyperextension (knee behind plumb line) or flexion (knee in front)
         - Normal: knee aligned with plumb line
         - Hyperextension: knee behind plumb line
         - Flexion: knee forward of plumb line
      `}
      
      Return ONLY a JSON object with this EXACT structure:
      ${view === 'front' || view === 'back' ? `
      {
        "landmarks": {
          "shoulder_y_percent": number,  // Y position of shoulder center as % of image height (0-100)
          "hip_y_percent": number,        // Y position of hip center as % of image height (0-100)
          "head_y_percent": number,       // Y position of center of head (EAR/EYE LEVEL) as % of image height (0-100)
          "center_x_percent": number      // X position of body midline (between legs) as % of image width (0-100)
        },
        "head_alignment": {
          "status": "Neutral | Tilted Left | Tilted Right",
          "tilt_degrees": number,
          "description": "ONE simple sentence. NO measurements. Example: 'Your head tilts slightly to the right.'",
          "recommendation": "ONE actionable sentence if needed."
        },
        "forward_head": null,
        "shoulder_alignment": {
          "status": "Neutral | Elevated | Depressed | Asymmetric",
          "left_elevation_cm": number,
          "right_elevation_cm": number,
          "height_difference_cm": number,
          "rounded_forward": boolean,
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
          "hip_shift_cm": number,
          "hip_shift_direction": "None | Left | Right",
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
          "description": "ONE simple sentence. NO measurements. Example: 'Your spine shows a slight lateral curve.'",
          "recommendation": "ONE actionable sentence if needed."
        },
        ` : ''}
        "deviations": ["Short list of main findings - max 3-4 items, simple language"],
        "risk_flags": ["Brief risk factors - max 2-3 items"],
        "overall_assessment": "2-3 sentences MAX summarizing the key findings. Address the person as 'you'. Keep it simple and encouraging. NO technical jargon or measurements."
      }
      ` : `
      {
        "landmarks": {
          "shoulder_y_percent": number,  // Y position of shoulder center as % of image height (0-100)
          "hip_y_percent": number,        // Y position of hip center as % of image height (0-100)
          "midfoot_x_percent": number     // X position of midfoot (ankle area) as % of image width (0-100)
        },
        "forward_head": {
          "status": "Neutral | Mild | Moderate | Severe",
          "deviation_degrees": number,
          "deviation_cm": number,
          "description": "ONE simple sentence about head position. NO measurements. Example: 'Your head sits forward of your shoulders.'",
          "recommendation": "ONE actionable sentence. Example: 'Practice chin tucks daily.'"
        },
        "shoulder_alignment": {
          "status": "Neutral | Rounded",
          "forward_position_cm": number,
          "rounded_forward": boolean,
          "description": "ONE simple sentence. NO measurements. Example: 'Your shoulders are noticeably rounded forward.'",
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
          "anterior_tilt_degrees": number, // Positive = anterior tilt, Negative = posterior tilt
          "description": "ONE simple sentence. NO measurements. Example: 'Your pelvis tilts forward (anterior tilt).'",
          "recommendation": "ONE actionable sentence. Example: 'Strengthen your core and stretch your hip flexors.'"
        },
        "hip_alignment": null,
        "knee_position": {
          "status": "Neutral | Hyperextended | Flexed",
          "deviation_degrees": number,
          "description": "ONE simple sentence. NO measurements.",
          "recommendation": "ONE actionable sentence if needed."
        },
        "deviations": ["Short list of main findings - max 3-4 items, simple language"],
        "risk_flags": ["Brief risk factors - max 2-3 items"],
        "overall_assessment": "2-3 sentences MAX summarizing the key findings. Address the person as 'you'. Keep it simple and encouraging. NO technical jargon or measurements."
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

    logger.debug(`Calling Gemini API for ${view}`, ctx);
    let result;
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
      logger.debug(`Gemini API call successful for ${view}`, ctx);
    } catch (apiError) {
      logger.error('Gemini API call failed', ctx, apiError);
      
      const errorMessage = apiError instanceof Error ? apiError.message : String(apiError);
      if (errorMessage.includes('BILLING_DISABLED') || errorMessage.includes('billing to be enabled')) {
        const projectMatch = errorMessage.match(/project[#\s]+([a-z0-9-]+)/i);
        const projectId = projectMatch ? projectMatch[1] : 'your project';
        throw new Error(`Billing is not enabled for your Google Cloud project "${projectId}". Please enable billing in the Google Cloud Console to use AI posture analysis. Visit: https://console.developers.google.com/billing/enable?project=${projectId}`);
      }
      
      throw new Error(`AI API call failed: ${errorMessage}`);
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
