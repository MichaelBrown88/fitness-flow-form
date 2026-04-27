/**
 * AXIS Bloom — One Assess's signature five-pillar visualisation.
 *
 * Five outline-only petal shapes radiating from the AXIS brand mark
 * at the centre. Each petal:
 *   - Owns a fixed semantic hue (Body=Cyan, Strength=Rose, Cardio=Amber,
 *     Movement=Indigo, Lifestyle=Emerald), rendered at a constant
 *     brightness regardless of score.
 *   - Communicates pillar HEALTH through SIZE alone — small for low
 *     scores, full-bloom for high scores.
 *   - Has subtly bowed-outward edges (geometric but not rigid) and
 *     small rounded corners (sharp but not jagged).
 *   - Anchors at the chart centre (no overlap past it).
 *
 * Design polish:
 *   - Centre AXIS brand mark (faceted diamond) anchors the bloom.
 *   - Subtle continuous "breathing" pulse on the petals — looks alive
 *     when the user dwells on it.
 *   - Mount animation: each petal expands from previous → current
 *     scores on view, with cubic-out easing.
 *   - Dashed scale rings at 25 / 50 / 75 / 100 with centred labels on
 *     the top axis; dashed spokes on the other 4 axes.
 *   - Subtle outer glow tinted by each petal's pillar colour.
 *
 * No Recharts. Custom SVG, ~13kb on the wire.
 */

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export interface RadarData {
  name: string;
  value: number;
  fullLabel: string;
  /** Legacy field — kept for prop-compat; pillar colour is now derived
   *  by name lookup against the AXIS palette. */
  color: string;
}

interface OverallRadarChartProps {
  data: RadarData[];
  /** When provided, each petal animates from previous → current scores. */
  previousData?: RadarData[];
  /** Mobile: shrink labels + radius slightly. */
  compact?: boolean;
}

// ─── Per-pillar palette (fixed brightness; identity only) ───────────

interface PillarHue { h: number; alias: string }

const PILLAR_HUES: Record<string, PillarHue> = {
  // Canonical full labels
  'Body Composition': { h: 188, alias: 'Cyan' },
  'Functional Strength': { h: 350, alias: 'Rose' },
  'Metabolic Fitness': { h: 28, alias: 'Amber' },
  'Movement Quality': { h: 262, alias: 'Indigo' },
  'Lifestyle Factors': { h: 152, alias: 'Emerald' },
  // Short labels (mobile / compact)
  Body: { h: 188, alias: 'Cyan' },
  Strength: { h: 350, alias: 'Rose' },
  Cardio: { h: 28, alias: 'Amber' },
  Movement: { h: 262, alias: 'Indigo' },
  Lifestyle: { h: 152, alias: 'Emerald' },
  // Category id keys (kit data shape)
  bodyComp: { h: 188, alias: 'Cyan' },
  strength: { h: 350, alias: 'Rose' },
  cardio: { h: 28, alias: 'Amber' },
  movementQuality: { h: 262, alias: 'Indigo' },
  lifestyle: { h: 152, alias: 'Emerald' },
};

// Order-based fallback hues so pillars in non-standard orders still get
// a consistent identity (5 hues spaced around the wheel).
const FALLBACK_HUES = [188, 350, 28, 262, 152];

const FIXED_LIGHTNESS = 45;
const FIXED_SATURATION = 72;

function pillarHueAt(name: string, fullLabel: string, index: number): number {
  return (
    PILLAR_HUES[fullLabel]?.h ??
    PILLAR_HUES[name]?.h ??
    FALLBACK_HUES[index % FALLBACK_HUES.length]
  );
}

function pillarColor(hue: number, alpha = 1): string {
  return alpha === 1
    ? `hsl(${hue} ${FIXED_SATURATION}% ${FIXED_LIGHTNESS}%)`
    : `hsl(${hue} ${FIXED_SATURATION}% ${FIXED_LIGHTNESS}% / ${alpha})`;
}

// ─── Geometry ───────────────────────────────────────────────────────

function petalAngle(i: number, n: number): number {
  return -Math.PI / 2 + (i * 2 * Math.PI) / n;
}

interface XY { x: number; y: number; }

