import { PostureAnalysisResult } from '../ai/postureAnalysis';
import { CONFIG } from '@/config';

interface OverlayOptions {
  showMidline?: boolean;
  showShoulderLine?: boolean;
  showHipLine?: boolean;
  lineColor?: string;
  lineWidth?: number;
  analysis?: PostureAnalysisResult;
  mode?: 'reference' | 'align' | 'deviation';
  landmarks?: PostureAnalysisResult['landmarks'];
}

/**
 * Adds posture reference or deviation lines to an image using HTML Canvas
 */
export async function addPostureOverlay(
  imageData: string,
  view: 'front' | 'side-right' | 'side-left' | 'back',
  options: OverlayOptions = {}
): Promise<string> {
  const {
    showMidline = true,
    showShoulderLine = true,
    showHipLine = true,
    lineColor = CONFIG.POSTURE_OVERLAY.STYLE.LINE_COLOR,
    lineWidth = CONFIG.POSTURE_OVERLAY.STYLE.LINE_WIDTH,
    analysis,
    mode = 'reference'
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const width = CONFIG.POSTURE_OVERLAY.CANVAS_SIZE.WIDTH;
        const height = CONFIG.POSTURE_OVERLAY.CANVAS_SIZE.HEIGHT;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        const targetCenterX = canvas.width * (CONFIG.POSTURE_OVERLAY.TARGET_LANDMARKS.CENTER_X_PCT / 100);
        const targetShoulderY = canvas.height * (CONFIG.POSTURE_OVERLAY.TARGET_LANDMARKS.SHOULDER_Y_PCT / 100);
        const targetHipY = canvas.height * (CONFIG.POSTURE_OVERLAY.TARGET_LANDMARKS.HIP_Y_PCT / 100);
        const targetHeadY = canvas.height * (CONFIG.POSTURE_OVERLAY.TARGET_LANDMARKS.HEAD_Y_PCT / 100);
        
        const landmarkData = options.landmarks || analysis?.landmarks;
        
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (mode === 'align' && landmarkData) {
          // Target positions on canvas (where green lines will be drawn)
          const targetCenterX = canvas.width * (CONFIG.POSTURE_OVERLAY.TARGET_LANDMARKS.CENTER_X_PCT / 100);
          const targetShoulderY = canvas.height * (CONFIG.POSTURE_OVERLAY.TARGET_LANDMARKS.SHOULDER_Y_PCT / 100);
          const targetHipY = canvas.height * (CONFIG.POSTURE_OVERLAY.TARGET_LANDMARKS.HIP_Y_PCT / 100);
          const targetHeadY = canvas.height * (CONFIG.POSTURE_OVERLAY.TARGET_LANDMARKS.HEAD_Y_PCT / 100);
          
          // Get detected landmark positions in SOURCE image pixels
          let sourceLandmarkX: number;
          let sourceShoulderY: number;
          let sourceHipY: number;
          
          // Determine X landmark (center for front/back, midfoot for side)
          if (view === 'side-right' || view === 'side-left') {
            if (landmarkData.midfoot_x_percent !== undefined) {
              sourceLandmarkX = (landmarkData.midfoot_x_percent / 100) * img.width;
            } else {
              sourceLandmarkX = img.width / 2; // Fallback to center
            }
          } else {
            if (landmarkData.center_x_percent !== undefined) {
              sourceLandmarkX = (landmarkData.center_x_percent / 100) * img.width;
            } else {
              sourceLandmarkX = img.width / 2; // Fallback to center
            }
          }
          
          // Get Y positions
          if (landmarkData.shoulder_y_percent !== undefined) {
            sourceShoulderY = (landmarkData.shoulder_y_percent / 100) * img.height;
          } else {
            sourceShoulderY = img.height * 0.25; // Fallback
          }
          
          if (landmarkData.hip_y_percent !== undefined) {
            sourceHipY = (landmarkData.hip_y_percent / 100) * img.height;
          } else {
            sourceHipY = img.height * 0.5; // Fallback
          }

          // Calculate scale based on torso height (shoulder to hip distance)
          const sourceTorsoHeight = Math.abs(sourceHipY - sourceShoulderY);
          const targetTorsoHeight = Math.abs(targetHipY - targetShoulderY);
          
          // Calculate scale factor
          let scale = sourceTorsoHeight > 0 ? targetTorsoHeight / sourceTorsoHeight : 1.0;
          // Clamp scale to reasonable limits (0.3x to 3x) to prevent extreme distortion
          scale = Math.max(0.3, Math.min(3.0, scale));

          // After scaling, where will the source landmarks be?
          const scaledLandmarkX = sourceLandmarkX * scale;
          const scaledShoulderY = sourceShoulderY * scale;
          const scaledHipY = sourceHipY * scale;
          
          // Calculate translation needed to align landmarks with targets
          // We want: targetCenterX = translateX + scaledLandmarkX
          const translateX = targetCenterX - scaledLandmarkX;
          
          // For Y, align the midpoint between shoulder and hip
          const scaledBodyCenterY = (scaledShoulderY + scaledHipY) / 2;
          const targetBodyCenterY = (targetShoulderY + targetHipY) / 2;
          const translateY = targetBodyCenterY - scaledBodyCenterY;

          // Aligning image with landmarks

          ctx.save();
          // Apply transformations: first translate, then scale
          // This ensures the scale happens around the origin, then we translate
          ctx.translate(translateX, translateY);
          ctx.scale(scale, scale);
          ctx.drawImage(img, 0, 0);
          ctx.restore();
        } else {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
        
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        if (showMidline) {
          ctx.beginPath();
          ctx.moveTo(targetCenterX, 0);
          ctx.lineTo(targetCenterX, canvas.height);
          ctx.stroke();
        }
        
        if (showShoulderLine) {
          ctx.beginPath();
          ctx.moveTo(0, targetShoulderY);
          ctx.lineTo(canvas.width, targetShoulderY);
          ctx.stroke();
        }
        
        if (showHipLine) {
          ctx.beginPath();
          ctx.moveTo(0, targetHipY);
          ctx.lineTo(canvas.width, targetHipY);
          ctx.stroke();
        }

        if (mode === 'deviation' && analysis) {
          drawDeviations(ctx, view, analysis, targetCenterX, targetShoulderY, targetHipY);
        }

        resolve(canvas.toDataURL('image/jpeg', 0.95));
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageData;
  });
}

