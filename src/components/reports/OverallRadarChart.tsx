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

export function pillarHueAt(name: string, fullLabel: string, index: number): number {
  return (
    PILLAR_HUES[fullLabel]?.h ??
    PILLAR_HUES[name]?.h ??
    FALLBACK_HUES[index % FALLBACK_HUES.length]
  );
}

export function pillarColor(hue: number, alpha = 1): string {
  return alpha === 1
    ? `hsl(${hue} ${FIXED_SATURATION}% ${FIXED_LIGHTNESS}%)`
    : `hsl(${hue} ${FIXED_SATURATION}% ${FIXED_LIGHTNESS}% / ${alpha})`;
}

// ─── Geometry ───────────────────────────────────────────────────────

function petalAngle(i: number, n: number): number {
  return -Math.PI / 2 + (i * 2 * Math.PI) / n;
}

export interface XY { x: number; y: number; }

export function petalDimsFor(score: number, baseR: number, maxScale: number, fatness: number): { length: number; halfWidth: number } {
  const t = Math.max(0, Math.min(100, score)) / 100;
  const length = baseR * (0.30 + t * (maxScale - 0.30));
  // Sharper width curve — wilted petals are thin/fragile, bloomed ones swollen.
  const halfWidth = length * fatness * (0.30 + Math.sqrt(t) * 0.70);
  return { length, halfWidth };
}

// ─── Wilt model ──────────────────────────────────────────────────────
// Low scores → wilted, asymmetric, jagged petals with sparse flickering
// dot fields and minimal glow. High scores → smooth, swollen petals
// with dense flowing dot fields and vivid pulsing glow.

export function wiltFor(score: number): number {
  const t = Math.max(0, Math.min(100, score)) / 100;
  return Math.pow(1 - t, 1.4);
}

