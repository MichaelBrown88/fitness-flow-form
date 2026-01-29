/**
 * POSTURE REFERENCE LINES
 * Renders alignment reference lines (ear-eye, hip, shoulder) on posture images.
 * Lines are GREEN if aligned (within threshold), RED if deviated.
 */

import React from 'react';
import { PostureAnalysisResult } from '@/lib/ai/postureAnalysis';

interface PostureReferenceLinesProps {
  view: 'front' | 'back' | 'side-left' | 'side-right';
  analysis: PostureAnalysisResult;
}

// Thresholds for determining deviation
const THRESHOLDS = {
  headPitchDegrees: 10,      // ±10° for head pitch (ear-eye level)
  hipPositionCm: 2,          // ±2cm for hip position from plumb
  shoulderDiffCm: 1.0,       // 1.0cm shoulder height difference
  hipDiffCm: 1.0,            // 1.0cm hip height difference
};

/**
 * Check if head pitch is a deviation (side views)
 */
function isHeadPitchDeviation(analysis: PostureAnalysisResult): boolean {
  const status = analysis.head_updown?.status;
  return status === 'Looking Up' || status === 'Looking Down';
}

/**
 * Check if hip alignment is a deviation (side views - forward/behind plumb)
 */
function isHipPositionDeviation(analysis: PostureAnalysisResult): boolean {
  // For side views, check if hip is forward or behind
  const hipStatus = analysis.hip_alignment?.status;
  return hipStatus === 'Forward' || hipStatus === 'Behind';
}

/**
 * Check if shoulder alignment is a deviation (front/back views)
 */
function isShoulderDeviation(analysis: PostureAnalysisResult): boolean {
  const status = analysis.shoulder_alignment?.status;
  const diff = analysis.shoulder_alignment?.height_difference_cm || 0;
  return status === 'Asymmetric' || status === 'Elevated' || status === 'Depressed' || diff >= THRESHOLDS.shoulderDiffCm;
}

/**
 * Check if hip alignment is a deviation (front/back views - level)
 */
function isHipLevelDeviation(analysis: PostureAnalysisResult): boolean {
  const status = analysis.hip_alignment?.status;
  const diff = analysis.hip_alignment?.height_difference_cm || 0;
  return status === 'Asymmetric' || diff >= THRESHOLDS.hipDiffCm;
}

/**
 * Check if pelvic tilt is a deviation (side views)
 */
function isPelvicTiltDeviation(analysis: PostureAnalysisResult): boolean {
  const status = analysis.pelvic_tilt?.status;
  return status === 'Anterior Tilt' || status === 'Posterior Tilt';
}

/**
 * Single reference line component
 */
function ReferenceLine({ 
  y, 
  isDeviation, 
  label,
  showAngle,
  angle 
}: { 
  y: number; // Y position as percentage (0-100)
  isDeviation: boolean;
  label: string;
  showAngle?: boolean;
  angle?: number;
}) {
  const color = isDeviation ? '#ef4444' : '#22c55e'; // red-500 or green-500
  const rotation = showAngle && angle ? angle : 0;
  
  return (
    <g>
      {/* Main horizontal line */}
      <line
        x1="5%"
        y1={`${y}%`}
        x2="95%"
        y2={`${y}%`}
        stroke={color}
        strokeWidth="2"
        strokeDasharray={isDeviation ? "none" : "8,4"}
        opacity="0.8"
        transform={rotation ? `rotate(${rotation}, 50%, ${y}%)` : undefined}
      />
      
      {/* End markers */}
      <circle cx="5%" cy={`${y}%`} r="3" fill={color} opacity="0.9" />
      <circle cx="95%" cy={`${y}%`} r="3" fill={color} opacity="0.9" />
      
      {/* Label */}
      <text
        x="97%"
        y={`${y - 2}%`}
        fill={color}
        fontSize="10"
        fontWeight="bold"
        textAnchor="end"
        className="uppercase"
      >
        {label}
      </text>
    </g>
  );
}

/**
 * Vertical plumb line component
 */
function PlumbLine({ x }: { x: number }) {
  return (
    <line
      x1={`${x}%`}
      y1="5%"
      x2={`${x}%`}
      y2="95%"
      stroke="#22c55e"
      strokeWidth="1.5"
      strokeDasharray="6,4"
      opacity="0.6"
    />
  );
}

/**
 * Main component - renders reference lines based on view type
 */
export function PostureReferenceLines({ view, analysis }: PostureReferenceLinesProps) {
  const isSideView = view === 'side-left' || view === 'side-right';
  const landmarks = analysis.landmarks;
  
  // Default positions if landmarks not available
  const shoulderY = landmarks?.shoulder_y_percent || 25;
  const hipY = landmarks?.hip_y_percent || 50;
  const headY = landmarks?.head_y_percent || 12;
  const centerX = landmarks?.center_x_percent || 50;
  
  if (isSideView) {
    // Side view lines: ear-eye (head pitch), hip position, plumb line
    const headPitchDeviation = isHeadPitchDeviation(analysis);
    const pelvicDeviation = isPelvicTiltDeviation(analysis);
    
    return (
      <svg 
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {/* Vertical Plumb Line */}
        <PlumbLine x={centerX} />
        
        {/* Ear-Eye Line (Head Pitch) */}
        <ReferenceLine 
          y={headY + 3} // Slightly below head landmark for ear-eye level
          isDeviation={headPitchDeviation}
          label="Head Pitch"
        />
        
        {/* Hip Line */}
        <ReferenceLine 
          y={hipY}
          isDeviation={pelvicDeviation}
          label="Pelvis"
        />
      </svg>
    );
  }
  
  // Front/Back view lines: shoulder level, hip level
  const shoulderDeviation = isShoulderDeviation(analysis);
  const hipDeviation = isHipLevelDeviation(analysis);
  
  return (
    <svg 
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      {/* Vertical Center Line */}
      <PlumbLine x={centerX} />
      
      {/* Shoulder Line */}
      <ReferenceLine 
        y={shoulderY}
        isDeviation={shoulderDeviation}
        label="Shoulders"
      />
      
      {/* Hip Line */}
      <ReferenceLine 
        y={hipY}
        isDeviation={hipDeviation}
        label="Hips"
      />
    </svg>
  );
}

/**
 * Export deviation check functions for use in labels component
 */
export function hasAnyDeviation(view: string, analysis: PostureAnalysisResult): boolean {
  const isSideView = view === 'side-left' || view === 'side-right';
  
  if (isSideView) {
    return isHeadPitchDeviation(analysis) || 
           isPelvicTiltDeviation(analysis) ||
           analysis.forward_head?.status !== 'Neutral' ||
           analysis.kyphosis?.status !== 'Normal' ||
           analysis.lordosis?.status !== 'Normal' ||
           analysis.hip_alignment?.status !== 'Neutral';
  }
  
  // Front/Back views - check ALL potential deviations
  return isShoulderDeviation(analysis) || 
         isHipLevelDeviation(analysis) ||
         analysis.hip_shift?.status !== 'Centered' ||
         analysis.spinal_curvature?.status !== 'Normal' ||
         // Leg alignment (valgus/varus)
         analysis.left_leg_alignment?.status !== 'Straight' ||
         analysis.right_leg_alignment?.status !== 'Straight' ||
         // Head alignment
         analysis.head_alignment?.status !== 'Neutral';
}

export default PostureReferenceLines;