function drawDeviations(
  ctx: CanvasRenderingContext2D,
  view: string,
  analysis: PostureAnalysisResult,
  centerX: number,
  shoulderY: number,
  hipY: number
) {
  const facingDir = view === 'side-right' ? 1 : -1;
  // For front/back, we need to know screen-left vs screen-right
  // Front: screen-left is client-right
  // Back: screen-left is client-left
  const isBackView = view === 'back';
  
  ctx.strokeStyle = CONFIG.POSTURE_OVERLAY.STYLE.DEVIATION_COLOR;
  ctx.lineWidth = CONFIG.POSTURE_OVERLAY.STYLE.DEVIATION_WIDTH;
  ctx.setLineDash([5, 5]);

  if (view === 'front' || view === 'back') {
    // 1. Head Tilt - only draw if tilt is significant (> 5 degrees raw)
    const rawTiltDeg = Math.abs(analysis.head_alignment?.tilt_degrees || 0);
    if (analysis.head_alignment && analysis.head_alignment.status !== 'Neutral' && rawTiltDeg > 5) {
      const tiltDeg = Math.min(rawTiltDeg, 20); // Cap at 20 degrees for visual
      const status = analysis.head_alignment.status;
      
      // Determine screen direction of tilt
      // Tilted Right in Back view = Screen Right (client's right is screen right when viewing back)
      // Tilted Right in Front view = Screen Left (client's right is screen left when viewing front)
      let screenTiltDir = 1;
      if (status === 'Tilted Right') {
        screenTiltDir = isBackView ? 1 : -1;
      } else if (status === 'Tilted Left') {
        screenTiltDir = isBackView ? -1 : 1;
      }
      
      // Calculate head position - place line at ear/eye level
      // Use shoulder as reference and go UP by a percentage of canvas height
      let headY: number;
      if (analysis.landmarks?.head_y_percent !== undefined) {
        const reportedHeadY = (analysis.landmarks.head_y_percent / 100) * ctx.canvas.height;
        // Calculate distance from reported head to shoulder
        const headToShoulderDist = shoulderY - reportedHeadY;
        // Place line at ~50-60% of the way down from reported head (towards ear level)
        headY = reportedHeadY + (headToShoulderDist * 0.5);
      } else {
        // Fallback: place at ~70% of the way from top to shoulder line
        headY = shoulderY * 0.7;
      }
      
      const rad = (tiltDeg * Math.PI / 180);
      const lineLength = 90;
      
      ctx.beginPath();
      // Tilted Right: Right side of head is lower (screen right for back view)
      // Tilted Left: Left side of head is lower (screen left for back view)
      if (screenTiltDir === 1) {
        ctx.moveTo(centerX - (Math.cos(rad) * lineLength), headY - (Math.sin(rad) * lineLength));
        ctx.lineTo(centerX + (Math.cos(rad) * lineLength), headY + (Math.sin(rad) * lineLength));
      } else {
        ctx.moveTo(centerX - (Math.cos(rad) * lineLength), headY + (Math.sin(rad) * lineLength));
        ctx.lineTo(centerX + (Math.cos(rad) * lineLength), headY - (Math.sin(rad) * lineLength));
      }
      ctx.stroke();
    }

    // 2. Shoulder Asymmetry
    if (analysis.shoulder_alignment && analysis.shoulder_alignment.status !== 'Neutral') {
      const diffCm = analysis.shoulder_alignment.height_difference_cm || 0;
      const desc = analysis.shoulder_alignment.description.toLowerCase();
      
      // Determine which side is higher on screen
      let higherSide = 0; // 0 = even, -1 = screen left higher, 1 = screen right higher
      
      if (desc.includes('right shoulder is slightly elevated') || desc.includes('right shoulder sits higher')) {
        // Client Right is Screen Left in Back View, Screen Right in Front View
        higherSide = isBackView ? -1 : 1;
      } else if (desc.includes('left shoulder is slightly elevated') || desc.includes('left shoulder sits higher')) {
        // Client Left is Screen Right in Back View, Screen Left in Front View
        higherSide = isBackView ? 1 : -1;
      }
      
      if (higherSide !== 0) {
        const pixelDiff = Math.min(diffCm * 15, 60); // Scale for visibility
        ctx.beginPath();
        // Line tilts up towards the higher side
        ctx.moveTo(centerX - 150, shoulderY + (higherSide * pixelDiff / 2));
        ctx.lineTo(centerX + 150, shoulderY - (higherSide * pixelDiff / 2));
        ctx.stroke();
      }
    }

    // 3. Pelvic/Hip Asymmetry
    const pelvicData = analysis.pelvic_tilt;
    const hipData = analysis.hip_alignment;
    
    if ((pelvicData && pelvicData.status !== 'Neutral') || (hipData && hipData.status !== 'Neutral')) {
      const pelvicDiff = pelvicData?.height_difference_cm || 0;
      const hipDiff = hipData?.height_difference_cm || 0;
      const diffCm = Math.max(pelvicDiff, hipDiff);
      
      const pelvicDesc = pelvicData?.description.toLowerCase() || '';
      const hipDesc = hipData?.description.toLowerCase() || '';
      const combinedDesc = `${pelvicDesc} ${hipDesc}`;
      
      let higherSide = 0;
      if (combinedDesc.includes('right side is elevated') || combinedDesc.includes('right hip sits higher') || combinedDesc.includes('right shoulder is slightly elevated')) {
        higherSide = isBackView ? -1 : 1;
      } else if (combinedDesc.includes('left side is elevated') || combinedDesc.includes('left hip sits higher') || combinedDesc.includes('left shoulder is slightly elevated')) {
        higherSide = isBackView ? 1 : -1;
      }
      
      if (higherSide !== 0 || diffCm > 0) {
        const pixelDiff = Math.min(Math.max(diffCm * 15, 20), 60);
        ctx.beginPath();
        ctx.moveTo(centerX - 150, hipY + (higherSide * pixelDiff / 2));
        ctx.lineTo(centerX + 150, hipY - (higherSide * pixelDiff / 2));
        ctx.stroke();
      }
    }

    // 4. Spinal Curvature (Scoliosis)
    if (view === 'back' && analysis.spinal_curvature && analysis.spinal_curvature.status !== 'Normal') {
      const curveDeg = analysis.spinal_curvature.curve_degrees || 0;
      const desc = analysis.spinal_curvature.description.toLowerCase();
      
      // Determine bulge direction
      let bulgeSide = curveDeg > 0 ? 1 : -1; 
      if (desc.includes('right-side bulge') || desc.includes('curve to the right')) {
        bulgeSide = -1; // Client Right is Screen Left in Back View
      } else if (desc.includes('left-side bulge') || desc.includes('curve to the left')) {
        bulgeSide = 1; // Client Left is Screen Right in Back View
      }
      
      ctx.beginPath();
      ctx.setLineDash([2, 4]);
      
      // S-curve support: Use cubic bezier for more complex visualization
      const curveHeight = hipY - shoulderY;
      const bulge = Math.min(Math.max(Math.abs(curveDeg) * 4, 40), 150);
      
      // Control points for a more realistic spinal curve
      const cp1x = centerX + (bulgeSide * bulge);
      const cp1y = shoulderY + (curveHeight * 0.3);
      const cp2x = centerX - (bulgeSide * bulge * 0.5); // Slight counter-curve for S-shape
      const cp2y = shoulderY + (curveHeight * 0.7);
      
      ctx.moveTo(centerX, shoulderY);
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, centerX, hipY);
      ctx.stroke();
      ctx.setLineDash([5, 5]);
    }
  } else {
    // ============================================
    // SIDE VIEW DEVIATIONS - Simplified, essential only
    // ============================================
    
    const rawLandmarks = analysis.landmarks?.raw;
    
    // Get MediaPipe landmarks for accurate positioning
    let earX: number | null = null;
    let earY: number | null = null;
    let shoulderLandmarkX: number | null = null;
    let shoulderLandmarkY: number | null = null;
    
    if (rawLandmarks && rawLandmarks.length > 24) {
      // Ear: 7 = Left, 8 = Right
      const earLandmark = view === 'side-left' ? rawLandmarks[7] : rawLandmarks[8];
      if (earLandmark?.x !== undefined && earLandmark?.y !== undefined) {
        earX = earLandmark.x * ctx.canvas.width;
        earY = earLandmark.y * ctx.canvas.height;
      }
      
      // Shoulder: 11 = Left, 12 = Right
      const shoulderLandmark = view === 'side-left' ? rawLandmarks[11] : rawLandmarks[12];
      if (shoulderLandmark?.x !== undefined && shoulderLandmark?.y !== undefined) {
        shoulderLandmarkX = shoulderLandmark.x * ctx.canvas.width;
        shoulderLandmarkY = shoulderLandmark.y * ctx.canvas.height;
      }
    }
    
    // =====================================================
    // SIMPLIFIED - Essential deviations only
    // =====================================================
    
    // Get hip landmarks for pelvic tilt
    let hipLandmarkX: number | null = null;
    let hipLandmarkY: number | null = null;
    if (rawLandmarks && rawLandmarks.length > 24) {
      const hipLandmark = view === 'side-left' ? rawLandmarks[23] : rawLandmarks[24];
      if (hipLandmark?.x !== undefined && hipLandmark?.y !== undefined) {
        hipLandmarkX = hipLandmark.x * ctx.canvas.width;
        hipLandmarkY = hipLandmark.y * ctx.canvas.height;
      }
    }
    
    // -----------------------------------------
    // 1. FORWARD HEAD POSTURE - Straight horizontal line from plumb to ear
    // -----------------------------------------
    const fhpStatus = analysis.forward_head?.status;
    const hasForwardHead = fhpStatus && fhpStatus !== 'Neutral';
    
    if (hasForwardHead) {
      // Use MediaPipe ear position if available, otherwise estimate
      let targetEarX = earX;
      let targetEarY = earY;
      
      if (targetEarX === null || targetEarY === null) {
        // Estimate: forward and above shoulder level
        const estimatedForward = facingDir * 50;
        targetEarX = (shoulderLandmarkX || centerX) + estimatedForward;
        targetEarY = shoulderY - 100;
      }
      
      // Straight horizontal line showing forward displacement
      ctx.beginPath();
      ctx.moveTo(centerX, targetEarY);
      ctx.lineTo(targetEarX, targetEarY);
      ctx.stroke();
    }

    // -----------------------------------------
    // 2. SHOULDER ROUNDING/FORWARD POSITION - Straight horizontal line from plumb to shoulder
    // -----------------------------------------
    const shoulderStatus = analysis.shoulder_alignment?.status;
    const isRoundedShoulders = analysis.shoulder_alignment?.rounded_forward || 
                               shoulderStatus === 'Rounded' || 
                               (analysis.shoulder_alignment?.forward_position_cm || 0) > 0;
    
    if (isRoundedShoulders && shoulderLandmarkX !== null && shoulderLandmarkY !== null) {
      // Straight horizontal line from plumb to actual shoulder position
      ctx.beginPath();
      ctx.moveTo(centerX, shoulderLandmarkY);
      ctx.lineTo(shoulderLandmarkX, shoulderLandmarkY);
      ctx.stroke();
    }

    // -----------------------------------------
    // 3. PELVIC TILT - Straight angled line through hips
    // -----------------------------------------
    const pelvicStatus = analysis.pelvic_tilt?.status;
    if (pelvicStatus && pelvicStatus !== 'Neutral') {
      const statusLower = (pelvicStatus || '').toLowerCase();
      const isAnterior = statusLower.includes('anterior');
      const pelvicY = hipLandmarkY || hipY;
      const lineLength = 120;
      
      // Visual angle for tilt (8-10 degrees)
      const visualAngleDeg = isAnterior ? 10 : 8;
      const rad = (visualAngleDeg * Math.PI) / 180;
      const verticalOffset = Math.tan(rad) * lineLength;
      
      // ANTERIOR TILT: Front of pelvis drops DOWN
      // - Facing LEFT (facingDir=-1): LEFT end should be LOWER (front)
      // - Facing RIGHT (facingDir=1): RIGHT end should be LOWER (front)
      const tiltSign = isAnterior ? 1 : -1;
      
      const leftY = pelvicY - (facingDir * tiltSign * verticalOffset);
      const rightY = pelvicY + (facingDir * tiltSign * verticalOffset);
      
      ctx.beginPath();
      ctx.moveTo(centerX - lineLength, leftY);
      ctx.lineTo(centerX + lineLength, rightY);
      ctx.stroke();
    }
  }
}

