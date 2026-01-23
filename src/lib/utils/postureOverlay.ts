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
 * Generates a clean placeholder image for the companion app
 * Simple gradient background with view label - no figure/silhouette
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

  // Subtle gradient background
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#f8fafc'); // slate-50
  gradient.addColorStop(1, '#e2e8f0'); // slate-200
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const centerX = width / 2;

  // Subtle crosshairs to indicate where to stand
  ctx.strokeStyle = '#cbd5e1'; // slate-300
  ctx.lineWidth = 1;
  ctx.setLineDash([8, 8]);
  
  // Vertical center line (lower third)
  ctx.beginPath();
  ctx.moveTo(centerX, height * 0.6);
  ctx.lineTo(centerX, height * 0.85);
  ctx.stroke();
  
  // Horizontal line for feet position
  ctx.beginPath();
  ctx.moveTo(width * 0.3, height * 0.85);
  ctx.lineTo(width * 0.7, height * 0.85);
  ctx.stroke();
  
  ctx.setLineDash([]); // Reset line dash

  // View label
  ctx.fillStyle = '#64748b'; // slate-500
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(view.toUpperCase().replace('-', ' '), centerX, height - 30);
  
  // Instruction text
  ctx.fillStyle = '#94a3b8'; // slate-400
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText('Upload or capture image', centerX, height - 12);

  return canvas.toDataURL('image/jpeg', 0.95);
}

/**
 * Crop and center an image based on detected landmarks
 * ONLY does alignment - no reference lines drawn
 */
export async function cropAndCenterImage(
  imageData: string,
  view: 'front' | 'side-right' | 'side-left' | 'back',
  landmarks: { 
    shoulder_y_percent?: number; 
    hip_y_percent?: number; 
    center_x_percent?: number; 
    midfoot_x_percent?: number 
  }
): Promise<string> {
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
        
        // Target positions on canvas
        const targetCenterX = width * (CONFIG.POSTURE_OVERLAY.TARGET_LANDMARKS.CENTER_X_PCT / 100);
        const targetShoulderY = height * (CONFIG.POSTURE_OVERLAY.TARGET_LANDMARKS.SHOULDER_Y_PCT / 100);
        const targetHipY = height * (CONFIG.POSTURE_OVERLAY.TARGET_LANDMARKS.HIP_Y_PCT / 100);
        
        // Get source landmark positions
        let sourceLandmarkX: number;
        let sourceShoulderY: number;
        let sourceHipY: number;
        
        // X position based on view
        if (view === 'side-right' || view === 'side-left') {
          sourceLandmarkX = landmarks.midfoot_x_percent !== undefined
            ? (landmarks.midfoot_x_percent / 100) * img.width
            : img.width / 2;
        } else {
          sourceLandmarkX = landmarks.center_x_percent !== undefined
            ? (landmarks.center_x_percent / 100) * img.width
            : img.width / 2;
        }
        
        // Y positions
        sourceShoulderY = landmarks.shoulder_y_percent !== undefined
          ? (landmarks.shoulder_y_percent / 100) * img.height
          : img.height * 0.25;
        
        sourceHipY = landmarks.hip_y_percent !== undefined
          ? (landmarks.hip_y_percent / 100) * img.height
          : img.height * 0.5;
        
        // Calculate scale based on torso height
        const sourceTorsoHeight = Math.abs(sourceHipY - sourceShoulderY);
        const targetTorsoHeight = Math.abs(targetHipY - targetShoulderY);
        
        let scale = sourceTorsoHeight > 0 ? targetTorsoHeight / sourceTorsoHeight : 1.0;
        scale = Math.max(0.3, Math.min(3.0, scale)); // Clamp scale
        
        // Calculate translation
        const scaledLandmarkX = sourceLandmarkX * scale;
        const scaledShoulderY = sourceShoulderY * scale;
        const scaledHipY = sourceHipY * scale;
        
        const translateX = targetCenterX - scaledLandmarkX;
        const scaledBodyCenterY = (scaledShoulderY + scaledHipY) / 2;
        const targetBodyCenterY = (targetShoulderY + targetHipY) / 2;
        const translateY = targetBodyCenterY - scaledBodyCenterY;
        
        // Draw cropped/centered image (no lines)
        ctx.fillStyle = '#f1f5f9'; // Light background for any gaps
        ctx.fillRect(0, 0, width, height);
        
        ctx.save();
        ctx.translate(translateX, translateY);
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);
        ctx.restore();
        
        resolve(canvas.toDataURL('image/jpeg', 0.92));
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageData;
  });
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

// =============================================================================
// POSTURE ASSESSMENT THRESHOLDS (Clinical Standards)
// =============================================================================

/**
 * Clinical thresholds for posture assessment
 * These are based on normalized coordinates (0-1) where applicable
 * and clinical standards for postural deviations
 */
