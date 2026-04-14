/**
 * PillarScoreCard — social share card at 1080×1080 (square post).
 *
 * Uses a `size` prop (default 1080) so the card renders natively at any pixel width.
 * All measurements scale proportionally — no CSS transform compression.
 *
 * Usage:
 *   Full social dimensions:  <PillarScoreCard data={d} />              → 1080×1080
 *   In-app preview:          <PillarScoreCardPreview data={d} previewWidth={400} />
 */

import { PRODUCT_DISPLAY_NAME } from '@/constants/productBranding';
import type { PillarCardData } from '@/lib/share/pillarCardData';

const BASE = 1080;

interface PillarScoreCardProps {
  data: PillarCardData;
  /** Pixel size of the card. Defaults to 1080 (full social dimensions). */
  size?: number;
  /**
   * 'client' (default) — "Claire, your score improved by 7"
   * 'coach'            — "Claire's score is up 7 points"
   */
  perspective?: 'client' | 'coach';
}

function px(base: number, r: number) { return base * r; }

function DeltaBadge({ delta, r }: { delta: number | null; r: number }) {
  if (delta === null) return null;
  const positive = delta >= 0;
  return (
    <span style={{ fontSize: px(28, r), fontWeight: 700, color: positive ? '#22c55e' : '#ef4444', marginLeft: px(8, r) }}>
      {positive ? '+' : ''}{delta}
    </span>
  );
}

function MetricRow({ label, score, delta, isFirst, r }: {
  label: string; score: number; delta: number | null; isFirst: boolean; r: number;
}) {
  const showDelta = !isFirst && delta !== null;
  const positive = delta !== null && delta >= 0;
  const barWidth = Math.max(4, Math.min(100, score));

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: px(24, r), padding: `${px(18, r)}px 0`, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
      <span style={{ flex: `0 0 ${px(260, r)}px`, fontSize: px(30, r), fontWeight: 500, color: 'rgba(255,255,255,0.85)', letterSpacing: '-0.3px' }}>
        {label}
      </span>
      <div style={{ flex: 1, height: px(10, r), borderRadius: px(6, r), background: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
        <div style={{ width: `${barWidth}%`, height: '100%', borderRadius: px(6, r), background: showDelta ? (positive ? '#22c55e' : '#ef4444') : 'rgba(255,255,255,0.5)' }} />
      </div>
      <span style={{ flex: `0 0 ${px(60, r)}px`, fontSize: px(30, r), fontWeight: 700, color: '#fff', textAlign: 'right' }}>{score}</span>
      {showDelta ? (
        <span style={{ flex: `0 0 ${px(72, r)}px`, fontSize: px(26, r), fontWeight: 700, color: positive ? '#22c55e' : '#ef4444', textAlign: 'right' }}>
          {positive ? '+' : ''}{delta}
        </span>
      ) : <span style={{ flex: `0 0 ${px(72, r)}px` }} />}
    </div>
  );
}

export function PillarScoreCard({ data, size = BASE, perspective = 'client' }: PillarScoreCardProps) {
  const r = size / BASE;
  const { pillarTitle, clientFirstName, score, scoreDelta, previousScore, metrics, assessmentLabel, isFirstAssessment, coachLogoUrl, coachName } = data;

  const headline = perspective === 'coach'
    ? isFirstAssessment
      ? `${clientFirstName}'s ${pillarTitle} baseline is set`
      : scoreDelta !== null
        ? `${clientFirstName}'s ${pillarTitle} score is up ${scoreDelta} points`
        : `${clientFirstName}'s ${pillarTitle} results`
    : isFirstAssessment
      ? `${clientFirstName}, here's your ${pillarTitle} score`
      : scoreDelta !== null
        ? `${clientFirstName}, your ${pillarTitle} score improved by ${scoreDelta}`
        : `${clientFirstName}, your ${pillarTitle} results`;

  return (
    <div style={{
      width: size, height: size,
      background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
      color: '#fff', display: 'flex', flexDirection: 'column',
      padding: px(72, r), boxSizing: 'border-box', position: 'relative', overflow: 'hidden',
    }}>
      {/* Glow */}
      <div style={{ position: 'absolute', top: px(-200, r), right: px(-200, r), width: px(600, r), height: px(600, r), borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: px(56, r) }}>
        {coachLogoUrl
          ? <img src={coachLogoUrl} alt={coachName ?? 'Coach'} style={{ height: px(48, r), maxWidth: px(200, r), objectFit: 'contain' }} />
          : <span style={{ fontSize: px(26, r), fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: '-0.3px' }}>{coachName ?? ''}</span>
        }
        <span style={{ fontSize: px(24, r), fontWeight: 600, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.5px' }}>{assessmentLabel}</span>
      </div>

      {/* Pillar label */}
      <span style={{ fontSize: px(22, r), fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', color: 'rgba(99,102,241,0.9)', marginBottom: px(16, r) }}>{pillarTitle}</span>

      {/* Headline */}
      <h1 style={{ fontSize: px(52, r), fontWeight: 800, lineHeight: 1.15, letterSpacing: '-1.5px', color: '#fff', margin: 0, marginBottom: px(32, r), maxWidth: px(840, r) }}>{headline}</h1>

      {/* Score */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: px(16, r), marginBottom: px(52, r) }}>
        {!isFirstAssessment && previousScore !== null && (
          <>
            <span style={{ fontSize: px(52, r), fontWeight: 300, color: 'rgba(255,255,255,0.35)' }}>{previousScore}</span>
            <span style={{ fontSize: px(36, r), color: 'rgba(255,255,255,0.25)' }}>→</span>
          </>
        )}
        <span style={{ fontSize: px(80, r), fontWeight: 900, color: '#fff', letterSpacing: '-3px' }}>{score}</span>
        <DeltaBadge delta={scoreDelta} r={r} />
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', marginBottom: px(8, r) }} />

      {/* Metrics */}
      <div style={{ flex: 1 }}>
        {metrics.map((m) => <MetricRow key={m.id} label={m.label} score={m.score} delta={m.delta} isFirst={isFirstAssessment} r={r} />)}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: px(32, r), gap: px(8, r) }}>
        <span style={{ fontSize: px(20, r), color: 'rgba(255,255,255,0.25)', letterSpacing: '0.3px' }}>Powered by</span>
        <span style={{ fontSize: px(20, r), fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '-0.2px' }}>{PRODUCT_DISPLAY_NAME}</span>
      </div>
    </div>
  );
}

/** Renders the card natively at `previewWidth` pixels — no transform compression. */
export function PillarScoreCardPreview({
  data,
  previewWidth = 320,
  perspective = 'client',
}: {
  data: PillarCardData;
  previewWidth?: number;
  perspective?: 'client' | 'coach';
}) {
  return (
    <div style={{ width: previewWidth, height: previewWidth, overflow: 'hidden', borderRadius: 12, flexShrink: 0 }}>
      <PillarScoreCard data={data} size={previewWidth} perspective={perspective} />
    </div>
  );
}
