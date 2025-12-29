import { getAI, VertexAIBackend, getGenerativeModel } from "firebase/ai";
import { getApp } from "firebase/app";
import { CONFIG } from '@/config';
import { calculateFrontViewMetrics, calculateSideViewMetrics } from '@/lib/utils/postureMath';
import { logAIUsage } from '@/services/aiUsage';
import { auth } from '@/lib/firebase';

export interface PostureAnalysisResult {
  // Body Landmarks (for overlay alignment) - NEW
  landmarks?: {
    shoulder_y_percent?: number; // Y position of shoulder line as % of image height (0-100)
    hip_y_percent?: number; // Y position of hip line as % of image height (0-100)
    head_y_percent?: number; // Y position of head/nose as % of image height (0-100)
    center_x_percent?: number; // X position of body center/midfoot as % of image width (0-100)
    midfoot_x_percent?: number; // X position of midfoot (for side views) as % of image width (0-100)
    raw?: any; // The raw MediaPipe landmarks for calculation
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
    let calculated: any = {};
    if (landmarks?.raw) {
      if (view === 'front' || view === 'back') {
        calculated = calculateFrontViewMetrics(landmarks.raw);
      } else {
        calculated = calculateSideViewMetrics(landmarks.raw);
      }
    }

    console.log(`[POSTURE] Local metrics for ${view}:`, calculated);

    // 2. TRIGGER AI FOR HYBRID REFINEMENT
    await logAIUsage(coachUid, 'posture_analysis', 'ai_fallback', 'gemini');

    const firebaseApp = getApp();
    const ai = getAI(firebaseApp, { backend: new VertexAIBackend() });
    
    // Use Gemini 2.0 Flash
    const model = getGenerativeModel(ai, { 
      model: CONFIG.AI.GEMINI.MODEL_NAME,
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

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
        - Analyze HEAD TILT: Look at eye level and ear alignment. Even a slight 2-3 degree tilt is significant.
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
        BACK VIEW ANALYSIS - CRITICAL SKELETAL CHECKS:
        - Use the provided MediaPipe coordinates as your skeletal "ground truth".
        - Vertical midline: Draw along the spine to the center of the heels.
        - Analyze HEAD TILT: Look at ear alignment and head position relative to the spine.
        - Analyze SHOULDER ASYMMETRY: Look for height differences and scapular winging/protraction.
        - Analyze SPINAL CURVATURE (Scoliosis): Look for lateral deviation (S-curve or C-curve). Estimate Cobb angle.
        - Analyze HIP ASYMMETRY: Measure height difference between iliac crests or gluteal folds.
        - Analyze PELVIC TILT & SHIFT: Look for lateral tilt and displacement from the midline.
        - CRITICAL: Report exact degrees and directions (e.g. "Right-side bulge", "Left shoulder elevated").
        - LANDMARK PERCENTAGES:
          * center_x_percent: X position of spine as % of image width (0-100)
          * shoulder_y_percent: Y position of shoulder center as % of image height (0-100)
          * hip_y_percent: Y position of hip center as % of image height (0-100)
          * head_y_percent: Y position of head as % of image height (0-100)
      `,
      'side-right': `
        RIGHT SIDE VIEW ANALYSIS - CENTER OF MASS PLUMB LINE:
        - IMPORTANT: The vertical plumb line is positioned at the CENTER OF THE SCREEN (50% width)
        - The client should be aligned so their mid-foot (just in front of ankle bone) aligns with this center plumb line
        - Vertical plumb line: Draw from the center of the screen (through ear canal, center of shoulder joint, center of hip joint, center of knee, center of ankle)
        - This plumb line represents ideal center of mass alignment and is always at 50% screen width
        - Horizontal shoulder line: Reference for shoulder position
        - Horizontal hip line: Reference for hip position
        - Measure deviations FROM the plumb line:
          * Forward head posture: Horizontal distance from ear canal to plumb line (in cm and degrees)
          * Thoracic kyphosis: Degree of forward curve in upper back (normal 20-40°, mild 40-50°, moderate 50-60°, severe >60°)
          * Lumbar lordosis: Degree of inward curve in lower back (normal 20-40°, mild 40-50°, moderate 50-60°, severe >60°)
          * Anterior/posterior pelvic tilt: Angle of pelvic rotation (anterior = forward, posterior = backward)
          * Rounded shoulders: Forward position of shoulders relative to plumb line
          * Knee position: Hyperextension or flexion relative to plumb line
      `,
      'side-left': `
        LEFT SIDE VIEW ANALYSIS - CENTER OF MASS PLUMB LINE:
        - IMPORTANT: The vertical plumb line is positioned at the CENTER OF THE SCREEN (50% width)
        - The client should be aligned so their mid-foot (just in front of ankle bone) aligns with this center plumb line
        - Vertical plumb line: Draw from the center of the screen (through ear canal, center of shoulder joint, center of hip joint, center of knee, center of ankle)
        - This plumb line represents ideal center of mass alignment and is always at 50% screen width
        - Horizontal shoulder line: Reference for shoulder position
        - Horizontal hip line: Reference for hip position
        - Measure deviations FROM the plumb line:
          * Forward head posture: Horizontal distance from ear canal to plumb line (in cm and degrees)
          * Thoracic kyphosis: Degree of forward curve in upper back (normal 20-40°, mild 40-50°, moderate 50-60°, severe >60°)
          * Lumbar lordosis: Degree of inward curve in lower back (normal 20-40°, mild 40-50°, moderate 50-60°, severe >60°)
          * Anterior/posterior pelvic tilt: Angle of pelvic rotation (anterior = forward, posterior = backward)
          * Rounded shoulders: Forward position of shoulders relative to plumb line
          * Knee position: Hyperextension or flexion relative to plumb line
      `
    };

    const prompt = `
      You are an expert Biomechanics and Posture Analyst with 20+ years of clinical experience.
      Analyze the attached image of a person from the ${view} view for comprehensive postural assessment.
      
      ${quantitativeContext}
      
      REFERENCE LINES TO USE:
      ${viewSpecificInstructions[view]}
      
      VIEW-SPECIFIC ANALYSIS REQUIRED:
      
      ${view === 'front' || view === 'back' ? `
      FRONT/BACK VIEW SPECIFIC CHECKS:
      1. SHOULDER ELEVATION ASYMMETRY:
         - Measure vertical height difference between left and right shoulders (in cm)
         - Report the height_difference_cm (absolute value of difference)
         - Normal: < 0.5cm difference = "Neutral" status
         - Mild: 0.5-1.0cm difference = "Asymmetric" status
         - Moderate: 1.0-2.0cm difference = "Asymmetric" status
         - Severe: > 2.0cm difference = "Asymmetric" status
         - Identify which shoulder is elevated in description
         - If difference is 0cm or < 0.5cm, status must be "Neutral", not "Asymmetric"
      
      2. HIP ELEVATION ASYMMETRY:
         - Measure vertical height difference between left and right hips (in cm)
         - Normal: < 0.5cm difference
         - Mild: 0.5-1.0cm difference
         - Moderate: 1.0-2.0cm difference
         - Severe: > 2.0cm difference
         - Identify which hip is elevated
      
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
         - Measure horizontal distance from ear canal to plumb line (in cm)
         - Measure deviation angle in degrees
         - Normal: < 2cm forward, < 5 degrees
         - Mild: 2-4cm forward, 5-12 degrees
         - Moderate: 4-6cm forward, 12-20 degrees
         - Severe: > 6cm forward, > 20 degrees
      
      2. THORACIC KYPHOSIS (Upper Back Curve):
         - Measure the degree of forward curvature in upper back
         - Normal: 20-40 degrees
         - Mild: 40-50 degrees
         - Moderate: 50-60 degrees
         - Severe: > 60 degrees
      
      3. LUMBAR LORDOSIS (Lower Back Curve):
         - Measure the degree of inward curvature in lower back
         - Normal: 20-40 degrees
         - Mild: 40-50 degrees
         - Moderate: 50-60 degrees
         - Severe: > 60 degrees
      
      4. ANTERIOR/POSTERIOR PELVIC TILT:
         - Measure tilt angle in degrees relative to plumb line
         - Anterior tilt: pelvis rotated forward (positive angle)
         - Posterior tilt: pelvis rotated backward (negative angle)
         - Normal: -5 to +5 degrees
         - Mild: 5-10 degrees deviation
         - Moderate: 10-15 degrees deviation
         - Severe: > 15 degrees deviation
      
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
          "head_y_percent": number,       // Y position of center of head as % of image height (0-100)
          "center_x_percent": number      // X position of body midline (between legs) as % of image width (0-100)
        },
        "head_alignment": {
          "status": "Neutral | Tilted Left | Tilted Right",
          "tilt_degrees": number,
          "description": "Detailed explanation of head tilt and asymmetry",
          "recommendation": "Specific corrective recommendations"
        },
        "forward_head": null,
        "shoulder_alignment": {
          "status": "Neutral | Elevated | Depressed | Asymmetric",
          "left_elevation_cm": number,
          "right_elevation_cm": number,
          "height_difference_cm": number,
          "rounded_forward": boolean,
          "description": "Detailed explanation of shoulder alignment and asymmetry",
          "recommendation": "Specific corrective recommendations"
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
          "description": "Detailed explanation of pelvic position, hip elevation, and hip shift",
          "recommendation": "Specific corrective recommendations"
        },
        "hip_alignment": {
          "status": "Neutral | Elevated | Depressed | Asymmetric",
          "left_elevation_cm": number,
          "right_elevation_cm": number,
          "height_difference_cm": number,
          "description": "Detailed explanation of hip alignment and asymmetry",
          "recommendation": "Specific corrective recommendations"
        },
        "knee_alignment": {
          "status": "Neutral | Valgus | Varus",
          "deviation_degrees": number,
          "description": "Detailed explanation of knee alignment from front/back view",
          "recommendation": "Specific corrective recommendations"
        },
        ${view === 'back' ? `
        "spinal_curvature": {
          "status": "Normal | Mild Scoliosis | Moderate Scoliosis | Severe Scoliosis",
          "curve_degrees": number,
          "description": "Detailed explanation of spinal curvature from back view",
          "recommendation": "Specific corrective recommendations"
        },
        ` : ''}
        "deviations": ["list of all identified postural deviations from this view"],
        "risk_flags": ["list of risk factors for pain/injury"],
        "overall_assessment": "Comprehensive summary of all findings from ${view} view. IMPORTANT: Address the person directly as 'you' (e.g., 'You present with...', 'Your posture shows...', 'You have...'). Never use 'the individual', 'the person', or 'the subject'."
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
          "description": "Detailed explanation of forward head posture relative to plumb line",
          "recommendation": "Specific exercise/stretching recommendations"
        },
        "shoulder_alignment": {
          "status": "Neutral | Rounded",
          "forward_position_cm": number,
          "rounded_forward": boolean,
          "description": "Detailed explanation of shoulder position relative to plumb line",
          "recommendation": "Specific corrective recommendations"
        },
        "kyphosis": {
          "status": "Normal | Mild | Moderate | Severe",
          "curve_degrees": number,
          "description": "Detailed explanation of thoracic kyphosis",
          "recommendation": "Specific strengthening/stretching recommendations"
        },
        "lordosis": {
          "status": "Normal | Mild | Moderate | Severe",
          "curve_degrees": number,
          "description": "Detailed explanation of lumbar lordosis",
          "recommendation": "Specific corrective recommendations"
        },
        "pelvic_tilt": {
          "status": "Neutral | Anterior Tilt | Posterior Tilt",
          "anterior_tilt_degrees": number,
          "description": "Detailed explanation of pelvic position relative to plumb line",
          "recommendation": "Specific corrective recommendations"
        },
        "hip_alignment": null,
        "knee_position": {
          "status": "Neutral | Hyperextended | Flexed",
          "deviation_degrees": number,
          "description": "Detailed explanation of knee position relative to plumb line",
          "recommendation": "Specific corrective recommendations"
        },
        "deviations": ["list of all identified postural deviations from this view"],
        "risk_flags": ["list of risk factors for pain/injury"],
        "overall_assessment": "Comprehensive summary of all findings from ${view} view. IMPORTANT: Address the person directly as 'you' (e.g., 'You present with...', 'Your posture shows...', 'You have...'). Never use 'the individual', 'the person', or 'the subject'."
      }
      `}
    `;

    // Handle different image formats:
    // 1. Storage URL (https://...) - fetch and convert to base64
    // 2. Data URL (data:image/...) - extract base64
    // 3. Raw base64 - use as-is
    let base64Data: string;
    
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      // Fetch from Storage URL and convert to base64
      console.log('[AI] Fetching full-size image from Storage URL...');
      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        base64Data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            // Extract base64 part
            const base64Part = result.split(',')[1] || result;
            resolve(base64Part);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        console.log('[AI] Successfully fetched full-size image from Storage');
      } catch (error) {
        console.error('[AI] Failed to fetch image from Storage URL:', error);
        throw new Error('Failed to fetch full-size image from Storage');
      }
    } else if (imageUrl.startsWith('data:')) {
      // Data URL - extract base64
      base64Data = imageUrl.split(',')[1];
    } else {
      // Assume raw base64
      base64Data = imageUrl;
    }

    const result = await model.generateContent([
      { text: prompt },
      {
        inlineData: {
          data: base64Data,
          mimeType: "image/jpeg",
        },
      },
    ]);

    const aiResponse = await result.response;
    
    // Gemini 2.0 Flash with responseMimeType: "application/json" returns JSON directly
    // Try to get JSON first, fallback to text extraction if needed
    try {
      const text = aiResponse.text();
      let data: any;
      // If responseMimeType is set, text should be valid JSON
      try {
        data = JSON.parse(text);
      } catch {
        // Fallback: extract JSON from text if wrapped
        const startIdx = text.indexOf('{');
        const endIdx = text.lastIndexOf('}');
        if (startIdx === -1) throw new Error('Invalid AI response');
        const jsonString = text.substring(startIdx, endIdx + 1);
        data = JSON.parse(jsonString);
      }

      await logAIUsage(coachUid, 'posture_analysis', 'ai_success', 'gemini');
      return { ...data, provider: 'hybrid' };
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      throw new Error('Failed to parse AI response as JSON.');
    }

  } catch (err) {
    console.error('Posture Analysis Error:', err);
    await logAIUsage(coachUid, 'posture_analysis', 'error', 'local');
    throw new Error('Failed to analyze posture image.');
  }
}
