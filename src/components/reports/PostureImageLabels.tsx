/**
 * POSTURE IMAGE LABELS
 * Renders deviation labels ONLY when there are red (deviation) lines.
 * If all lines are green (aligned), no labels are shown.
 * Labels include the corrective measure/recommendation.
 */

import React from 'react';
import { PostureAnalysisResult } from '@/lib/ai/postureAnalysis';
import { 
  getLabelPositionsForView, 
  isDeviation,
  DeviationLabelConfig 
} from '@/lib/utils/posture-label-positions';
import { hasAnyDeviation } from '@/lib/posture/postureDeviationChecks';

interface PostureImageLabelsProps {
  view: 'front' | 'back' | 'side-left' | 'side-right';
  analysis: PostureAnalysisResult;
}

// Type for analysis entries that have status and description
interface DeviationDetail {
  status?: string;
  description?: string;
  recommendation?: string;
}

/**
 * Get the deviation data from analysis by key
 */
function getDeviationData(analysis: PostureAnalysisResult, key: string): DeviationDetail | null {
  const value = analysis[key as keyof PostureAnalysisResult];
  if (
    typeof value === 'object' && 
    value !== null && 
    !Array.isArray(value) &&
    'status' in value
  ) {
    return value as DeviationDetail;
  }
  return null;
}

/**
 * Single label component with recommendation
 */
function DeviationLabel({ 
  config, 
  data 
}: { 
  config: DeviationLabelConfig; 
  data: DeviationDetail;
}) {
  const { position, label } = config;
  const isLeft = position.align === 'left';
  
  // Use recommendation as the text (corrective measure)
  const labelText = data.recommendation || data.description || '';
  const shortText = labelText.length > 60 
    ? labelText.substring(0, 57) + '...'
    : labelText;
  
  return (
    <div
      className={`absolute z-20 max-w-[42%] pointer-events-auto`}
      style={{
        top: `${position.top}%`,
        ...(isLeft 
          ? { left: `${position.left}%` } 
          : { right: `${position.right}%` }
        ),
        transform: 'translateY(-50%)'
      }}
    >
      {/* Label Card */}
      <div 
        className={`
          bg-score-red-light/95 backdrop-blur-sm rounded-lg shadow-lg border border-score-red-muted
          p-2 transition-all hover:scale-105 hover:shadow-xl cursor-default
          ${isLeft ? 'text-left' : 'text-right'}
        `}
      >
        {/* Header with red indicator */}
        <div className={`flex items-center gap-1.5 ${isLeft ? '' : 'flex-row-reverse'}`}>
          <div className="h-2 w-2 rounded-full bg-score-red" />
          <span className="text-[10px] font-black uppercase tracking-[0.15em] text-score-red-fg">
            {label}
          </span>
        </div>
        
        {/* Recommendation/Corrective measure */}
        {shortText && (
          <p className="text-xs text-score-red-fg leading-tight mt-1 line-clamp-2 font-medium">
            {shortText}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Main component - renders labels ONLY for red deviations
 * If all green (no deviations), shows nothing (reference lines speak for themselves)
 */
export function PostureImageLabels({ view, analysis }: PostureImageLabelsProps) {
  // First check if there are ANY deviations for this view
  // If not, don't render any labels - the green lines are sufficient
  if (!hasAnyDeviation(view, analysis)) {
    return null; // All green, no labels needed
  }
  
  const positions = getLabelPositionsForView(view);
  
  // Filter to only deviations that exist and are not neutral
  const activeDeviations = Object.entries(positions).filter(([key]) => {
    const data = getDeviationData(analysis, key);
    return data && isDeviation(data.status);
  });
  
  // If somehow no individual deviations but hasAnyDeviation was true,
  // still don't show anything confusing
  if (activeDeviations.length === 0) {
    return null;
  }
  
  return (
    <div className="absolute inset-0 overflow-hidden">
      {activeDeviations.map(([key, config]) => {
        const data = getDeviationData(analysis, key);
        if (!data) return null;
        
        return (
          <DeviationLabel 
            key={key} 
            config={config} 
            data={data} 
          />
        );
      })}
    </div>
  );
}

export default PostureImageLabels;
