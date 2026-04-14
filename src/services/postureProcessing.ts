/**
 * UNIFIED POSTURE PROCESSING SYSTEM
 * 
 * Single entry point for ALL image sources:
 * - Manual file upload
 * - Mobile companion handoff
 * - This device (camera on tablet or desktop)
 * 
 * Flow:
 * 1. Detect landmarks with MediaPipe (or use provided)
 * 2. Draw wireframe overlay
 * 3. Calculate deviations using trigonometry (postureMath.ts)
 * 4. Deterministic template + structured feedback library (no Gemini narrative call).
 */

import { CONFIG } from '@/config';
import {
  POSTURE_LANDMARK_QUALITY_COPY,
  postureLandmarkStructuralRetakeReason,
} from '@/constants/postureLandmarkQuality';
import { LandmarkResult, detectPostureLandmarks } from '@/lib/ai/postureLandmarks';
import { drawLandmarkWireframe } from '@/lib/utils/postureOverlay';
import { buildPostureResult } from '@/lib/ai/postureTemplates';
import type { PostureAiContext, PostureAnalysisResult } from '@/lib/ai/postureAnalysis';
import { buildStructuredPostureFindings } from '@/lib/posture/buildStructuredPostureFindings';
import type { PostureFindingViewId } from '@/lib/types/postureFindings';
import { logger } from '@/lib/utils/logger';

export interface LandmarkConfidence {
  confident: boolean;
  avgVisibility: number;
  retakeReason?: string;
}

export interface PostureProcessingResult {
  alignedImage: string; // Image with green reference lines
  imageWithDeviations: string; // Image with green + red deviation lines
  wireframeImage?: string; // Image with MediaPipe skeleton overlay (for debugging/visualization)
  analysis: PostureAnalysisResult; // Complete analysis with metrics and descriptions
  landmarks: LandmarkResult; // Detected landmarks
  landmarkConfidence: LandmarkConfidence; // Visibility-based quality signal
}

/** Indices of structural landmarks for visibility / Companion retry averaging. */
export const POSTURE_STRUCTURAL_LANDMARK_INDICES = [11, 12, 23, 24, 27, 28] as const;

export type PostureStillCaptureViewId = (typeof CONFIG.POSTURE_VIEWS)[number]['id'];

export interface StructuralAnchorGateResult {
  pass: boolean;
  avgVisibility: number;
  minAnchorVisibility: number;
  /** Grouped user-facing regions (e.g. Shoulders, Hips, Feet) when any anchor fails the threshold. */
  failingRegions: string[];
}

/**
 * Strict gate: every structural anchor (11,12,23,24,27,28) must meet
 * {@link CONFIG.COMPANION.POSE_THRESHOLDS.STRUCTURAL_ANCHOR_MIN_VISIBILITY}.
 */
export function evaluateStructuralAnchorVisibility(
  raw: import('@/lib/types/mediapipe').MediaPipeLandmark[] | undefined
): StructuralAnchorGateResult {
  const threshold = CONFIG.COMPANION.POSE_THRESHOLDS.STRUCTURAL_ANCHOR_MIN_VISIBILITY;
  const avgVisibility = averageStructuralLandmarkVisibility(raw);
  if (!raw?.length) {
    return { pass: false, avgVisibility, minAnchorVisibility: 0, failingRegions: ['Body'] };
  }
  const failingIndices: number[] = [];
  let minAnchorVisibility = 1;
  for (const index of POSTURE_STRUCTURAL_LANDMARK_INDICES) {
    const lm = raw[index];
    const v = lm?.visibility ?? 0;
    minAnchorVisibility = Math.min(minAnchorVisibility, v);
    if (v < threshold) {
      failingIndices.push(index);
    }
  }
  const failingRegions = structuralIndicesToRegionLabels(failingIndices);
  return {
    pass: failingIndices.length === 0,
    avgVisibility,
    minAnchorVisibility,
    failingRegions,
  };
}

function structuralIndicesToRegionLabels(indices: readonly number[]): string[] {
  const labels: string[] = [];
  if (indices.some((i) => i === 11 || i === 12)) labels.push('Shoulders');
  if (indices.some((i) => i === 23 || i === 24)) labels.push('Hips');
  if (indices.some((i) => i === 27 || i === 28)) labels.push('Feet');
  return labels;
}

