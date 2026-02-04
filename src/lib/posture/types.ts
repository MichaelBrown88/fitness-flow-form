import type { PostureAnalysisResult } from '../ai/postureAnalysis';
import type { SeverityLevel } from '@/lib/utils/postureAlignment';

export type PostureView = 'front' | 'side-right' | 'side-left' | 'back';

export interface OverlayOptions {
  showMidline?: boolean;
  showShoulderLine?: boolean;
  showHipLine?: boolean;
  lineColor?: string;
  lineWidth?: number;
  analysis?: PostureAnalysisResult;
  mode?: 'reference' | 'align' | 'deviation';
  landmarks?: PostureAnalysisResult['landmarks'];
}

export interface LandmarkData {
  shoulder_y_percent?: number;
  hip_y_percent?: number;
  center_x_percent?: number;
  midfoot_x_percent?: number;
  head_y_percent?: number;
  raw?: Array<{ x: number; y: number; z?: number; visibility?: number }>;
}

export interface WireframeOptions {
  pointRadius?: number;
  lineWidth?: number;
  showLabels?: boolean;
  opacity?: number;
  pointColor?: string;
  lineColor?: string;
}

export interface WireframeOnlyOptions {
  pointColor?: string;
  lineColor?: string;
  backgroundColor?: string;
}

/**
 * Extended alignment data for front/back views
 */
export interface FrontBackAlignments {
  shoulders: {
    severity: SeverityLevel;
    leftY: number;
    rightY: number;
    diff: number;
    higherSide: 'left' | 'right' | 'level';
  };
  hips: {
    severity: SeverityLevel;
    leftY: number;
    rightY: number;
    diff: number;
    higherSide: 'left' | 'right' | 'level';
  };
  headTilt: {
    severity: SeverityLevel;
    leftY: number;
    rightY: number;
    diff: number;
    tiltDirection: 'left' | 'right' | 'level';
  };
  hipShift: {
    severity: SeverityLevel;
    midpointX: number;
    bodyMidlineX: number;
    shiftAmount: number;
    shiftDirection: 'left' | 'right' | 'centered';
  };
  lateralHead: {
    severity: SeverityLevel;
    noseX: number;
    midlineX: number;
    offset: number;
    direction: 'left' | 'right' | 'centered';
  };
  leftLeg: {
    severity: SeverityLevel;
    hipPos: { x: number; y: number };
    kneePos: { x: number; y: number };
    anklePos: { x: number; y: number };
    kneeDeviation: number;
    direction: 'valgus' | 'varus' | 'neutral';
  };
  rightLeg: {
    severity: SeverityLevel;
    hipPos: { x: number; y: number };
    kneePos: { x: number; y: number };
    anklePos: { x: number; y: number };
    kneeDeviation: number;
    direction: 'valgus' | 'varus' | 'neutral';
  };
  scoliosis?: {
    severity: SeverityLevel;
    shoulderMidX: number;
    hipMidX: number;
    spineMidX: number;
    deviation: number;
    direction: 'left' | 'right' | 'straight';
  };
  bodyMidlineX: number;
}

/**
 * Extended side view alignments
 */
export interface SideViewAlignments {
  plumbX: number;
  ear: {
    x: number;
    y: number;
    severity: SeverityLevel;
    forwardAmount: number;
    isForward: boolean;
  };
  eye: {
    x: number;
    y: number;
  };
  headUpDown: {
    status: 'neutral' | 'up' | 'down';
    severity: SeverityLevel;
    earEyeDiff: number;
  };
  shoulder: {
    x: number;
    y: number;
    severity: SeverityLevel;
    forwardAmount: number;
    isForward: boolean;
  };
  hip: {
    x: number;
    y: number;
    severity: SeverityLevel;
    forwardAmount: number;
    isForward: boolean;
  };
  knee: {
    x: number;
    y: number;
    status: 'neutral' | 'hyperextended' | 'flexed';
    deviation: number;
  };
  ankle: {
    x: number;
    y: number;
  };
  kyphosis: {
    severity: SeverityLevel;
    curveIndicator: number;
  };
  lordosis: {
    severity: SeverityLevel;
    curveIndicator: number;
    type: 'normal' | 'hyper' | 'hypo';
  };
  pelvicTilt: {
    severity: SeverityLevel;
    type: 'neutral' | 'anterior' | 'posterior';
    tiltIndicator: number;
  };
}

