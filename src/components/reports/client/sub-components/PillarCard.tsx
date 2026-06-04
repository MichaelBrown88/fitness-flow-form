import React, { useState } from 'react';
import { ChevronDown, TrendingDown, TrendingUp } from 'lucide-react';
import type { PillarKey } from '@/lib/reports/radarData';
import { cn } from '@/lib/utils';
import { CLIENT_REPORT_COPY } from '@/constants/clientReport';
import { PillarCardSection } from './PillarCardSection';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface PillarCardProps {
  pillar: PillarKey;
  icon: React.ReactNode;
  title: string;
  /** Scroll anchor — matches SECTION_IDS (e.g. body-comp). */
  sectionId?: string;
  score?: number;
  previousScore?: number | null;
  summary?: string;
  strengths: string[];
  focusAreas: string[];
  graphic?: React.ReactNode;
  /** Gap rows, lifestyle targets, or similar. */
  targets?: React.ReactNode;
  /** @deprecated Use `targets` */
  gapAnalysis?: React.ReactNode;
  /** Defaults to snapshot heading; use for posture scan photos only on client report. */
  graphicSectionTitle?: string;
  className?: string;
}

const PILLAR_TILE_TINT: Record<PillarKey, string> = {
  bodyComp: 'bg-[hsl(188_72%_45%_/_0.10)] text-[hsl(188_72%_32%)]',
  strength: 'bg-[hsl(350_72%_45%_/_0.10)] text-[hsl(350_72%_38%)]',
  cardio: 'bg-[hsl(28_72%_45%_/_0.12)] text-[hsl(28_72%_36%)]',
  movementQuality: 'bg-[hsl(262_72%_45%_/_0.10)] text-[hsl(262_72%_50%)]',
  lifestyle: 'bg-[hsl(152_72%_45%_/_0.10)] text-[hsl(152_72%_32%)]',
};

const MAX_LIST_ITEMS = 3;

function scoreToneClass(score: number): string {
  if (score >= 75) return 'text-score-green-fg';
  if (score >= 50) return 'text-score-amber-fg';
  if (score > 0) return 'text-score-red-fg';
  return 'text-foreground';
}

/**
 * Pillar card: header → summary → takeaways → graphic → optional collapsible targets.
 */
export const PillarCard: React.FC<PillarCardProps> = ({
  pillar,
  icon,
  title,
  sectionId,
  score,
  previousScore,
  summary,
  strengths,
  focusAreas,
  graphic,
  targets,
  gapAnalysis,
  graphicSectionTitle,
  className,
}) => {
  const [targetsOpen, setTargetsOpen] = useState(false);
  const hasScore = typeof score === 'number';
  const diff =
    hasScore && previousScore != null ? Math.round(score!) - Math.round(previousScore) : null;

  const targetsContent = targets ?? gapAnalysis;
  const strengthItems = strengths.slice(0, MAX_LIST_ITEMS);
  const focusItems = focusAreas.slice(0, MAX_LIST_ITEMS);
  const hasLists = strengthItems.length > 0 || focusItems.length > 0;
  const hasBody = Boolean(graphic) || Boolean(targetsContent) || hasLists;

  return (
    <section
      id={sectionId}
      data-section-id={sectionId}
      className={cn(
        'scroll-mt-24 rounded-2xl bg-card p-6 ring-1 ring-border/60 sm:p-7',
        className,
      )}
    >
      <header className="flex items-center gap-3">
        <span
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-lg',
            PILLAR_TILE_TINT[pillar],
          )}
        >
          {icon}
        </span>
        <h3 className="flex-1 text-base font-bold tracking-[-0.01em] text-foreground sm:text-lg">
          {title}
        </h3>
        {hasScore ? (
          <>
            <span
              className={cn(
                'text-2xl font-bold tabular-nums tracking-[-0.02em] leading-none',
                scoreToneClass(score!),
              )}
            >
              {score}
            </span>
            <DeltaChip diff={diff} />
          </>
        ) : null}
      </header>

      {summary ? (
        <p className="mt-4 max-w-[72ch] text-sm text-foreground-secondary leading-relaxed">
          {summary}
        </p>
      ) : null}

      {hasLists ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {strengthItems.length > 0 ? (
            <PillarCardSection title={CLIENT_REPORT_COPY.strengthsHeading}>
              <BulletList items={strengthItems} dotClass="before:bg-score-green" />
            </PillarCardSection>
          ) : null}
          {focusItems.length > 0 ? (
            <PillarCardSection title={CLIENT_REPORT_COPY.focusHeading}>
              <BulletList items={focusItems} dotClass="before:bg-score-amber" />
            </PillarCardSection>
          ) : null}
        </div>
      ) : null}

      {hasBody ? (
        <div className="mt-6 space-y-4">
          {graphic ? (
            <PillarCardSection
              title={graphicSectionTitle ?? CLIENT_REPORT_COPY.snapshotHeading}
            >
              <div className="min-w-0">{graphic}</div>
            </PillarCardSection>
          ) : null}
          {targetsContent ? (
            <Collapsible open={targetsOpen} onOpenChange={setTargetsOpen}>
              <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 rounded-lg py-1 text-left text-sm font-semibold text-foreground transition-colors hover:text-foreground/80">
                <span>{CLIENT_REPORT_COPY.targetsHeading}</span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                    targetsOpen && 'rotate-180',
                  )}
                  aria-hidden
                />
                <span className="sr-only">
                  {targetsOpen
                    ? CLIENT_REPORT_COPY.targetsDetailsHide
                    : CLIENT_REPORT_COPY.targetsDetailsToggle}
                </span>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">{targetsContent}</CollapsibleContent>
            </Collapsible>
          ) : null}
        </div>
      ) : null}
    </section>
  );
};

function BulletList({ items, dotClass }: { items: string[]; dotClass: string }) {
  return (
    <ul className="space-y-1.5">
      {items.map((s, i) => (
        <li
          key={`item-${i}`}
          className={cn(
            'relative pl-4 text-sm leading-snug text-foreground-secondary before:absolute before:left-0 before:top-[0.5em] before:h-1.5 before:w-1.5 before:rounded-full',
            dotClass,
          )}
        >
          {s}
        </li>
      ))}
    </ul>
  );
}

function DeltaChip({ diff }: { diff: number | null }) {
  if (diff == null || diff === 0) return null;
  if (diff > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-score-green-light px-2 py-0.5 text-[10px] font-semibold tabular-nums text-score-green-fg">
        <TrendingUp className="h-3 w-3" /> +{diff}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-score-red-light px-2 py-0.5 text-[10px] font-semibold tabular-nums text-score-red-fg">
      <TrendingDown className="h-3 w-3" /> {diff}
    </span>
  );
}
