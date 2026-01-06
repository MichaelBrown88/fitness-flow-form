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
    // SIDE VIEW DEVIATIONS - Clean angle indicators
    // ============================================
    
    const rawLandmarks = analysis.landmarks?.raw;
    
    // Get MediaPipe landmarks for accurate positioning
    let earX: number | null = null;
    let earY: number | null = null;
    let shoulderLandmarkX: number | null = null;
    let shoulderLandmarkY: number | null = null;
    let hipLandmarkX: number | null = null;
    let hipLandmarkY: number | null = null;
    
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
      
      // Hip: 23 = Left, 24 = Right
      const hipLandmark = view === 'side-left' ? rawLandmarks[23] : rawLandmarks[24];
      if (hipLandmark?.x !== undefined && hipLandmark?.y !== undefined) {
        hipLandmarkX = hipLandmark.x * ctx.canvas.width;
        hipLandmarkY = hipLandmark.y * ctx.canvas.height;
      }
    }
    
    // =====================================================
    // CLEAN DEVIATION LINES - Simple lines and arcs only
    // =====================================================
    
    // -----------------------------------------
    // 1. FORWARD HEAD POSTURE - Diagonal line from plumb to ear
    // -----------------------------------------
    const fhpStatus = analysis.forward_head?.status;
    const hasForwardHead = fhpStatus && fhpStatus !== 'Neutral';
    
    if (hasForwardHead) {
      // Determine ear position - use MediaPipe if available, otherwise estimate
      let targetEarX = earX;
      let targetEarY = earY;
      
      // If ear not detected, estimate based on shoulder position
      if (targetEarX === null || targetEarY === null) {
        // Estimate ear position: above and forward of shoulder
        const estimatedForward = facingDir * 60; // 60px forward
        targetEarX = (shoulderLandmarkX || centerX) + estimatedForward;
        targetEarY = shoulderY - 120; // Above shoulder
      }
      
      // Main diagonal line from shoulder-level on plumb to ear position
      ctx.beginPath();
      ctx.moveTo(centerX, shoulderY);
      ctx.lineTo(targetEarX, targetEarY);
      ctx.stroke();
      
      // Horizontal line showing forward displacement
      ctx.beginPath();
      ctx.moveTo(centerX, targetEarY);
      ctx.lineTo(targetEarX, targetEarY);
      ctx.stroke();
    }

    // -----------------------------------------
    // 2. ROUNDED SHOULDERS - Horizontal line from plumb to shoulder
    // -----------------------------------------
    const shoulderStatus = analysis.shoulder_alignment?.status;
    const isRoundedShoulders = analysis.shoulder_alignment?.rounded_forward || 
                               shoulderStatus === 'Rounded' || 
                               (analysis.shoulder_alignment?.forward_position_cm || 0) > 0;
    
    if (isRoundedShoulders && shoulderLandmarkX !== null && shoulderLandmarkY !== null) {
      // Horizontal line from plumb to actual shoulder position
      ctx.beginPath();
      ctx.moveTo(centerX, shoulderLandmarkY);
      ctx.lineTo(shoulderLandmarkX, shoulderLandmarkY);
      ctx.stroke();
    }

    // -----------------------------------------
    // 3. KYPHOSIS - Arc on upper back (BEHIND the shoulder)
    // -----------------------------------------
    const kyphosisStatus = analysis.kyphosis?.status;
    if (kyphosisStatus && kyphosisStatus !== 'Normal') {
      // Position arc BEHIND the body (opposite to facing direction)
      // Use shoulder landmark as reference point
      const shoulderX = shoulderLandmarkX || centerX;
      
      // Offset BEHIND the shoulder (opposite to facing direction)
      // facingDir = -1 (facing left) → offset to the RIGHT (+)
      // facingDir = +1 (facing right) → offset to the LEFT (-)
      const behindOffset = -facingDir * 40;
      const arcCenterX = shoulderX + behindOffset;
      const arcCenterY = shoulderY + 60;
      
      const arcRadius = kyphosisStatus === 'Severe' ? 60 : kyphosisStatus === 'Moderate' ? 50 : 40;
      
      ctx.beginPath();
      // Draw arc that curves BACKWARD (shows the kyphotic bulge)
      // For left-facing: arc bulges RIGHT (backward)
      // For right-facing: arc bulges LEFT (backward)
      if (facingDir === -1) {
        // Facing left: draw arc that curves to the right (backward)
        ctx.arc(arcCenterX, arcCenterY, arcRadius, Math.PI * 0.7, Math.PI * 1.3, false);
      } else {
        // Facing right: draw arc that curves to the left (backward)
        ctx.arc(arcCenterX, arcCenterY, arcRadius, -Math.PI * 0.3, Math.PI * 0.3, false);
      }
      ctx.stroke();
    }

    // -----------------------------------------
    // 4. LORDOSIS - Arc on lower back
    // -----------------------------------------
    const lordosisStatus = analysis.lordosis?.status;
    if (lordosisStatus && lordosisStatus !== 'Normal') {
      const backOffsetX = -facingDir * 40;
      const arcCenterY = hipY - 50;
      const arcRadius = lordosisStatus === 'Severe' ? 50 : lordosisStatus === 'Moderate' ? 40 : 30;
      
      ctx.beginPath();
      // Arc opens toward the front (in facing direction) showing inward curve
      const startAngle = facingDir === 1 ? -Math.PI * 0.4 : Math.PI * 0.6;
      const endAngle = facingDir === 1 ? Math.PI * 0.4 : Math.PI * 1.4;
      ctx.arc(centerX + backOffsetX, arcCenterY, arcRadius, startAngle, endAngle, false);
      ctx.stroke();
    }

    // -----------------------------------------
    // 5. PELVIC TILT - Angled line at hip level
    // -----------------------------------------
    const pelvicStatus = analysis.pelvic_tilt?.status;
    if (pelvicStatus && pelvicStatus !== 'Neutral') {
      const statusLower = (pelvicStatus || '').toLowerCase();
      const isAnterior = statusLower.includes('anterior');
      
      const pelvicY = hipLandmarkY || hipY;
      const lineLength = 140;
      
      // Subtle visual angle (8-10 degrees)
      const visualAngleDeg = 10;
      const rad = (visualAngleDeg * Math.PI) / 180;
      const verticalOffset = Math.tan(rad) * lineLength;
      
      // ANTERIOR TILT: Front of pelvis drops DOWN
      // - Facing LEFT (facingDir=-1): LEFT end should be LOWER (front)
      // - Facing RIGHT (facingDir=1): RIGHT end should be LOWER (front)
      // POSTERIOR TILT: Front of pelvis rises UP (opposite)
      
      const tiltSign = isAnterior ? 1 : -1;
      
      // Correct math: front end goes DOWN for anterior
      const leftY = pelvicY - (facingDir * tiltSign * verticalOffset);
      const rightY = pelvicY + (facingDir * tiltSign * verticalOffset);
      
      ctx.beginPath();
      ctx.moveTo(centerX - lineLength, leftY);
      ctx.lineTo(centerX + lineLength, rightY);
      ctx.stroke();
    }

    // Knee Position (Hyperextension/Flexion)
    if (analysis.knee_position && analysis.knee_position.status !== 'Neutral') {
      const deg = analysis.knee_position.deviation_degrees || 0;
      const rad = (deg * Math.PI) / 180;
      const isHyperextended = (analysis.knee_position.status || '').includes('Hyperextended') || deg < 0;
      
      ctx.beginPath();
      ctx.moveTo(centerX, hipY);
      
      const kneeLength = 220;
      const angle = isHyperextended ? rad : -rad;
      
      const endX = centerX + (Math.sin(angle) * kneeLength);
      const endY = hipY + (Math.cos(angle) * kneeLength);
      ctx.lineTo(endX, endY);
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
