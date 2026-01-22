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
import { logger } from '@/lib/utils/logger';

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
  const ctx = 'POSTURE_PROCESSING';
  
  try {
    logger.debug(`Starting processing for ${view} (source: ${source})`, ctx);
    
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

    // STEP 2 & 3: Run alignment and metrics calculation in PARALLEL
    // Both only depend on landmarks, so we can execute them simultaneously
    logger.debug(`Starting parallel alignment + metrics for ${view}...`, ctx);
    
    // Metrics calculation helper (wrapped for Promise.all)
    const calculateMetricsAsync = (): Promise<Partial<import('@/lib/utils/postureMath').CalculatedPostureMetrics>> => {
      return new Promise((resolve) => {
        if (!landmarks.raw) {
          resolve({});
          return;
        }
        try {
          const metrics = view === 'front' || view === 'back'
            ? calculateFrontViewMetrics(landmarks.raw)
            : calculateSideViewMetrics(landmarks.raw, view);
          logger.debug(`Metrics calculated for ${view}`, ctx);
          resolve(metrics);
        } catch (metricsError) {
          logger.warn(`Metrics calculation failed for ${view}, continuing without metrics`, ctx, metricsError);
          resolve({});
        }
      });
    };
    
    // Alignment helper (wrapped for error handling)
    const alignImageAsync = async (): Promise<string> => {
      try {
        const aligned = await addPostureOverlay(imageData, view, {
          showMidline: true,
          showShoulderLine: true,
          showHipLine: true,
          lineColor: '#00ff00',
          lineWidth: 4,
          mode: 'align',
          landmarks,
        });
        logger.debug(`Image aligned for ${view}`, ctx);
        return aligned;
      } catch (alignError) {
        logger.error(`Alignment failed for ${view}`, ctx, alignError);
        throw new Error(`Failed to align image: ${alignError instanceof Error ? alignError.message : 'Unknown error'}`);
      }
    };
    
    // Execute alignment and metrics in parallel
    const [alignedImage, calculatedMetrics] = await Promise.all([
      alignImageAsync(),
      calculateMetricsAsync(),
    ]);
    
    logger.debug(`Parallel alignment + metrics complete for ${view}`, ctx);

    // STEP 4: Use AI ONLY to convert numbers → user-friendly descriptions
    let analysis: PostureAnalysisResult;
    try {
      logger.debug(`Generating AI analysis for ${view}...`, ctx);
      analysis = await analyzePostureImage(alignedImage, view, {
        ...landmarks,
        raw: landmarks.raw,
      });
      
      // IMPORTANT: Merge MediaPipe landmarks back into analysis result
      // The AI returns its own landmarks, but we need the RAW MediaPipe data
      // for accurate drawing of deviation lines (especially ear position for FHP)
      if (landmarks.raw) {
        analysis.landmarks = {
          ...analysis.landmarks,
          raw: landmarks.raw,
        };
      }
      
      // OVERRIDE AI severity with MediaPipe-calculated severity (more accurate)
      // The AI often gets severity wrong, especially for FHP on left side view
      if (view === 'side-left' || view === 'side-right') {
        if (calculatedMetrics.headSeverity && analysis.forward_head) {
          const mediaPipeSeverity = calculatedMetrics.headSeverity;
          const aiSeverity = analysis.forward_head.status;
          
          // Use MediaPipe calculation as source of truth
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

    // STEP 5: Draw red deviation lines based on calculated metrics
    let imageWithDeviations: string;
    try {
      logger.debug(`Adding deviation overlay for ${view}...`, ctx);
      imageWithDeviations = await addDeviationOverlay(alignedImage, view, analysis);
      logger.debug(`Deviation overlay added for ${view}`, ctx);
    } catch (deviationError) {
      logger.warn(`Deviation overlay failed for ${view}, using aligned image`, ctx, deviationError);
      imageWithDeviations = alignedImage;
    }

    logger.debug(`Complete processing for ${view}`, ctx);
    return {
      alignedImage,
      imageWithDeviations,
      analysis,
      landmarks,
    };
  } catch (error) {
    logger.error(`Fatal error processing ${view}`, ctx, error);
    throw error;
  }
}

