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

// Alignment thresholds (in normalized coordinates, roughly pixels/image_size)
const ALIGNMENT_THRESHOLDS = {
  SHOULDER_LEVEL: 0.02,    // ~2% of image height = shoulder level threshold
  HIP_LEVEL: 0.02,         // ~2% of image height = hip level threshold
  HEAD_TILT: 0.015,        // ~1.5% for ear level (head tilt)
  VERTICAL_PLUMB: 0.03,    // ~3% horizontal deviation from vertical plumb line
  KNEE_ALIGNMENT: 0.025,   // ~2.5% for knee valgus/varus
};

// Colors for alignment visualization
const ALIGNMENT_COLORS = {
  GOOD: '#22c55e',         // Green - aligned
  GOOD_LINE: 'rgba(34, 197, 94, 0.9)',
  DEVIATION: '#ef4444',    // Red - deviation
  DEVIATION_LINE: 'rgba(239, 68, 68, 0.9)',
  NEUTRAL: 'rgba(255, 255, 255, 0.6)', // White - skeleton connections
  POINT_GOOD: '#22c55e',
  POINT_DEVIATION: '#ef4444',
  POINT_NEUTRAL: '#ffffff',
};

/**
 * Calculates alignment status for front/back view landmarks
 */
function calculateFrontBackAlignments(
  landmarks: Array<{ x: number; y: number; z?: number; visibility?: number }>,
  canvasWidth: number,
  canvasHeight: number
): {
  shoulders: { aligned: boolean; leftY: number; rightY: number; diff: number };
  hips: { aligned: boolean; leftY: number; rightY: number; diff: number };
  head: { aligned: boolean; leftY: number; rightY: number; diff: number };
  knees: { aligned: boolean; leftX: number; rightX: number; leftAnkleX: number; rightAnkleX: number };
} {
  // Shoulders: landmarks 11 (left) and 12 (right)
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const shoulderLeftY = (leftShoulder?.y ?? 0) * canvasHeight;
  const shoulderRightY = (rightShoulder?.y ?? 0) * canvasHeight;
  const shoulderDiff = Math.abs(leftShoulder?.y - rightShoulder?.y) || 0;
  
  // Hips: landmarks 23 (left) and 24 (right)
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];
  const hipLeftY = (leftHip?.y ?? 0) * canvasHeight;
  const hipRightY = (rightHip?.y ?? 0) * canvasHeight;
  const hipDiff = Math.abs(leftHip?.y - rightHip?.y) || 0;
  
  // Head/Ears: landmarks 7 (left ear) and 8 (right ear)
  const leftEar = landmarks[7];
  const rightEar = landmarks[8];
  const earLeftY = (leftEar?.y ?? 0) * canvasHeight;
  const earRightY = (rightEar?.y ?? 0) * canvasHeight;
  const earDiff = Math.abs(leftEar?.y - rightEar?.y) || 0;
  
  // Knees: landmarks 25 (left) and 26 (right), ankles 27 (left) and 28 (right)
  const leftKnee = landmarks[25];
  const rightKnee = landmarks[26];
  const leftAnkle = landmarks[27];
  const rightAnkle = landmarks[28];
  
  // Check for knee valgus/varus by comparing knee X to ankle X
  const leftKneeX = (leftKnee?.x ?? 0) * canvasWidth;
  const rightKneeX = (rightKnee?.x ?? 0) * canvasWidth;
  const leftAnkleX = (leftAnkle?.x ?? 0) * canvasWidth;
  const rightAnkleX = (rightAnkle?.x ?? 0) * canvasWidth;
  
  // Knees should be roughly above ankles (within threshold)
  const leftKneeDeviation = Math.abs((leftKnee?.x ?? 0) - (leftAnkle?.x ?? 0));
  const rightKneeDeviation = Math.abs((rightKnee?.x ?? 0) - (rightAnkle?.x ?? 0));
  const kneeAligned = leftKneeDeviation < ALIGNMENT_THRESHOLDS.KNEE_ALIGNMENT && 
                       rightKneeDeviation < ALIGNMENT_THRESHOLDS.KNEE_ALIGNMENT;
  
  return {
    shoulders: {
      aligned: shoulderDiff < ALIGNMENT_THRESHOLDS.SHOULDER_LEVEL,
      leftY: shoulderLeftY,
      rightY: shoulderRightY,
      diff: shoulderDiff,
    },
    hips: {
      aligned: hipDiff < ALIGNMENT_THRESHOLDS.HIP_LEVEL,
      leftY: hipLeftY,
      rightY: hipRightY,
      diff: hipDiff,
    },
    head: {
      aligned: earDiff < ALIGNMENT_THRESHOLDS.HEAD_TILT,
      leftY: earLeftY,
      rightY: earRightY,
      diff: earDiff,
    },
    knees: {
      aligned: kneeAligned,
      leftX: leftKneeX,
      rightX: rightKneeX,
      leftAnkleX,
      rightAnkleX,
    },
  };
}