export const POSTURE_THRESHOLDS = {
  // Front/Back View - Level checks (as fraction of image height)
  SHOULDER_LEVEL: {
    GOOD: 0.015,      // <1.5% = good (level)
    MILD: 0.03,       // 1.5-3% = mild asymmetry
    MODERATE: 0.05,   // 3-5% = moderate
    SEVERE: 0.08,     // >5% = severe
  },
  HIP_LEVEL: {
    GOOD: 0.015,
    MILD: 0.03,
    MODERATE: 0.05,
    SEVERE: 0.08,
  },
  HEAD_TILT: {
    GOOD: 0.012,      // <1.2% = good (level)
    MILD: 0.025,      // 1.2-2.5% = mild tilt
    MODERATE: 0.04,   // 2.5-4% = moderate
    SEVERE: 0.06,     // >4% = severe
  },
  
  // Front/Back View - Hip Shift (lateral displacement as fraction of body width)
  HIP_SHIFT: {
    GOOD: 0.02,       // <2% of shoulder width = centered
    MILD: 0.05,       // 2-5% = mild shift
    MODERATE: 0.08,   // 5-8% = moderate
    SEVERE: 0.12,     // >8% = severe
  },
  
  // Front/Back View - Lateral Head Tilt (nose/chin off midline)
  LATERAL_HEAD: {
    GOOD: 0.02,       // <2% = centered
    MILD: 0.04,       // 2-4% = mild
    MODERATE: 0.06,   // 4-6% = moderate
    SEVERE: 0.10,     // >6% = severe
  },
  
  // Front/Back View - Leg alignment (knee deviation from hip-ankle line)
  LEG_ALIGNMENT: {
    GOOD: 0.02,       // <2% = straight alignment
    MILD: 0.04,       // 2-4% = mild valgus/varus
    MODERATE: 0.06,   // 4-6% = moderate
    SEVERE: 0.10,     // >6% = severe
  },
  
  // Back View - Scoliosis (spine midpoint deviation from shoulder-hip midline)
  SCOLIOSIS: {
    GOOD: 0.015,      // <1.5% = normal
    MILD: 0.03,       // 1.5-3% = mild curvature
    MODERATE: 0.05,   // 3-5% = moderate
    SEVERE: 0.08,     // >5% = severe
  },
  
  // Side View - Plumb line deviations (as fraction of image width)
  PLUMB_LINE: {
    GOOD: 0.025,      // <2.5% = on plumb
    MILD: 0.05,       // 2.5-5% = mild forward
    MODERATE: 0.08,   // 5-8% = moderate
    SEVERE: 0.12,     // >8% = severe
  },
  
  // Side View - Kyphosis (upper back rounding)
  KYPHOSIS: {
    NORMAL_MAX: 40,   // degrees - normal thoracic kyphosis up to 40°
    MILD: 50,         // 40-50° = mild
    MODERATE: 60,     // 50-60° = moderate
    SEVERE: 70,       // >60° = severe
  },
  
  // Side View - Lordosis (lower back curve)
  LORDOSIS: {
    NORMAL_MIN: 30,   // degrees - normal lumbar lordosis 30-50°
    NORMAL_MAX: 50,
    HYPER_MILD: 60,   // 50-60° = mild hyperlordosis
    HYPER_MOD: 70,    // 60-70° = moderate
    HYPER_SEV: 80,    // >70° = severe
    HYPO_MILD: 20,    // 20-30° = mild hypolordosis (flat back)
    HYPO_MOD: 10,     // 10-20° = moderate
  },
  
  // Side View - Pelvic Tilt
  PELVIC_TILT: {
    NEUTRAL_MIN: 5,   // degrees - normal anterior tilt 5-15°
    NEUTRAL_MAX: 15,
    ANT_MILD: 20,     // 15-20° = mild anterior
    ANT_MOD: 25,      // 20-25° = moderate
    ANT_SEV: 30,      // >25° = severe
    POST_THRESHOLD: 5, // <5° = posterior tilt
  },
  
  // Side View - Head Up/Down (ear vs eye vertical relationship)
  HEAD_UPDOWN: {
    NEUTRAL: 0.02,    // Ear within 2% of eye level = neutral
    UP: 0.04,         // Ear >2% above eye = looking up
    DOWN: 0.04,       // Ear >2% below eye = looking down
  },
};

// Colors for alignment visualization
const ALIGNMENT_COLORS = {
  // Control lines (ideal position) - dashed green
  CONTROL: 'rgba(34, 197, 94, 0.6)',
  CONTROL_DASHED: [8, 8] as number[],
  
  // Good alignment - solid green
  GOOD: '#22c55e',
  GOOD_LINE: 'rgba(34, 197, 94, 0.9)',
  
  // Deviation - solid red
  DEVIATION: '#ef4444',
  DEVIATION_LINE: 'rgba(239, 68, 68, 0.9)',
  
  // Mild deviation - orange
  MILD_DEVIATION: '#f97316',
  MILD_LINE: 'rgba(249, 115, 22, 0.9)',
  
  // Neutral/skeleton - white
  NEUTRAL: 'rgba(255, 255, 255, 0.6)',
  
  // Point colors
  POINT_GOOD: '#22c55e',
  POINT_DEVIATION: '#ef4444',
  POINT_MILD: '#f97316',
  POINT_NEUTRAL: '#ffffff',
  
  // Midline - cyan
  MIDLINE: 'rgba(6, 182, 212, 0.7)',
};

/**
 * Severity levels for posture deviations
 */
type SeverityLevel = 'good' | 'mild' | 'moderate' | 'severe';

/**
 * Get severity level based on value and thresholds
 */
function getSeverity(value: number, thresholds: { GOOD: number; MILD: number; MODERATE: number; SEVERE: number }): SeverityLevel {
  if (value < thresholds.GOOD) return 'good';
  if (value < thresholds.MILD) return 'mild';
  if (value < thresholds.MODERATE) return 'moderate';
  return 'severe';
}

/**
 * Get color based on severity level
 */
function getSeverityColor(severity: SeverityLevel): string {
  switch (severity) {
    case 'good': return ALIGNMENT_COLORS.GOOD_LINE;
    case 'mild': return ALIGNMENT_COLORS.MILD_LINE;
    case 'moderate':
    case 'severe': return ALIGNMENT_COLORS.DEVIATION_LINE;
  }
}

/**
 * Get point color based on severity level
 */
function getSeverityPointColor(severity: SeverityLevel): string {
  switch (severity) {
    case 'good': return ALIGNMENT_COLORS.POINT_GOOD;
    case 'mild': return ALIGNMENT_COLORS.POINT_MILD;
    case 'moderate':
    case 'severe': return ALIGNMENT_COLORS.POINT_DEVIATION;
  }
}

/**
 * Calculate line from hip to ankle and measure knee deviation
 * Returns the deviation of knee from the hip-ankle line (for valgus/varus detection)
 */
function calculateKneeDeviation(
  hipX: number, hipY: number,
  kneeX: number, kneeY: number,
  ankleX: number, ankleY: number
): { deviation: number; direction: 'valgus' | 'varus' | 'neutral' } {
  // Calculate the expected X position of the knee if it were on the hip-ankle line
  // Using linear interpolation: kneeExpectedX = hipX + (ankleX - hipX) * ((kneeY - hipY) / (ankleY - hipY))
  const t = (kneeY - hipY) / (ankleY - hipY);
  const expectedKneeX = hipX + (ankleX - hipX) * t;
  
  // Deviation is the horizontal distance from expected position
  const deviation = kneeX - expectedKneeX;
  
  // Normalize by body width (approximate as hip-to-hip distance or use canvas)
  const direction = Math.abs(deviation) < 0.01 ? 'neutral' : (deviation < 0 ? 'valgus' : 'varus');
  
  return { deviation, direction };
}

/**
 * Extended alignment data for front/back views
 */