/**
 * Adds red deviation lines to an image that has already been aligned with green lines
 */
export async function addDeviationOverlay(
  imageData: string,
  view: 'front' | 'side-right' | 'side-left' | 'back',
  analysis: PostureAnalysisResult
): Promise<string> {
  return addPostureOverlay(imageData, view, {
    mode: 'deviation',
    analysis
  });
}

/**
 * Generates a placeholder image with green reference lines for the companion app
 */
export function generatePlaceholderWithGreenLines(
  view: 'front' | 'side-right' | 'side-left' | 'back',
  width: number = CONFIG.POSTURE_OVERLAY.CANVAS_SIZE.WIDTH,
  height: number = CONFIG.POSTURE_OVERLAY.CANVAS_SIZE.HEIGHT
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) return '';

  ctx.fillStyle = CONFIG.POSTURE_OVERLAY.STYLE.PLACEHOLDER_BG; 
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // DRAW REFERENCE GRID (SYSTEM ONLY)
  // This helps MediaPipe/AI align but is usually covered by the image
  ctx.strokeStyle = '#e2e8f0'; // very light gray
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 2]);
  
  // 10% vertical grid lines
  for (let x = 0; x <= width; x += width * 0.1) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  // 10% horizontal grid lines
  for (let y = 0; y <= height; y += height * 0.1) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.setLineDash([]); // Reset dash

  const centerX = width * (CONFIG.POSTURE_OVERLAY.TARGET_LANDMARKS.CENTER_X_PCT / 100);
  const shoulderY = height * (CONFIG.POSTURE_OVERLAY.TARGET_LANDMARKS.SHOULDER_Y_PCT / 100);
  const hipY = height * (CONFIG.POSTURE_OVERLAY.TARGET_LANDMARKS.HIP_Y_PCT / 100);

  ctx.strokeStyle = CONFIG.POSTURE_OVERLAY.STYLE.LINE_COLOR;
  ctx.lineWidth = CONFIG.POSTURE_OVERLAY.STYLE.LINE_WIDTH;
  ctx.lineCap = 'round';

  // Vertical midline
  ctx.beginPath();
  ctx.moveTo(centerX, 0);
  ctx.lineTo(centerX, height);
  ctx.stroke();

  // Horizontal shoulder line
  ctx.beginPath();
  ctx.moveTo(0, shoulderY);
  ctx.lineTo(width, shoulderY);
  ctx.stroke();

  // Horizontal hip line
  ctx.beginPath();
  ctx.moveTo(0, hipY);
  ctx.lineTo(width, hipY);
  ctx.stroke();

  return canvas.toDataURL('image/jpeg', 0.95);
}

