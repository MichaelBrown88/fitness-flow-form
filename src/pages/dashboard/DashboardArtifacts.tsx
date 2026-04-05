import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArtifactGridCard } from '@/components/dashboard/artifacts/ArtifactGridCard';
import { COACH_ASSISTANT_COPY } from '@/constants/coachAssistantCopy';
import {
  ARTIFACTS_FILTER_CHIPS,
  buildArtifactsGridItems,
  type ArtifactsFilter,
  type ArtifactsGridItem,
} from '@/lib/dashboard/artifactsGridItems';
import { cn } from '@/lib/utils';
import type { DashboardOutletContext } from './DashboardLayout';

export default function DashboardArtifacts() {
  const {
    openShareablePreview,
    reportShares,
    roadmapShares,
    achievementShares,
    shareablesLoading,
    shareablesError,
  } = useOutletContext<DashboardOutletContext>();
  const [filter, setFilter] = useState<ArtifactsFilter>('all');

  const allItems = useMemo(
    () => buildArtifactsGridItems(reportShares, roadmapShares, achievementShares),
    [reportShares, roadmapShares, achievementShares],
  );

  const visible = useMemo(
    () => (filter === 'all' ? allItems : allItems.filter((i) => i.kind === filter)),
    [allItems, filter],
  );

  const openCard = (item: ArtifactsGridItem) => {
    if (item.kind === 'report' && item.report) {
      openShareablePreview({ kind: 'report', report: item.report });
      return;
    }
    if (item.kind === 'roadmap' && item.roadmap) {
      openShareablePreview({ kind: 'roadmap', row: item.roadmap });
      return;
    }
    if (item.kind === 'achievements' && item.achievement) {
      openShareablePreview({ kind: 'achievements', row: item.achievement });
    }
  };

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col bg-background">
      <div className="shrink-0 border-b border-border/60 px-3 py-4 sm:px-4 lg:px-5">
        <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
          {COACH_ASSISTANT_COPY.ARTIFACTS_PAGE_TITLE}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{COACH_ASSISTANT_COPY.ARTIFACTS_PAGE_SUB}</p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {ARTIFACTS_FILTER_CHIPS.map(({ id, label }) => (
            <Button
              key={id}
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                'h-8 rounded-full px-3 text-xs font-medium',
                filter === id
                  ? 'bg-muted text-foreground hover:bg-muted'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
              )}
              onClick={() => setFilter(id)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-3 py-4 sm:px-4 lg:px-5">
        {shareablesError ? (
          <p className="text-sm text-destructive" role="alert">
            {COACH_ASSISTANT_COPY.ARTIFACTS_LOAD_ERROR}
          </p>
        ) : shareablesLoading ? (
          <p className="text-sm text-muted-foreground">{COACH_ASSISTANT_COPY.ARTIFACTS_GRID_LOADING}</p>
        ) : visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {allItems.length === 0
              ? COACH_ASSISTANT_COPY.ARTIFACTS_GRID_EMPTY_ALL
              : COACH_ASSISTANT_COPY.ARTIFACTS_GRID_EMPTY_FILTERED}
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((item) => (
              <ArtifactGridCard key={item.key} item={item} onOpen={openCard} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