interface FrontBackAlignments {
  // Shoulder level
  shoulders: {
    severity: SeverityLevel;
    leftY: number;
    rightY: number;
    diff: number;
    higherSide: 'left' | 'right' | 'level';
  };
  // Hip level
  hips: {
    severity: SeverityLevel;
    leftY: number;
    rightY: number;
    diff: number;
    higherSide: 'left' | 'right' | 'level';
  };
  // Head tilt (ear level)
  headTilt: {
    severity: SeverityLevel;
    leftY: number;
    rightY: number;
    diff: number;
    tiltDirection: 'left' | 'right' | 'level';
  };
  // Hip shift (lateral displacement)
  hipShift: {
    severity: SeverityLevel;
    midpointX: number;
    bodyMidlineX: number;
    shiftAmount: number;
    shiftDirection: 'left' | 'right' | 'centered';
  };
  // Lateral head position (nose off midline)
  lateralHead: {
    severity: SeverityLevel;
    noseX: number;
    midlineX: number;
    offset: number;
    direction: 'left' | 'right' | 'centered';
  };
  // Left leg alignment (hip-knee-ankle)
  leftLeg: {
    severity: SeverityLevel;
    hipPos: { x: number; y: number };
    kneePos: { x: number; y: number };
    anklePos: { x: number; y: number };
    kneeDeviation: number;
    direction: 'valgus' | 'varus' | 'neutral';
  };
  // Right leg alignment
  rightLeg: {
    severity: SeverityLevel;
    hipPos: { x: number; y: number };
    kneePos: { x: number; y: number };
    anklePos: { x: number; y: number };
    kneeDeviation: number;
    direction: 'valgus' | 'varus' | 'neutral';
  };
  // Scoliosis (back view only) - spine deviation from shoulder-hip midline
  scoliosis?: {
    severity: SeverityLevel;
    shoulderMidX: number;
    hipMidX: number;
    spineMidX: number;
    deviation: number;
    direction: 'left' | 'right' | 'straight';
  };
  // Body midline X position
  bodyMidlineX: number;
}

/**
 * Calculates comprehensive alignment status for front/back view landmarks
 */
function calculateFrontBackAlignments(
  landmarks: Array<{ x: number; y: number; z?: number; visibility?: number }>,
  canvasWidth: number,
  canvasHeight: number,
  isBackView: boolean = false
): FrontBackAlignments {
  // Landmark positions (normalized 0-1)
  const nose = landmarks[0];
  const leftEar = landmarks[7];
  const rightEar = landmarks[8];
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];
  const leftKnee = landmarks[25];
  const rightKnee = landmarks[26];
  const leftAnkle = landmarks[27];
  const rightAnkle = landmarks[28];
  
  // Calculate body midline (average of shoulders and hips X positions)
  const shoulderMidX = ((leftShoulder?.x ?? 0.5) + (rightShoulder?.x ?? 0.5)) / 2;
  const hipMidX = ((leftHip?.x ?? 0.5) + (rightHip?.x ?? 0.5)) / 2;
  const bodyMidlineX = (shoulderMidX + hipMidX) / 2;
  
  // ===== SHOULDER LEVEL =====
  const shoulderDiff = Math.abs((leftShoulder?.y ?? 0) - (rightShoulder?.y ?? 0));
  const shoulderSeverity = getSeverity(shoulderDiff, POSTURE_THRESHOLDS.SHOULDER_LEVEL);
  const shoulderHigherSide = shoulderDiff < POSTURE_THRESHOLDS.SHOULDER_LEVEL.GOOD ? 'level' :
    ((leftShoulder?.y ?? 0) < (rightShoulder?.y ?? 0) ? 'left' : 'right');
  
  // ===== HIP LEVEL =====
  const hipDiff = Math.abs((leftHip?.y ?? 0) - (rightHip?.y ?? 0));
  const hipSeverity = getSeverity(hipDiff, POSTURE_THRESHOLDS.HIP_LEVEL);
  const hipHigherSide = hipDiff < POSTURE_THRESHOLDS.HIP_LEVEL.GOOD ? 'level' :
    ((leftHip?.y ?? 0) < (rightHip?.y ?? 0) ? 'left' : 'right');
  
  // ===== HEAD TILT (ear level) =====
  const earDiff = Math.abs((leftEar?.y ?? 0) - (rightEar?.y ?? 0));
  const headTiltSeverity = getSeverity(earDiff, POSTURE_THRESHOLDS.HEAD_TILT);
  const tiltDirection = earDiff < POSTURE_THRESHOLDS.HEAD_TILT.GOOD ? 'level' :
    ((leftEar?.y ?? 0) < (rightEar?.y ?? 0) ? 'right' : 'left'); // Lower ear = tilt toward that side
  
  // ===== HIP SHIFT =====
  const hipShiftAmount = Math.abs(hipMidX - bodyMidlineX);
  const hipShiftSeverity = getSeverity(hipShiftAmount, POSTURE_THRESHOLDS.HIP_SHIFT);
  const hipShiftDirection = hipShiftAmount < POSTURE_THRESHOLDS.HIP_SHIFT.GOOD ? 'centered' :
    (hipMidX < bodyMidlineX ? 'left' : 'right');
  
  // ===== LATERAL HEAD (nose off midline) =====
  const noseOffset = Math.abs((nose?.x ?? bodyMidlineX) - bodyMidlineX);
  const lateralHeadSeverity = getSeverity(noseOffset, POSTURE_THRESHOLDS.LATERAL_HEAD);
  const lateralHeadDirection = noseOffset < POSTURE_THRESHOLDS.LATERAL_HEAD.GOOD ? 'centered' :
    ((nose?.x ?? bodyMidlineX) < bodyMidlineX ? 'left' : 'right');
  
  // ===== LEFT LEG ALIGNMENT =====
  const leftKneeDevResult = calculateKneeDeviation(
    (leftHip?.x ?? 0), (leftHip?.y ?? 0),
    (leftKnee?.x ?? 0), (leftKnee?.y ?? 0),
    (leftAnkle?.x ?? 0), (leftAnkle?.y ?? 0)
  );
  const leftLegSeverity = getSeverity(Math.abs(leftKneeDevResult.deviation), POSTURE_THRESHOLDS.LEG_ALIGNMENT);
  
  // ===== RIGHT LEG ALIGNMENT =====
  const rightKneeDevResult = calculateKneeDeviation(
    (rightHip?.x ?? 0), (rightHip?.y ?? 0),
    (rightKnee?.x ?? 0), (rightKnee?.y ?? 0),
    (rightAnkle?.x ?? 0), (rightAnkle?.y ?? 0)
  );
  const rightLegSeverity = getSeverity(Math.abs(rightKneeDevResult.deviation), POSTURE_THRESHOLDS.LEG_ALIGNMENT);
  
  // ===== SCOLIOSIS (back view only) =====
  let scoliosis: FrontBackAlignments['scoliosis'];
  if (isBackView) {
    // Estimate spine midpoint as average of shoulder and hip midpoints
    // A more accurate method would use actual spine landmarks if available
    const spineMidX = (shoulderMidX + hipMidX) / 2;
    // Check deviation of mid-torso from the shoulder-hip line
    // For scoliosis, we look at whether landmarks 11-12 midpoint differs from 23-24 midpoint
    const scoliosisDeviation = Math.abs(shoulderMidX - hipMidX);
    const scoliosisSeverity = getSeverity(scoliosisDeviation, POSTURE_THRESHOLDS.SCOLIOSIS);
    const scoliosisDirection = scoliosisDeviation < POSTURE_THRESHOLDS.SCOLIOSIS.GOOD ? 'straight' :
      (shoulderMidX < hipMidX ? 'right' : 'left'); // Curve bulges opposite to shoulder shift
    
    scoliosis = {
      severity: scoliosisSeverity,
      shoulderMidX: shoulderMidX * canvasWidth,
      hipMidX: hipMidX * canvasWidth,
      spineMidX: spineMidX * canvasWidth,
      deviation: scoliosisDeviation,
      direction: scoliosisDirection,
    };
  }
  
  return {
    shoulders: {
      severity: shoulderSeverity,
      leftY: (leftShoulder?.y ?? 0) * canvasHeight,
      rightY: (rightShoulder?.y ?? 0) * canvasHeight,
      diff: shoulderDiff,
      higherSide: shoulderHigherSide,
    },
    hips: {
      severity: hipSeverity,
      leftY: (leftHip?.y ?? 0) * canvasHeight,
      rightY: (rightHip?.y ?? 0) * canvasHeight,
      diff: hipDiff,
      higherSide: hipHigherSide,
    },
    headTilt: {
      severity: headTiltSeverity,
      leftY: (leftEar?.y ?? 0) * canvasHeight,
      rightY: (rightEar?.y ?? 0) * canvasHeight,
      diff: earDiff,
      tiltDirection,
    },
    hipShift: {
      severity: hipShiftSeverity,
      midpointX: hipMidX * canvasWidth,
      bodyMidlineX: bodyMidlineX * canvasWidth,
      shiftAmount: hipShiftAmount,
      shiftDirection: hipShiftDirection,
    },
    lateralHead: {
      severity: lateralHeadSeverity,
      noseX: (nose?.x ?? bodyMidlineX) * canvasWidth,
      midlineX: bodyMidlineX * canvasWidth,
      offset: noseOffset,
      direction: lateralHeadDirection,
    },
    leftLeg: {
      severity: leftLegSeverity,
      hipPos: { x: (leftHip?.x ?? 0) * canvasWidth, y: (leftHip?.y ?? 0) * canvasHeight },
      kneePos: { x: (leftKnee?.x ?? 0) * canvasWidth, y: (leftKnee?.y ?? 0) * canvasHeight },
      anklePos: { x: (leftAnkle?.x ?? 0) * canvasWidth, y: (leftAnkle?.y ?? 0) * canvasHeight },
      kneeDeviation: leftKneeDevResult.deviation,
      direction: leftKneeDevResult.direction,
    },
    rightLeg: {
      severity: rightLegSeverity,
      hipPos: { x: (rightHip?.x ?? 0) * canvasWidth, y: (rightHip?.y ?? 0) * canvasHeight },
      kneePos: { x: (rightKnee?.x ?? 0) * canvasWidth, y: (rightKnee?.y ?? 0) * canvasHeight },
      anklePos: { x: (rightAnkle?.x ?? 0) * canvasWidth, y: (rightAnkle?.y ?? 0) * canvasHeight },
      kneeDeviation: rightKneeDevResult.deviation,
      direction: rightKneeDevResult.direction,
    },
    scoliosis,
    bodyMidlineX: bodyMidlineX * canvasWidth,
  };
}