function petalDimsFor(score: number, baseR: number, maxScale: number, fatness: number): { length: number; halfWidth: number } {
  const t = Math.max(0, Math.min(100, score)) / 100;
  const length = baseR * (0.30 + t * (maxScale - 0.30));
  const halfWidth = length * fatness * (0.55 + Math.sqrt(t) * 0.45);
  return { length, halfWidth };
}

/**
 * Path generator: rounded corners at each vertex + subtly bowed-outward
 * edges between corners. Polygon centroid determines "outward" for each
 * edge, so convex shapes bow uniformly outward.
 */
function curvedAngularPath(vertices: XY[], cornerRadius: number, bowFactor: number): string {
  if (vertices.length === 0) return '';
  const n = vertices.length;

  const cx = vertices.reduce((s, v) => s + v.x, 0) / n;
  const cy = vertices.reduce((s, v) => s + v.y, 0) / n;

  const corners = vertices.map((curr, i) => {
    const prev = vertices[(i - 1 + n) % n];
    const next = vertices[(i + 1) % n];

    const v1 = { x: curr.x - prev.x, y: curr.y - prev.y };
    const len1 = Math.hypot(v1.x, v1.y) || 1;
    const r1 = Math.min(cornerRadius, len1 / 2);
    const approach = { x: curr.x - (v1.x / len1) * r1, y: curr.y - (v1.y / len1) * r1 };

    const v2 = { x: next.x - curr.x, y: next.y - curr.y };
    const len2 = Math.hypot(v2.x, v2.y) || 1;
    const r2 = Math.min(cornerRadius, len2 / 2);
    const exit = { x: curr.x + (v2.x / len2) * r2, y: curr.y + (v2.y / len2) * r2 };

    return { vertex: curr, approach, exit };
  });

  const parts: string[] = [];
  for (let i = 0; i < n; i++) {
    const c1 = corners[i];
    const c2 = corners[(i + 1) % n];
    if (i === 0) parts.push(`M ${c1.exit.x.toFixed(2)} ${c1.exit.y.toFixed(2)}`);

    const mx = (c1.exit.x + c2.approach.x) / 2;
    const my = (c1.exit.y + c2.approach.y) / 2;
    const outX = mx - cx;
    const outY = my - cy;
    const outLen = Math.hypot(outX, outY) || 1;
    const edgeLen = Math.hypot(c2.approach.x - c1.exit.x, c2.approach.y - c1.exit.y);
    const push = edgeLen * bowFactor;
    const ctlX = mx + (outX / outLen) * push;
    const ctlY = my + (outY / outLen) * push;
    parts.push(`Q ${ctlX.toFixed(2)} ${ctlY.toFixed(2)} ${c2.approach.x.toFixed(2)} ${c2.approach.y.toFixed(2)}`);
    parts.push(`Q ${c2.vertex.x.toFixed(2)} ${c2.vertex.y.toFixed(2)} ${c2.exit.x.toFixed(2)} ${c2.exit.y.toFixed(2)}`);
  }
  parts.push('Z');
  return parts.join(' ');
}

function petalPath(cx: number, cy: number, ux: number, uy: number, length: number, halfWidth: number, cornerRadius: number): string {
  const nx = -uy;
  const ny = ux;
  const sideAlong = 0.58;
  const vertices: XY[] = [
    { x: cx + length * ux, y: cy + length * uy },
    { x: cx + sideAlong * length * ux - halfWidth * nx, y: cy + sideAlong * length * uy - halfWidth * ny },
    { x: cx, y: cy },
    { x: cx + sideAlong * length * ux + halfWidth * nx, y: cy + sideAlong * length * uy + halfWidth * ny },
  ];
  return curvedAngularPath(vertices, cornerRadius, 0.07);
}

// ─── Animation hook ─────────────────────────────────────────────────

