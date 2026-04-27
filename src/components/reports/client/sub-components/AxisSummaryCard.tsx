import React from 'react';
import { ArrowRight, Download, Share2, Trophy, TrendingDown, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import OverallRadarChart, { type RadarData } from '@/components/reports/OverallRadarChart';
import type { ScoreSummary } from '@/lib/scoring';
import { cn } from '@/lib/utils';

interface AxisSummaryCardProps {
  clientName: string;
  /** Pre-formatted date string for the metadata line (e.g. "14 January 2026"). */
  reportDate: string;
  scores: ScoreSummary;
  previousOverallScore?: number | null;
  /** Optional client-friendly narrative — falls back to archetype description. */
  narrative?: string;
  /** Client archetype (name + description) — rendered as a small badge inside the AXIS block. */
  archetype?: { name: string; description: string };
  /** Five-pillar data for the AXIS Bloom on the right side of the hero. */
  radarData: RadarData[];
  /** Previous-assessment radar data for the Bloom's ghost outline + delta animation. */
  previousRadarData?: RadarData[];
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
 * The single AXIS hero — combines the headline number, narrative,
 * archetype, and the AXIS Bloom into one cohesive card.
 *
 * Left column: identity + AXIS Score™ block (number + trend +
 * archetype badge + narrative). Right column: AXIS Bloom (the
 * five-pillar petal visualisation). Footer: Download / Share /
 * Send actions when in coach review mode.
 *
 * One colour system across the whole card:
 *   - Aggregate AXIS score → score-tone (green/amber/red by overall)
 *   - Trend pill → score-tone (positive/negative)
 *   - Per-pillar info → handled inside the Bloom (per-pillar identity
 *     hues — cyan/rose/amber/indigo/emerald)
 */
export const AxisSummaryCard: React.FC<AxisSummaryCardProps> = ({
  clientName,
  reportDate,
  scores,
  previousOverallScore,
  narrative,
  archetype,
  radarData,
  previousRadarData,
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
  const tone: 'green' | 'amber' | 'red' | 'muted' =
    overall >= 75 ? 'green' : overall >= 50 ? 'amber' : overall > 0 ? 'red' : 'muted';

  const firstName = clientName?.trim().split(/\s+/)[0] || 'client';

  const bylineParts: string[] = [];
  if (assessmentNumber) bylineParts.push(`Assessment #${assessmentNumber}`);
  if (coachName) bylineParts.push(`Coach: ${coachName}`);
  const byline = bylineParts.join(' · ');

  const metaParts: string[] = [];
  if (orgName) metaParts.push(orgName);
  if (reportDate) metaParts.push(reportDate);
  const meta = metaParts.join(' · ');

  const description = narrative ?? archetype?.description;

  return (
    <section className="rounded-[28px] border border-border bg-card p-7 sm:p-8">
      <div className="grid items-stretch gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        {/* ─── LEFT: identity + AXIS score block ───────────────── */}
        <div className="flex flex-col gap-5">
          {meta ? <p className="text-[13px] text-muted-foreground">{meta}</p> : null}

          <div className="space-y-1">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {clientName || 'Assessment summary'}
            </h2>
            {byline ? <p className="text-[13px] text-muted-foreground">{byline}</p> : null}
          </div>

          <div className="rounded-[20px] border border-border bg-card-elevated p-5">
            {/* Eyebrow with the small AXIS diamond mark */}
            <div className="flex items-center gap-2">
              <AxisDiamondMark />
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                AXIS Score™
              </span>
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

            {/* Archetype badge — small pill with trophy icon and name */}
            {archetype?.name ? (
              <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-semibold tracking-[-0.005em] text-foreground">
                <Trophy className="h-3 w-3 text-foreground" />
                {archetype.name}
              </div>
            ) : null}

            {description ? (
              <p className="mt-3 text-sm leading-relaxed text-foreground-secondary">{description}</p>
            ) : null}
          </div>
        </div>

        {/* ─── RIGHT: AXIS Bloom ──────────────────────────────── */}
        {/* Min-height keeps the SVG from collapsing on first paint;
            the Bloom expands to fill the column. */}
        <div className="flex min-h-[340px] items-center justify-center sm:min-h-[380px]">
          {radarData?.length > 0 ? (
            <OverallRadarChart data={radarData} previousData={previousRadarData} />
          ) : null}
        </div>
      </div>

      {/* ─── ACTIONS (coach view only) ──────────────────────── */}
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

// ─── AXIS diamond brand mark ────────────────────────────────────────

/**
 * Small faceted diamond that echoes the centre mark of the AXIS Bloom.
 * Used as a tiny brand glyph next to the "AXIS Score™" eyebrow so the
 * hero card reads as part of the same visual system as the Bloom.
 */
function AxisDiamondMark({ size = 11 }: { size?: number }) {
  const c = size / 2;
  const inner = size * 0.32;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <path
        d={`M ${c} 0 L ${size} ${c} L ${c} ${size} L 0 ${c} Z`}
        className="fill-foreground"
        opacity={0.92}
      />
      <path
        d={`M ${c} ${c - inner} L ${c + inner} ${c} L ${c} ${c + inner} L ${c - inner} ${c} Z`}
        className="fill-background"
        opacity={0.22}
      />
    </svg>
  );
}

// ─── Tone mapping for the big AXIS number ───────────────────────────

const AXIS_NUMBER_TONE: Record<'green' | 'amber' | 'red' | 'muted', string> = {
  green: 'text-score-green',
  amber: 'text-score-amber',
  red: 'text-score-red',
  muted: 'text-foreground',
};
