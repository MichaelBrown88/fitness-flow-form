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
        
        const landmarkData = options.landmarks || analysis?.landmarks;
        
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (mode === 'align' && landmarkData) {
          let landmarkX = img.width * (CONFIG.POSTURE_OVERLAY.TARGET_LANDMARKS.CENTER_X_PCT / 100);
          let landmarkShoulderY = img.height * (CONFIG.POSTURE_OVERLAY.TARGET_LANDMARKS.SHOULDER_Y_PCT / 100);
          let landmarkHipY = img.height * (CONFIG.POSTURE_OVERLAY.TARGET_LANDMARKS.HIP_Y_PCT / 100);
          
          if (view === 'side-right' || view === 'side-left') {
            if (landmarkData.midfoot_x_percent !== undefined) {
              landmarkX = (landmarkData.midfoot_x_percent / 100) * img.width;
            }
          } else {
            if (landmarkData.center_x_percent !== undefined) {
              landmarkX = (landmarkData.center_x_percent / 100) * img.width;
            }
          }
          
          if (landmarkData.shoulder_y_percent !== undefined) {
            landmarkShoulderY = (landmarkData.shoulder_y_percent / 100) * img.height;
          }
          if (landmarkData.hip_y_percent !== undefined) {
            landmarkHipY = (landmarkData.hip_y_percent / 100) * img.height;
          }

          const actualTorsoHeight = Math.abs(landmarkHipY - landmarkShoulderY);
          const targetTorsoHeight = Math.abs(targetHipY - targetShoulderY);
          const scale = actualTorsoHeight > 0 ? targetTorsoHeight / actualTorsoHeight : (canvas.height / img.height);

          const translateX = targetCenterX - (landmarkX * scale);
          const bodyCenterY = (landmarkShoulderY + landmarkHipY) / 2;
          const targetCenterY = (targetShoulderY + targetHipY) / 2;
          const translateY = targetCenterY - (bodyCenterY * scale);

          console.log(`[OVERLAY] Aligning ${view}: torso_h=${actualTorsoHeight.toFixed(0)}px, scale=${scale.toFixed(3)}, translate(${translateX.toFixed(1)}, ${translateY.toFixed(1)})`);

          ctx.save();
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
    // 1. Head Tilt
    if (analysis.head_alignment && analysis.head_alignment.status !== 'Neutral') {
      const tiltDeg = analysis.head_alignment.tilt_degrees || 0;
      const status = analysis.head_alignment.status;
      
      // Determine screen direction of tilt
      // Tilted Right in Back view = Screen Right
      // Tilted Right in Front view = Screen Left
      let screenTiltDir = 1; // Default to screen right
      if (status === 'Tilted Right') {
        screenTiltDir = isBackView ? 1 : -1;
      } else if (status === 'Tilted Left') {
        screenTiltDir = isBackView ? -1 : 1;
      }
      
      const headY = (analysis.landmarks?.head_y_percent !== undefined) 
        ? (analysis.landmarks.head_y_percent / 100) * ctx.canvas.height 
        : shoulderY - 150;
      
      const rad = (Math.abs(tiltDeg) * Math.PI / 180) * screenTiltDir;
      const lineLength = 100;
      
      ctx.beginPath();
      ctx.moveTo(centerX - (Math.cos(rad) * lineLength), headY + (Math.sin(rad) * lineLength));
      ctx.lineTo(centerX + (Math.cos(rad) * lineLength), headY - (Math.sin(rad) * lineLength));
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
      const pelvicDiff = (pelvicData as any)?.height_difference_cm || 0;
      const hipDiff = (hipData as any)?.height_difference_cm || 0;
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
    // Side view deviations
    // Forward Head
    if (analysis.forward_head && analysis.forward_head.deviation_degrees) {
      const deg = analysis.forward_head.deviation_degrees;
      const rad = (deg * Math.PI) / 180;
      
      ctx.beginPath();
      ctx.moveTo(centerX, shoulderY);
      const lineLength = 150;
      const endX = centerX + (facingDir * Math.sin(rad) * lineLength);
      const endY = shoulderY - (Math.cos(rad) * lineLength);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }

    // Rounded Shoulders (Side View)
    if (analysis.shoulder_alignment && (analysis.shoulder_alignment.rounded_forward || (analysis.shoulder_alignment.forward_position_cm || 0) > 0)) {
      const forwardCm = analysis.shoulder_alignment.forward_position_cm || 2;
      const pixelOffset = Math.min(forwardCm * 10, 80); 
      
      ctx.beginPath();
      ctx.moveTo(centerX, shoulderY);
      ctx.lineTo(centerX + (facingDir * pixelOffset), shoulderY);
      ctx.stroke();
      
      ctx.moveTo(centerX + (facingDir * pixelOffset), shoulderY - 15);
      ctx.lineTo(centerX + (facingDir * pixelOffset), shoulderY + 15);
      ctx.stroke();
    }

    // Kyphosis (Upper Back Curve)
    if (analysis.kyphosis && analysis.kyphosis.status !== 'Normal') {
      const curveDeg = analysis.kyphosis.curve_degrees || 40;
      const arcSize = Math.min(curveDeg * 1.2, 80);
      
      ctx.beginPath();
      ctx.arc(centerX - (facingDir * 30), shoulderY + 40, arcSize, -Math.PI/2.5, Math.PI/2.5, facingDir === 1);
      ctx.stroke();
    }

    // Lordosis (Lower Back Curve)
    if (analysis.lordosis && analysis.lordosis.status !== 'Normal') {
      const curveDeg = analysis.lordosis.curve_degrees || 30;
      const arcSize = Math.min(curveDeg * 1.5, 70);
      
      ctx.beginPath();
      ctx.arc(centerX + (facingDir * 20), hipY - 50, arcSize, -Math.PI/3, Math.PI/3, facingDir === -1);
      ctx.stroke();
    }

    // Pelvic Tilt (Side View)
    if (analysis.pelvic_tilt && analysis.pelvic_tilt.status !== 'Neutral') {
      const deg = (analysis.pelvic_tilt as any).anterior_tilt_degrees || 0;
      const rad = (deg * Math.PI) / 180;
      const isAnterior = (analysis.pelvic_tilt.status || '').includes('Anterior') || deg > 0;
      
      ctx.beginPath();
      const lineLength = 50;
      const angle = isAnterior ? rad : -rad;
      
      ctx.moveTo(centerX - lineLength, hipY - (facingDir * Math.tan(angle) * lineLength));
      ctx.lineTo(centerX + lineLength, hipY + (facingDir * Math.tan(angle) * lineLength));
      ctx.stroke();
    }

    // Knee Position (Hyperextension/Flexion)
    if (analysis.knee_position && analysis.knee_position.status !== 'Neutral') {
      const deg = (analysis.knee_position as any).deviation_degrees || 0;
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

  ctx.beginPath();
  ctx.moveTo(centerX, 0);
  ctx.lineTo(centerX, height);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, shoulderY);
  ctx.lineTo(width, shoulderY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, hipY);
  ctx.lineTo(width, hipY);
  ctx.stroke();

  return canvas.toDataURL('image/jpeg', 0.95);
}