/**
 * MediaPipe Pose Landmark Indices Reference:
 * 0: nose, 1-6: eyes, 7-8: ears, 9-10: mouth
 * 11-12: shoulders (L/R), 13-14: elbows, 15-16: wrists, 17-22: hands
 * 23-24: hips (L/R), 25-26: knees, 27-28: ankles, 29-32: feet
 */

/**
 * VIEW-SPECIFIC LANDMARK CONNECTIONS
 * Only draw landmarks relevant to what we're assessing in each view
 */

// FRONT VIEW: Head tilt, shoulder level, hip level, knee alignment
// Looking for: lateral asymmetry, tilts
const FRONT_VIEW_CONNECTIONS: [number, number][] = [
  // Head - ears for tilt detection
  [7, 8],   // Ear to ear (head tilt line)
  
  // Shoulders
  [11, 12], // Shoulder line
  
  // Torso - vertical alignment
  [11, 23], // Left shoulder to hip
  [12, 24], // Right shoulder to hip
  
  // Hips
  [23, 24], // Hip line
  
  // Legs - knee alignment
  [23, 25], // Left hip to knee
  [24, 26], // Right hip to knee
  [25, 27], // Left knee to ankle
  [26, 28], // Right knee to ankle
];

// Landmarks to draw for front view
const FRONT_VIEW_LANDMARKS = [0, 7, 8, 11, 12, 23, 24, 25, 26, 27, 28];

