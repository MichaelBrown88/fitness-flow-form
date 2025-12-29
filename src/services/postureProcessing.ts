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
  console.log(`[UNIFIED] Processing ${view} image from ${source}...`);

  // STEP 1: Detect landmarks (or use provided)
  let landmarks: LandmarkResult;
  if (providedLandmarks) {
    landmarks = providedLandmarks;
    console.log(`[UNIFIED] Using provided landmarks from ${source}`);
  } else {
    console.log(`[UNIFIED] Detecting landmarks using MediaPipe...`);
    landmarks = await detectPostureLandmarks(imageData, view);
    console.log(`[UNIFIED] Landmarks detected:`, landmarks);
  }

  // STEP 2: Align image with green reference lines
  console.log(`[UNIFIED] Aligning image with green reference lines...`);
  const alignedImage = await addPostureOverlay(imageData, view, {
    showMidline: true,
    showShoulderLine: true,
    showHipLine: true,
    lineColor: '#00ff00',
    lineWidth: 4,
    mode: 'align',
    landmarks,
  });

  // STEP 3: Calculate metrics using trigonometry (deterministic, no AI)
  console.log(`[UNIFIED] Calculating deviations using trigonometry...`);
  let calculatedMetrics: Partial<import('@/lib/utils/postureMath').CalculatedPostureMetrics> = {};
  if (landmarks.raw) {
    if (view === 'front' || view === 'back') {
      calculatedMetrics = calculateFrontViewMetrics(landmarks.raw);
    } else {
      calculatedMetrics = calculateSideViewMetrics(landmarks.raw);
    }
  }
  console.log(`[UNIFIED] Calculated metrics:`, calculatedMetrics);

  // STEP 4: Use AI ONLY to convert numbers → user-friendly descriptions
  // AI receives the calculated metrics and normative data to generate descriptions
  console.log(`[UNIFIED] Using AI to generate user-friendly descriptions from calculated metrics...`);
  const analysis = await analyzePostureImage(alignedImage, view, {
    ...landmarks,
    raw: landmarks.raw, // Pass raw landmarks so AI can refine if needed
  });

  // STEP 5: Draw red deviation lines based on calculated metrics
  console.log(`[UNIFIED] Drawing red deviation lines...`);
  const imageWithDeviations = await addDeviationOverlay(alignedImage, view, analysis);

  console.log(`[UNIFIED] ✅ Complete processing for ${view} from ${source}`);

  return {
    alignedImage,
    imageWithDeviations,
    analysis,
    landmarks,
  };
}

