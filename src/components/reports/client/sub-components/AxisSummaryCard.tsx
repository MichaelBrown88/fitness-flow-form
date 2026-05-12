import React from 'react';
import { ArrowRight, Download, Share2, Trophy, TrendingDown, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import OverallRadarChart, {
  COMPACT_LABELS,
  pillarColor,
  pillarHueAt,
  type RadarData,
} from '@/components/reports/OverallRadarChart';
import type { ScoreSummary } from '@/lib/scoring';
import type { FormData } from '@/contexts/FormContext';
import { calculateAge } from '@/lib/scoring';
import { buildOverallSummary } from './coachSummaryText';
import { cn } from '@/lib/utils';

interface AxisSummaryCardProps {
  clientName: string;
  /** Pre-formatted date string for the metadata line (e.g. "14 January 2026"). */
  reportDate: string;
  scores: ScoreSummary;
  previousOverallScore?: number | null;
  /** Optional client-friendly narrative — falls back to archetype description. */
  narrative?: string;
  /** Client archetype (name + description) — rendered top-right of the card. */
  archetype?: { name: string; description: string };
  /** Five-pillar data for the AXIS Bloom on the left side of the card. */
  radarData: RadarData[];
  /** Previous-assessment radar data — used for the per-pillar delta chips. */
  previousRadarData?: RadarData[];
  /** Org/studio name shown top-left. */
  orgName?: string;
  /** Coach display name for the byline. */
  coachName?: string;
  /** "Assessment #N" — pass when known; omitted otherwise. */
  assessmentNumber?: number;
  /** Vitals row inside the card (gender / age / height / weight / BMI). */
  formData?: FormData;
  /** When false (client view via /r/:token), action buttons are hidden. */
  showActions?: boolean;
  onDownloadPdf?: () => void;
  onShare?: () => void;
  onSendToClient?: () => void;
}

/**
 * The single AXIS hero. Left column hosts the AXIS Bloom; right column
 * stacks the headline AXIS Score + archetype, then the five-pillar
 * trend bars. Vitals (gender / age / height / weight / BMI) sit inside
 * the card so the Report tab no longer needs a separate header strip.
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
  formData,
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

  const vitals = buildVitals(formData);
  const overallSummary = buildOverallSummary(scores, previousOverallScore ?? null);

  // Trend bar rows — match each current pillar to its previous score.
  const bars = radarData.map((d, i) => {
    const score = Math.round(d.value);
    const prev = previousRadarData?.find((p) => p.name === d.name)?.value;
    const diff = prev != null ? Math.round(score - prev) : null;
    const hue = pillarHueAt(d.name, d.fullLabel, i);
    const colour = pillarColor(hue);
    const label = COMPACT_LABELS[d.fullLabel] ?? d.fullLabel;
    return { score, diff, colour, label, key: d.name };
  });

  return (
    <section className="rounded-[28px] border border-border bg-card p-7 shadow-[0_1px_2px_rgba(15,15,15,0.04),0_4px_14px_rgba(15,15,15,0.04)] sm:p-8">
      {/* ─── HEADER ───────────────────────────────────────────────── */}
      <div className="space-y-2">
        {meta ? <p className="text-[12px] tracking-[0.02em] text-muted-foreground">{meta}</p> : null}
        <h2 className="text-3xl font-bold tracking-[-0.020em] text-foreground sm:text-4xl">
          {clientName || 'Assessment summary'}
        </h2>
        {byline ? <p className="text-[12px] text-muted-foreground">{byline}</p> : null}
        {vitals.length > 0 ? (
          <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1">
            {vitals.map((v) => (
              <span key={v.label} className="inline-flex flex-col gap-0.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.10em] text-muted-foreground">
                  {v.label}
                </span>
                <span className="text-[13px] font-semibold tabular-nums text-foreground-secondary">
                  {v.value}
                </span>
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {/* ─── BODY: bloom on left, summary + bars on right ─────────── */}
      <div className="mt-7 grid items-stretch gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <div className="flex min-h-[340px] items-center justify-center sm:min-h-[400px]">
          {radarData?.length > 0 ? (
            <OverallRadarChart data={radarData} previousData={previousRadarData} />
          ) : null}
        </div>

        <div className="flex flex-col gap-5">
          {/* Summary row: AXIS Score (left) + Archetype (right). */}
          <div className="grid grid-cols-[1fr_auto] items-start gap-4 border-b border-border pb-5">
            <div className="flex flex-col gap-1">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                <AxisDiamondMark />
                AXIS Score™
              </span>
              <span className="flex items-baseline gap-1">
                <span
                  className={cn(
                    'text-6xl font-bold leading-none tracking-[-0.025em] tabular-nums',
                    AXIS_NUMBER_TONE[tone],
                  )}
                >
                  {overall || '—'}
                </span>
                {overall ? (
                  <span className="text-xl font-semibold text-muted-foreground">/ 100</span>
                ) : null}
              </span>
              {scoreDiff !== null && scoreDiff !== 0 ? (
                <span
                  className={cn(
                    'inline-flex items-center gap-1 text-[12px] font-semibold tabular-nums',
                    scoreDiff > 0 ? 'text-score-green-fg' : 'text-score-red-fg',
                  )}
                >
                  {scoreDiff > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                  {scoreDiff > 0 ? `+${scoreDiff} since last assessment` : `${scoreDiff} since last assessment`}
                </span>
              ) : null}
            </div>

            {archetype?.name ? (
              <div className="flex max-w-[200px] flex-col items-end gap-1.5 text-right">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Archetype
                </span>
                <span className="inline-flex items-center gap-1.5 text-sm font-bold leading-tight tracking-[-0.01em] text-foreground">
                  <Trophy className="h-3.5 w-3.5 flex-none text-foreground" />
                  {archetype.name}
                </span>
              </div>
            ) : null}
          </div>

          {/* Trend bars — one per pillar, in pillar-identity colours. */}
          <div className="flex flex-col gap-3">
            {bars.map((b) => (
              <div
                key={b.key}
                className="grid items-center gap-4"
                style={{ gridTemplateColumns: '96px minmax(0,1fr) 44px 60px' }}
              >
                <span className="inline-flex items-center gap-2 text-[13px] font-bold tracking-[-0.005em] text-foreground">
                  <span
                    className="h-2.5 w-2.5 flex-none rounded-full ring-2 ring-background"
                    style={{ background: b.colour }}
                  />
                  {b.label}
                </span>
                <div className="relative h-3 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-[width] duration-700 ease-out"
                    style={{ width: `${Math.max(0, Math.min(100, b.score))}%`, background: b.colour }}
                  />
                </div>
                <span className="text-[15px] font-bold tabular-nums tracking-[-0.005em] text-foreground">
                  {b.score}
                </span>
                <DeltaChip diff={b.diff} />
              </div>
            ))}
          </div>

          {/* Coach Summary — synthesis copy when present, generated fallback otherwise. */}
          {overallSummary ? (
            <div className="rounded-[18px] border border-border bg-gradient-to-b from-card-elevated to-muted/30 px-5 py-4">
              <p className="mb-1.5 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                <AxisDiamondMark />
                Coach Summary
              </p>
              <p className="text-[14px] font-medium leading-[1.55] tracking-[-0.005em] text-foreground-secondary">
                {overallSummary}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {/* ─── NARRATIVE under both columns ─────────────────────────── */}
      {description ? (
        <p className="mt-7 max-w-[72ch] border-t border-border pt-5 text-sm leading-relaxed text-foreground-secondary">
          {description}
        </p>
      ) : null}

      {/* ─── ACTIONS (coach view only) ────────────────────────────── */}
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

// ─── Delta chip for the trend bars ──────────────────────────────────

function DeltaChip({ diff }: { diff: number | null }) {
  if (diff == null) {
    return (
      <span className="inline-flex w-fit justify-self-end items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
        new
      </span>
    );
  }
  if (diff > 0) {
    return (
      <span className="inline-flex w-fit justify-self-end items-center gap-0.5 rounded-full bg-score-green-light px-2 py-0.5 text-[11px] font-semibold tabular-nums text-score-green-fg">
        ▲ +{diff}
      </span>
    );
  }
  if (diff < 0) {
    return (
      <span className="inline-flex w-fit justify-self-end items-center gap-0.5 rounded-full bg-score-red-light px-2 py-0.5 text-[11px] font-semibold tabular-nums text-score-red-fg">
        ▼ {diff}
      </span>
    );
  }
  return (
    <span className="inline-flex w-fit justify-self-end items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
      —
    </span>
  );
}

// ─── Vitals row helpers ─────────────────────────────────────────────

interface VitalsRow { label: string; value: string; }

function buildVitals(formData?: FormData): VitalsRow[] {
  if (!formData) return [];
  const out: VitalsRow[] = [];
  if (formData.gender) out.push({ label: 'Gender', value: capitalize(formData.gender) });
  if (formData.dateOfBirth) out.push({ label: 'Age', value: String(calculateAge(formData.dateOfBirth)) });
  const heightCm = parseFloat(formData.heightCm ?? '');
  if (heightCm > 0) {
    out.push({
      label: 'Height',
      value: heightCm >= 100 ? `${(heightCm / 100).toFixed(2)} m` : `${formData.heightCm} cm`,
    });
  }
  const weightKg = parseFloat(formData.inbodyWeightKg ?? '');
  if (weightKg > 0) out.push({ label: 'Weight', value: `${weightKg.toFixed(1)} kg` });
  const bmi = parseFloat(formData.inbodyBmi ?? '');
  if (bmi > 0) out.push({ label: 'BMI', value: bmi.toFixed(1) });
  return out;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── AXIS diamond brand mark ────────────────────────────────────────

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

const AXIS_NUMBER_TONE: Record<'green' | 'amber' | 'red' | 'muted', string> = {
  green: 'text-score-green',
  amber: 'text-score-amber',
  red: 'text-score-red',
  muted: 'text-foreground',
};
