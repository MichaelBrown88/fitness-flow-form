/**
 * UNIFIED POSTURE PROCESSING SYSTEM
 * 
 * Single entry point for ALL image sources:
 * - Manual file upload
 * - iPhone Companion App handoff
 * - This Device (iPad/Direct camera)
 * 
 * Flow:
 * 1. Detect landmarks with MediaPipe (or use provided)
 * 2. Align image with green reference lines
 * 3. Calculate deviations using trigonometry (postureMath.ts)
 * 4. Use AI ONLY to convert numbers → user-friendly text (based on normative data)
 * 5. Draw red deviation lines
 * 
 * ONE SYSTEM - ONE FLOW - REDUCED BLOAT
 */

import { LandmarkResult, detectPostureLandmarks } from '@/lib/ai/postureLandmarks';
import { cropAndCenterImage, drawLandmarkWireframe } from '@/lib/utils/postureOverlay';
import { calculateFrontViewMetrics, calculateSideViewMetrics } from '@/lib/utils/postureMath';
import { analyzePostureImage } from '@/lib/ai/postureAnalysis';
import { PostureAnalysisResult } from '@/lib/ai/postureAnalysis';
import { logger } from '@/lib/utils/logger';

export interface PostureProcessingResult {
  alignedImage: string; // Image with green reference lines
  imageWithDeviations: string; // Image with green + red deviation lines
  wireframeImage?: string; // Image with MediaPipe skeleton overlay (for debugging/visualization)
  analysis: PostureAnalysisResult; // Complete analysis with metrics and descriptions
  landmarks: LandmarkResult; // Detected landmarks
}

// Progress stages for UI feedback
export type ProcessingStage = 'detecting' | 'wireframe' | 'aligning' | 'analyzing' | 'complete';

export interface ProcessingProgress {
  stage: ProcessingStage;
  view: string;
  wireframeImage?: string; // Available at 'wireframe' stage
  alignedImage?: string; // Available at 'aligning' stage
}

// Callback type for progress updates
export type OnProgressCallback = (progress: ProcessingProgress) => void;

/**
 * UNIFIED PROCESSING FUNCTION
 * Processes a posture image from ANY source using the same flow
 * 
 * @param onProgress - Optional callback for intermediate progress updates (wireframe, aligned image)
 */
