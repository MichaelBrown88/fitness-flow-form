import React, { useState } from 'react';
import type { PostureAnalysisResult } from '@/lib/ai/postureAnalysis';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, ImageOff, Maximize2 } from 'lucide-react';
import type { PostureView } from './postureViewerTypes';
import { getBriefFindings } from './postureViewerBriefFindings';

export function PostureViewCard({
  view,
  analysis,
  imageUrl,
  onClick,
  delta,
}: {
  view: PostureView;
  analysis: PostureAnalysisResult;
  imageUrl: string;
  onClick?: () => void;
  delta?: 'improved' | 'new' | 'resolved' | null;
}) {
  const [imgError, setImgError] = useState(false);
  const briefFindings = getBriefFindings(analysis, view);
  const isNeutral = briefFindings[0] === 'Neutral Alignment';

  return (
    <div
      className="group relative cursor-pointer overflow-hidden rounded-2xl border border-border bg-card transition-all hover:shadow-md active:scale-[0.98]"
      onClick={onClick}
    >
      <div className="absolute top-2 left-2 z-10">
        <Badge
          variant="secondary"
          className="bg-card/90 backdrop-blur-sm text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground border-none h-5"
        >
          {view.replace('-', ' ')}
        </Badge>
      </div>

      <div className="absolute top-2 right-2 z-10">
        {isNeutral ? (
          <CheckCircle2 className="h-4 w-4 text-gradient-dark fill-white" />
        ) : (
          <AlertCircle className="h-4 w-4 text-score-amber fill-white" />
        )}
      </div>

      {delta && (
        <div className="absolute top-8 right-2 z-10">
          <Badge
            variant="secondary"
            className={`text-[9px] font-bold uppercase tracking-wider border-none h-4 ${
              delta === 'improved' || delta === 'resolved'
                ? 'bg-score-green-light text-score-green-fg'
                : 'bg-blue-50 text-blue-600'
            }`}
          >
            {delta === 'improved' ? 'Improved' : delta === 'resolved' ? 'Resolved' : 'New'}
          </Badge>
        </div>
      )}

      <div className="aspect-[4/5] w-full overflow-hidden bg-muted">
        {imgError || !imageUrl ? (
          <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground gap-2">
            <ImageOff className="h-8 w-8" />
            <span className="text-[10px] uppercase tracking-wider font-medium">Image unavailable</span>
          </div>
        ) : (
          <img
            src={imageUrl}
            alt={view}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
            style={{ objectPosition: 'center 10%' }}
            onError={() => setImgError(true)}
          />
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 pt-10 text-center">
        <div className="flex flex-col gap-0.5">
          {briefFindings.slice(0, 1).map((finding, i) => (
            <span
              key={i}
              className="text-[10px] font-black uppercase tracking-[0.15em] leading-none text-white drop-shadow-md"
            >
              {finding}
            </span>
          ))}
          <span className="text-[10px] font-black text-white/50 sm:text-white/80 uppercase tracking-[0.15em] mt-1">
            Tap to expand
          </span>
        </div>
      </div>

      <div className="absolute inset-0 flex items-center justify-center bg-primary/10 opacity-0 transition-opacity group-hover:opacity-100">
        <div className="rounded-full bg-card/90 p-2 shadow-lg scale-75 group-hover:scale-100 transition-transform">
          <Maximize2 className="h-4 w-4 text-primary" />
        </div>
      </div>
    </div>
  );
}
