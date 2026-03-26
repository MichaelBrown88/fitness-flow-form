/**
 * POSTURE REFERENCE LINES
 * Renders alignment reference lines (ear-eye, hip, shoulder) on posture images.
 * Lines are GREEN if aligned (within threshold), RED if deviated.
 */

import React from 'react';
import type { PostureAnalysisResult } from '@/lib/ai/postureAnalysis';
import { CHART_HEX } from '@/lib/design/chartColors';
import {
  isHeadPitchDeviation,
  isHipLevelDeviation,
  isPelvicTiltDeviation,
  isShoulderDeviation,
} from '@/lib/posture/postureDeviationChecks';

interface PostureReferenceLinesProps {
  view: 'front' | 'back' | 'side-left' | 'side-right';
  analysis: PostureAnalysisResult;
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
  const color = isDeviation ? CHART_HEX.scoreRed : CHART_HEX.scoreGreen;
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
      stroke={CHART_HEX.scoreGreen}
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

export default PostureReferenceLines;