export async function processPostureImage(
  imageData: string,
  view: 'front' | 'side-right' | 'side-left' | 'back',
  providedLandmarks?: LandmarkResult,
  source: 'manual' | 'iphone' | 'this-device' = 'manual',
  onProgress?: OnProgressCallback
): Promise<PostureProcessingResult> {
  const ctx = 'POSTURE_PROCESSING';
  
  try {
    logger.debug(`Starting processing for ${view} (source: ${source})`, ctx);
    
    // Emit detecting stage
    onProgress?.({ stage: 'detecting', view });
    
    // STEP 1: Detect landmarks (or use provided)
    let landmarks: LandmarkResult;
    if (providedLandmarks) {
      landmarks = providedLandmarks;
      logger.debug(`Using provided landmarks for ${view}`, ctx);
    } else {
      try {
        logger.debug(`Detecting landmarks for ${view}...`, ctx);
        landmarks = await detectPostureLandmarks(imageData, view);
        logger.debug(`Landmarks detected for ${view}`, ctx);
      } catch (landmarkError) {
        logger.error(`Landmark detection failed for ${view}`, ctx, landmarkError);
        throw new Error(`Failed to detect landmarks: ${landmarkError instanceof Error ? landmarkError.message : 'Unknown error'}`);
      }
    }

    // STEP 2: Draw wireframe on ORIGINAL image first (landmarks are in original coordinates)
    // This ensures landmarks align perfectly with the image
    let wireframeOnOriginal: string | undefined;
    if (landmarks.raw && landmarks.raw.length > 0) {
      try {
        logger.debug(`Generating wireframe on original image for ${view}...`, ctx);
        wireframeOnOriginal = await drawLandmarkWireframe(imageData, landmarks.raw, view, {
          pointColor: '#00ff00',
          lineColor: 'rgba(0, 255, 0, 0.8)',
          pointRadius: 8,
          lineWidth: 3,
          opacity: 0.95,
        });
        logger.debug(`Wireframe generated for ${view}`, ctx);
      } catch (wireframeError) {
        logger.warn(`Wireframe generation failed for ${view}, using original`, ctx, wireframeError);
        wireframeOnOriginal = imageData;
      }
    } else {
      wireframeOnOriginal = imageData;
    }
    
    // Emit aligning stage
    onProgress?.({ stage: 'aligning', view });
    
    // STEP 3: Crop and center the wireframe image (skeleton moves with the subject)
    // This ensures proper framing while keeping landmarks aligned
    let wireframeImage: string;
    let croppedImage: string;
    try {
      logger.debug(`Cropping wireframe for ${view}...`, ctx);
      // Crop the wireframe (with skeleton overlay)
      wireframeImage = await cropAndCenterImage(wireframeOnOriginal, view, landmarks);
      // Also crop original for AI analysis (clean, no overlay)
      croppedImage = await cropAndCenterImage(imageData, view, landmarks);
      logger.debug(`Images cropped for ${view}`, ctx);
      
      // Emit wireframe stage - this IS the final visualization
      onProgress?.({ stage: 'wireframe', view, wireframeImage });
    } catch (cropError) {
      logger.warn(`Cropping failed for ${view}, using uncropped`, ctx, cropError);
      wireframeImage = wireframeOnOriginal;
      croppedImage = imageData;
    }
    
    // STEP 4: Calculate metrics (synchronous, fast)
    let calculatedMetrics: Partial<import('@/lib/utils/postureMath').CalculatedPostureMetrics> = {};
    if (landmarks.raw) {
      try {
        calculatedMetrics = view === 'front' || view === 'back'
          ? calculateFrontViewMetrics(landmarks.raw)
          : calculateSideViewMetrics(landmarks.raw, view);
        logger.debug(`Metrics calculated for ${view}`, ctx);
      } catch (metricsError) {
        logger.warn(`Metrics calculation failed for ${view}`, ctx, metricsError);
      }
    }

    // Emit analyzing stage
    onProgress?.({ stage: 'analyzing', view });
    
    // STEP 5: Use AI to generate user-friendly descriptions
    let analysis: PostureAnalysisResult;
    try {
      logger.debug(`Generating AI analysis for ${view}...`, ctx);
      // Use the cropped image for AI analysis (cleaner, no wireframe overlay)
      analysis = await analyzePostureImage(croppedImage, view, {
        ...landmarks,
        raw: landmarks.raw,
      });
      
      // Merge MediaPipe landmarks back into analysis result
      if (landmarks.raw) {
        analysis.landmarks = {
          ...analysis.landmarks,
          raw: landmarks.raw,
        };
      }
      
      // Override AI severity with MediaPipe-calculated severity (more accurate)
      if (view === 'side-left' || view === 'side-right') {
        if (calculatedMetrics.headSeverity && analysis.forward_head) {
          const mediaPipeSeverity = calculatedMetrics.headSeverity;
          const aiSeverity = analysis.forward_head.status;
          
          if (mediaPipeSeverity !== aiSeverity) {
            logger.debug(`Overriding AI FHP severity (${aiSeverity}) with MediaPipe (${mediaPipeSeverity}) for ${view}`, ctx);
            analysis.forward_head.status = mediaPipeSeverity;
          }
        }
      }
      
      logger.debug(`AI analysis complete for ${view}`, ctx);
    } catch (analysisError) {
      logger.error(`AI analysis failed for ${view}`, ctx, analysisError);
      throw new Error(`Failed to generate analysis: ${analysisError instanceof Error ? analysisError.message : 'Unknown error'}`);
    }

    logger.debug(`Complete processing for ${view}`, ctx);
    
    // Return wireframe as the primary visualization
    // The wireframe already contains color-coded alignment indicators
    return {
      alignedImage: croppedImage, // Clean cropped image (no lines) for AI
      imageWithDeviations: wireframeImage, // Cropped wireframe IS the deviation visualization
      wireframeImage,
      analysis,
      landmarks,
    };
  } catch (error) {
    logger.error(`Fatal error processing ${view}`, ctx, error);
    throw error;
  }
}

/**
 * Compare left vs right side view analysis results
 * Logs differences and suggests possible causes
 */