function noise1(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
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

export function petalVerts(cx: number, cy: number, ux: number, uy: number, length: number, halfWidth: number, wilt: number, seed: number): XY[] {
  const nx = -uy;
  const ny = ux;
  const sideAlong = 0.58;

  // Base 4-vertex kite — the "full bloom" shape.
  const baseVerts: XY[] = [
    { x: cx + length * ux, y: cy + length * uy },
    { x: cx + sideAlong * length * ux - halfWidth * nx, y: cy + sideAlong * length * uy - halfWidth * ny },
    { x: cx, y: cy },
    { x: cx + sideAlong * length * ux + halfWidth * nx, y: cy + sideAlong * length * uy + halfWidth * ny },
  ];

  // Side count maps to score: full bloom → 4 verts, full wilt → 9 verts.
  const totalExtras = Math.round(wilt * 5);
  const subsPerEdge = [0, 0, 0, 0];
  for (let k = 0; k < totalExtras; k++) subsPerEdge[k % 4]++;

  const verts: XY[] = [];
  for (let i = 0; i < 4; i++) {
    const a = baseVerts[i];
    const b = baseVerts[(i + 1) % 4];
    verts.push(a);
    const subs = subsPerEdge[i];
    for (let s = 1; s <= subs; s++) {
      const t = s / (subs + 1);
      const mx = a.x + (b.x - a.x) * t;
      const my = a.y + (b.y - a.y) * t;
      const edgeX = b.x - a.x;
      const edgeY = b.y - a.y;
      const len = Math.hypot(edgeX, edgeY) || 1;
      const perpX = -edgeY / len;
      const perpY = edgeX / len;
      const jitter = noise1(seed * 100 + i * 10 + s) * wilt * 0.30 * len;
      verts.push({ x: mx + perpX * jitter, y: my + perpY * jitter });
    }
  }
  return verts;
}

export function petalPathFromVerts(verts: XY[], wilt: number): string {
  // Edges bow outward at full bloom (swollen), cave at full wilt (shriveled).
  const bow = 0.14 - wilt * 0.20;
  // Fully rounded at bloom, perfectly sharp at full wilt.
  const cr = (1 - wilt) * 32;
  return curvedAngularPath(verts, cr, bow);
}

interface PetalDot { cx: number; cy: number; r: number; alpha: number; delay: number; }

/**
 * Generates the dot-matrix fill positions for one petal.
 * Bloomed petals get a dense uniform grid with delays mapped to
 * distance-from-anchor — light flows outward like a heartbeat. Wilted
 * petals get a sparse, jittered, mostly-dropped field with random
 * delays — flickers arrhythmically.
 */
function petalDots(
  verts: XY[],
  wilt: number,
  seed: number,
  cx: number,
  cy: number,
  ux: number,
  uy: number,
  length: number,
  animDuration: number,
): PetalDot[] {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const v of verts) {
    if (v.x < minX) minX = v.x;
    if (v.y < minY) minY = v.y;
    if (v.x > maxX) maxX = v.x;
    if (v.y > maxY) maxY = v.y;
  }
  // Pad so dots cover the curved silhouette (bow extends past raw verts).
  const padX = (maxX - minX) * 0.12;
  const padY = (maxY - minY) * 0.12;
  minX -= padX;
  maxX += padX;
  minY -= padY;
  maxY += padY;

  // Calmer 10×14 grid — at the production rendered size the original
  // 16×22 reads as noise. This is a soft halftone instead.
  const cols = 10;
  const rows = 14;
  const dx = (maxX - minX) / cols;
  const dy = (maxY - minY) / rows;
  const dotR = 1.0 + (1 - wilt) * 0.5;
  const waveRange = animDuration * 0.75;
  const randRange = animDuration;

  const dots: PetalDot[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const baseX = minX + (c + 0.5) * dx;
      const baseY = minY + (r + 0.5) * dy;
      const jx = noise1(seed * 999 + r * 100 + c) * wilt * dx * 0.55;
      const jy = noise1(seed * 999 + r * 100 + c + 7777) * wilt * dy * 0.55;
      const x = baseX + jx;
      const y = baseY + jy;

      const alphaBase = 0.30 + (1 - wilt) * 0.50;
      const alphaJit = noise1(seed * 999 + r * 100 + c + 3333) * wilt * 0.55;
      const alpha = Math.max(0.04, Math.min(0.92, alphaBase + alphaJit));

      // Drop probability ramps with wilt — 0% at bloom, ~85% at full wilt.
      const keepRoll = noise1(seed * 999 + r * 100 + c + 5555);
      const dropProb = Math.pow(wilt, 1.3) * 0.85;
      if ((keepRoll + 1) / 2 < dropProb) continue;

      // Project onto petal axis → "distance from anchor" → wave delay.
      const distAlong = Math.max(0, (x - cx) * ux + (y - cy) * uy);
      const distNorm = length > 0 ? Math.min(1, distAlong / length) : 0;
      const waveDelay = distNorm * waveRange;
      const randDelay = Math.abs(noise1(seed * 999 + r * 100 + c + 1111)) * randRange;
      const delay = (1 - wilt) * waveDelay + wilt * randDelay;

      dots.push({ cx: x, cy: y, r: dotR, alpha, delay });
    }
  }
  return dots;
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
  // Big viewBox (440) gives the bloom presence and leaves room for full
  // pillar labels without clipping. Petals scale to baseR (still 100=ring).
  const size = 440;
  const cx = size / 2;
  const cy = size / 2;
  const labelGap = compact ? 14 : 26;
  const baseR = (size / 2) - labelGap - (compact ? 24 : 38);
  const maxScale = 1.0;
  const fatness = 0.42;

  const filterId = useId();
  const safeId = filterId.replace(/:/g, '');
  const glowId = `axis-glow-${safeId}`;

  // Dot-matrix shimmer cycle — must match the CSS animation duration below.
  const DOT_ANIM_DURATION = 3.2;

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

  // Per-pillar paths + colours + dot fields (live, follow the animation).
  // Wilt drives geometry irregularity, glow intensity, and dot density.
  const petals = animatedScores.map((s, i) => {
    const angle = petalAngle(i, n);
    const ux = Math.cos(angle);
    const uy = Math.sin(angle);
    const dims = petalDimsFor(s, baseR, maxScale, fatness);
    const wilt = wiltFor(s);
    const seed = i + 1;
    const verts = petalVerts(cx, cy, ux, uy, dims.length, dims.halfWidth, wilt, seed);
    const d = petalPathFromVerts(verts, wilt);
    const hue = pillarHueAt(data[i].name, data[i].fullLabel, i);
    const colour = pillarColor(hue);
    const glowAlpha = Math.pow(1 - wilt, 1.5) * 0.95;
    const glowWidth = 1 + Math.pow(1 - wilt, 1.3) * 6;
    const dots = petalDots(verts, wilt, seed, cx, cy, ux, uy, dims.length, DOT_ANIM_DURATION);
    return { d, stroke: colour, glow: colour, glowAlpha, glowWidth, dots, wilt };
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
          0%, 100% { stroke-width: 3.2; }
          50%      { stroke-width: 3.5; }
        }
        @keyframes axisBloomGlowBreathe {
          0%, 100% { opacity: 0.55; }
          50%      { opacity: 1.0; }
        }
        @keyframes axisDotShimmer {
          0%, 100% { opacity: 0.45; transform: scale(0.80); }
          50%      { opacity: 1.0;  transform: scale(1.20); }
        }
        .axis-petal-crisp { animation: axisBloomBreathe 3.4s ease-in-out infinite; }
        .axis-petal-glow  { animation: axisBloomGlowBreathe 3.4s ease-in-out infinite; }
        .axis-dot {
          animation: axisDotShimmer ${DOT_ANIM_DURATION}s ease-in-out infinite;
          transform-box: fill-box;
          transform-origin: center;
        }
        @media (prefers-reduced-motion: reduce) {
          .axis-petal-crisp, .axis-petal-glow, .axis-dot { animation: none; }
        }
      `}</style>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="h-full w-full"
        role="img"
        aria-label="AXIS Score five-pillar bloom"
      >
        <defs>
          {/* Stronger glow than before — gives the bloom more presence. */}
          <filter id={glowId} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
          {/* Per-petal clipPaths — confine each dot field to its petal silhouette. */}
          {petals.map((p, i) => (
            <clipPath key={`clip-${i}`} id={`axis-clip-${safeId}-${i}`}>
              <path d={p.d} />
            </clipPath>
          ))}
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

        {/* Dot-matrix fills — radial-wave flow for bloomed petals,
            chaotic flicker for wilted ones. Clipped to each silhouette. */}
        {petals.map((p, i) => (
          <g key={`dots-${i}`} clipPath={`url(#axis-clip-${safeId}-${i})`}>
            {p.dots.map((dot, di) => (
              <circle
                key={di}
                cx={dot.cx.toFixed(2)}
                cy={dot.cy.toFixed(2)}
                r={dot.r.toFixed(2)}
                fill={p.stroke}
                fillOpacity={dot.alpha.toFixed(3)}
                className="axis-dot"
                style={{ animationDelay: `${dot.delay.toFixed(2)}s` }}
              />
            ))}
          </g>
        ))}

        {/* Glow halo — per-petal width + opacity ramp with score, so
            wilted petals barely glow and bloomed ones pulse vividly. */}
        <g className="axis-petal-glow" filter={`url(#${glowId})`}>
          {petals.map((p, i) => (
            <path
              key={`glow-${i}`}
              d={p.d}
              fill="none"
              stroke={p.glow}
              strokeWidth={p.glowWidth.toFixed(2)}
              strokeOpacity={p.glowAlpha.toFixed(3)}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}
        </g>

        {/* Crisp outline strokes — breathing animation handles stroke-width. */}
        {petals.map((p, i) => (
          <path
            key={`petal-${i}`}
            className="axis-petal-crisp"
            d={p.d}
            fill="none"
            stroke={p.stroke}
            strokeLinejoin="round"
            strokeLinecap="round"
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
          // Always use the abbreviated label — full labels overflow the
          // chart at radar angles and read worse than the short forms.
          const labelText = COMPACT_LABELS[d.fullLabel] ?? d.fullLabel;
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

export const COMPACT_LABELS: Record<string, string> = {
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
