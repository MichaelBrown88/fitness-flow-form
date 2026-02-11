/**
 * POSTURE HOLISTIC SUMMARY
 * Condensed full-width card that synthesizes findings across all posture views.
 * Single narrative format - ~40% height of original design.
 */

import React, { useState } from 'react';
import { PostureAnalysisResult } from '@/lib/ai/postureAnalysis';
import { 
  generateHolisticSummary,
  getSeverityBgClass,
  HolisticSummary
} from '@/lib/utils/postureHolisticSummary';
import { 
  CheckCircle2, 
  AlertCircle
} from 'lucide-react';

interface PostureHolisticSummaryProps {
  results: Record<string, PostureAnalysisResult>;
}

/**
 * Main holistic summary component - condensed single narrative
 */
export function PostureHolisticSummary({ results }: PostureHolisticSummaryProps) {
  const summary: HolisticSummary = generateHolisticSummary(results);
  const hasPatterns = summary.patterns.length > 0;
  const bgClass = getSeverityBgClass(summary.patterns.length);
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className={`rounded-xl border p-3 sm:p-4 ${bgClass}`}>
      <div className="flex items-start gap-3">
        {/* Status Icon */}
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          hasPatterns ? 'bg-score-amber-muted' : 'bg-score-green-muted'
        }`}>
          {hasPatterns ? (
            <AlertCircle className="h-4 w-4 text-score-amber-fg" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-score-green-fg" />
          )}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={`text-xs sm:text-sm text-slate-800 leading-snug ${
            !expanded ? 'line-clamp-4 sm:line-clamp-none' : ''
          }`}>
            {summary.narrative}
          </p>
          {summary.narrative.length > 180 && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="text-xs font-medium text-slate-500 hover:text-slate-700 mt-1 sm:hidden"
            >
              {expanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default PostureHolisticSummary;
