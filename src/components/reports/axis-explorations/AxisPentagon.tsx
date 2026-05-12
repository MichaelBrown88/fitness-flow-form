/**
 * AXIS Pentagon — symmetric cohesive shape system (refined).
 *
 * Each pillar owns one of five 72° wedges of a shared pentagon. A
 * wedge is a single gradient-filled triangle that extends from the
 * centre to its score radius — adjacent wedges meet without visible
 * dividers, so the pentagon reads as ONE shape with five colour zones.
 * Concentric pentagon scaffolding (drawn on top, very subtle) gives
 * facet readability without re-introducing radial seams.
 *
 * At equal scores the silhouette is a perfectly symmetric pentagon.
 * At divergent scores the silhouette is jagged — imbalance becomes
 * visible directly.
 *
 * Two callers:
 *   - <PillarWedge>          single wedge as a branding stamp
 *                            (always points up, used in section headers).
 *   - <AxisPentagonHero>     composed pentagon with all 5 wedges plus
 *                            composite AXIS Index in the centre.
 */

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  pillarColor,
  pillarHueAt,
  type RadarData,
} from '@/components/reports/OverallRadarChart';

const N = 5;
const PILLAR_OFFSET = -Math.PI / 2;     // start at 12 o'clock
const HALF_WEDGE = Math.PI / N;         // 36° each side of the pillar centre
const SCAFFOLD_STOPS = [0.25, 0.50, 0.75]; // facet-readability rings inside the hull

// ─── Pillar → tip-glyph identifier ────────────────────────────────
type GlyphKind = 'block' | 'spike' | 'wave' | 'star' | 'hex';

const PILLAR_GLYPH: Record<string, GlyphKind> = {
  'Body Composition': 'block',
  'Functional Strength': 'spike',
  'Metabolic Fitness': 'wave',
  'Movement Quality': 'star',
  'Lifestyle Factors': 'hex',
  Body: 'block',
  Strength: 'spike',
  Cardio: 'wave',
  Movement: 'star',
  Lifestyle: 'hex',
};

function glyphKindFor(name: string, fullLabel: string): GlyphKind {
  return PILLAR_GLYPH[fullLabel] ?? PILLAR_GLYPH[name] ?? 'block';
}

// ─── Geometry ─────────────────────────────────────────────────────

function pillarAngle(i: number): number {
  return PILLAR_OFFSET + (i * 2 * Math.PI) / N;
}

function corner(i: number, dAng: number, r: number): { x: number; y: number } {
  const a = pillarAngle(i) + dAng;
  return { x: Math.cos(a) * r, y: Math.sin(a) * r };
}

function pentagonPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: N })
    .map((_, i) => {
      const a = pillarAngle(i);
      return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
    })
    .join(' ');
}

// ─── Tip glyphs (drawn at outer apex of each wedge) ───────────────

function renderTipGlyph(
  kind: GlyphKind,
  cx: number,
  cy: number,
  size: number,
  hue: number,
  intensity: number,
): React.ReactNode {
  const s = size;
  const fill = pillarColor(hue, 0.85 * intensity + 0.15);
  const stroke = pillarColor(hue, 0.95);
  const sw = Math.max(0.8, s * 0.06);
  const common = {
    fill,
    stroke,
    strokeWidth: sw,
    strokeLinejoin: 'miter' as const,
    opacity: 0.55 + intensity * 0.45,
  };

  switch (kind) {
    case 'block': {
      const r = s * 0.46;
      return (
        <rect
          x={cx - r}
          y={cy - r}
          width={r * 2}
          height={r * 2}
          rx={r * 0.16}
          {...common}
        />
      );
    }
    case 'spike': {
      const apex = `${cx},${cy - s * 0.62}`;
      const right = `${cx + s * 0.45},${cy + s * 0.38}`;
      const left = `${cx - s * 0.45},${cy + s * 0.38}`;
      return <polygon points={`${apex} ${right} ${left}`} {...common} />;
    }
    case 'wave': {
      const w = s * 0.78;
      const h = s * 0.55;
      const d = `
        M ${cx - w} ${cy + h * 0.3}
        L ${cx - w * 0.4} ${cy - h * 0.6}
        L ${cx} ${cy + h * 0.3}
        L ${cx + w * 0.4} ${cy - h * 0.6}
        L ${cx + w} ${cy + h * 0.3}
      `;
      return (
        <path
          d={d}
          fill="none"
          stroke={stroke}
          strokeWidth={Math.max(1, s * 0.18)}
          strokeLinejoin="miter"
          strokeLinecap="butt"
          opacity={common.opacity}
        />
      );
    }
    case 'star': {
      // 4-point compass star
      const r = s * 0.62;
      const tip = (ang: number) =>
        `${(cx + Math.cos(ang) * r).toFixed(2)},${(cy + Math.sin(ang) * r).toFixed(2)}`;
      const inner = (ang: number) =>
        `${(cx + Math.cos(ang) * r * 0.32).toFixed(2)},${(cy + Math.sin(ang) * r * 0.32).toFixed(2)}`;
      const points: string[] = [];
      for (let k = 0; k < 4; k++) {
        const angTip = -Math.PI / 2 + (k * Math.PI) / 2;
        const angIn = angTip + Math.PI / 4;
        points.push(tip(angTip));
        points.push(inner(angIn));
      }
      return <polygon points={points.join(' ')} {...common} />;
    }
    case 'hex': {
      const r = s * 0.55;
      const pts: string[] = [];
      for (let k = 0; k < 6; k++) {
        const a = -Math.PI / 2 + (k * Math.PI) / 3;
        pts.push(
          `${(cx + Math.cos(a) * r).toFixed(2)},${(cy + Math.sin(a) * r).toFixed(2)}`,
        );
      }
      return <polygon points={pts.join(' ')} {...common} />;
    }
  }
}