/**
 * Calculates alignment status for side view landmarks (plumb line check)
 */
function calculateSideViewAlignments(
  landmarks: Array<{ x: number; y: number; z?: number; visibility?: number }>,
  view: 'side-left' | 'side-right',
  canvasWidth: number,
  canvasHeight: number
): {
  ear: { x: number; y: number; forwardOfPlumb: boolean };
  shoulder: { x: number; y: number; forwardOfPlumb: boolean };
  hip: { x: number; y: number };
  knee: { x: number; y: number; forwardOfPlumb: boolean };
  ankle: { x: number; y: number };
  plumbX: number; // Ideal vertical line X position (based on ankle)
} {
  // Use appropriate landmarks based on which side we're viewing
  const earIdx = view === 'side-left' ? 7 : 8;
  const shoulderIdx = view === 'side-left' ? 11 : 12;
  const hipIdx = view === 'side-left' ? 23 : 24;
  const kneeIdx = view === 'side-left' ? 25 : 26;
  const ankleIdx = view === 'side-left' ? 27 : 28;
  
  const ear = landmarks[earIdx];
  const shoulder = landmarks[shoulderIdx];
  const hip = landmarks[hipIdx];
  const knee = landmarks[kneeIdx];
  const ankle = landmarks[ankleIdx];
  
  // Plumb line is based on ankle position (where feet contact ground)
  const plumbX = (ankle?.x ?? 0.5) * canvasWidth;
  
  const earX = (ear?.x ?? 0) * canvasWidth;
  const earY = (ear?.y ?? 0) * canvasHeight;
  const shoulderX = (shoulder?.x ?? 0) * canvasWidth;
  const shoulderY = (shoulder?.y ?? 0) * canvasHeight;
  const hipX = (hip?.x ?? 0) * canvasWidth;
  const hipY = (hip?.y ?? 0) * canvasHeight;
  const kneeX = (knee?.x ?? 0) * canvasWidth;
  const kneeY = (knee?.y ?? 0) * canvasHeight;
  const ankleX = (ankle?.x ?? 0) * canvasWidth;
  const ankleY = (ankle?.y ?? 0) * canvasHeight;
  
  // For side view, "forward" depends on which side
  // Side-left: facing left, so forward = smaller X
  // Side-right: facing right, so forward = larger X
  const forwardDir = view === 'side-left' ? -1 : 1;
  const threshold = ALIGNMENT_THRESHOLDS.VERTICAL_PLUMB * canvasWidth;
  
  // Check if each point is forward of the plumb line
  const earDeviation = earX - plumbX;
  const shoulderDeviation = shoulderX - plumbX;
  const kneeDeviation = kneeX - plumbX;
  
  return {
    ear: {
      x: earX,
      y: earY,
      forwardOfPlumb: Math.abs(earDeviation) > threshold && (earDeviation * forwardDir) > 0,
    },
    shoulder: {
      x: shoulderX,
      y: shoulderY,
      forwardOfPlumb: Math.abs(shoulderDeviation) > threshold && (shoulderDeviation * forwardDir) > 0,
    },
    hip: { x: hipX, y: hipY },
    knee: {
      x: kneeX,
      y: kneeY,
      forwardOfPlumb: Math.abs(kneeDeviation) > threshold,
    },
    ankle: { x: ankleX, y: ankleY },
    plumbX,
  };
}

/**
 * Draws view-specific MediaPipe pose landmarks wireframe on an image
 * with GREEN lines for aligned landmarks and RED lines for deviations
 * 
 * @param imageData - Base64 image data
 * @param landmarks - Raw MediaPipe landmarks array (33 points)
 * @param view - Which view we're assessing (determines which landmarks to show)
 * @param options - Drawing options
 * @returns Base64 image with wireframe overlay showing alignment analysis
 */