/**
 * VIEW-SPECIFIC LANDMARK CONNECTIONS
 * Only draw landmarks relevant to what we're assessing in each view
 */

// FRONT VIEW: Head tilt, shoulder level, hip level, knee alignment
export const FRONT_VIEW_CONNECTIONS: [number, number][] = [
  [7, 8],   // Ear to ear (head tilt line)
  [11, 12], // Shoulder line
  [11, 23], // Left shoulder to hip
  [12, 24], // Right shoulder to hip
  [23, 24], // Hip line
  [23, 25], // Left hip to knee
  [24, 26], // Right hip to knee
  [25, 27], // Left knee to ankle
  [26, 28], // Right knee to ankle
];

export const FRONT_VIEW_LANDMARKS = [0, 7, 8, 11, 12, 23, 24, 25, 26, 27, 28];

// BACK VIEW: Shoulder level, spinal curves, hip level, knee alignment (NO face landmarks)
export const BACK_VIEW_CONNECTIONS: [number, number][] = [
  [11, 12], // Shoulder line
  [11, 23], // Left side torso
  [12, 24], // Right side torso
  [23, 24], // Hip line
  [23, 25], // Left hip to knee
  [24, 26], // Right hip to knee
  [25, 27], // Left knee to ankle
  [26, 28], // Right knee to ankle
];

export const BACK_VIEW_LANDMARKS = [11, 12, 23, 24, 25, 26, 27, 28];

// SIDE-LEFT VIEW: Plumb line landmarks (vertical alignment)
export const SIDE_LEFT_CONNECTIONS: [number, number][] = [
  [7, 11],  // Left ear to shoulder
  [11, 23], // Shoulder to hip
  [23, 25], // Hip to knee
  [25, 27], // Knee to ankle
  [11, 13], // Shoulder to elbow
  [13, 15], // Elbow to wrist
];

export const SIDE_LEFT_LANDMARKS = [7, 11, 13, 15, 23, 25, 27];

// SIDE-RIGHT VIEW: Mirror of side-left using right-side landmarks
export const SIDE_RIGHT_CONNECTIONS: [number, number][] = [
  [8, 12],  // Right ear to shoulder
  [12, 24], // Shoulder to hip
  [24, 26], // Hip to knee
  [26, 28], // Knee to ankle
  [12, 14], // Shoulder to elbow
  [14, 16], // Elbow to wrist
];

export const SIDE_RIGHT_LANDMARKS = [8, 12, 14, 16, 24, 26, 28];

// Full pose connections for debug wireframe
export const DEBUG_POSE_CONNECTIONS: [number, number][] = [
  [11, 12], [11, 23], [12, 24], [23, 24],
  [11, 13], [13, 15], [12, 14], [14, 16],
  [23, 25], [25, 27], [24, 26], [26, 28],
];

// Colors for alignment visualization
export const ALIGNMENT_COLORS = {
  CONTROL: 'rgba(34, 197, 94, 0.8)',
  CONTROL_DASHED: [10, 6] as number[],
  GOOD: '#22c55e',
  GOOD_LINE: 'rgba(34, 197, 94, 1.0)',
  DEVIATION: '#ef4444',
  DEVIATION_LINE: 'rgba(239, 68, 68, 1.0)',
  MILD_DEVIATION: '#f97316',
  MILD_LINE: 'rgba(249, 115, 22, 1.0)',
  NEUTRAL: 'rgba(255, 255, 255, 0.7)',
  POINT_GOOD: '#22c55e',
  POINT_DEVIATION: '#ef4444',
  POINT_MILD: '#f97316',
  POINT_NEUTRAL: '#ffffff',
  MIDLINE: 'rgba(6, 182, 212, 0.85)',
};
