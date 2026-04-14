import { useMemo } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { ArtifactGridCard } from '@/components/dashboard/artifacts/ArtifactGridCard';
import { COACH_ASSISTANT_COPY } from '@/constants/coachAssistantCopy';
import {
  buildArtifactsGridItems,
  type ArtifactsGridItem,
} from '@/lib/dashboard/artifactsGridItems';
import type { DashboardOutletContext } from './DashboardLayout';

interface ArtifactsSectionProps {
  title: string;
  items: ArtifactsGridItem[];
  onOpen: (item: ArtifactsGridItem) => void;
}

function ArtifactsSection({ title, items, onOpen }: ArtifactsSectionProps) {
  if (items.length === 0) return null;
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <span className="text-xs text-muted-foreground">{items.length}</span>
      </div>
      <ul className="flex flex-wrap gap-4">
        {items.map((item) => (
          <ArtifactGridCard key={item.key} item={item} onOpen={onOpen} />
        ))}
      </ul>
    </section>
  );
}

export default function DashboardArtifacts() {
  const navigate = useNavigate();
  const {
    openShareablePreview,
    reportShares,
    roadmapShares,
    achievementShares,
    shareablesLoading,
    shareablesError,
  } = useOutletContext<DashboardOutletContext>();

  const allItems = useMemo(
    () => buildArtifactsGridItems(reportShares, roadmapShares, achievementShares),
    [reportShares, roadmapShares, achievementShares],
  );

  const reportItems = useMemo(() => allItems.filter((i) => i.kind === 'report'), [allItems]);
  const roadmapItems = useMemo(() => allItems.filter((i) => i.kind === 'roadmap'), [allItems]);
  const achievementItems = useMemo(() => allItems.filter((i) => i.kind === 'achievements'), [allItems]);

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
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              {COACH_ASSISTANT_COPY.ARTIFACTS_PAGE_TITLE}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {COACH_ASSISTANT_COPY.ARTIFACTS_PAGE_SUB}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close artifacts"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-3 py-5 sm:px-4 lg:px-5">
        {shareablesError ? (
          <p className="text-sm text-destructive" role="alert">
            {COACH_ASSISTANT_COPY.ARTIFACTS_LOAD_ERROR}
          </p>
        ) : shareablesLoading ? (
          <p className="text-sm text-muted-foreground">{COACH_ASSISTANT_COPY.ARTIFACTS_GRID_LOADING}</p>
        ) : allItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">{COACH_ASSISTANT_COPY.ARTIFACTS_GRID_EMPTY_ALL}</p>
        ) : (
          <div className="flex flex-col gap-10">
            <ArtifactsSection title="Score Cards" items={reportItems} onOpen={openCard} />
            <ArtifactsSection title="ARC™ Plans" items={roadmapItems} onOpen={openCard} />
            <ArtifactsSection title="Milestones" items={achievementItems} onOpen={openCard} />
          </div>
        )}
      </div>
    </div>
  );
}
