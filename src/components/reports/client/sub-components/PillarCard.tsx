import React from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { PillarPetalBadge, type PillarKey } from './PillarPetalBadge';
import { cn } from '@/lib/utils';

interface PillarCardProps {
  /** Pillar key — drives the petal badge orientation + colour. */
  pillar: PillarKey;
  /** Lucide-style icon rendered top-left (e.g. Scale, Dumbbell, Heart…). */
  icon: React.ReactNode;
  /** Pillar display title (e.g. "Body Composition"). */
  title: string;
  /** 0-100 current score. */
  score: number;
  /** Previous score — drives the delta chip. Undefined → "new" chip. */
  previousScore?: number | null;
  /**
   * 1-2 sentence directional summary stitching strengths + focus into a
   * coach-readable paragraph. Always render — the caller generates it
   * deterministically from category data.
   */
  summary: string;
  /** Pillar-level strengths list. Empty array hides the block. */
  strengths: string[];
  /** Pillar-level focus areas list (weaknesses). Empty array hides the block. */
  focusAreas: string[];
  /** Detail-zone label (e.g. "Gap analysis", "Movement assessment"). */
  detailEyebrow?: string;
  /** Pillar-specific detail content rendered below the strengths grid. */
  children?: React.ReactNode;
  className?: string;
}

/**
 * Per-pillar identity tints for the icon tile background. Hue values
 * mirror the AXIS palette in OverallRadarChart so the tile reads as
 * "the same colour as the petal" without shouting.
 */
const PILLAR_TILE_TINT: Record<PillarKey, string> = {
  bodyComp:        'bg-[hsl(188_72%_45%_/_0.10)] text-[hsl(188_72%_32%)]',
  strength:        'bg-[hsl(350_72%_45%_/_0.10)] text-[hsl(350_72%_38%)]',
  cardio:          'bg-[hsl(28_72%_45%_/_0.12)]  text-[hsl(28_72%_36%)]',
  movementQuality: 'bg-[hsl(262_72%_45%_/_0.10)] text-[hsl(262_72%_50%)]',
  lifestyle:       'bg-[hsl(152_72%_45%_/_0.10)] text-[hsl(152_72%_32%)]',
};

/**
 * Unified pillar card shell. Header carries the lucide icon (in a
 * pillar-tinted tile), pillar name, the bloom-petal-as-score badge, and
 * a delta chip. Below the header sits the per-pillar coach summary,
 * then a tonal strengths/focus grid, then a pillar-specific detail
 * zone via children.
 */
export const PillarCard: React.FC<PillarCardProps> = ({
  pillar,
  icon,
  title,
  score,
  previousScore,
  summary,
  strengths,
  focusAreas,
  detailEyebrow,
  children,
  className,
}) => {
  const diff = previousScore != null ? Math.round(score) - Math.round(previousScore) : null;

  return (
    <section
      className={cn(
        'rounded-[24px] border border-border bg-card p-6 shadow-[0_1px_2px_rgba(15,15,15,0.04),0_4px_14px_rgba(15,15,15,0.04)] sm:p-7',
        className,
      )}
    >
      {/* ─── Header ─────────────────────────────────────────────── */}
      <header className="grid grid-cols-[40px_1fr_auto_auto] items-center gap-4">
        <span
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-xl',
            PILLAR_TILE_TINT[pillar],
          )}
        >
          {icon}
        </span>
        <h3 className="text-lg font-bold tracking-[-0.014em] text-foreground sm:text-xl">
          {title}
        </h3>
        <PillarPetalBadge pillar={pillar} score={score} size={144} />
        <DeltaChip diff={diff} />
      </header>

      {/* ─── Coach summary (per-pillar) ─────────────────────────── */}
      {summary ? (
        <p className="mt-4 max-w-[70ch] text-sm font-medium leading-relaxed tracking-[-0.005em] text-foreground-secondary sm:text-[14px]">
          {summary}
        </p>
      ) : null}

      {/* ─── Strengths + Focus grid (tonal tinted blocks) ───────── */}
      {strengths.length > 0 || focusAreas.length > 0 ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {strengths.length > 0 ? (
            <div className="rounded-2xl border border-score-green-light bg-score-green-light/40 p-4">
              <p className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.10em] text-score-green-fg">
                ✓ Strengths
              </p>
              <ul className="flex flex-col gap-1.5">
                {strengths.map((s, i) => (
                  <li
                    key={i}
                    className="relative pl-5 text-sm leading-relaxed text-foreground-secondary before:absolute before:left-0 before:font-extrabold before:text-score-green before:content-['✓']"
                  >
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {focusAreas.length > 0 ? (
            <div className="rounded-2xl border border-score-amber-light bg-score-amber-light/40 p-4">
              <p className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.10em] text-score-amber-fg">
                △ Focus areas
              </p>
              <ul className="flex flex-col gap-1.5">
                {focusAreas.map((s, i) => (
                  <li
                    key={i}
                    className="relative pl-5 text-sm leading-relaxed text-foreground-secondary before:absolute before:left-0 before:font-extrabold before:text-score-amber before:content-['△']"
                  >
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* ─── Pillar-specific detail zone ────────────────────────── */}
      {children ? (
        <div className="mt-5 border-t border-border pt-5">
          {detailEyebrow ? (
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              {detailEyebrow}
            </p>
          ) : null}
          {children}
        </div>
      ) : null}
    </section>
  );
};

// ─── Delta chip ─────────────────────────────────────────────────────

function DeltaChip({ diff }: { diff: number | null }) {
  if (diff == null) {
    return (
      <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-bold text-muted-foreground">
        new
      </span>
    );
  }
  if (diff > 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-score-green-light px-2.5 py-0.5 text-[11px] font-bold tabular-nums text-score-green-fg">
        <TrendingUp className="h-3 w-3" /> +{diff}
      </span>
    );
  }
  if (diff < 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-score-red-light px-2.5 py-0.5 text-[11px] font-bold tabular-nums text-score-red-fg">
        <TrendingDown className="h-3 w-3" /> {diff}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-bold text-muted-foreground">
      —
    </span>
  );
}
