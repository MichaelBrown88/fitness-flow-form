/**
 * POSTURE HOLISTIC SUMMARY
 * Condensed full-width card that synthesizes findings across all posture views.
 * Single narrative format - ~40% height of original design.
 */

import React from 'react';
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
  
  return (
    <div className={`rounded-xl border p-3 sm:p-4 ${bgClass}`}>
      <div className="flex items-start gap-3">
        {/* Status Icon */}
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          hasPatterns ? 'bg-amber-200' : 'bg-green-200'
        }`}>
          {hasPatterns ? (
            <AlertCircle className="h-4 w-4 text-amber-700" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-green-700" />
          )}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-800 leading-snug">
            {summary.narrative}
          </p>
        </div>
      </div>
    </div>
  );
}

export default PostureHolisticSummary;
