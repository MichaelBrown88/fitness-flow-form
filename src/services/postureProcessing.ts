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
import { drawLandmarkWireframe } from '@/lib/utils/postureOverlay';
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
export type ProcessingStage = 'detecting' | 'wireframe' | 'analyzing' | 'complete';

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
    
    // STEP 3: Use wireframe on original image directly (no cropping/resizing)
    // This preserves the original image dimensions - no borders added
    const wireframeImage = wireframeOnOriginal;
    const croppedImage = imageData; // Original for AI analysis
    
    // Emit wireframe stage immediately
    onProgress?.({ stage: 'wireframe', view, wireframeImage });
    logger.debug(`Using original dimensions for ${view} (no crop)`, ctx);
    
    // STEP 4: Calculate metrics (synchronous, fast)
    let calculatedMetrics: Partial<import('@/lib/utils/postureMath').CalculatedPostureMetrics> = {};
    if (landmarks.raw) {
      try {
        calculatedMetrics = view === 'front' || view === 'back'
          ? calculateFrontViewMetrics(landmarks.raw, view)
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
          ...landmarks,
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
  logger.debug('\n' + '═'.repeat(60));
  logger.debug('📊 SIDE VIEW COMPARISON: LEFT vs RIGHT');
  logger.debug('═'.repeat(60));
  
  if (!leftAnalysis || !rightAnalysis) {
    logger.debug('⚠️ Missing analysis data for comparison');
    return;
  }
  
  // Forward Head Posture comparison
  const leftFHP = leftAnalysis.forward_head;
  const rightFHP = rightAnalysis.forward_head;
  
  logger.debug('\n🔍 FORWARD HEAD POSTURE:');
  logger.debug(`   Left Side:  ${leftFHP?.status} (${leftFHP?.deviation_cm?.toFixed(1) || '?'}cm)`);
  logger.debug(`   Right Side: ${rightFHP?.status} (${rightFHP?.deviation_cm?.toFixed(1) || '?'}cm)`);
  
  if (leftFHP?.status !== rightFHP?.status) {
    logger.debug(`   ⚠️ ASYMMETRY DETECTED!`);
    logger.debug(`   Possible causes:`);
    logger.debug(`   - Rotational component to posture (torso twist)`);
    logger.debug(`   - Dominant side compensation`);
    logger.debug(`   - Habitual head turn preference`);
    logger.debug(`   - Scoliosis affecting head position`);
  }
  
  // Shoulder comparison
  const leftShoulder = leftAnalysis.shoulder_alignment;
  const rightShoulder = rightAnalysis.shoulder_alignment;
  
  logger.debug('\n🔍 SHOULDER POSITION:');
  logger.debug(`   Left Side:  ${leftShoulder?.status} (rounded: ${leftShoulder?.rounded_forward})`);
  logger.debug(`   Right Side: ${rightShoulder?.status} (rounded: ${rightShoulder?.rounded_forward})`);
  
  if (leftShoulder?.rounded_forward !== rightShoulder?.rounded_forward) {
    logger.debug(`   ⚠️ ASYMMETRY DETECTED!`);
    logger.debug(`   Possible causes:`);
    logger.debug(`   - Unilateral pec tightness`);
    logger.debug(`   - Rotator cuff imbalance`);
    logger.debug(`   - Thoracic rotation`);
  }
  
  // Kyphosis comparison
  const leftKyphosis = leftAnalysis.kyphosis;
  const rightKyphosis = rightAnalysis.kyphosis;
  
  logger.debug('\n🔍 KYPHOSIS (Upper Back):');
  logger.debug(`   Left Side:  ${leftKyphosis?.status}`);
  logger.debug(`   Right Side: ${rightKyphosis?.status}`);
  
  // Lordosis comparison
  const leftLordosis = leftAnalysis.lordosis;
  const rightLordosis = rightAnalysis.lordosis;
  
  logger.debug('\n🔍 LORDOSIS (Lower Back):');
  logger.debug(`   Left Side:  ${leftLordosis?.status}`);
  logger.debug(`   Right Side: ${rightLordosis?.status}`);
  
  // Pelvic Tilt comparison
  const leftPelvis = leftAnalysis.pelvic_tilt;
  const rightPelvis = rightAnalysis.pelvic_tilt;
  
  logger.debug('\n🔍 PELVIC TILT:');
  logger.debug(`   Left Side:  ${leftPelvis?.status}`);
  logger.debug(`   Right Side: ${rightPelvis?.status}`);
  
  if (leftPelvis?.status !== rightPelvis?.status) {
    logger.debug(`   ⚠️ ASYMMETRY DETECTED!`);
    logger.debug(`   Possible causes:`);
    logger.debug(`   - Pelvic rotation (one hip forward)`);
    logger.debug(`   - Hip flexor length difference`);
    logger.debug(`   - Leg length discrepancy`);
  }
  
  // Summary
  logger.debug('\n' + '─'.repeat(60));
  logger.debug('📋 CORRECTIVE EXERCISE PRIORITIES:');
  
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
    logger.debug(`   ⚡ LEFT SIDE shows more deviations (${leftIssues} vs ${rightIssues})`);
    logger.debug(`   Focus on: Left-side mobility and right-side strengthening`);
  } else if (rightIssues > leftIssues) {
    logger.debug(`   ⚡ RIGHT SIDE shows more deviations (${rightIssues} vs ${leftIssues})`);
    logger.debug(`   Focus on: Right-side mobility and left-side strengthening`);
  } else {
    logger.debug(`   ✓ Both sides show similar findings (${leftIssues} issues each)`);
  }
  
  // Specific recommendations
  if (leftFHP?.status !== 'Neutral' || rightFHP?.status !== 'Neutral') {
    logger.debug(`\n   For Forward Head:`);
    logger.debug(`   - Chin tucks (2x daily)`);
    logger.debug(`   - Upper trap stretches`);
    logger.debug(`   - Deep neck flexor strengthening`);
  }
  
  if (leftShoulder?.rounded_forward || rightShoulder?.rounded_forward) {
    logger.debug(`\n   For Rounded Shoulders:`);
    logger.debug(`   - Doorway pec stretch`);
    logger.debug(`   - Face pulls`);
    logger.debug(`   - Wall angels`);
  }
  
  if (leftPelvis?.status?.includes('Anterior') || rightPelvis?.status?.includes('Anterior')) {
    logger.debug(`\n   For Anterior Pelvic Tilt:`);
    logger.debug(`   - Hip flexor stretch (especially psoas)`);
    logger.debug(`   - Glute bridges`);
    logger.debug(`   - Dead bugs for core stability`);
  }
  
  logger.debug('\n' + '═'.repeat(60) + '\n');
}

// Make comparison function available globally for console use
if (typeof window !== 'undefined') {
  (window as Window & { compareSideViews?: typeof compareSideViews }).compareSideViews = compareSideViews;
}