// BACK VIEW: Head tilt, shoulder level, spinal curves, hip level, knee alignment
// Looking for: scoliosis, lateral asymmetry (NO face landmarks)
const BACK_VIEW_CONNECTIONS: [number, number][] = [
  // Shoulders
  [11, 12], // Shoulder line
  
  // Spine approximation (shoulder midpoint to hip midpoint shown via torso lines)
  [11, 23], // Left side torso
  [12, 24], // Right side torso
  
  // Hips
  [23, 24], // Hip line
  
  // Legs
  [23, 25], // Left hip to knee
  [24, 26], // Right hip to knee
  [25, 27], // Left knee to ankle
  [26, 28], // Right knee to ankle
];

// Landmarks for back view (no face/eyes)
const BACK_VIEW_LANDMARKS = [11, 12, 23, 24, 25, 26, 27, 28];

// SIDE-LEFT VIEW: Ear-shoulder-hip-knee-ankle plumb line, arm position for rounded shoulders
// Looking for: forward head, rounded shoulders, kyphosis, lordosis, pelvic tilt
const SIDE_LEFT_CONNECTIONS: [number, number][] = [
  // Plumb line landmarks (vertical alignment)
  [7, 11],  // Left ear to shoulder
  [11, 23], // Shoulder to hip
  [23, 25], // Hip to knee
  [25, 27], // Knee to ankle
  
  // Arm for rounded shoulder detection
  [11, 13], // Shoulder to elbow
  [13, 15], // Elbow to wrist
];