export async function drawLandmarkWireframe(
  imageData: string,
  landmarks: Array<{ x: number; y: number; z?: number; visibility?: number }>,
  view: 'front' | 'back' | 'side-left' | 'side-right' = 'front',
  options: {
    pointRadius?: number;
    lineWidth?: number;
    showLabels?: boolean;
    opacity?: number;
  } = {}
): Promise<string> {
  const {
    pointRadius = 8,
    lineWidth = 4,
    showLabels = false,
    opacity = 1.0,
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
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        if (view === 'front' || view === 'back') {
          // ========== FRONT/BACK VIEW WITH ALIGNMENT ANALYSIS ==========
          const alignments = calculateFrontBackAlignments(landmarks, canvas.width, canvas.height);
          
          // Get landmark positions
          const getPos = (idx: number) => ({
            x: (landmarks[idx]?.x ?? 0) * canvas.width,
            y: (landmarks[idx]?.y ?? 0) * canvas.height,
            visible: (landmarks[idx]?.visibility ?? 1) > 0.3,
          });
          
          // Draw skeleton connections first (neutral color)
          ctx.strokeStyle = ALIGNMENT_COLORS.NEUTRAL;
          ctx.lineWidth = lineWidth - 1;
          
          // Torso lines (neutral - just for reference)
          const connections = [[11, 23], [12, 24], [23, 25], [24, 26], [25, 27], [26, 28]];
          for (const [startIdx, endIdx] of connections) {
            const start = getPos(startIdx);
            const end = getPos(endIdx);
            if (!start.visible || !end.visible) continue;
            
            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();
          }
          
          // ===== HEAD/EAR LINE (Alignment Check) =====
          if (view === 'front') { // Only show ear line on front view
            const leftEar = getPos(7);
            const rightEar = getPos(8);
            if (leftEar.visible && rightEar.visible) {
              ctx.strokeStyle = alignments.head.aligned ? ALIGNMENT_COLORS.GOOD_LINE : ALIGNMENT_COLORS.DEVIATION_LINE;
              ctx.lineWidth = lineWidth;
              ctx.beginPath();
              ctx.moveTo(leftEar.x, leftEar.y);
              ctx.lineTo(rightEar.x, rightEar.y);
              ctx.stroke();
            }
          }
          
          // ===== SHOULDER LINE (Alignment Check) =====
          const leftShoulder = getPos(11);
          const rightShoulder = getPos(12);
          if (leftShoulder.visible && rightShoulder.visible) {
            ctx.strokeStyle = alignments.shoulders.aligned ? ALIGNMENT_COLORS.GOOD_LINE : ALIGNMENT_COLORS.DEVIATION_LINE;
            ctx.lineWidth = lineWidth;
            ctx.beginPath();
            ctx.moveTo(leftShoulder.x, leftShoulder.y);
            ctx.lineTo(rightShoulder.x, rightShoulder.y);
            ctx.stroke();
          }
          
          // ===== HIP LINE (Alignment Check) =====
          const leftHip = getPos(23);
          const rightHip = getPos(24);
          if (leftHip.visible && rightHip.visible) {
            ctx.strokeStyle = alignments.hips.aligned ? ALIGNMENT_COLORS.GOOD_LINE : ALIGNMENT_COLORS.DEVIATION_LINE;
            ctx.lineWidth = lineWidth;
            ctx.beginPath();
            ctx.moveTo(leftHip.x, leftHip.y);
            ctx.lineTo(rightHip.x, rightHip.y);
            ctx.stroke();
          }
          
          // ===== KNEE ALIGNMENT (Check for valgus/varus) =====
          const leftKnee = getPos(25);
          const rightKnee = getPos(26);
          const leftAnkle = getPos(27);
          const rightAnkle = getPos(28);
          
          // Draw knee-to-ankle lines with alignment color
          if (leftKnee.visible && leftAnkle.visible) {
            const leftAligned = Math.abs(landmarks[25]?.x - landmarks[27]?.x) < ALIGNMENT_THRESHOLDS.KNEE_ALIGNMENT;
            ctx.strokeStyle = leftAligned ? ALIGNMENT_COLORS.GOOD_LINE : ALIGNMENT_COLORS.DEVIATION_LINE;
            ctx.lineWidth = lineWidth;
            ctx.beginPath();
            ctx.moveTo(leftKnee.x, leftKnee.y);
            ctx.lineTo(leftAnkle.x, leftAnkle.y);
            ctx.stroke();
          }
          
          if (rightKnee.visible && rightAnkle.visible) {
            const rightAligned = Math.abs(landmarks[26]?.x - landmarks[28]?.x) < ALIGNMENT_THRESHOLDS.KNEE_ALIGNMENT;
            ctx.strokeStyle = rightAligned ? ALIGNMENT_COLORS.GOOD_LINE : ALIGNMENT_COLORS.DEVIATION_LINE;
            ctx.lineWidth = lineWidth;
            ctx.beginPath();
            ctx.moveTo(rightKnee.x, rightKnee.y);
            ctx.lineTo(rightAnkle.x, rightAnkle.y);
            ctx.stroke();
          }
          
          // Draw landmark points with appropriate colors
          const pointsToCheck = [
            { idx: 0, check: null }, // Nose - neutral
            { idx: 7, check: view === 'front' ? alignments.head.aligned : null }, // Left ear
            { idx: 8, check: view === 'front' ? alignments.head.aligned : null }, // Right ear
            { idx: 11, check: alignments.shoulders.aligned }, // Left shoulder
            { idx: 12, check: alignments.shoulders.aligned }, // Right shoulder
            { idx: 23, check: alignments.hips.aligned }, // Left hip
            { idx: 24, check: alignments.hips.aligned }, // Right hip
            { idx: 25, check: alignments.knees.aligned }, // Left knee
            { idx: 26, check: alignments.knees.aligned }, // Right knee
            { idx: 27, check: null }, // Left ankle - neutral
            { idx: 28, check: null }, // Right ankle - neutral
          ];
          
          for (const { idx, check } of pointsToCheck) {
            const pos = getPos(idx);
            if (!pos.visible) continue;
            if (!viewConfig.landmarks.includes(idx)) continue;
            
            // Determine point color
            let fillColor = ALIGNMENT_COLORS.POINT_NEUTRAL;
            if (check === true) fillColor = ALIGNMENT_COLORS.POINT_GOOD;
            else if (check === false) fillColor = ALIGNMENT_COLORS.POINT_DEVIATION;
            
            // Draw point with outline
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, pointRadius, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.fillStyle = fillColor;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, pointRadius - 1, 0, Math.PI * 2);
            ctx.fill();
          }
          
        } else {
          // ========== SIDE VIEW WITH PLUMB LINE ANALYSIS ==========
          const alignments = calculateSideViewAlignments(landmarks, view, canvas.width, canvas.height);
          
          // Draw vertical plumb line (reference line from ankle up)
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.lineWidth = 2;
          ctx.setLineDash([10, 10]);
          ctx.beginPath();
          ctx.moveTo(alignments.plumbX, 0);
          ctx.lineTo(alignments.plumbX, canvas.height);
          ctx.stroke();
          ctx.setLineDash([]);
          
          // Draw the postural chain: Ear → Shoulder → Hip → Knee → Ankle
          // Each segment colored based on alignment
          ctx.lineWidth = lineWidth;
          
          // Ear to Shoulder
          const earAligned = !alignments.ear.forwardOfPlumb;
          ctx.strokeStyle = earAligned ? ALIGNMENT_COLORS.GOOD_LINE : ALIGNMENT_COLORS.DEVIATION_LINE;
          ctx.beginPath();
          ctx.moveTo(alignments.ear.x, alignments.ear.y);
          ctx.lineTo(alignments.shoulder.x, alignments.shoulder.y);
          ctx.stroke();
          
          // If ear is forward, draw horizontal deviation line to plumb
          if (!earAligned) {
            ctx.strokeStyle = ALIGNMENT_COLORS.DEVIATION_LINE;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(alignments.ear.x, alignments.ear.y);
            ctx.lineTo(alignments.plumbX, alignments.ear.y);
            ctx.stroke();
            ctx.setLineDash([]);
          }
          
          // Shoulder to Hip
          const shoulderAligned = !alignments.shoulder.forwardOfPlumb;
          ctx.strokeStyle = shoulderAligned ? ALIGNMENT_COLORS.GOOD_LINE : ALIGNMENT_COLORS.DEVIATION_LINE;
          ctx.beginPath();
          ctx.moveTo(alignments.shoulder.x, alignments.shoulder.y);
          ctx.lineTo(alignments.hip.x, alignments.hip.y);
          ctx.stroke();
          
          // If shoulder is forward, draw horizontal deviation line to plumb
          if (!shoulderAligned) {
            ctx.strokeStyle = ALIGNMENT_COLORS.DEVIATION_LINE;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(alignments.shoulder.x, alignments.shoulder.y);
            ctx.lineTo(alignments.plumbX, alignments.shoulder.y);
            ctx.stroke();
            ctx.setLineDash([]);
          }
          
          // Hip to Knee (usually aligned - reference)
          ctx.strokeStyle = ALIGNMENT_COLORS.GOOD_LINE;
          ctx.beginPath();
          ctx.moveTo(alignments.hip.x, alignments.hip.y);
          ctx.lineTo(alignments.knee.x, alignments.knee.y);
          ctx.stroke();
          
          // Knee to Ankle
          const kneeAligned = !alignments.knee.forwardOfPlumb;
          ctx.strokeStyle = kneeAligned ? ALIGNMENT_COLORS.GOOD_LINE : ALIGNMENT_COLORS.DEVIATION_LINE;
          ctx.beginPath();
          ctx.moveTo(alignments.knee.x, alignments.knee.y);
          ctx.lineTo(alignments.ankle.x, alignments.ankle.y);
          ctx.stroke();
          
          // Draw arm for rounded shoulder detection
          const elbowIdx = view === 'side-left' ? 13 : 14;
          const wristIdx = view === 'side-left' ? 15 : 16;
          const shoulderIdx = view === 'side-left' ? 11 : 12;
          
          const elbow = landmarks[elbowIdx];
          const wrist = landmarks[wristIdx];
          const shoulder = landmarks[shoulderIdx];
          
          if (elbow && wrist && shoulder && (elbow.visibility ?? 1) > 0.3) {
            ctx.strokeStyle = ALIGNMENT_COLORS.NEUTRAL;
            ctx.lineWidth = lineWidth - 1;
            
            // Shoulder to elbow
            ctx.beginPath();
            ctx.moveTo((shoulder.x) * canvas.width, (shoulder.y) * canvas.height);
            ctx.lineTo((elbow.x) * canvas.width, (elbow.y) * canvas.height);
            ctx.stroke();
            
            // Elbow to wrist
            if ((wrist.visibility ?? 1) > 0.3) {
              ctx.beginPath();
              ctx.moveTo((elbow.x) * canvas.width, (elbow.y) * canvas.height);
              ctx.lineTo((wrist.x) * canvas.width, (wrist.y) * canvas.height);
              ctx.stroke();
            }
          }
          
          // Draw landmark points
          const sidePoints = [
            { x: alignments.ear.x, y: alignments.ear.y, aligned: earAligned },
            { x: alignments.shoulder.x, y: alignments.shoulder.y, aligned: shoulderAligned },
            { x: alignments.hip.x, y: alignments.hip.y, aligned: true }, // Hip is reference
            { x: alignments.knee.x, y: alignments.knee.y, aligned: kneeAligned },
            { x: alignments.ankle.x, y: alignments.ankle.y, aligned: true }, // Ankle is reference
          ];
          
          for (const point of sidePoints) {
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(point.x, point.y, pointRadius, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.fillStyle = point.aligned ? ALIGNMENT_COLORS.POINT_GOOD : ALIGNMENT_COLORS.POINT_DEVIATION;
            ctx.beginPath();
            ctx.arc(point.x, point.y, pointRadius - 1, 0, Math.PI * 2);
            ctx.fill();
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

// Full pose connections for debug wireframe
const DEBUG_POSE_CONNECTIONS: [number, number][] = [
  [11, 12], [11, 23], [12, 24], [23, 24],
  [11, 13], [13, 15], [12, 14], [14, 16],
  [23, 25], [25, 27], [24, 26], [26, 28],
];

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
  
  for (const [startIdx, endIdx] of DEBUG_POSE_CONNECTIONS) {
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
