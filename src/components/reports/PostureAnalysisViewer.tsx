import React, { useState } from 'react';
import type { PostureAnalysisResult } from '@/lib/ai/postureAnalysis';
import { PostureHolisticSummary } from './PostureHolisticSummary';
import { PostureExpandedDialog } from './PostureExpandedDialog';
import { Carousel, CarouselContent, CarouselItem, CarouselDots } from '@/components/ui/carousel';
import { getConsolidatedDeviations } from './postureViewerDeviationHelpers';
import type { PostureView } from './postureViewerTypes';
import { PostureViewCard } from './PostureViewCard';

/**
 * Main posture analysis viewer — grid (desktop) or carousel (mobile) plus holistic summary.
 */
export function PostureAnalysisViewer({
  postureResults,
  postureImages,
  previousPostureResults,
}: {
  postureResults: Partial<Record<PostureView, PostureAnalysisResult>>;
  postureImages: Record<string, string> | undefined;
  previousPostureResults?: Partial<Record<PostureView, PostureAnalysisResult>>;
}) {
  const views = ['front', 'back', 'side-left', 'side-right'] as const;
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const getImageUrl = (view: PostureView): string => {
    return (
      postureImages?.[view] ||
      postureImages?.[`postureImagesStorage_${view}`] ||
      postureImages?.[`postureImagesFull_${view}`] ||
      postureImages?.[`postureImages_${view}`] ||
      ''
    );
  };

  const availableViews = views.filter((v) => postureResults[v] && getImageUrl(v));

  if (availableViews.length === 0) return null;

  const getViewDelta = (view: PostureView): 'improved' | 'new' | 'resolved' | null => {
    if (!previousPostureResults) return null;
    const current = postureResults[view];
    const previous = previousPostureResults[view];
    if (current && !previous) return 'new';
    if (!current && previous) return 'resolved';
    if (!current || !previous) return null;
    const currentDeviations = getConsolidatedDeviations(current, view);
    const previousDeviations = getConsolidatedDeviations(previous, view);
    if (currentDeviations.length < previousDeviations.length) return 'improved';
    return null;
  };

  const handleCardClick = (index: number) => setExpandedIndex(index);

  return (
    <div className="space-y-3">
      <div className="hidden md:grid md:grid-cols-4 gap-3 md:gap-4">
        {availableViews.map((view, idx) => (
          <PostureViewCard
            key={view}
            view={view}
            analysis={postureResults[view]!}
            imageUrl={getImageUrl(view)}
            onClick={() => handleCardClick(idx)}
            delta={getViewDelta(view)}
          />
        ))}
      </div>

      <div className="md:hidden">
        <Carousel opts={{ align: 'start', containScroll: 'trimSnaps' }} className="w-full">
          <CarouselContent className="-ml-3">
            {availableViews.map((view, idx) => (
              <CarouselItem key={view} className="basis-[75%] pl-3">
                <PostureViewCard
                  view={view}
                  analysis={postureResults[view]!}
                  imageUrl={getImageUrl(view)}
                  onClick={() => handleCardClick(idx)}
                  delta={getViewDelta(view)}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselDots count={availableViews.length} />
        </Carousel>
      </div>

      <PostureExpandedDialog
        views={[...availableViews]}
        postureResults={postureResults}
        getImageUrl={getImageUrl}
        expandedIndex={expandedIndex}
        onClose={() => setExpandedIndex(null)}
      />

      {availableViews.length >= 2 && <PostureHolisticSummary results={postureResults} />}
    </div>
  );
}