// Landmarks for side-left view (left side of body)
const SIDE_LEFT_LANDMARKS = [7, 11, 13, 15, 23, 25, 27];

// SIDE-RIGHT VIEW: Mirror of side-left using right-side landmarks
const SIDE_RIGHT_CONNECTIONS: [number, number][] = [
  // Plumb line landmarks (vertical alignment)
  [8, 12],  // Right ear to shoulder
  [12, 24], // Shoulder to hip
  [24, 26], // Hip to knee
  [26, 28], // Knee to ankle
  
  // Arm for rounded shoulder detection
  [12, 14], // Shoulder to elbow
  [14, 16], // Elbow to wrist
];

// Landmarks for side-right view (right side of body)
const SIDE_RIGHT_LANDMARKS = [8, 12, 14, 16, 24, 26, 28];

/**
 * Get view-specific connections and landmarks
 */
function getViewSpecificConfig(view: 'front' | 'back' | 'side-left' | 'side-right'): {
  connections: [number, number][];
  landmarks: number[];
} {
  switch (view) {
    case 'front':
      return { connections: FRONT_VIEW_CONNECTIONS, landmarks: FRONT_VIEW_LANDMARKS };
    case 'back':
      return { connections: BACK_VIEW_CONNECTIONS, landmarks: BACK_VIEW_LANDMARKS };
    case 'side-left':
      return { connections: SIDE_LEFT_CONNECTIONS, landmarks: SIDE_LEFT_LANDMARKS };
    case 'side-right':
      return { connections: SIDE_RIGHT_CONNECTIONS, landmarks: SIDE_RIGHT_LANDMARKS };
    default:
      return { connections: FRONT_VIEW_CONNECTIONS, landmarks: FRONT_VIEW_LANDMARKS };
  }
}