// ─── Single wedge fill (triangle, gradient, score-driven extent) ──

function WedgeFill({
  cx,
  cy,
  baseR,
  i,
  score,
  hue,
  gradientId,
}: {
  cx: number;
  cy: number;
  baseR: number;
  i: number;
  score: number;
  hue: number;
  gradientId: string;
}) {
  const scoreR = (Math.max(0, Math.min(100, score)) / 100) * baseR;
  if (scoreR < 1) return null;
  const lOuter = corner(i, -HALF_WEDGE, scoreR);
  const rOuter = corner(i, +HALF_WEDGE, scoreR);
  return (
    <path
      d={`M ${cx} ${cy} L ${(cx + lOuter.x).toFixed(2)} ${(cy + lOuter.y).toFixed(2)} L ${(cx + rOuter.x).toFixed(2)} ${(cy + rOuter.y).toFixed(2)} Z`}
      fill={`url(#${gradientId})`}
      stroke="none"
    />
  );
}

// ─── Concentric pentagon scaffolding (always-on faint reference) ─

function ConcentricScaffold({
  cx,
  cy,
  baseR,
  withOuter = true,
  opacityScale = 1,
}: {
  cx: number;
  cy: number;
  baseR: number;
  withOuter?: boolean;
  opacityScale?: number;
}) {
  return (
    <g>
      {SCAFFOLD_STOPS.map((scale) => (
        <polygon
          key={`scaf-${scale}`}
          points={pentagonPoints(cx, cy, baseR * scale)}
          fill="none"
          stroke="currentColor"
          strokeWidth={0.5}
          strokeDasharray="3 5"
          opacity={0.10 * opacityScale}
          className="text-foreground"
        />
      ))}
      {withOuter && (
        <polygon
          points={pentagonPoints(cx, cy, baseR)}
          fill="none"
          stroke="currentColor"
          strokeWidth={1}
          opacity={0.18 * opacityScale}
          className="text-foreground"
        />
      )}
    </g>
  );
}

// ─── PillarWedge — standalone branding stamp ──────────────────────

interface PillarWedgeProps {
  pillarName: string;
  score?: number;
  size?: number;
  index?: number;
  showGlyph?: boolean;
  className?: string;
}