/**
 * Single-frame gate for Companion / guided capture before accepting a screenshot.
 */
export async function evaluateCompanionStillCaptureLandmarks(
  imageData: string,
  view: PostureStillCaptureViewId
): Promise<
  | { ok: true; avgVisibility: number; minAnchorVisibility: number }
  | { ok: false; avgVisibility: number; minAnchorVisibility: number; failingRegions: string[] }
> {
  const landmarks = await detectPostureLandmarks(imageData, view);
  const gate = evaluateStructuralAnchorVisibility(landmarks.raw);
  if (!gate.pass) {
    return {
      ok: false,
      avgVisibility: gate.avgVisibility,
      minAnchorVisibility: gate.minAnchorVisibility,
      failingRegions: gate.failingRegions,
    };
  }
  return { ok: true, avgVisibility: gate.avgVisibility, minAnchorVisibility: gate.minAnchorVisibility };
}

export function averageStructuralLandmarkVisibility(
  raw: import('@/lib/types/mediapipe').MediaPipeLandmark[] | undefined
): number {
  if (!raw?.length) return 0;
  const structural = POSTURE_STRUCTURAL_LANDMARK_INDICES.map((i) => raw[i]).filter(Boolean);
  if (structural.length === 0) return 0;
  return structural.reduce((sum, l) => sum + (l.visibility ?? 0), 0) / structural.length;
}

function assessLandmarkConfidence(
  raw: import('@/lib/types/mediapipe').MediaPipeLandmark[] | undefined
): LandmarkConfidence {
  if (!raw || raw.length === 0) {
    return { confident: false, avgVisibility: 0, retakeReason: POSTURE_LANDMARK_QUALITY_COPY.NO_LANDMARKS };
  }
  const structural = POSTURE_STRUCTURAL_LANDMARK_INDICES.map((i) => raw[i]).filter(Boolean);
  if (structural.length === 0) {
    return {
      confident: false,
      avgVisibility: 0,
      retakeReason: POSTURE_LANDMARK_QUALITY_COPY.KEY_POINTS_MISSING,
    };
  }
  const gate = evaluateStructuralAnchorVisibility(raw);
  if (!gate.pass) {
    return {
      confident: false,
      avgVisibility: gate.avgVisibility,
      retakeReason: postureLandmarkStructuralRetakeReason(gate.failingRegions),
    };
  }
  return { confident: true, avgVisibility: gate.avgVisibility };
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
  source: 'manual' | 'companion' | 'this-device' = 'manual',
  onProgress?: OnProgressCallback,
  aiContext?: PostureAiContext
): Promise<PostureProcessingResult> {
  const ctx = 'POSTURE_PROCESSING';
  void aiContext;

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
    const wireframeImage = wireframeOnOriginal;
    
    // Emit wireframe stage immediately
    onProgress?.({ stage: 'wireframe', view, wireframeImage });
    
    // Emit analyzing stage
    onProgress?.({ stage: 'analyzing', view });
    
    // STEP 4: Deterministic templates + structured feedback library (no second-pass AI)
    const templateBase = buildPostureResult(landmarks, view);
    const viewKey = view as PostureFindingViewId;
    const structuredFindings = buildStructuredPostureFindings(viewKey, templateBase);
    const analysis: PostureAnalysisResult = {
      ...templateBase,
      structuredFindings,
      overall_assessment: '',
    };
    logger.debug(`Template + structured findings complete for ${view}`, ctx);

    logger.debug(`Complete processing for ${view}`, ctx);
    
    const landmarkConfidence = assessLandmarkConfidence(landmarks.raw);
    if (!landmarkConfidence.confident) {
      logger.warn(`[POSTURE] Low landmark confidence (${landmarkConfidence.avgVisibility.toFixed(2)}): ${landmarkConfidence.retakeReason}`, ctx);
    }

    return {
      alignedImage: imageData,
      imageWithDeviations: wireframeImage,
      wireframeImage,
      analysis,
      landmarks,
      landmarkConfidence,
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
    leftKyphosis?.status !== 'Within range',
    leftPelvis?.status !== 'Neutral'
  ].filter(Boolean).length;
  
  const rightIssues = [
    rightFHP?.status !== 'Neutral',
    rightShoulder?.rounded_forward,
    rightKyphosis?.status !== 'Within range',
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