function useAnimatedScores(targets: number[], opts: { from?: number[]; duration?: number } = {}): number[] {
  const { from, duration = 1100 } = opts;
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
      const next = targets.map((target, i) => {
        const start = initialRef.current[i] ?? 0;
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

// ─── Component ──────────────────────────────────────────────────────

export default function OverallRadarChart({ data, previousData, compact = false }: OverallRadarChartProps) {
  // ─── Layout
  const size = 360;
  const cx = size / 2;
  const cy = size / 2;
  const labelGap = compact ? 14 : 22;
  const baseR = (size / 2) - labelGap - (compact ? 22 : 30);
  const maxScale = 1.0;       // petals top out exactly at the 100 ring
  const fatness = 0.42;       // slim enough to avoid heavy outer overlap
  const cornerRadius = compact ? 5 : 6;

  const filterId = useId();
  const safeId = filterId.replace(/:/g, '');
  const glowId = `axis-glow-${safeId}`;

  // ─── Animation targets
  const currentScores = useMemo(() => data.map((d) => d.value), [data]);
  const previousScores = useMemo(() => {
    if (!previousData) return undefined;
    return data.map((d) => previousData.find((p) => p.name === d.name)?.value ?? d.value);
  }, [data, previousData]);

  const animatedScores = useAnimatedScores(currentScores, {
    from: previousScores ?? currentScores.map(() => 0),
    duration: previousScores ? 1100 : 900,
  });

  const n = data.length;
  const ringStops = [25, 50, 75, 100];

  // Per-pillar paths + colours (live, follow the animation)
  const petals = animatedScores.map((s, i) => {
    const angle = petalAngle(i, n);
    const ux = Math.cos(angle);
    const uy = Math.sin(angle);
    const dims = petalDimsFor(s, baseR, maxScale, fatness);
    const hue = pillarHueAt(data[i].name, data[i].fullLabel, i);
    return {
      d: petalPath(cx, cy, ux, uy, dims.length, dims.halfWidth, cornerRadius),
      stroke: pillarColor(hue),
      glow: pillarColor(hue, 0.9),
    };
  });

  // ─── Centre AXIS brand mark (faceted diamond)
  const markR = compact ? 5 : 6;
  const innerR = compact ? 1.8 : 2.2;
  const markPath = `M ${cx} ${cy - markR} L ${cx + markR} ${cy} L ${cx} ${cy + markR} L ${cx - markR} ${cy} Z`;
  const innerMarkPath = `M ${cx} ${cy - innerR} L ${cx + innerR} ${cy} L ${cx} ${cy + innerR} L ${cx - innerR} ${cy} Z`;

  // ─── Label geometry — past the longest possible petal so they never collide
  const labelDistance = baseR * 1.08;

  return (
    <div className="relative h-full w-full">
      <style>{`
        @keyframes axisBloomBreathe {
          0%, 100% { stroke-width: 2; }
          50%      { stroke-width: 2.15; }
        }
        @keyframes axisBloomGlowBreathe {
          0%, 100% { opacity: 0.55; }
          50%      { opacity: 0.72; }
        }
        .axis-petal-crisp { animation: axisBloomBreathe 3.4s ease-in-out infinite; }
        .axis-petal-glow  { animation: axisBloomGlowBreathe 3.4s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .axis-petal-crisp, .axis-petal-glow { animation: none; }
        }
      `}</style>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="h-full w-full"
        role="img"
        aria-label="AXIS Score five-pillar bloom"
      >
        <defs>
          <filter id={glowId} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
        </defs>

        {/* Reference rings */}
        {ringStops.map((stop) => {
          const ringPoints = data
            .map((_, i) => {
              const angle = petalAngle(i, n);
              const r = (stop / 100) * baseR;
              return `${(cx + r * Math.cos(angle)).toFixed(2)},${(cy + r * Math.sin(angle)).toFixed(2)}`;
            })
            .join(' ');
          return (
            <polygon
              key={stop}
              points={ringPoints}
              fill="none"
              stroke="hsl(var(--border))"
              strokeWidth={stop === 100 ? 1 : 0.7}
              strokeDasharray={stop === 100 ? '0' : '3 5'}
              opacity={stop === 100 ? 0.55 : 0.4}
            />
          );
        })}

        {/* Dashed spokes from centre to each pillar vertex — skip the
            top axis (index 0) where the scale labels sit. */}
        {data.map((_, i) => {
          if (i === 0) return null;
          const angle = petalAngle(i, n);
          const ex = cx + baseR * Math.cos(angle);
          const ey = cy + baseR * Math.sin(angle);
          return (
            <line
              key={`spoke-${i}`}
              x1={cx}
              y1={cy}
              x2={ex.toFixed(2)}
              y2={ey.toFixed(2)}
              stroke="hsl(var(--border))"
              strokeWidth={0.7}
              strokeDasharray="3 5"
              opacity={0.55}
            />
          );
        })}

        {/* Scale markers — centred on the top axis, tucked inside each ring */}
        {ringStops.map((stop) => {
          const r = (stop / 100) * baseR;
          const labelOffset = compact ? 12 : 16;
          return (
            <text
              key={`scale-${stop}`}
              x={cx}
              y={cy - r + labelOffset}
              textAnchor="middle"
              fontSize={compact ? 8 : 8}
              fontWeight={500}
              className="fill-muted-foreground tabular-nums"
              opacity={0.7}
            >
              {stop}
            </text>
          );
        })}

        {/* Glow layer — per-pillar colour blurred underneath, breathing */}
        <g className="axis-petal-glow" filter={`url(#${glowId})`}>
          {petals.map((p, i) => (
            <path key={`glow-${i}`} d={p.d} fill="none" stroke={p.glow} strokeWidth={3} strokeLinejoin="round" />
          ))}
        </g>

        {/* Crisp outline strokes — per-pillar colour, breathing */}
        {petals.map((p, i) => (
          <path
            key={`petal-${i}`}
            className="axis-petal-crisp"
            d={p.d}
            fill="none"
            stroke={p.stroke}
            strokeLinejoin="round"
          />
        ))}

        {/* Centre AXIS brand mark — faceted diamond */}
        <path d={markPath} fill="hsl(var(--foreground))" opacity={0.92} />
        <path d={innerMarkPath} fill="hsl(var(--background))" opacity={0.18} />

        {/* Pillar labels — name above + score/100 below */}
        {data.map((d, i) => {
          const angle = petalAngle(i, n);
          const lx = cx + labelDistance * Math.cos(angle);
          const ly = cy + labelDistance * Math.sin(angle);
          const score = Math.round(animatedScores[i] ?? 0);
          const anchor: 'start' | 'middle' | 'end' = lx < cx - 6 ? 'end' : lx > cx + 6 ? 'start' : 'middle';
          const isAbove = ly < cy - 4;
          const labelDy = isAbove ? -6 : 6;
          const scoreDy = isAbove ? -6 + (compact ? 12 : 16) : 6 + (compact ? 12 : 16);
          const hue = pillarHueAt(d.name, d.fullLabel, i);
          const labelText = compact ? COMPACT_LABELS[d.fullLabel] ?? d.fullLabel : d.fullLabel;
          return (
            <g key={`label-${i}`}>
              <text
                x={lx}
                y={ly + labelDy}
                textAnchor={anchor}
                className="fill-foreground"
                fontSize={compact ? 11 : 12}
                fontWeight={600}
                style={{ letterSpacing: '-0.005em' }}
              >
                {labelText}
              </text>
              <text
                x={lx}
                y={ly + scoreDy}
                textAnchor={anchor}
                fontSize={compact ? 12 : 14}
                fontWeight={700}
                className="tabular-nums"
              >
                <tspan fill={pillarColor(hue)}>{score}</tspan>
                <tspan className="fill-muted-foreground" fontSize={compact ? 10 : 11} fontWeight={500}>
                  /100
                </tspan>
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

const COMPACT_LABELS: Record<string, string> = {
  'Body Composition': 'Body',
  'Functional Strength': 'Strength',
  'Metabolic Fitness': 'Cardio',
  'Movement Quality': 'Movement',
  'Lifestyle Factors': 'Lifestyle',
};

// ─── Tiny export utility for callers wanting just the colour ────────

export function AxisPentagonChip({ score: _score, className }: { score: number; className?: string }) {
  // Kept for prop-compat with any existing callers. Score-tone display
  // dot — uses score-green as a neutral health indicator.
  return (
    <span
      className={cn('inline-block h-2 w-2 rounded-full bg-score-green', className)}
    />
  );
}
