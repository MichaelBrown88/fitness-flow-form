import React, { useMemo, useState } from 'react';
import type { PostureAnalysisResult } from '@/lib/ai/postureAnalysis';
import type { PostureFindingRecord, PostureFindingSeverity, PostureFindingViewId } from '@/lib/types/postureFindings';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Carousel, CarouselContent, CarouselItem, CarouselDots } from '@/components/ui/carousel';
import { AlertCircle, CheckCircle2, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PostureScoreGauge } from './PostureScoreGauge';
import { PostureFindingExpandedSheet } from './PostureFindingExpandedSheet';
import {
  aggregatePostureFindings,
  buildFocusBullets,
  computePostureScore,
  sortFindingsForDisplay,
  viewLabelUpper,
} from '@/lib/posture/aggregatePostureInsights';

const VIEWS: PostureFindingViewId[] = ['front', 'back', 'side-left', 'side-right'];

function getImageUrl(postureImages: Record<string, string> | undefined, view: PostureFindingViewId): string {
  if (!postureImages) return '';
  return (
    postureImages[view] ||
    postureImages[`postureImagesStorage_${view}`] ||
    postureImages[`postureImagesFull_${view}`] ||
    ''
  );
}

function severityPillClass(sev: PostureFindingSeverity): string {
  if (sev === 'mild') return 'bg-score-amber-muted text-score-amber-fg';
  if (sev === 'moderate') return 'bg-orange-500/15 text-orange-700 dark:text-orange-300';
  if (sev === 'significant') return 'bg-score-red-muted text-score-red-fg';
  return 'bg-muted text-muted-foreground';
}

function legendSetForView(
  results: Partial<Record<PostureFindingViewId, PostureAnalysisResult>>,
  view: PostureFindingViewId
): PostureFindingSeverity[] {
  const rows = results[view]?.structuredFindings ?? [];
  return [...new Set(rows.map((r) => r.severity))];
}

interface PostureClientPostureSectionProps {
  postureResults: Partial<Record<PostureFindingViewId, PostureAnalysisResult>>;
  postureImages: Record<string, string>;
}

