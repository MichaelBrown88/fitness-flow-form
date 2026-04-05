import { ARTIFACTS_KIND_META, type ArtifactsGridItem } from '@/lib/dashboard/artifactsGridItems';
import { cn } from '@/lib/utils';

interface ArtifactGridCardProps {
  item: ArtifactsGridItem;
  onOpen: (item: ArtifactsGridItem) => void;
}

export function ArtifactGridCard({ item, onOpen }: ArtifactGridCardProps) {
  const meta = ARTIFACTS_KIND_META[item.kind];
  const { Icon } = meta;
  const dateStr =
    item.updatedAt != null ? item.updatedAt.toLocaleDateString(undefined, { dateStyle: 'medium' }) : null;

  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(item)}
        className="flex w-full flex-col overflow-hidden rounded-xl border border-border/60 bg-card text-left shadow-sm transition-colors hover:border-border hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:border-border/50 dark:bg-card/60"
      >
        <div
          className={cn(
            'relative flex aspect-[4/3] items-center justify-center bg-gradient-to-br',
            meta.previewAreaClass,
          )}
        >
          <Icon className="h-10 w-10 text-muted-foreground/50" aria-hidden />
        </div>
        <div className="space-y-0.5 px-3 py-2.5">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{meta.label}</p>
          <p className="truncate text-sm font-semibold text-foreground">{item.clientName}</p>
          {dateStr ? <p className="text-xs text-muted-foreground">Updated {dateStr}</p> : null}
        </div>
      </button>
    </li>
  );
}
