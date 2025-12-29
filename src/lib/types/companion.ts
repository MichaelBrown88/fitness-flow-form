/**
 * Types for Companion Modal Callbacks
 */

import type { FormData } from '@/contexts/FormContext';
import type { PostureAnalysisResult } from '@/lib/ai/postureAnalysis';

/**
 * Data structure returned by PostureCompanionModal.onComplete
 */
export interface PostureCompanionData {
  postureAiResults: Record<string, PostureAnalysisResult>;
  postureImages: Record<string, string>;
  postureImagesStorage: Record<string, string>;
  // Legacy fields for backward compatibility
  postureHeadOverall?: string[];
  postureShouldersOverall?: string[];
  postureBackOverall?: string[];
}

/**
 * Data structure returned by InBodyCompanionModal.onComplete
 */
export interface InBodyCompanionData extends Partial<FormData> {
  inbodyImage?: string;
}