/**
 * Extended side view alignments
 */
interface SideViewAlignments {
  // Plumb line reference (from ankle)
  plumbX: number;
  
  // Ear position (forward head posture)
  ear: {
    x: number;
    y: number;
    severity: SeverityLevel;
    forwardAmount: number;
    isForward: boolean;
  };
  
  // Eye position (for head up/down check)
  eye: {
    x: number;
    y: number;
  };
  
  // Head up/down tilt
  headUpDown: {
    status: 'neutral' | 'up' | 'down';
    severity: SeverityLevel;
    earEyeDiff: number;
  };
  
  // Shoulder position (rounded shoulders)
  shoulder: {
    x: number;
    y: number;
    severity: SeverityLevel;
    forwardAmount: number;
    isForward: boolean;
  };
  
  // Hip position (relative to plumb)
  hip: {
    x: number;
    y: number;
    severity: SeverityLevel;
    forwardAmount: number;
    isForward: boolean;
  };
  
  // Knee position (hyperextension check)
  knee: {
    x: number;
    y: number;
    status: 'neutral' | 'hyperextended' | 'flexed';
    deviation: number;
  };
  
  // Ankle (base of plumb)
  ankle: {
    x: number;
    y: number;
  };
  
  // Kyphosis (upper back curve) - estimated from shoulder-spine angle
  kyphosis: {
    severity: SeverityLevel;
    curveIndicator: number; // Higher = more curve
  };
  
  // Lordosis (lower back curve) - estimated from hip-spine angle
  lordosis: {
    severity: SeverityLevel;
    curveIndicator: number;
    type: 'normal' | 'hyper' | 'hypo';
  };
  
  // Pelvic tilt
  pelvicTilt: {
    severity: SeverityLevel;
    type: 'neutral' | 'anterior' | 'posterior';
    tiltIndicator: number;
  };
}

/**
 * Calculates comprehensive alignment status for side view landmarks
 */