export function PillarWedge({
  pillarName,
  score = 100,
  size = 64,
  index = 0,
  showGlyph = true,
  className,
}: PillarWedgeProps) {
  const VIEW = 100;
  const cx = VIEW / 2;
  const cy = VIEW * 0.62;
  const baseR = VIEW * 0.50;
  const hue = pillarHueAt(pillarName, pillarName, index);
  const kind = glyphKindFor(pillarName, pillarName);
  const i = 0;

  const reactId = useId();
  const id = reactId.replace(/:/g, '');
  const gradId = `pwedge-grad-${id}`;
  const glowId = `pwedge-glow-${id}`;

  const ax = Math.cos(pillarAngle(i)) * baseR;
  const ay = Math.sin(pillarAngle(i)) * baseR;

  const tipR = baseR * (Math.max(0, Math.min(100, score)) / 100) * 0.86;
  const tipPos = corner(i, 0, tipR);
  const glyphSize = VIEW * 0.18;
  const intensity = Math.max(0.2, Math.min(1, score / 100));

  return (
    <svg
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={`${pillarName} pillar — score ${Math.round(score)} of 100`}
    >
      <defs>
        <linearGradient
          id={gradId}
          x1={cx}
          y1={cy}
          x2={cx + ax}
          y2={cy + ay}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor={pillarColor(hue, 0.16)} />
          <stop offset="55%" stopColor={pillarColor(hue, 0.55)} />
          <stop offset="100%" stopColor={pillarColor(hue, 0.92)} />
        </linearGradient>
        <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
      </defs>

      <ConcentricScaffold cx={cx} cy={cy} baseR={baseR} opacityScale={0.6} />

      <WedgeFill cx={cx} cy={cy} baseR={baseR} i={i} score={score} hue={hue} gradientId={gradId} />

      {/* Subtle outline along the wedge's outer chord */}
      {score > 1 && (() => {
        const scoreR = (score / 100) * baseR;
        const l = corner(i, -HALF_WEDGE, scoreR);
        const r = corner(i, +HALF_WEDGE, scoreR);
        return (
          <line
            x1={(cx + l.x).toFixed(2)}
            y1={(cy + l.y).toFixed(2)}
            x2={(cx + r.x).toFixed(2)}
            y2={(cy + r.y).toFixed(2)}
            stroke={pillarColor(hue, 0.95)}
            strokeWidth={1.4}
          />
        );
      })()}

      {showGlyph && score > 1 && (
        <g>
          <g filter={`url(#${glowId})`} opacity={0.55 * intensity}>
            {renderTipGlyph(kind, cx + tipPos.x, cy + tipPos.y, glyphSize, hue, 1)}
          </g>
          {renderTipGlyph(kind, cx + tipPos.x, cy + tipPos.y, glyphSize, hue, intensity)}
        </g>
      )}
    </svg>
  );
}

// ─── Animation hook (shared) ──────────────────────────────────────

