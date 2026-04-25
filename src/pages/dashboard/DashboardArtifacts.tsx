import { useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Share2 } from 'lucide-react';
import { ArtifactGridCard } from '@/components/dashboard/artifacts/ArtifactGridCard';
import { COACH_ASSISTANT_COPY } from '@/constants/coachAssistantCopy';
import {
  buildArtifactsGridItems,
  type ArtifactsGridItem,
} from '@/lib/dashboard/artifactsGridItems';
import { WorkspaceBreadcrumb } from '@/components/dashboard/WorkspaceBreadcrumb';
import { EmptyState } from '@/components/ui/empty-state';
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
    <div className="mx-auto flex w-full min-h-0 flex-1 flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <WorkspaceBreadcrumb current="Artifacts" />

      <header className="space-y-1.5">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {COACH_ASSISTANT_COPY.ARTIFACTS_PAGE_TITLE}
        </h1>
        <p className="text-sm text-muted-foreground">
          {COACH_ASSISTANT_COPY.ARTIFACTS_PAGE_SUB}
        </p>
      </header>

      <div className="min-h-0 flex-1">
        {shareablesError ? (
          <p className="text-sm text-destructive" role="alert">
            {COACH_ASSISTANT_COPY.ARTIFACTS_LOAD_ERROR}
          </p>
        ) : shareablesLoading ? (
          <p className="text-sm text-muted-foreground">{COACH_ASSISTANT_COPY.ARTIFACTS_GRID_LOADING}</p>
        ) : allItems.length === 0 ? (
          <EmptyState
            icon={Share2}
            title="No shared links yet"
            description={COACH_ASSISTANT_COPY.ARTIFACTS_GRID_EMPTY_ALL}
          />
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
