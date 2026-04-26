import React from 'react';
import { ArrowRight, Download, Share2, TrendingDown, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ScoreSummary, ScoreCategory } from '@/lib/scoring';
import { cn } from '@/lib/utils';

interface AxisSummaryCardProps {
  clientName: string;
  /** Pre-formatted date string for the metadata line (e.g. "14 January 2026"). */
  reportDate: string;
  scores: ScoreSummary;
  previousOverallScore?: number | null;
  /** Optional client-friendly narrative — falls back to archetype description. */
  narrative?: string;
  /** Org/studio name shown top-left ("Bristol Strength Studio"). */
  orgName?: string;
  /** Coach display name for the byline. */
  coachName?: string;
  /** "Assessment #N" — pass when known; omitted otherwise. */
  assessmentNumber?: number;
  /** When false (client view via /r/:token), action buttons are hidden. */
  showActions?: boolean;
  onDownloadPdf?: () => void;
  onShare?: () => void;
  onSendToClient?: () => void;
}

/**
 * Kit Image 2: client-facing "AXIS Score™ Summary" hero card. Sits at the
 * very top of the report and gives the at-a-glance "where am I now"
 * picture before the deeper sections (radar, pillar detail, etc).
 *
 * Layout follows the kit's form-card recipe (rounded-[28px], hairline
 * border, kit padding scale) with a 1.5fr/1fr grid: AXIS + narrative on
 * the left, five-pillar bars on the right, action row across the bottom.
 */
export const AxisSummaryCard: React.FC<AxisSummaryCardProps> = ({
  clientName,
  reportDate,
  scores,
  previousOverallScore,
  narrative,
  orgName,
  coachName,
  assessmentNumber,
  showActions = false,
  onDownloadPdf,
  onShare,
  onSendToClient,
}) => {
  const overall = scores?.overall ?? 0;
  const scoreDiff = previousOverallScore != null ? overall - previousOverallScore : null;
  const tone: 'green' | 'amber' | 'red' | 'muted' = overall >= 75 ? 'green' : overall >= 50 ? 'amber' : overall > 0 ? 'red' : 'muted';

  // First-name greeting button (kit shows "Send to Alex" — first name only).
  const firstName = clientName?.trim().split(/\s+/)[0] || 'client';

  // "Coach: Maya Whitfield" — only shown when a name is available.
  const bylineParts: string[] = [];
  if (assessmentNumber) bylineParts.push(`Assessment #${assessmentNumber}`);
  if (coachName) bylineParts.push(`Coach: ${coachName}`);
  const byline = bylineParts.join(' · ');

  // "Bristol Strength Studio · 14 January 2026"
  const metaParts: string[] = [];
  if (orgName) metaParts.push(orgName);
  if (reportDate) metaParts.push(reportDate);
  const meta = metaParts.join(' · ');

  return (
    <section className="rounded-[28px] border border-border bg-card p-7 sm:p-8">
      <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        {/* ─── LEFT: identity + AXIS score + narrative ───────── */}
        <div className="flex flex-col gap-5">
          {meta ? (
            <p className="text-[13px] text-muted-foreground">{meta}</p>
          ) : null}

          <div className="space-y-1">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {clientName || 'Assessment summary'}
            </h2>
            {byline ? (
              <p className="text-[13px] text-muted-foreground">{byline}</p>
            ) : null}
          </div>

          <div className="rounded-[20px] border border-border bg-card-elevated p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              AXIS Score™
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className={cn('text-7xl font-bold leading-none tracking-[-0.02em] tabular-nums', AXIS_NUMBER_TONE[tone])}>
                {overall || '—'}
              </span>
              {overall ? (
                <span className="text-2xl font-semibold text-muted-foreground">/ 100</span>
              ) : null}
            </div>
            {scoreDiff !== null && scoreDiff !== 0 ? (
              <div
                className={cn(
                  'mt-3 inline-flex items-center gap-1 text-[13px] font-semibold',
                  scoreDiff > 0 ? 'text-score-green-fg' : 'text-score-red-fg',
                )}
              >
                {scoreDiff > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                {scoreDiff > 0 ? `+${scoreDiff} since last assessment` : `${scoreDiff} since last assessment`}
              </div>
            ) : null}
            {narrative ? (
              <p className="mt-4 text-sm leading-relaxed text-foreground-secondary">{narrative}</p>
            ) : null}
          </div>
        </div>

        {/* ─── RIGHT: five-pillar profile bars ────────────────── */}
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Five-pillar profile
            </span>
            {previousOverallScore != null ? (
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                vs. previous
              </span>
            ) : null}
          </div>
          <ul className="space-y-3">
            {scores?.categories?.map((cat) => (
              <PillarBar key={cat.id} category={cat} />
            )) ?? null}
          </ul>
        </div>
      </div>

      {/* ─── ACTIONS (coach view only) ─────────────────────── */}
      {showActions ? (
        <div className="mt-7 flex flex-wrap items-center justify-end gap-2 border-t border-border pt-5">
          {onDownloadPdf ? (
            <Button variant="outline" onClick={onDownloadPdf} className="h-10 gap-2 rounded-full">
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          ) : null}
          {onShare ? (
            <Button variant="outline" onClick={onShare} className="h-10 gap-2 rounded-full">
              <Share2 className="h-4 w-4" />
              Share link
            </Button>
          ) : null}
          {onSendToClient ? (
            <Button onClick={onSendToClient} className="h-10 gap-2 rounded-full">
              <ArrowRight className="h-4 w-4" />
              Send to {firstName}
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
};

// ─── Pillar bar (one per category) ──────────────────────────────────────

const AXIS_NUMBER_TONE: Record<'green' | 'amber' | 'red' | 'muted', string> = {
  green: 'text-score-green',
  amber: 'text-score-amber',
  red: 'text-score-red',
  muted: 'text-foreground',
};

const PILLAR_BAR_TONE: Record<'green' | 'amber' | 'red' | 'muted', { fill: string; score: string }> = {
  green: { fill: 'bg-score-green', score: 'text-score-green-fg' },
  amber: { fill: 'bg-score-amber', score: 'text-score-amber-fg' },
  red: { fill: 'bg-score-red', score: 'text-score-red-fg' },
  muted: { fill: 'bg-muted-foreground/30', score: 'text-muted-foreground' },
};

function pillarTone(score: number): 'green' | 'amber' | 'red' | 'muted' {
  if (!score) return 'muted';
  if (score >= 75) return 'green';
  if (score >= 50) return 'amber';
  return 'red';
}

function pillarSubLine(cat: ScoreCategory): string | undefined {
  const first = cat.details?.[0];
  if (!first) return undefined;
  if (typeof first.value === 'number' && first.unit) {
    return `${first.label} · ${first.value}${first.unit}`;
  }
  return first.label;
}

interface PillarBarProps {
  category: ScoreCategory;
}

function PillarBar({ category }: PillarBarProps) {
  const tone = pillarTone(category.score);
  const toneCls = PILLAR_BAR_TONE[tone];
  const sub = pillarSubLine(category);
  const pct = Math.max(0, Math.min(100, category.score));

  return (
    <li className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[14px] font-semibold tracking-[-0.005em] text-foreground">{category.title}</div>
          {sub ? (
            <div className="truncate text-[12px] text-muted-foreground">{sub}</div>
          ) : null}
        </div>
        <span className={cn('shrink-0 text-[14px] font-bold tabular-nums', toneCls.score)}>
          {category.score || '—'}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={cn('h-full rounded-full transition-all duration-500', toneCls.fill)} style={{ width: `${pct}%` }} />
      </div>
    </li>
  );
}
