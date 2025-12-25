/**
 * Draw reference lines overlay on posture images
 * Adds green reference lines and red deviation lines based on AI analysis
 */

export interface OverlayOptions {
  showMidline?: boolean; // Vertical center line
  showShoulderLine?: boolean; // Horizontal line at shoulder level
  showHipLine?: boolean; // Horizontal line at hip level
  lineColor?: string;
  lineWidth?: number;
  analysis?: any; // PostureAnalysisResult from AI
}

/**
 * Draw reference lines on an image
 * @param imageData Base64 image data URL
 * @param view The view being analyzed
 * @param options Overlay options
 * @returns Base64 image with overlay lines
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
    lineColor = '#00ff00', // Green for reference lines
    lineWidth = 2,
    analysis
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
        
        // Draw original image
        ctx.drawImage(img, 0, 0);
        
        // Track how many deviations we draw (declare outside if block for scope)
        let deviationCount = 0;
        
        // Draw GREEN reference lines first
        ctx.strokeStyle = '#00ff00'; // Green
        ctx.lineWidth = lineWidth;
        ctx.setLineDash([]);
        
        // Standard Reference Coordinates (used for both green and red lines)
        const centerX = canvas.width / 2;
        const shoulderY = canvas.height * 0.25; // Approx shoulder height
        const hipY = canvas.height * 0.5;      // Approx hip height
        
        if (showMidline && (view === 'front' || view === 'back')) {
          // Vertical midline for front/back views
          ctx.beginPath();
          ctx.moveTo(centerX, 0);
          ctx.lineTo(centerX, canvas.height);
          ctx.stroke();
        }
        
        if (showMidline && (view === 'side-right' || view === 'side-left')) {
          // Vertical plumb line for side views - CENTER OF SCREEN
          const plumbX = centerX; // Same as centerX
          ctx.beginPath();
          ctx.moveTo(plumbX, 0);
          ctx.lineTo(plumbX, canvas.height);
          ctx.stroke();
        }
        
        if (showShoulderLine) {
          // Horizontal line at shoulder level
          ctx.beginPath();
          ctx.moveTo(0, shoulderY);
          ctx.lineTo(canvas.width, shoulderY);
          ctx.stroke();
        }
        
        if (showHipLine) {
          // Horizontal line at hip level
          ctx.beginPath();
          ctx.moveTo(0, hipY);
          ctx.lineTo(canvas.width, hipY);
          ctx.stroke();
        }
        
        // Draw RED deviation lines if analysis is available
        if (analysis) {
          console.log(`[OVERLAY] ===== STARTING DEVIATION OVERLAY FOR ${view} =====`);
          console.log(`[OVERLAY] Full analysis object:`, JSON.stringify(analysis, null, 2));
          console.log(`[OVERLAY] Analysis keys:`, Object.keys(analysis));
          
          ctx.strokeStyle = '#ff0000'; // Red for deviations
          ctx.lineWidth = 3;
          ctx.setLineDash([5, 5]); // Dashed line for deviations
          
          if (view === 'front' || view === 'back') {
            // Front/Back view deviations
            // Use same coordinates as green reference lines
            
            // Shoulder asymmetry - draw offset line
            // ALWAYS draw if there's a measurable difference, regardless of status
            const shoulderDiff = Math.abs(analysis.shoulder_alignment?.height_difference_cm || 0);
            if (analysis.shoulder_alignment && shoulderDiff > 0.1) {
              console.log(`[OVERLAY] Drawing shoulder asymmetry: ${shoulderDiff}cm, status: ${analysis.shoulder_alignment.status}`);
              // Convert cm to pixels (approximate: 1cm = ~10px for typical photo)
              const offsetPx = Math.max(5, shoulderDiff * 10); // Minimum 5px for visibility
              // Determine which shoulder is higher based on elevation values
              const leftElev = analysis.shoulder_alignment.left_elevation_cm || 0;
              const rightElev = analysis.shoulder_alignment.right_elevation_cm || 0;
              const leftHigher = leftElev > rightElev;
              
              const leftShoulderY = leftHigher ? shoulderY - (offsetPx / 2) : shoulderY + (offsetPx / 2);
              const rightShoulderY = leftHigher ? shoulderY + (offsetPx / 2) : shoulderY - (offsetPx / 2);
              
              // Draw horizontal line showing asymmetry
              ctx.beginPath();
              ctx.moveTo(centerX - canvas.width * 0.3, leftShoulderY);
              ctx.lineTo(centerX + canvas.width * 0.3, rightShoulderY);
              ctx.stroke();
            }
            
            // Hip asymmetry - draw offset line
            // ALWAYS draw if there's a measurable difference
            const hipDiff = Math.abs(analysis.hip_alignment?.height_difference_cm || 0);
            if (analysis.hip_alignment && hipDiff > 0.1) {
              console.log(`[OVERLAY] Drawing hip asymmetry: ${hipDiff}cm, status: ${analysis.hip_alignment.status}`);
              const offsetPx = Math.max(5, hipDiff * 10);
              // Determine which hip is higher
              const leftElev = analysis.hip_alignment.left_elevation_cm || 0;
              const rightElev = analysis.hip_alignment.right_elevation_cm || 0;
              const leftHigher = leftElev > rightElev;
              
              const leftHipY = leftHigher ? hipY - (offsetPx / 2) : hipY + (offsetPx / 2);
              const rightHipY = leftHigher ? hipY + (offsetPx / 2) : hipY - (offsetPx / 2);
              
              ctx.beginPath();
              ctx.moveTo(centerX - canvas.width * 0.3, leftHipY);
              ctx.lineTo(centerX + canvas.width * 0.3, rightHipY);
              ctx.stroke();
            }
            
            // Lateral pelvic tilt - draw angled line
            // ALWAYS draw if there's a measurable tilt
            const lateralTilt = Math.abs(analysis.pelvic_tilt?.lateral_tilt_degrees || 0);
            if (analysis.pelvic_tilt && lateralTilt > 0.5) {
              console.log(`[OVERLAY] Drawing lateral pelvic tilt: ${lateralTilt}°, status: ${analysis.pelvic_tilt.status}`);
              const hipWidth = canvas.width * 0.2;
              const tiltRad = (lateralTilt * Math.PI) / 180;
              // Determine tilt direction
              const leftElev = analysis.pelvic_tilt.left_hip_elevation_cm || 0;
              const rightElev = analysis.pelvic_tilt.right_hip_elevation_cm || 0;
              const leftHigher = leftElev > rightElev;
              
              // Draw hip line at angle
              ctx.beginPath();
              if (leftHigher) {
                ctx.moveTo(centerX - hipWidth, hipY - (Math.sin(tiltRad) * hipWidth));
                ctx.lineTo(centerX + hipWidth, hipY + (Math.sin(tiltRad) * hipWidth));
              } else {
                ctx.moveTo(centerX - hipWidth, hipY + (Math.sin(tiltRad) * hipWidth));
                ctx.lineTo(centerX + hipWidth, hipY - (Math.sin(tiltRad) * hipWidth));
              }
              ctx.stroke();
            }
            
            // Hip shift - draw vertical offset
            // ALWAYS draw if there's a measurable shift
            const hipShift = Math.abs(analysis.pelvic_tilt?.hip_shift_cm || 0);
            if (analysis.pelvic_tilt && hipShift > 0.1) {
              console.log(`[OVERLAY] Drawing hip shift: ${hipShift}cm, direction: ${analysis.pelvic_tilt.hip_shift_direction}`);
              const shiftPx = Math.max(5, hipShift * 10);
              const shiftDirection = analysis.pelvic_tilt.hip_shift_direction === 'Left' ? -1 : 
                                    analysis.pelvic_tilt.hip_shift_direction === 'Right' ? 1 : 0;
              const shiftedX = centerX + (shiftPx * shiftDirection);
              
              ctx.beginPath();
              ctx.moveTo(shiftedX, hipY - canvas.height * 0.2);
              ctx.lineTo(shiftedX, hipY + canvas.height * 0.2);
              ctx.stroke();
            }
            
            // Knee alignment - draw valgus/varus lines
            if (analysis.knee_alignment && analysis.knee_alignment.status !== 'Neutral') {
              const kneeY = canvas.height * 0.75;
              const devDegrees = analysis.knee_alignment.deviation_degrees || 0;
              const kneeWidth = canvas.width * 0.1;
              
              if (analysis.knee_alignment.status === 'Valgus') {
                // Knees pointing inward - draw angle lines
                ctx.beginPath();
                ctx.moveTo(centerX - kneeWidth, kneeY);
                ctx.lineTo(centerX - kneeWidth * 0.5, kneeY - (devDegrees * 2));
                ctx.moveTo(centerX + kneeWidth, kneeY);
                ctx.lineTo(centerX + kneeWidth * 0.5, kneeY - (devDegrees * 2));
                ctx.stroke();
              } else if (analysis.knee_alignment.status === 'Varus') {
                // Knees pointing outward - draw angle lines
                ctx.beginPath();
                ctx.moveTo(centerX - kneeWidth, kneeY);
                ctx.lineTo(centerX - kneeWidth * 1.5, kneeY - (devDegrees * 2));
                ctx.moveTo(centerX + kneeWidth, kneeY);
                ctx.lineTo(centerX + kneeWidth * 1.5, kneeY - (devDegrees * 2));
                ctx.stroke();
              }
            }
            
            // Spinal curvature (scoliosis) - for back view only
            if (view === 'back' && analysis.spinal_curvature && analysis.spinal_curvature.status !== 'Normal') {
              const curveDegrees = analysis.spinal_curvature.curve_degrees || 0;
              const spineStartY = canvas.height * 0.15; // Top of spine
              const spineEndY = hipY; // Bottom of spine
              const curveOffset = (curveDegrees / 10) * (canvas.width * 0.1); // Convert degrees to pixels
              
              // Draw curved spine line
              ctx.beginPath();
              ctx.moveTo(centerX, spineStartY);
              ctx.quadraticCurveTo(centerX + curveOffset, (spineStartY + spineEndY) / 2, centerX, spineEndY);
              ctx.stroke();
            }
          } else if (view === 'side-right' || view === 'side-left') {
            // Side view deviations - FIXED with facing direction awareness
            const plumbX = centerX; // Same as green plumb line
            // Use same Y-coords as green reference lines (defined at top of function)
            
            // 1. DETERMINE FACING DIRECTION
            // side-right: Person's RIGHT side visible, facing RIGHT (nose → right, front → right)
            // side-left: Person's LEFT side visible, facing LEFT (nose → left, front → left)
            // Forward head means head protrudes forward (toward camera/viewer)
            // In side-right view: forward = +X (right side of image)
            // In side-left view: forward = -X (left side of image)
            const facingDir = view === 'side-right' ? 1 : -1;
            
            // Forward head posture - draw angled line from shoulder to ear
            const forwardHead = analysis.forward_head;
            if (forwardHead) {
              console.log(`[OVERLAY] forward_head data:`, forwardHead);
              const headDevDegrees = Math.abs(forwardHead.deviation_degrees || 0);
              const headStatus = forwardHead.status || 'Neutral';
              const hasDeviation = headDevDegrees > 0 || headStatus !== 'Neutral';
              
              if (hasDeviation) {
                deviationCount++;
                console.log(`[OVERLAY] ✓ Drawing forward head: ${headDevDegrees}°, status: ${headStatus}, view: ${view}, facingDir: ${facingDir}`);
                
                // Anchor at the intersection of Plumb Line and Shoulder Line
                const startX = plumbX;
                const startY = shoulderY;
                
                // Calculate length of the neck line (approximate)
                const neckLength = canvas.height * 0.15;
                
                // Calculate the endpoint (Ear) based on the angle
                // Forward head: head moves forward from plumb line
                // For side-right: forward = +X (right)
                // For side-left: forward = -X (left)
                const angleRad = (headDevDegrees * Math.PI) / 180;
                
                // Math: sin gives us the X offset (forward), cos gives the Y height (up)
                // Forward head means head is forward of plumb line, so multiply by facingDir
                const endX = startX + (Math.sin(angleRad) * neckLength * facingDir);
                const endY = startY - (Math.cos(angleRad) * neckLength); // -Y is Up
                
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
                
                // NO CIRCLE - just the line showing the deviation
              } else {
                console.log(`[OVERLAY] ✗ Skipping forward head - no deviation detected`);
              }
            } else {
              console.log(`[OVERLAY] ✗ No forward_head data in analysis`);
            }
            
            // Rounded shoulders - draw forward position
            const shoulderForwardCm = Math.abs(analysis.shoulder_alignment?.forward_position_cm || 0);
            if (analysis.shoulder_alignment && (analysis.shoulder_alignment.status === 'Rounded' || shoulderForwardCm > 0)) {
              deviationCount++;
              console.log(`[OVERLAY] ✓ Drawing rounded shoulders: ${shoulderForwardCm}cm forward, status: ${analysis.shoulder_alignment.status}`);
              const forwardPx = Math.max(10, shoulderForwardCm * 10);
              const shoulderX = plumbX + (forwardPx * facingDir); // Shoulders are forward of plumb line
              
              // Draw line showing forward shoulder position
              ctx.beginPath();
              ctx.moveTo(shoulderX, shoulderY);
              ctx.lineTo(plumbX, shoulderY);
              ctx.stroke();
            }
            
            // Torso angle (kyphosis) - draw line showing forward curve
            const kyphosisDegrees = analysis.kyphosis?.curve_degrees || 0;
            if (analysis.kyphosis && kyphosisDegrees > 0) {
              deviationCount++;
              console.log(`[OVERLAY] ✓ Drawing kyphosis: ${kyphosisDegrees}°, status: ${analysis.kyphosis.status}`);
              // Draw line from shoulder to mid-back showing curve
              const midBackY = (shoulderY + hipY) / 2;
              const idealKyphosis = 30; // Ideal thoracic curve
              const deviationDegrees = Math.max(0, kyphosisDegrees - idealKyphosis);
              const forwardOffset = Math.tan((deviationDegrees * Math.PI) / 180) * (midBackY - shoulderY);
              
              // Draw curved line showing forward deviation (forward = negative X for side views)
              ctx.beginPath();
              ctx.moveTo(plumbX, shoulderY);
              ctx.lineTo(plumbX - (forwardOffset * facingDir), midBackY);
              ctx.stroke();
            }
            
            // Pelvic Tilt - FIXED with facing direction awareness
            const pelvicTilt = analysis.pelvic_tilt;
            if (pelvicTilt) {
              console.log(`[OVERLAY] pelvic_tilt data:`, pelvicTilt);
              const tiltDegrees = pelvicTilt.anterior_tilt_degrees || 0; // Positive = Anterior
              const isAnterior = tiltDegrees > 0 || (pelvicTilt.status || '').includes('Anterior');
              const tiltAbs = Math.abs(tiltDegrees);
              
              if (tiltAbs > 0) {
                deviationCount++;
                console.log(`[OVERLAY] ✓ Drawing pelvic tilt: ${tiltDegrees}° (absolute: ${tiltAbs}°), status: ${pelvicTilt.status}, isAnterior: ${isAnterior}, facingDir: ${facingDir}`);
                
                const lineLen = canvas.width * 0.2; // Length of the hip line
                const tiltRad = (tiltAbs * Math.PI) / 180;
                
                // Calculate offsets
                // If Anterior: Belt buckle drops.
                // Facing Right: Front (Right) Y increases. Back (Left) Y decreases.
                // Facing Left: Front (Left) Y increases. Back (Right) Y decreases.
                
                let frontYOffset, backYOffset;
                
                if (isAnterior) {
                  // Front drops down (+Y), Back goes up (-Y)
                  frontYOffset = Math.sin(tiltRad) * (lineLen / 2);
                  backYOffset = -Math.sin(tiltRad) * (lineLen / 2);
                } else {
                  // Posterior: Front goes up (-Y), Back drops down (+Y)
                  frontYOffset = -Math.sin(tiltRad) * (lineLen / 2);
                  backYOffset = Math.sin(tiltRad) * (lineLen / 2);
                }
                
                const frontX = plumbX + ((lineLen / 2) * facingDir);
                const frontY = hipY + frontYOffset;
                
                const backX = plumbX - ((lineLen / 2) * facingDir);
                const backY = hipY + backYOffset;
                
                // Draw the tilted Red Line (NO CIRCLE/ARC - just offset line)
                ctx.beginPath();
                ctx.moveTo(backX, backY);
                ctx.lineTo(frontX, frontY);
                ctx.stroke();
                
                // Draw green horizontal reference line for comparison (ideal alignment)
                ctx.strokeStyle = '#00ff00'; // Green reference
                ctx.lineWidth = 1;
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.moveTo(plumbX - (lineLen / 2), hipY);
                ctx.lineTo(plumbX + (lineLen / 2), hipY);
                ctx.stroke();
                
                // NO ARC/CIRCLE - just the offset lines showing the tilt
                
                // Reset to red solid line for other deviations
                ctx.strokeStyle = '#ff0000';
                ctx.lineWidth = 3;
                ctx.setLineDash([5, 5]);
              } else {
                console.log(`[OVERLAY] ✗ Skipping pelvic tilt - no deviation detected`);
              }
            } else {
              console.log(`[OVERLAY] ✗ No pelvic_tilt data in analysis`);
            }
          }
        }
        
        // Convert back to base64
        const overlayImage = canvas.toDataURL('image/jpeg', 0.95);
        console.log(`[OVERLAY] ===== COMPLETED DEVIATION OVERLAY FOR ${view} =====`);
        console.log(`[OVERLAY] Total deviations drawn: ${deviationCount}`);
        if (deviationCount === 0) {
          console.warn(`[OVERLAY] ⚠️ NO DEVIATIONS DRAWN! Check analysis data structure.`);
        }
        resolve(overlayImage);
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    img.src = imageData;
  });
}

/**
 * Add deviation lines to an image after AI analysis
 * This is called after analysis is complete to add red deviation lines
 */
export async function addDeviationOverlay(
  imageData: string,
  view: 'front' | 'side-right' | 'side-left' | 'back',
  analysis: any
): Promise<string> {
  return addPostureOverlay(imageData, view, {
    showMidline: true,
    showShoulderLine: true,
    showHipLine: true,
    lineColor: '#00ff00',
    lineWidth: 2,
    analysis
  });
}