export function PostureClientPostureSection({ postureResults, postureImages }: PostureClientPostureSectionProps) {
  const [expanded, setExpanded] = useState<PostureFindingRecord | null>(null);

  const findings = useMemo(() => aggregatePostureFindings(postureResults), [postureResults]);
  const sorted = useMemo(() => sortFindingsForDisplay(findings), [findings]);
  const score = useMemo(() => computePostureScore(findings), [findings]);
  const focusBullets = useMemo(() => buildFocusBullets(findings, 4), [findings]);

  const availableViews = VIEWS.filter((v) => postureResults[v] && getImageUrl(postureImages, v));
  if (availableViews.length === 0) return null;

  const hero = sorted[0];
  const rest = sorted.slice(1);
  const scoreLabel =
    findings.length === 0 ? 'Well aligned' : `${findings.length} area${findings.length === 1 ? '' : 's'} to work on`;

  const viewHasDeviation = (view: PostureFindingViewId) =>
    (postureResults[view]?.structuredFindings ?? []).some((f) => f.severity !== 'aligned');

  const expandedLegend = expanded ? legendSetForView(postureResults, expanded.view) : [];

  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center gap-2 md:flex-row md:items-start md:justify-between md:gap-6">
        <PostureScoreGauge score={score} className="md:order-2 md:shrink-0" />
        <div className="text-center md:order-1 md:text-left md:flex-1">
          <p className="text-sm font-medium text-foreground">Posture score</p>
          <p className="mt-1 text-sm text-muted-foreground">{scoreLabel}</p>
        </div>
      </div>

      <div className="hidden md:grid md:grid-cols-2 md:gap-3">
        {availableViews.map((view) => {
          const url = getImageUrl(postureImages, view);
          const dev = viewHasDeviation(view);
          return (
            <button
              key={view}
              type="button"
              className="group relative overflow-hidden rounded-2xl border border-border bg-card text-left"
              onClick={() => {
                const first = (postureResults[view]?.structuredFindings ?? []).find((f) => f.severity !== 'aligned');
                if (first) setExpanded(first);
              }}
            >
              <Badge
                variant="secondary"
                className="absolute left-2 top-2 z-10 bg-card/90 text-[10px] font-black uppercase tracking-[0.15em]"
              >
                {viewLabelUpper(view)}
              </Badge>
              <div className="absolute right-2 top-2 z-10">
                {dev ? (
                  <AlertCircle className="h-4 w-4 text-score-amber" aria-hidden />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-score-green" aria-hidden />
                )}
              </div>
              <div className="aspect-[3/5] w-full overflow-hidden bg-muted">
                <img src={url} alt="" className="h-full w-full object-cover object-top" />
              </div>
              <ChevronUp className="absolute bottom-2 right-2 h-4 w-4 text-white/80 drop-shadow-md" aria-hidden />
            </button>
          );
        })}
      </div>

      <div className="md:hidden">
        <Carousel opts={{ align: 'start', containScroll: 'trimSnaps' }} className="w-full">
          <CarouselContent className="-ml-2">
            {availableViews.map((view) => {
              const url = getImageUrl(postureImages, view);
              const dev = viewHasDeviation(view);
              return (
                <CarouselItem key={view} className="basis-[88%] pl-2 sm:basis-[85%]">
                  <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
                    <Badge
                      variant="secondary"
                      className="absolute left-2 top-2 z-10 bg-card/90 text-[10px] font-black uppercase tracking-[0.15em]"
                    >
                      {viewLabelUpper(view)}
                    </Badge>
                    <div className="absolute right-2 top-2 z-10">
                      {dev ? (
                        <AlertCircle className="h-4 w-4 text-score-amber" aria-hidden />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-score-green" aria-hidden />
                      )}
                    </div>
                    <div className="aspect-[3/5] w-full overflow-hidden bg-muted">
                      <img src={url} alt="" className="h-full w-full object-cover object-top" />
                    </div>
                    <ChevronUp className="absolute bottom-2 right-2 h-4 w-4 text-white/80 drop-shadow-md" aria-hidden />
                  </div>
                </CarouselItem>
              );
            })}
          </CarouselContent>
          <CarouselDots count={availableViews.length} />
        </Carousel>
      </div>

      {hero ? (
        <button
          type="button"
          className="w-full overflow-hidden rounded-2xl border border-border bg-card text-left transition hover:shadow-md"
          onClick={() => setExpanded(hero)}
        >
          <div className="relative h-56 w-full bg-muted sm:h-64">
            <img
              src={getImageUrl(postureImages, hero.view)}
              alt=""
              className="h-full w-full object-cover object-top"
            />
            <ChevronUp className="absolute bottom-2 right-2 h-5 w-5 text-white drop-shadow-md" aria-hidden />
          </div>
          <div className="space-y-2 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize', severityPillClass(hero.severity))}
              >
                {hero.severity}
              </span>
              <span className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
                {viewLabelUpper(hero.view)}
              </span>
            </div>
            <h3 className="text-xl font-semibold text-foreground">{hero.name}</h3>
            <p className="text-sm text-muted-foreground leading-snug">{hero.whatItMeans}</p>
          </div>
        </button>
      ) : (
        <Card className="border-border p-4">
          <p className="text-sm font-medium text-foreground">Well aligned</p>
          <p className="mt-1 text-sm text-muted-foreground">No notable deviations detected across these views.</p>
        </Card>
      )}

      {rest.length > 0 && (
        <div className="space-y-2">
          {rest.map((f) => (
            <button
              key={`${f.id}-${f.view}`}
              type="button"
              className="flex w-full flex-col gap-1 rounded-xl border border-border bg-card p-3 text-left transition hover:bg-muted/40"
              onClick={() => setExpanded(f)}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-foreground">{f.name}</span>
                <span
                  className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize', severityPillClass(f.severity))}
                >
                  {f.severity}
                </span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{f.whatItMeans}</p>
              <Badge variant="outline" className="w-fit text-[10px] font-black uppercase tracking-wider">
                {viewLabelUpper(f.view)}
              </Badge>
            </button>
          ))}
        </div>
      )}

      {focusBullets.length > 0 && (
        <Card className="border-border p-4">
          <h5 className="text-sm font-semibold text-foreground mb-2">What We&apos;ll Focus On</h5>
          <ul className="list-disc space-y-1.5 pl-4 text-sm text-muted-foreground">
            {focusBullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </Card>
      )}

      <PostureFindingExpandedSheet
        finding={expanded}
        imageUrl={expanded ? getImageUrl(postureImages, expanded.view) : ''}
        legendSeverities={expandedLegend}
        onClose={() => setExpanded(null)}
      />
    </div>
  );
}