function calculateSideViewAlignments(
  landmarks: Array<{ x: number; y: number; z?: number; visibility?: number }>,
  view: 'side-left' | 'side-right',
  canvasWidth: number,
  canvasHeight: number
): SideViewAlignments {
  // Use appropriate landmarks based on which side we're viewing
  const eyeIdx = view === 'side-left' ? 2 : 5; // Left eye outer / Right eye outer
  const earIdx = view === 'side-left' ? 7 : 8;
  const shoulderIdx = view === 'side-left' ? 11 : 12;
  const hipIdx = view === 'side-left' ? 23 : 24;
  const kneeIdx = view === 'side-left' ? 25 : 26;
  const ankleIdx = view === 'side-left' ? 27 : 28;
  
  const eye = landmarks[eyeIdx];
  const ear = landmarks[earIdx];
  const shoulder = landmarks[shoulderIdx];
  const hip = landmarks[hipIdx];
  const knee = landmarks[kneeIdx];
  const ankle = landmarks[ankleIdx];
  
  // Plumb line is based on ankle position
  const plumbX = (ankle?.x ?? 0.5) * canvasWidth;
  const ankleY = (ankle?.y ?? 0.9) * canvasHeight;
  
  // For side view, "forward" depends on which side the person is facing
  // Side-left: facing left, so forward = smaller X (left on screen)
  // Side-right: facing right, so forward = larger X (right on screen)
  const forwardDir = view === 'side-left' ? -1 : 1;
  
  // Convert all positions to canvas coordinates
  const earX = (ear?.x ?? 0.5) * canvasWidth;
  const earY = (ear?.y ?? 0.1) * canvasHeight;
  const eyeX = (eye?.x ?? 0.5) * canvasWidth;
  const eyeY = (eye?.y ?? 0.1) * canvasHeight;
  const shoulderX = (shoulder?.x ?? 0.5) * canvasWidth;
  const shoulderY = (shoulder?.y ?? 0.25) * canvasHeight;
  const hipX = (hip?.x ?? 0.5) * canvasWidth;
  const hipY = (hip?.y ?? 0.5) * canvasHeight;
  const kneeX = (knee?.x ?? 0.5) * canvasWidth;
  const kneeY = (knee?.y ?? 0.75) * canvasHeight;
  const ankleX = (ankle?.x ?? 0.5) * canvasWidth;
  
  // ===== EAR (Forward Head Posture) =====
  const earDeviation = (earX - plumbX) * forwardDir; // Positive = forward
  const earDeviationNorm = Math.abs((ear?.x ?? 0.5) - (ankle?.x ?? 0.5));
  const earSeverity = getSeverity(earDeviationNorm, POSTURE_THRESHOLDS.PLUMB_LINE);
  const earIsForward = earDeviation > POSTURE_THRESHOLDS.PLUMB_LINE.GOOD * canvasWidth;
  
  // ===== HEAD UP/DOWN TILT =====
  // Compare ear Y to eye Y - if ear is above eye level, looking up; if below, looking down
  const earEyeYDiff = ((ear?.y ?? 0) - (eye?.y ?? 0)); // Positive = ear lower than eye (looking up)
  const headUpDownStatus = Math.abs(earEyeYDiff) < POSTURE_THRESHOLDS.HEAD_UPDOWN.NEUTRAL ? 'neutral' :
    (earEyeYDiff > 0 ? 'up' : 'down'); // If ear is lower (higher Y), head is tilted back (looking up)
  const headUpDownSeverity = Math.abs(earEyeYDiff) < POSTURE_THRESHOLDS.HEAD_UPDOWN.NEUTRAL ? 'good' :
    (Math.abs(earEyeYDiff) < POSTURE_THRESHOLDS.HEAD_UPDOWN.UP ? 'mild' : 'moderate');
  
  // ===== SHOULDER (Rounded) =====
  const shoulderDeviation = (shoulderX - plumbX) * forwardDir;
  const shoulderDeviationNorm = Math.abs((shoulder?.x ?? 0.5) - (ankle?.x ?? 0.5));
  const shoulderSeverity = getSeverity(shoulderDeviationNorm, POSTURE_THRESHOLDS.PLUMB_LINE);
  const shoulderIsForward = shoulderDeviation > POSTURE_THRESHOLDS.PLUMB_LINE.GOOD * canvasWidth;
  
  // ===== HIP POSITION =====
  const hipDeviation = (hipX - plumbX) * forwardDir;
  const hipDeviationNorm = Math.abs((hip?.x ?? 0.5) - (ankle?.x ?? 0.5));
  const hipSeverity = getSeverity(hipDeviationNorm, POSTURE_THRESHOLDS.PLUMB_LINE);
  const hipIsForward = hipDeviation > POSTURE_THRESHOLDS.PLUMB_LINE.GOOD * canvasWidth;
  
  // ===== KNEE (Hyperextension) =====
  const kneeDeviation = (kneeX - plumbX) * forwardDir;
  const kneeStatus = Math.abs(kneeDeviation) < POSTURE_THRESHOLDS.PLUMB_LINE.GOOD * canvasWidth ? 'neutral' :
    (kneeDeviation < 0 ? 'hyperextended' : 'flexed');
  
  // ===== KYPHOSIS (Upper back curve) =====
  // Estimate by checking if upper back (shoulder area) is significantly behind the plumb
  // A person with kyphosis will have their shoulder behind their hip in the sagittal plane
  const kyphosisIndicator = Math.abs(shoulderDeviation - hipDeviation) / canvasWidth;
  const kyphosisSeverity = shoulderX * forwardDir < hipX * forwardDir && Math.abs(shoulderDeviation) > POSTURE_THRESHOLDS.PLUMB_LINE.MILD * canvasWidth
    ? getSeverity(kyphosisIndicator, POSTURE_THRESHOLDS.PLUMB_LINE)
    : 'good';
  
  // ===== LORDOSIS (Lower back curve) =====
  // Estimate by checking the relationship between hip and lower spine
  // For now, use hip forward position as an indicator (anterior tilt often accompanies hyperlordosis)
  const lordosisIndicator = hipDeviationNorm;
  const lordosisSeverity = getSeverity(lordosisIndicator, POSTURE_THRESHOLDS.PLUMB_LINE);
  const lordosisType = lordosisSeverity === 'good' ? 'normal' :
    (hipIsForward ? 'hyper' : 'hypo');
  
  // ===== PELVIC TILT =====
  // Estimate from hip-knee-ankle angle and hip forward position
  // Anterior tilt: hip forward of plumb, increased lordosis
  // Posterior tilt: hip behind plumb, flat back
  const pelvicTiltIndicator = hipDeviationNorm;
  const pelvicTiltType = Math.abs(hipDeviation) < POSTURE_THRESHOLDS.PLUMB_LINE.GOOD * canvasWidth ? 'neutral' :
    (hipIsForward ? 'anterior' : 'posterior');
  const pelvicTiltSeverity = getSeverity(pelvicTiltIndicator, POSTURE_THRESHOLDS.PLUMB_LINE);
  
  return {
    plumbX,
    ear: {
      x: earX,
      y: earY,
      severity: earSeverity,
      forwardAmount: earDeviation,
      isForward: earIsForward,
    },
    eye: {
      x: eyeX,
      y: eyeY,
    },
    headUpDown: {
      status: headUpDownStatus,
      severity: headUpDownSeverity as SeverityLevel,
      earEyeDiff: earEyeYDiff,
    },
    shoulder: {
      x: shoulderX,
      y: shoulderY,
      severity: shoulderSeverity,
      forwardAmount: shoulderDeviation,
      isForward: shoulderIsForward,
    },
    hip: {
      x: hipX,
      y: hipY,
      severity: hipSeverity,
      forwardAmount: hipDeviation,
      isForward: hipIsForward,
    },
    knee: {
      x: kneeX,
      y: kneeY,
      status: kneeStatus,
      deviation: kneeDeviation,
    },
    ankle: {
      x: ankleX,
      y: ankleY,
    },
    kyphosis: {
      severity: kyphosisSeverity,
      curveIndicator: kyphosisIndicator,
    },
    lordosis: {
      severity: lordosisSeverity,
      curveIndicator: lordosisIndicator,
      type: lordosisType,
    },
    pelvicTilt: {
      severity: pelvicTiltSeverity,
      type: pelvicTiltType,
      tiltIndicator: pelvicTiltIndicator,
    },
  };
}

/**
 * Helper to draw a dashed control line (ideal alignment reference)
 */
function drawControlLine(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number,
  x2: number, y2: number,
  color: string = ALIGNMENT_COLORS.CONTROL
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.setLineDash(ALIGNMENT_COLORS.CONTROL_DASHED);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
    ctx.stroke();
  ctx.restore();
}

/**
 * Helper to draw an alignment line (actual position)
 */
