/**
 * PillarStoryCard — social share card at 1080×1920 (Instagram/TikTok story).
 *
 * Uses a `size` prop (width, default 1080) and derives height at the 9:16 ratio.
 * All measurements scale proportionally — no CSS transform compression.
 */

import { PRODUCT_DISPLAY_NAME } from '@/constants/productBranding';
import type { PillarCardData } from '@/lib/share/pillarCardData';

const BASE_W = 1080;
const BASE_H = 1920;

interface PillarStoryCardProps {
  data: PillarCardData;
  /** Card width in pixels. Height is derived at 9:16. Defaults to 1080. */
  size?: number;
  perspective?: 'client' | 'coach';
}

function px(base: number, r: number) { return base * r; }

function MetricPill({ label, score, delta, isFirst, r }: {
  label: string; score: number; delta: number | null; isFirst: boolean; r: number;
}) {
  const showDelta = !isFirst && delta !== null;
  const positive = delta !== null && delta >= 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `${px(28, r)}px ${px(40, r)}px`, background: 'rgba(255,255,255,0.06)', borderRadius: px(20, r), border: '1px solid rgba(255,255,255,0.08)' }}>
      <span style={{ fontSize: px(36, r), fontWeight: 500, color: 'rgba(255,255,255,0.8)' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: px(16, r) }}>
        <span style={{ fontSize: px(44, r), fontWeight: 800, color: '#fff' }}>{score}</span>
        {showDelta && (
          <span style={{ fontSize: px(32, r), fontWeight: 700, color: positive ? '#22c55e' : '#ef4444' }}>
            {positive ? '+' : ''}{delta}
          </span>
        )}
      </div>
    </div>
  );
}

export function PillarStoryCard({ data, size = BASE_W, perspective = 'client' }: PillarStoryCardProps) {
  const r = size / BASE_W;
  const height = Math.round((BASE_H / BASE_W) * size);
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

  const subline = perspective === 'coach'
    ? isFirstAssessment
      ? 'Baseline locked in. The progress journey starts now.'
      : scoreDelta !== null && scoreDelta > 0
        ? "Results like this don't happen by accident."
        : 'Consistent effort. Consistent results.'
    : isFirstAssessment
      ? 'Your baseline has been set. Every session from here is progress.'
      : scoreDelta !== null && scoreDelta > 0
        ? 'Hard work pays off. Keep showing up.'
        : 'Consistency is everything. Keep going.';

  return (
    <div style={{
      width: size, height,
      background: 'linear-gradient(175deg, #0f172a 0%, #1e293b 50%, #0c1120 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
      color: '#fff', display: 'flex', flexDirection: 'column',
      padding: `${px(96, r)}px ${px(80, r)}px`,
      boxSizing: 'border-box', position: 'relative', overflow: 'hidden',
    }}>
      {/* Glow */}
      <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: px(900, r), height: px(900, r), borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Coach logo */}
      <div style={{ marginBottom: px(96, r) }}>
        {coachLogoUrl
          ? <img src={coachLogoUrl} alt={coachName ?? 'Coach'} style={{ height: px(56, r), maxWidth: px(220, r), objectFit: 'contain' }} />
          : <span style={{ fontSize: px(32, r), fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>{coachName ?? ''}</span>
        }
      </div>

      {/* Pillar + label */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: px(40, r) }}>
        <span style={{ fontSize: px(26, r), fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', color: 'rgba(99,102,241,0.9)' }}>{pillarTitle}</span>
        <span style={{ fontSize: px(26, r), fontWeight: 600, color: 'rgba(255,255,255,0.35)' }}>{assessmentLabel}</span>
      </div>

      {/* Big score */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: px(20, r), marginBottom: px(24, r) }}>
        {!isFirstAssessment && previousScore !== null && (
          <>
            <span style={{ fontSize: px(72, r), fontWeight: 300, color: 'rgba(255,255,255,0.3)' }}>{previousScore}</span>
            <span style={{ fontSize: px(48, r), color: 'rgba(255,255,255,0.2)' }}>→</span>
          </>
        )}
        <span style={{ fontSize: px(160, r), fontWeight: 900, letterSpacing: '-6px', color: '#fff', lineHeight: 1 }}>{score}</span>
        {scoreDelta !== null && (
          <span style={{ fontSize: px(56, r), fontWeight: 800, color: scoreDelta >= 0 ? '#22c55e' : '#ef4444', marginBottom: px(16, r) }}>
            {scoreDelta >= 0 ? '+' : ''}{scoreDelta}
          </span>
        )}
      </div>

      {/* Headline */}
      <h1 style={{ fontSize: px(64, r), fontWeight: 800, lineHeight: 1.2, letterSpacing: '-2px', color: '#fff', margin: 0, marginBottom: px(24, r) }}>{headline}</h1>

      {/* Subline */}
      <p style={{ fontSize: px(36, r), fontWeight: 400, color: 'rgba(255,255,255,0.55)', margin: 0, marginBottom: px(80, r), lineHeight: 1.4 }}>{subline}</p>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', marginBottom: px(48, r) }} />

      {/* Metrics */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: px(20, r), flex: 1 }}>
        {metrics.map((m) => <MetricPill key={m.id} label={m.label} score={m.score} delta={m.delta} isFirst={isFirstAssessment} r={r} />)}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: px(64, r), gap: px(10, r) }}>
        <span style={{ fontSize: px(24, r), color: 'rgba(255,255,255,0.2)' }}>Powered by</span>
        <span style={{ fontSize: px(24, r), fontWeight: 700, color: 'rgba(255,255,255,0.3)' }}>{PRODUCT_DISPLAY_NAME}</span>
      </div>
    </div>
  );
}

/** Renders the story card natively at `previewWidth` pixels — no transform compression. */
export function PillarStoryCardPreview({
  data,
  previewWidth = 180,
  perspective = 'client',
}: {
  data: PillarCardData;
  previewWidth?: number;
  perspective?: 'client' | 'coach';
}) {
  const previewHeight = Math.round((BASE_H / BASE_W) * previewWidth);
  return (
    <div style={{ width: previewWidth, height: previewHeight, overflow: 'hidden', borderRadius: 12, flexShrink: 0 }}>
      <PillarStoryCard data={data} size={previewWidth} perspective={perspective} />
    </div>
  );
}