/**
 * Draws view-specific MediaPipe pose landmarks wireframe on an image
 * Only shows landmarks relevant to the posture assessment for that view
 * 
 * @param imageData - Base64 image data
 * @param landmarks - Raw MediaPipe landmarks array (33 points)
 * @param view - Which view we're assessing (determines which landmarks to show)
 * @param options - Drawing options
 * @returns Base64 image with wireframe overlay
 */
export async function drawLandmarkWireframe(
  imageData: string,
  landmarks: Array<{ x: number; y: number; z?: number; visibility?: number }>,
  view: 'front' | 'back' | 'side-left' | 'side-right' = 'front',
  options: {
    pointColor?: string;
    lineColor?: string;
    pointRadius?: number;
    lineWidth?: number;
    showLabels?: boolean;
    opacity?: number;
  } = {}
): Promise<string> {
  const {
    pointColor = '#00ff00',
    lineColor = 'rgba(0, 255, 0, 0.7)',
    pointRadius = 6,
    lineWidth = 3,
    showLabels = false,
    opacity = 0.9,
  } = options;

  // Get view-specific connections and landmarks
  const viewConfig = getViewSpecificConfig(view);

  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        // Draw the original image
        ctx.drawImage(img, 0, 0);
        
        // Set global alpha for wireframe
        ctx.globalAlpha = opacity;
        
        // Draw connections (skeleton lines) - VIEW SPECIFIC
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        for (const [startIdx, endIdx] of viewConfig.connections) {
          const start = landmarks[startIdx];
          const end = landmarks[endIdx];
          
          if (!start || !end) continue;
          
          // Skip if visibility is too low
          const startVis = start.visibility ?? 1;
          const endVis = end.visibility ?? 1;
          if (startVis < 0.3 || endVis < 0.3) continue;
          
          const startX = start.x * canvas.width;
          const startY = start.y * canvas.height;
          const endX = end.x * canvas.width;
          const endY = end.y * canvas.height;
          
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.stroke();
        }
        
        // Draw landmark points - ONLY VIEW-SPECIFIC LANDMARKS
        ctx.fillStyle = pointColor;
        
        for (const index of viewConfig.landmarks) {
          const landmark = landmarks[index];
          if (!landmark) continue;
          
          const visibility = landmark.visibility ?? 1;
          if (visibility < 0.3) continue;
          
          const x = landmark.x * canvas.width;
          const y = landmark.y * canvas.height;
          
          // Draw point with white outline for visibility
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, y, pointRadius, 0, Math.PI * 2);
          ctx.stroke();
          
          ctx.fillStyle = pointColor;
          ctx.beginPath();
          ctx.arc(x, y, pointRadius - 1, 0, Math.PI * 2);
          ctx.fill();
          
          // Optionally draw labels
          if (showLabels) {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px Arial';
            ctx.fillText(String(index), x + pointRadius + 4, y + 4);
          }
        }
        
        // Reset alpha
        ctx.globalAlpha = 1;
        
        resolve(canvas.toDataURL('image/jpeg', 0.95));
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => reject(new Error('Failed to load image for wireframe'));
    img.src = imageData;
  });
}