function drawAlignmentLine(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number,
  x2: number, y2: number,
  severity: SeverityLevel,
  lineWidth: number = 4
): void {
  ctx.strokeStyle = getSeverityColor(severity);
  ctx.lineWidth = lineWidth;
  ctx.setLineDash([]);
    ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
    ctx.stroke();
  }

/**
 * Helper to draw a landmark point
 */
function drawLandmarkPoint(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  severity: SeverityLevel | null,
  radius: number = 8
): void {
  // Outline
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
  
  // Fill
  ctx.fillStyle = severity !== null ? getSeverityPointColor(severity) : ALIGNMENT_COLORS.POINT_NEUTRAL;
  ctx.beginPath();
  ctx.arc(x, y, radius - 1, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Draws view-specific MediaPipe pose landmarks wireframe on an image
 * with GREEN lines for aligned landmarks, ORANGE for mild deviations, and RED for significant deviations
 * Also draws dashed GREEN "control" lines showing ideal alignment positions
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
    pointColor?: string;
    lineColor?: string;
  } = {}
): Promise<string> {
  const {
    pointRadius = 8,
    lineWidth = 4,
    opacity = 1.0,
  } = options;

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
          // ========== FRONT/BACK VIEW WITH COMPREHENSIVE ALIGNMENT ANALYSIS ==========
          const isBackView = view === 'back';
          const alignments = calculateFrontBackAlignments(landmarks, canvas.width, canvas.height, isBackView);
          
          // Get landmark positions helper
          const getPos = (idx: number) => ({
            x: (landmarks[idx]?.x ?? 0) * canvas.width,
            y: (landmarks[idx]?.y ?? 0) * canvas.height,
            visible: (landmarks[idx]?.visibility ?? 1) > 0.3,
          });
          
          // ===== 1. VERTICAL MIDLINE (Control Line) =====
          drawControlLine(ctx, alignments.bodyMidlineX, 0, alignments.bodyMidlineX, canvas.height, ALIGNMENT_COLORS.MIDLINE);
          
          // ===== 2. HORIZONTAL CONTROL LINES (ideal levels) =====
          const avgShoulderY = (alignments.shoulders.leftY + alignments.shoulders.rightY) / 2;
          const avgHipY = (alignments.hips.leftY + alignments.hips.rightY) / 2;
          const avgEarY = (alignments.headTilt.leftY + alignments.headTilt.rightY) / 2;
          
          // Shoulder level control line
          drawControlLine(ctx, 0, avgShoulderY, canvas.width, avgShoulderY);
          // Hip level control line
          drawControlLine(ctx, 0, avgHipY, canvas.width, avgHipY);
          // Head level control line (for front view)
          if (!isBackView) {
            drawControlLine(ctx, 0, avgEarY, canvas.width, avgEarY);
          }
          
          // ===== 3. TORSO SKELETON (neutral reference) =====
          ctx.strokeStyle = ALIGNMENT_COLORS.NEUTRAL;
          ctx.lineWidth = lineWidth - 1;
          ctx.setLineDash([]);
          
          // Left torso
          const leftShoulder = getPos(11);
          const leftHip = getPos(23);
          if (leftShoulder.visible && leftHip.visible) {
  ctx.beginPath();
            ctx.moveTo(leftShoulder.x, leftShoulder.y);
            ctx.lineTo(leftHip.x, leftHip.y);
  ctx.stroke();
          }

          // Right torso
          const rightShoulder = getPos(12);
          const rightHip = getPos(24);
          if (rightShoulder.visible && rightHip.visible) {
  ctx.beginPath();
            ctx.moveTo(rightShoulder.x, rightShoulder.y);
            ctx.lineTo(rightHip.x, rightHip.y);
  ctx.stroke();
          }
          
          // ===== 4. HEAD TILT (Ear-to-Ear Line) - Front view only =====
          if (!isBackView) {
            const leftEar = getPos(7);
            const rightEar = getPos(8);
            if (leftEar.visible && rightEar.visible) {
              drawAlignmentLine(ctx, leftEar.x, leftEar.y, rightEar.x, rightEar.y, alignments.headTilt.severity, lineWidth);
            }
          }
          
          // ===== 5. LATERAL HEAD POSITION (Nose off midline) - Front view only =====
          if (!isBackView && alignments.lateralHead.severity !== 'good') {
            const nose = getPos(0);
            if (nose.visible) {
              // Draw deviation line from nose to midline
              ctx.strokeStyle = getSeverityColor(alignments.lateralHead.severity);
              ctx.lineWidth = 2;
              ctx.setLineDash([5, 5]);
  ctx.beginPath();
              ctx.moveTo(nose.x, nose.y);
              ctx.lineTo(alignments.bodyMidlineX, nose.y);
  ctx.stroke();
              ctx.setLineDash([]);
            }
          }
          
          // ===== 6. SHOULDER LINE =====
          if (leftShoulder.visible && rightShoulder.visible) {
            drawAlignmentLine(ctx, leftShoulder.x, leftShoulder.y, rightShoulder.x, rightShoulder.y, alignments.shoulders.severity, lineWidth);
          }
          
          // ===== 7. HIP LINE =====
          if (leftHip.visible && rightHip.visible) {
            drawAlignmentLine(ctx, leftHip.x, leftHip.y, rightHip.x, rightHip.y, alignments.hips.severity, lineWidth);
          }
          
          // ===== 8. HIP SHIFT (Pelvis off midline) =====
          if (alignments.hipShift.severity !== 'good') {
            // Draw deviation line from hip midpoint to body midline
            ctx.strokeStyle = getSeverityColor(alignments.hipShift.severity);
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(alignments.hipShift.midpointX, avgHipY);
            ctx.lineTo(alignments.bodyMidlineX, avgHipY);
            ctx.stroke();
            ctx.setLineDash([]);
          }
          
          // ===== 9. LEFT LEG ALIGNMENT (Hip-Knee-Ankle) =====
          const leftKnee = getPos(25);
          const leftAnkle = getPos(27);
          if (leftHip.visible && leftKnee.visible && leftAnkle.visible) {
            // Draw control line (hip to ankle - ideal straight line)
            drawControlLine(ctx, leftHip.x, leftHip.y, leftAnkle.x, leftAnkle.y);
            
            // Draw actual leg segments with severity colors
            // Hip to knee
            drawAlignmentLine(ctx, leftHip.x, leftHip.y, leftKnee.x, leftKnee.y, alignments.leftLeg.severity, lineWidth);
            // Knee to ankle
            drawAlignmentLine(ctx, leftKnee.x, leftKnee.y, leftAnkle.x, leftAnkle.y, alignments.leftLeg.severity, lineWidth);
            
            // If deviation, draw horizontal line showing knee deviation from ideal
            if (alignments.leftLeg.severity !== 'good') {
              const idealKneeX = alignments.leftLeg.hipPos.x + 
                (alignments.leftLeg.anklePos.x - alignments.leftLeg.hipPos.x) * 
                ((alignments.leftLeg.kneePos.y - alignments.leftLeg.hipPos.y) / 
                 (alignments.leftLeg.anklePos.y - alignments.leftLeg.hipPos.y));
              ctx.strokeStyle = getSeverityColor(alignments.leftLeg.severity);
              ctx.lineWidth = 2;
              ctx.setLineDash([3, 3]);
              ctx.beginPath();
              ctx.moveTo(leftKnee.x, leftKnee.y);
              ctx.lineTo(idealKneeX, leftKnee.y);
              ctx.stroke();
              ctx.setLineDash([]);
            }
          }
          
          // ===== 10. RIGHT LEG ALIGNMENT (Hip-Knee-Ankle) =====
          const rightKnee = getPos(26);
          const rightAnkle = getPos(28);
          if (rightHip.visible && rightKnee.visible && rightAnkle.visible) {
            // Draw control line (hip to ankle - ideal straight line)
            drawControlLine(ctx, rightHip.x, rightHip.y, rightAnkle.x, rightAnkle.y);
            
            // Draw actual leg segments
            drawAlignmentLine(ctx, rightHip.x, rightHip.y, rightKnee.x, rightKnee.y, alignments.rightLeg.severity, lineWidth);
            drawAlignmentLine(ctx, rightKnee.x, rightKnee.y, rightAnkle.x, rightAnkle.y, alignments.rightLeg.severity, lineWidth);
            
            // If deviation, draw horizontal line showing knee deviation
            if (alignments.rightLeg.severity !== 'good') {
              const idealKneeX = alignments.rightLeg.hipPos.x + 
                (alignments.rightLeg.anklePos.x - alignments.rightLeg.hipPos.x) * 
                ((alignments.rightLeg.kneePos.y - alignments.rightLeg.hipPos.y) / 
                 (alignments.rightLeg.anklePos.y - alignments.rightLeg.hipPos.y));
              ctx.strokeStyle = getSeverityColor(alignments.rightLeg.severity);
              ctx.lineWidth = 2;
              ctx.setLineDash([3, 3]);
              ctx.beginPath();
              ctx.moveTo(rightKnee.x, rightKnee.y);
              ctx.lineTo(idealKneeX, rightKnee.y);
              ctx.stroke();
              ctx.setLineDash([]);
            }
          }
          
          // ===== 11. SCOLIOSIS CHECK (Back view only) =====
          if (isBackView && alignments.scoliosis) {
            const scoliosis = alignments.scoliosis;
            if (scoliosis.severity !== 'good') {
              // Draw the spine midline (actual)
              ctx.strokeStyle = getSeverityColor(scoliosis.severity);
              ctx.lineWidth = lineWidth;
              ctx.setLineDash([]);
              
              // Draw curved spine indicator (from shoulder mid to hip mid)
              const midTorsoY = (avgShoulderY + avgHipY) / 2;
              const curveBulge = scoliosis.direction === 'left' ? -30 : 30;
              
              ctx.beginPath();
              ctx.moveTo(scoliosis.shoulderMidX, avgShoulderY);
              ctx.quadraticCurveTo(
                scoliosis.shoulderMidX + curveBulge,
                midTorsoY,
                scoliosis.hipMidX,
                avgHipY
              );
              ctx.stroke();
              
              // Draw ideal straight line (control)
              drawControlLine(ctx, alignments.bodyMidlineX, avgShoulderY, alignments.bodyMidlineX, avgHipY);
            }
          }
          
          // ===== DRAW LANDMARK POINTS =====
          // Build points array - exclude face landmarks for back view
          const frontBackPoints: Array<{ pos: ReturnType<typeof getPos>; severity: SeverityLevel | null }> = [];
          
          // Face landmarks only for front view
          if (!isBackView) {
            frontBackPoints.push(
              { pos: getPos(0), severity: alignments.lateralHead.severity }, // Nose
              { pos: getPos(7), severity: alignments.headTilt.severity }, // Left ear
              { pos: getPos(8), severity: alignments.headTilt.severity }, // Right ear
            );
          }
          
          // Body landmarks for both views
          frontBackPoints.push(
            { pos: getPos(11), severity: alignments.shoulders.severity }, // Left shoulder
            { pos: getPos(12), severity: alignments.shoulders.severity }, // Right shoulder
            { pos: getPos(23), severity: alignments.hips.severity }, // Left hip
            { pos: getPos(24), severity: alignments.hips.severity }, // Right hip
            { pos: getPos(25), severity: alignments.leftLeg.severity }, // Left knee
            { pos: getPos(26), severity: alignments.rightLeg.severity }, // Right knee
            { pos: getPos(27), severity: 'good' }, // Left ankle (reference - always green)
            { pos: getPos(28), severity: 'good' }, // Right ankle (reference - always green)
          );
          
          for (const { pos, severity } of frontBackPoints) {
            if (pos.visible) {
              drawLandmarkPoint(ctx, pos.x, pos.y, severity, pointRadius);
            }
          }
          
        } else {
          // ========== SIDE VIEW WITH COMPREHENSIVE PLUMB LINE ANALYSIS ==========
          const alignments = calculateSideViewAlignments(landmarks, view, canvas.width, canvas.height);
          
          // ===== 1. VERTICAL PLUMB LINE (Control - from ankle up) =====
          ctx.strokeStyle = ALIGNMENT_COLORS.MIDLINE;
          ctx.lineWidth = 2;
          ctx.setLineDash([10, 10]);
          ctx.beginPath();
          ctx.moveTo(alignments.plumbX, 0);
          ctx.lineTo(alignments.plumbX, canvas.height);
          ctx.stroke();
          ctx.setLineDash([]);
          
          // ===== 2. EAR POSITION (Forward Head Posture) =====
          // Draw ear-to-shoulder segment
          drawAlignmentLine(ctx, alignments.ear.x, alignments.ear.y, alignments.shoulder.x, alignments.shoulder.y, alignments.ear.severity, lineWidth);
          
          // If ear is forward, draw horizontal deviation line to plumb
          if (alignments.ear.isForward) {
            ctx.strokeStyle = getSeverityColor(alignments.ear.severity);
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(alignments.ear.x, alignments.ear.y);
            ctx.lineTo(alignments.plumbX, alignments.ear.y);
            ctx.stroke();
            ctx.setLineDash([]);
          }
          
          // ===== 3. HEAD UP/DOWN INDICATOR =====
          if (alignments.headUpDown.status !== 'neutral') {
            // Draw a small arc near the head indicating tilt direction
            ctx.strokeStyle = getSeverityColor(alignments.headUpDown.severity);
            ctx.lineWidth = 2;
            ctx.setLineDash([3, 3]);
            const arrowDir = alignments.headUpDown.status === 'up' ? -1 : 1;
            ctx.beginPath();
            ctx.moveTo(alignments.ear.x, alignments.ear.y);
            ctx.lineTo(alignments.ear.x, alignments.ear.y + arrowDir * 20);
            ctx.stroke();
            ctx.setLineDash([]);
          }
          
          // ===== 4. SHOULDER POSITION (Rounded Shoulders) =====
          drawAlignmentLine(ctx, alignments.shoulder.x, alignments.shoulder.y, alignments.hip.x, alignments.hip.y, alignments.shoulder.severity, lineWidth);
          
          // If shoulder is forward, draw horizontal deviation line
          if (alignments.shoulder.isForward) {
            ctx.strokeStyle = getSeverityColor(alignments.shoulder.severity);
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(alignments.shoulder.x, alignments.shoulder.y);
            ctx.lineTo(alignments.plumbX, alignments.shoulder.y);
            ctx.stroke();
            ctx.setLineDash([]);
          }
          
          // ===== 5. HIP POSITION =====
          drawAlignmentLine(ctx, alignments.hip.x, alignments.hip.y, alignments.knee.x, alignments.knee.y, alignments.hip.severity, lineWidth);
          
          // If hip is forward, draw horizontal deviation line
          if (alignments.hip.isForward) {
            ctx.strokeStyle = getSeverityColor(alignments.hip.severity);
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(alignments.hip.x, alignments.hip.y);
            ctx.lineTo(alignments.plumbX, alignments.hip.y);
            ctx.stroke();
            ctx.setLineDash([]);
          }
          
          // ===== 6. KNEE POSITION =====
          const kneeSeverity = alignments.knee.status === 'neutral' ? 'good' : 
            (Math.abs(alignments.knee.deviation) > POSTURE_THRESHOLDS.PLUMB_LINE.MODERATE * canvas.width ? 'moderate' : 'mild');
          drawAlignmentLine(ctx, alignments.knee.x, alignments.knee.y, alignments.ankle.x, alignments.ankle.y, kneeSeverity, lineWidth);
          
          // ===== 7. KYPHOSIS INDICATOR (Upper back curve) =====
          if (alignments.kyphosis.severity !== 'good') {
            // Draw curved indicator in upper back area
            const midBackY = alignments.shoulder.y + (alignments.hip.y - alignments.shoulder.y) * 0.3;
            const curveDepth = alignments.kyphosis.severity === 'severe' ? 40 : 
                              (alignments.kyphosis.severity === 'moderate' ? 25 : 15);
            const curveX = view === 'side-left' ? alignments.shoulder.x + curveDepth : alignments.shoulder.x - curveDepth;
            
            ctx.strokeStyle = getSeverityColor(alignments.kyphosis.severity);
            ctx.lineWidth = 3;
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.moveTo(alignments.shoulder.x, alignments.shoulder.y);
            ctx.quadraticCurveTo(curveX, midBackY, alignments.shoulder.x, alignments.shoulder.y + (alignments.hip.y - alignments.shoulder.y) * 0.5);
            ctx.stroke();
          }
          
          // ===== 8. LORDOSIS INDICATOR (Lower back curve) =====
          if (alignments.lordosis.severity !== 'good') {
            const lowerBackY = alignments.shoulder.y + (alignments.hip.y - alignments.shoulder.y) * 0.7;
            const curveDepth = alignments.lordosis.severity === 'severe' ? 35 :
                              (alignments.lordosis.severity === 'moderate' ? 20 : 10);
            const curveX = view === 'side-left' ? alignments.hip.x - curveDepth : alignments.hip.x + curveDepth;
            
            ctx.strokeStyle = getSeverityColor(alignments.lordosis.severity);
            ctx.lineWidth = 3;
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.moveTo(alignments.shoulder.x, lowerBackY);
            ctx.quadraticCurveTo(curveX, (lowerBackY + alignments.hip.y) / 2, alignments.hip.x, alignments.hip.y);
            ctx.stroke();
          }
          
          // ===== 9. PELVIC TILT INDICATOR =====
          if (alignments.pelvicTilt.type !== 'neutral') {
            // Draw angled line at hip level showing tilt direction
            const tiltAngle = alignments.pelvicTilt.type === 'anterior' ? 15 : -10;
            const tiltLength = 50;
            const tiltRad = (tiltAngle * Math.PI) / 180;
            const tiltDir = view === 'side-left' ? 1 : -1;
            
            ctx.strokeStyle = getSeverityColor(alignments.pelvicTilt.severity);
            ctx.lineWidth = 3;
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.moveTo(alignments.hip.x - tiltLength * tiltDir, alignments.hip.y + Math.sin(tiltRad) * tiltLength);
            ctx.lineTo(alignments.hip.x + tiltLength * tiltDir, alignments.hip.y - Math.sin(tiltRad) * tiltLength);
            ctx.stroke();
          }
          
          // ===== 10. ARM (for rounded shoulder context) =====
          const elbowIdx = view === 'side-left' ? 13 : 14;
          const wristIdx = view === 'side-left' ? 15 : 16;
          const shoulderIdx = view === 'side-left' ? 11 : 12;
          
          const elbow = landmarks[elbowIdx];
          const wrist = landmarks[wristIdx];
          const shoulder = landmarks[shoulderIdx];
          
          if (elbow && shoulder && (elbow.visibility ?? 1) > 0.3) {
            ctx.strokeStyle = ALIGNMENT_COLORS.NEUTRAL;
            ctx.lineWidth = lineWidth - 1;
            ctx.setLineDash([]);
            
            ctx.beginPath();
            ctx.moveTo((shoulder.x) * canvas.width, (shoulder.y) * canvas.height);
            ctx.lineTo((elbow.x) * canvas.width, (elbow.y) * canvas.height);
            ctx.stroke();
            
            if (wrist && (wrist.visibility ?? 1) > 0.3) {
              ctx.beginPath();
              ctx.moveTo((elbow.x) * canvas.width, (elbow.y) * canvas.height);
              ctx.lineTo((wrist.x) * canvas.width, (wrist.y) * canvas.height);
              ctx.stroke();
            }
          }
          
          // ===== DRAW LANDMARK POINTS =====
          const sidePoints = [
            { x: alignments.ear.x, y: alignments.ear.y, severity: alignments.ear.severity },
            { x: alignments.shoulder.x, y: alignments.shoulder.y, severity: alignments.shoulder.severity },
            { x: alignments.hip.x, y: alignments.hip.y, severity: alignments.hip.severity },
            { x: alignments.knee.x, y: alignments.knee.y, severity: kneeSeverity as SeverityLevel },
            { x: alignments.ankle.x, y: alignments.ankle.y, severity: null }, // Ankle is reference
          ];
          
          for (const point of sidePoints) {
            drawLandmarkPoint(ctx, point.x, point.y, point.severity, pointRadius);
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