export function compareSideViews(
  leftAnalysis: PostureAnalysisResult | null,
  rightAnalysis: PostureAnalysisResult | null
): void {
  console.log('\n' + '═'.repeat(60));
  console.log('📊 SIDE VIEW COMPARISON: LEFT vs RIGHT');
  console.log('═'.repeat(60));
  
  if (!leftAnalysis || !rightAnalysis) {
    console.log('⚠️ Missing analysis data for comparison');
    return;
  }
  
  // Forward Head Posture comparison
  const leftFHP = leftAnalysis.forward_head;
  const rightFHP = rightAnalysis.forward_head;
  
  console.log('\n🔍 FORWARD HEAD POSTURE:');
  console.log(`   Left Side:  ${leftFHP?.status} (${leftFHP?.deviation_cm?.toFixed(1) || '?'}cm)`);
  console.log(`   Right Side: ${rightFHP?.status} (${rightFHP?.deviation_cm?.toFixed(1) || '?'}cm)`);
  
  if (leftFHP?.status !== rightFHP?.status) {
    console.log(`   ⚠️ ASYMMETRY DETECTED!`);
    console.log(`   Possible causes:`);
    console.log(`   - Rotational component to posture (torso twist)`);
    console.log(`   - Dominant side compensation`);
    console.log(`   - Habitual head turn preference`);
    console.log(`   - Scoliosis affecting head position`);
  }
  
  // Shoulder comparison
  const leftShoulder = leftAnalysis.shoulder_alignment;
  const rightShoulder = rightAnalysis.shoulder_alignment;
  
  console.log('\n🔍 SHOULDER POSITION:');
  console.log(`   Left Side:  ${leftShoulder?.status} (rounded: ${leftShoulder?.rounded_forward})`);
  console.log(`   Right Side: ${rightShoulder?.status} (rounded: ${rightShoulder?.rounded_forward})`);
  
  if (leftShoulder?.rounded_forward !== rightShoulder?.rounded_forward) {
    console.log(`   ⚠️ ASYMMETRY DETECTED!`);
    console.log(`   Possible causes:`);
    console.log(`   - Unilateral pec tightness`);
    console.log(`   - Rotator cuff imbalance`);
    console.log(`   - Thoracic rotation`);
  }
  
  // Kyphosis comparison
  const leftKyphosis = leftAnalysis.kyphosis;
  const rightKyphosis = rightAnalysis.kyphosis;
  
  console.log('\n🔍 KYPHOSIS (Upper Back):');
  console.log(`   Left Side:  ${leftKyphosis?.status}`);
  console.log(`   Right Side: ${rightKyphosis?.status}`);
  
  // Lordosis comparison
  const leftLordosis = leftAnalysis.lordosis;
  const rightLordosis = rightAnalysis.lordosis;
  
  console.log('\n🔍 LORDOSIS (Lower Back):');
  console.log(`   Left Side:  ${leftLordosis?.status}`);
  console.log(`   Right Side: ${rightLordosis?.status}`);
  
  // Pelvic Tilt comparison
  const leftPelvis = leftAnalysis.pelvic_tilt;
  const rightPelvis = rightAnalysis.pelvic_tilt;
  
  console.log('\n🔍 PELVIC TILT:');
  console.log(`   Left Side:  ${leftPelvis?.status}`);
  console.log(`   Right Side: ${rightPelvis?.status}`);
  
  if (leftPelvis?.status !== rightPelvis?.status) {
    console.log(`   ⚠️ ASYMMETRY DETECTED!`);
    console.log(`   Possible causes:`);
    console.log(`   - Pelvic rotation (one hip forward)`);
    console.log(`   - Hip flexor length difference`);
    console.log(`   - Leg length discrepancy`);
  }
  
  // Summary
  console.log('\n' + '─'.repeat(60));
  console.log('📋 CORRECTIVE EXERCISE PRIORITIES:');
  
  // Determine which side has more issues
  const leftIssues = [
    leftFHP?.status !== 'Neutral',
    leftShoulder?.rounded_forward,
    leftKyphosis?.status !== 'Normal',
    leftPelvis?.status !== 'Neutral'
  ].filter(Boolean).length;
  
  const rightIssues = [
    rightFHP?.status !== 'Neutral',
    rightShoulder?.rounded_forward,
    rightKyphosis?.status !== 'Normal',
    rightPelvis?.status !== 'Neutral'
  ].filter(Boolean).length;
  
  if (leftIssues > rightIssues) {
    console.log(`   ⚡ LEFT SIDE shows more deviations (${leftIssues} vs ${rightIssues})`);
    console.log(`   Focus on: Left-side mobility and right-side strengthening`);
  } else if (rightIssues > leftIssues) {
    console.log(`   ⚡ RIGHT SIDE shows more deviations (${rightIssues} vs ${leftIssues})`);
    console.log(`   Focus on: Right-side mobility and left-side strengthening`);
  } else {
    console.log(`   ✓ Both sides show similar findings (${leftIssues} issues each)`);
  }
  
  // Specific recommendations
  if (leftFHP?.status !== 'Neutral' || rightFHP?.status !== 'Neutral') {
    console.log(`\n   For Forward Head:`);
    console.log(`   - Chin tucks (2x daily)`);
    console.log(`   - Upper trap stretches`);
    console.log(`   - Deep neck flexor strengthening`);
  }
  
  if (leftShoulder?.rounded_forward || rightShoulder?.rounded_forward) {
    console.log(`\n   For Rounded Shoulders:`);
    console.log(`   - Doorway pec stretch`);
    console.log(`   - Face pulls`);
    console.log(`   - Wall angels`);
  }
  
  if (leftPelvis?.status?.includes('Anterior') || rightPelvis?.status?.includes('Anterior')) {
    console.log(`\n   For Anterior Pelvic Tilt:`);
    console.log(`   - Hip flexor stretch (especially psoas)`);
    console.log(`   - Glute bridges`);
    console.log(`   - Dead bugs for core stability`);
  }
  
  console.log('\n' + '═'.repeat(60) + '\n');
}

// Make comparison function available globally for console use
if (typeof window !== 'undefined') {
  (window as Window & { compareSideViews?: typeof compareSideViews }).compareSideViews = compareSideViews;
}
