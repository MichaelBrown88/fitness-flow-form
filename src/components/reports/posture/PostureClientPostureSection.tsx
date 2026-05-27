import React, { useState } from 'react';
import type { PostureAnalysisResult } from '@/lib/ai/postureAnalysis';
import type { PostureFindingRecord, PostureFindingSeverity, PostureFindingViewId } from '@/lib/types/postureFindings';
import { cn } from '@/lib/utils';
import { PostureViewExpandedSheet } from './PostureViewExpandedSheet';
import { viewLabelUpper } from '@/lib/posture/aggregatePostureInsights';

const VIEWS: PostureFindingViewId[] = ['front', 'side-left', 'back', 'side-right'];

const SEV_ORDER: Record<PostureFindingSeverity, number> = {
  aligned: 0,
  mild: 1,
  moderate: 2,
  significant: 3,
};

function getImageUrl(postureImages: Record<string, string> | undefined, view: PostureFindingViewId): string {
  if (!postureImages) return '';
  return (
    postureImages[view] ||
    postureImages[`postureImagesStorage_${view}`] ||
    postureImages[`postureImagesFull_${view}`] ||
    ''
  );
}

function severityDotClass(sev: PostureFindingSeverity | undefined): string {
  if (sev === 'mild') return 'bg-score-amber';
  if (sev === 'moderate') return 'bg-orange-500';
  if (sev === 'significant') return 'bg-score-red';
  return 'bg-score-green';
}

interface PostureClientPostureSectionProps {
  postureResults: Partial<Record<PostureFindingViewId, PostureAnalysisResult>>;
  postureImages: Record<string, string>;
}

/**
 * Compact posture row: just the four view tiles. Severity dot per view
 * surfaces the worst finding at a glance. Click a tile to open the full
 * detail in the expanded modal. All elaborate per-view inline copy has
 * been intentionally removed — the pillar card's bullets and the expanded
 * modal carry the detail.
 */
export function PostureClientPostureSection({ postureResults, postureImages }: PostureClientPostureSectionProps) {
  const [expandedView, setExpandedView] = useState<PostureFindingViewId | null>(null);

  const availableViews = VIEWS.filter((v) => postureResults[v] && getImageUrl(postureImages, v));
  if (availableViews.length === 0) return null;

  const findingsByView: Partial<Record<PostureFindingViewId, PostureFindingRecord[]>> = {};
  for (const view of availableViews) {
    const list = (postureResults[view]?.structuredFindings ?? []).filter((f) => f.severity !== 'aligned');
    findingsByView[view] = [...list].sort((a, b) => SEV_ORDER[b.severity] - SEV_ORDER[a.severity]);
  }

  return (
    <div>
      <div className="grid grid-cols-4 gap-2">
        {availableViews.map((view) => {
          const url = getImageUrl(postureImages, view);
          const findings = findingsByView[view] ?? [];
          const worstSeverity = findings[0]?.severity;
          return (
            <button
              key={view}
              type="button"
              onClick={() => setExpandedView(view)}
              className="group relative overflow-hidden rounded-lg bg-muted text-left"
            >
              <div className="aspect-[3/5] w-full overflow-hidden">
                <img src={url} alt="" className="h-full w-full object-cover object-top" />
              </div>
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                <span className="text-[9px] font-black uppercase tracking-[0.15em] text-white drop-shadow">
                  {viewLabelUpper(view)}
                </span>
                <span
                  className={cn('h-2 w-2 rounded-full ring-2 ring-black/40', severityDotClass(worstSeverity))}
                  aria-hidden
                />
              </div>
            </button>
          );
        })}
      </div>

      <PostureViewExpandedSheet
        view={expandedView}
        findings={expandedView ? findingsByView[expandedView] ?? [] : []}
        imageUrl={expandedView ? getImageUrl(postureImages, expandedView) : ''}
        onClose={() => setExpandedView(null)}
      />
    </div>
  );
}