/**
 * Generates a wireframe-only visualization (no background image)
 * Useful for debugging landmark detection
 */
export function generateWireframeOnly(
  landmarks: Array<{ x: number; y: number; z?: number; visibility?: number }>,
  width: number = 400,
  height: number = 600,
  options: {
    pointColor?: string;
    lineColor?: string;
    backgroundColor?: string;
  } = {}
): string {
  const {
    pointColor = '#00ff00',
    lineColor = 'rgba(0, 255, 0, 0.8)',
    backgroundColor = '#1a1a2e',
  } = options;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return '';
  
  // Dark background
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);
  
  // Draw connections
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  
  for (const [startIdx, endIdx] of POSE_CONNECTIONS) {
    const start = landmarks[startIdx];
    const end = landmarks[endIdx];
    
    if (!start || !end) continue;
    
    const startVis = start.visibility ?? 1;
    const endVis = end.visibility ?? 1;
    if (startVis < 0.3 || endVis < 0.3) continue;
    
    ctx.beginPath();
    ctx.moveTo(start.x * width, start.y * height);
    ctx.lineTo(end.x * width, end.y * height);
    ctx.stroke();
  }
  
  // Draw points
  ctx.fillStyle = pointColor;
  landmarks.forEach((landmark) => {
    if (!landmark || (landmark.visibility ?? 1) < 0.3) return;
    
    ctx.beginPath();
    ctx.arc(landmark.x * width, landmark.y * height, 4, 0, Math.PI * 2);
    ctx.fill();
  });
  
  return canvas.toDataURL('image/png');
}
