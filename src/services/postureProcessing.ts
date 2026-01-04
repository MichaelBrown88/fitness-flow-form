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
import { addPostureOverlay, addDeviationOverlay } from '@/lib/utils/postureOverlay';
import { calculateFrontViewMetrics, calculateSideViewMetrics } from '@/lib/utils/postureMath';
import { analyzePostureImage } from '@/lib/ai/postureAnalysis';
import { PostureAnalysisResult } from '@/lib/ai/postureAnalysis';

export interface PostureProcessingResult {
  alignedImage: string; // Image with green reference lines
  imageWithDeviations: string; // Image with green + red deviation lines
  analysis: PostureAnalysisResult; // Complete analysis with metrics and descriptions
  landmarks: LandmarkResult; // Detected landmarks
}

/**
 * UNIFIED PROCESSING FUNCTION
 * Processes a posture image from ANY source using the same flow
 */
export async function processPostureImage(
  imageData: string,
  view: 'front' | 'side-right' | 'side-left' | 'back',
  providedLandmarks?: LandmarkResult,
  source: 'manual' | 'iphone' | 'this-device' = 'manual'
): Promise<PostureProcessingResult> {
  try {
    console.log(`[PROCESS_POSTURE] Starting processing for ${view} (source: ${source})`);
    
    // STEP 1: Detect landmarks (or use provided)
    let landmarks: LandmarkResult;
    if (providedLandmarks) {
      landmarks = providedLandmarks;
      console.log(`[PROCESS_POSTURE] Using provided landmarks for ${view}`);
    } else {
      try {
        console.log(`[PROCESS_POSTURE] Detecting landmarks for ${view}...`);
        landmarks = await detectPostureLandmarks(imageData, view);
        console.log(`[PROCESS_POSTURE] Landmarks detected for ${view}`);
      } catch (landmarkError) {
        console.error(`[PROCESS_POSTURE] Landmark detection failed for ${view}:`, landmarkError);
        throw new Error(`Failed to detect landmarks: ${landmarkError instanceof Error ? landmarkError.message : 'Unknown error'}`);
      }
    }

    // STEP 2: Align image with green reference lines
    let alignedImage: string;
    try {
      console.log(`[PROCESS_POSTURE] Aligning image for ${view}...`);
      alignedImage = await addPostureOverlay(imageData, view, {
        showMidline: true,
        showShoulderLine: true,
        showHipLine: true,
        lineColor: '#00ff00',
        lineWidth: 4,
        mode: 'align',
        landmarks,
      });
      console.log(`[PROCESS_POSTURE] Image aligned for ${view}`);
    } catch (alignError) {
      console.error(`[PROCESS_POSTURE] Alignment failed for ${view}:`, alignError);
      throw new Error(`Failed to align image: ${alignError instanceof Error ? alignError.message : 'Unknown error'}`);
    }

    // STEP 3: Calculate metrics using trigonometry (deterministic, no AI)
    let calculatedMetrics: Partial<import('@/lib/utils/postureMath').CalculatedPostureMetrics> = {};
    if (landmarks.raw) {
      try {
        if (view === 'front' || view === 'back') {
          calculatedMetrics = calculateFrontViewMetrics(landmarks.raw);
        } else {
          calculatedMetrics = calculateSideViewMetrics(landmarks.raw);
        }
        console.log(`[PROCESS_POSTURE] Metrics calculated for ${view}`);
      } catch (metricsError) {
        console.warn(`[PROCESS_POSTURE] Metrics calculation failed for ${view}, continuing without metrics:`, metricsError);
        // Continue without metrics - not critical
      }
    }

    // STEP 4: Use AI ONLY to convert numbers → user-friendly descriptions
    let analysis;
    try {
      console.log(`[PROCESS_POSTURE] Generating AI analysis for ${view}...`);
      analysis = await analyzePostureImage(alignedImage, view, {
        ...landmarks,
        raw: landmarks.raw, // Pass raw landmarks so AI can refine if needed
      });
      console.log(`[PROCESS_POSTURE] AI analysis complete for ${view}`);
    } catch (analysisError) {
      console.error(`[PROCESS_POSTURE] AI analysis failed for ${view}:`, analysisError);
      throw new Error(`Failed to generate analysis: ${analysisError instanceof Error ? analysisError.message : 'Unknown error'}`);
    }

    // STEP 5: Draw red deviation lines based on calculated metrics
    let imageWithDeviations: string;
    try {
      console.log(`[PROCESS_POSTURE] Adding deviation overlay for ${view}...`);
      imageWithDeviations = await addDeviationOverlay(alignedImage, view, analysis);
      console.log(`[PROCESS_POSTURE] Deviation overlay added for ${view}`);
    } catch (deviationError) {
      console.error(`[PROCESS_POSTURE] Deviation overlay failed for ${view}, using aligned image:`, deviationError);
      // Fallback to aligned image if deviation overlay fails
      imageWithDeviations = alignedImage;
    }

    console.log(`[PROCESS_POSTURE] Complete processing for ${view}`);
    return {
      alignedImage,
      imageWithDeviations,
      analysis,
      landmarks,
    };
  } catch (error) {
    console.error(`[PROCESS_POSTURE] Fatal error processing ${view}:`, error);
    throw error;
  }
}