function useAnimatedScores(
  targets: number[],
  opts: { from?: number[]; duration?: number } = {},
): number[] {
  const { from, duration = 1300 } = opts;
  const [values, setValues] = useState<number[]>(() => from ?? targets.map(() => 0));
  const startRef = useRef<number | null>(null);
  const initialRef = useRef<number[]>(values);

  const targetsKey = targets.join(',');
  useEffect(() => {
    initialRef.current = values;
    startRef.current = null;
    let raf = 0;
    const tick = (ts: number) => {
      if (startRef.current == null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = targets.map((target, idx) => {
        const start = initialRef.current[idx] ?? 0;
        return start + (target - start) * eased;
      });
      setValues(next);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetsKey, duration]);

  return values;
}

// ─── AxisPentagonHero — composed signature ────────────────────────

interface AxisPentagonHeroProps {
  data: RadarData[];
  previousData?: RadarData[];
  compositeOverride?: number;
}

export default function AxisPentagonHero({
  data,
  previousData,
  compositeOverride,
}: AxisPentagonHeroProps) {
  const VIEW = 600;
  const cx = VIEW / 2;
  const cy = VIEW / 2;
  const baseR = 220;
  const labelR = 282;

  const reactId = useId();
  const id = reactId.replace(/:/g, '');
  const haloFilter = `axis-halo-${id}`;
  const innerGlowFilter = `axis-inner-${id}`;
  const edgeGlowFilter = `axis-edge-${id}`;
  const tipGlowFilter = `axis-tip-${id}`;
  const wellId = `axis-well-${id}`;

  const targetScores = useMemo(() => data.map((d) => d.value), [data]);
  const prevValues = useMemo(() => {
    if (!previousData) return undefined;
    return data.map((d) => previousData.find((p) => p.name === d.name)?.value ?? d.value);
  }, [data, previousData]);
  const animatedScores = useAnimatedScores(targetScores, {
    from: prevValues ?? targetScores.map(() => 0),
    duration: prevValues ? 1300 : 1100,
  });

  const composite = useMemo(() => {
    if (typeof compositeOverride === 'number') return compositeOverride;
    if (animatedScores.length === 0) return 0;
    return animatedScores.reduce((a, b) => a + b, 0) / animatedScores.length;
  }, [animatedScores, compositeOverride]);

  const tier =
    composite >= 85 ? 'PEAK'
    : composite >= 70 ? 'ASCENT'
    : composite >= 55 ? 'BUILDING'
    : composite >= 40 ? 'EMERGING'
    : 'BASE';

  // Per-wedge linear gradient ids
  const gradientIds = useMemo(
    () => data.map((_, i) => `axis-grad-${id}-${i}`),
    [data, id],
  );

  return (
    <svg
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      className="h-full w-full"
      role="img"
      aria-label={`AXIS Index — composite score ${Math.round(composite)} of 100`}
    >
      <defs>
        {/* Per-wedge linear gradients aligned with each pillar axis */}
        {data.map((d, i) => {
          const a = pillarAngle(i);
          const ax = Math.cos(a) * baseR;
          const ay = Math.sin(a) * baseR;
          const hue = pillarHueAt(d.name, d.fullLabel, i);
          return (
            <linearGradient
              key={`grad-${i}`}
              id={gradientIds[i]}
              x1={cx}
              y1={cy}
              x2={cx + ax}
              y2={cy + ay}
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor={pillarColor(hue, 0.10)} />
              <stop offset="55%" stopColor={pillarColor(hue, 0.55)} />
              <stop offset="100%" stopColor={pillarColor(hue, 0.95)} />
            </linearGradient>
          );
        })}
        <filter id={haloFilter} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="22" />
        </filter>
        <filter id={innerGlowFilter} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <filter id={edgeGlowFilter} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <filter id={tipGlowFilter} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3.4" />
        </filter>
        <radialGradient id={wellId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(0,0,0,0.55)" />
          <stop offset="60%" stopColor="rgba(0,0,0,0.18)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
      </defs>

      {/* Atmospheric halos behind each wedge — broad coloured glow */}
      <g filter={`url(#${haloFilter})`}>
        {data.map((d, i) => {
          const score = animatedScores[i] ?? 0;
          const a = pillarAngle(i);
          const haloR = baseR * 0.62;
          const hx = cx + Math.cos(a) * haloR;
          const hy = cy + Math.sin(a) * haloR;
          const hue = pillarHueAt(d.name, d.fullLabel, i);
          const alpha = 0.18 + (score / 100) * 0.65;
          return (
            <circle
              key={`halo-${i}`}
              cx={hx.toFixed(2)}
              cy={hy.toFixed(2)}
              r={110}
              fill={pillarColor(hue, alpha)}
            />
          );
        })}
      </g>

      {/* Faint full-pentagon scaffolding — implies the cohesive shape
          even when scores are low. Drawn beneath the wedges. */}
      <ConcentricScaffold cx={cx} cy={cy} baseR={baseR} opacityScale={0.9} />

      {/* Wedge fills (gradient, no strokes — adjacent wedges meet seamlessly) */}
      {data.map((d, i) => {
        const score = animatedScores[i] ?? 0;
        const hue = pillarHueAt(d.name, d.fullLabel, i);
        return (
          <WedgeFill
            key={`wedge-${i}`}
            cx={cx}
            cy={cy}
            baseR={baseR}
            i={i}
            score={score}
            hue={hue}
            gradientId={gradientIds[i]}
          />
        );
      })}

      {/* Inner glow over the score-driven hull — soft luminous bloom */}
      <g filter={`url(#${innerGlowFilter})`} opacity={0.55}>
        {data.map((d, i) => {
          const score = animatedScores[i] ?? 0;
          const hue = pillarHueAt(d.name, d.fullLabel, i);
          return (
            <WedgeFill
              key={`wedge-glow-${i}`}
              cx={cx}
              cy={cy}
              baseR={baseR}
              i={i}
              score={score}
              hue={hue}
              gradientId={gradientIds[i]}
            />
          );
        })}
      </g>

      {/* Concentric scaffolding ON TOP of fills — gives facet readability */}
      <ConcentricScaffold cx={cx} cy={cy} baseR={baseR} withOuter={false} opacityScale={1.4} />

      {/* Outer chord glow — tint each score-radius edge with its leading hue */}
      <g filter={`url(#${edgeGlowFilter})`} opacity={0.85}>
        {data.map((d, i) => {
          const score = animatedScores[i] ?? 0;
          if (score < 1) return null;
          const hue = pillarHueAt(d.name, d.fullLabel, i);
          const scoreR = (score / 100) * baseR;
          const l = corner(i, -HALF_WEDGE, scoreR);
          const r = corner(i, +HALF_WEDGE, scoreR);
          return (
            <line
              key={`edge-glow-${i}`}
              x1={(cx + l.x).toFixed(2)}
              y1={(cy + l.y).toFixed(2)}
              x2={(cx + r.x).toFixed(2)}
              y2={(cy + r.y).toFixed(2)}
              stroke={pillarColor(hue, 0.95)}
              strokeWidth={3}
              strokeLinecap="butt"
            />
          );
        })}
      </g>

      {/* Crisp outer chord lines (the actual silhouette) */}
      {data.map((d, i) => {
        const score = animatedScores[i] ?? 0;
        if (score < 1) return null;
        const hue = pillarHueAt(d.name, d.fullLabel, i);
        const scoreR = (score / 100) * baseR;
        const l = corner(i, -HALF_WEDGE, scoreR);
        const r = corner(i, +HALF_WEDGE, scoreR);
        return (
          <line
            key={`edge-${i}`}
            x1={(cx + l.x).toFixed(2)}
            y1={(cy + l.y).toFixed(2)}
            x2={(cx + r.x).toFixed(2)}
            y2={(cy + r.y).toFixed(2)}
            stroke={pillarColor(hue, 0.95)}
            strokeWidth={1.6}
            strokeLinecap="butt"
          />
        );
      })}

      {/* Tip glyphs — bigger, with their own glow */}
      {data.map((d, i) => {
        const score = animatedScores[i] ?? 0;
        const hue = pillarHueAt(d.name, d.fullLabel, i);
        const kind = glyphKindFor(d.name, d.fullLabel);
        const a = pillarAngle(i);
        const tipR = baseR * 0.86;
        const gx = cx + Math.cos(a) * tipR;
        const gy = cy + Math.sin(a) * tipR;
        const intensity = Math.max(0.2, Math.min(1, score / 100));
        const glyphSize = 26;
        return (
          <g key={`tip-${i}`}>
            <g filter={`url(#${tipGlowFilter})`} opacity={0.6 * intensity}>
              {renderTipGlyph(kind, gx, gy, glyphSize, hue, 1)}
            </g>
            {renderTipGlyph(kind, gx, gy, glyphSize, hue, intensity)}
          </g>
        );
      })}

      {/* Centre well — subtle dark vignette behind the composite */}
      <circle cx={cx} cy={cy} r={baseR * 0.42} fill={`url(#${wellId})`} />

      {/* Composite — AXIS INDEX hero block */}
      <text
        x={cx}
        y={cy - 60}
        textAnchor="middle"
        fontSize={11}
        fontWeight={700}
        className="fill-muted-foreground"
        style={{ letterSpacing: '0.36em' }}
      >
        AXIS INDEX
      </text>
      <text
        x={cx}
        y={cy + 24}
        textAnchor="middle"
        fontSize={132}
        fontWeight={800}
        className="fill-foreground tabular-nums"
        style={{ letterSpacing: '-0.06em' }}
      >
        {Math.round(composite)}
      </text>
      <text
        x={cx}
        y={cy + 56}
        textAnchor="middle"
        fontSize={12}
        fontWeight={700}
        className="fill-foreground"
        style={{ letterSpacing: '0.34em' }}
      >
        {tier}
      </text>
      <text
        x={cx}
        y={cy + 74}
        textAnchor="middle"
        fontSize={9}
        fontWeight={500}
        className="fill-muted-foreground"
        style={{ letterSpacing: '0.40em', fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
      >
        /100 · REV.A
      </text>

      {/* Pillar labels at outer rim */}
      {data.map((d, i) => {
        const a = pillarAngle(i);
        const lx = cx + Math.cos(a) * labelR;
        const ly = cy + Math.sin(a) * labelR;
        const score = Math.round(animatedScores[i] ?? 0);
        const hue = pillarHueAt(d.name, d.fullLabel, i);
        const anchor: 'start' | 'middle' | 'end' = lx < cx - 6 ? 'end' : lx > cx + 6 ? 'start' : 'middle';
        const isAbove = ly < cy - 4;
        const dyName = isAbove ? -8 : 8;
        const dyScore = isAbove ? -8 - 18 : 8 + 18;
        return (
          <g key={`lbl-${i}`}>
            <text
              x={lx}
              y={ly + dyName}
              textAnchor={anchor}
              fontSize={10}
              fontWeight={700}
              fill={pillarColor(hue)}
              style={{ letterSpacing: '0.22em', textTransform: 'uppercase' }}
            >
              {d.name}
            </text>
            <text
              x={lx}
              y={ly + dyScore}
              textAnchor={anchor}
              fontSize={20}
              fontWeight={800}
              className="fill-foreground tabular-nums"
              style={{ letterSpacing: '-0.02em' }}
            >
              {score}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
