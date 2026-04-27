/**
 * AXIS Pentagon — One Assess's signature five-pillar radar.
 *
 * Outline-only geometric pentagon with per-pillar gradient stroke
 * (each edge transitions between its two adjacent pillars' tones),
 * a soft coloured glow underneath, and a muted ghost outline of the
 * previous assessment. Animates from previous → current on view.
 *
 * Aesthetic: kit-monochrome backdrop + score-tone semantic colour.
 * Inspired by the outline-with-glow charts in the reference deck —
 * geometric, not organic; clean, not busy.
 */

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export interface RadarData {
  name: string;
  value: number;
  fullLabel: string;
  /** Legacy field — kept for prop-compat with existing callers; the
   *  pentagon derives colour from each pillar's own score now. */
  color: string;
}

interface OverallRadarChartProps {
  data: RadarData[];
  /** When provided, the shape animates from previous → current and a
   *  ghost outline of the previous shape stays behind. */
  previousData?: RadarData[];
  /** Mobile: shrink labels + radius slightly. */
  compact?: boolean;
}

// ─── Per-pillar colour math ─────────────────────────────────────────

function pillarHsl(score: number): { hue: number; sat: number; light: number } {
  const s = Math.max(0, Math.min(100, score));
  const stops = [
    { at: 0, h: 0, s: 70, l: 38 },
    { at: 35, h: 22, s: 82, l: 46 },
    { at: 55, h: 42, s: 88, l: 50 },
    { at: 75, h: 95, s: 60, l: 46 },
    { at: 100, h: 142, s: 64, l: 44 },
  ];
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (s <= b.at) {
      const t = (s - a.at) / (b.at - a.at);
      return {
        hue: a.h + (b.h - a.h) * t,
        sat: a.s + (b.s - a.s) * t,
        light: a.l + (b.l - a.l) * t,
      };
    }
  }
  const last = stops[stops.length - 1];
  return { hue: last.h, sat: last.s, light: last.l };
}

function hslCss({ hue, sat, light }: { hue: number; sat: number; light: number }, alpha = 1): string {
  return alpha === 1
    ? `hsl(${hue.toFixed(0)} ${sat.toFixed(0)}% ${light.toFixed(0)}%)`
    : `hsl(${hue.toFixed(0)} ${sat.toFixed(0)}% ${light.toFixed(0)}% / ${alpha})`;
}

// ─── Geometry ───────────────────────────────────────────────────────

function vertexAngle(i: number, n: number): number {
  return -Math.PI / 2 + (i * 2 * Math.PI) / n;
}

interface XY { x: number; y: number; }

function polarPoint(score: number, i: number, n: number, cx: number, cy: number, maxR: number): XY {
  const t = Math.max(0, Math.min(1, score / 100));
  const r = t * maxR;
  const angle = vertexAngle(i, n);
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

/** Build one rounded corner at vertex `curr` between edges (prev→curr) and (curr→next).
 *  Returns the approach point (along prev→curr) and the exit point (along curr→next),
 *  and the original vertex which is used as the Q control point. */
function roundedCornerAt(prev: XY, curr: XY, next: XY, radius: number): { approach: XY; exit: XY } {
  const v1 = { x: curr.x - prev.x, y: curr.y - prev.y };
  const len1 = Math.hypot(v1.x, v1.y) || 1;
  const r1 = Math.min(radius, len1 / 2);
  const approach = { x: curr.x - (v1.x / len1) * r1, y: curr.y - (v1.y / len1) * r1 };

  const v2 = { x: next.x - curr.x, y: next.y - curr.y };
  const len2 = Math.hypot(v2.x, v2.y) || 1;
  const r2 = Math.min(radius, len2 / 2);
  const exit = { x: curr.x + (v2.x / len2) * r2, y: curr.y + (v2.y / len2) * r2 };

  return { approach, exit };
}

/** Closed rounded-corner polygon path (single shape — used for the ghost
 *  outline + the optional faint inner fill). */
function roundedPolygonPath(vertices: XY[], radius: number): string {
  if (vertices.length === 0) return '';
  const n = vertices.length;
  const parts: string[] = [];
  for (let i = 0; i < n; i++) {
    const prev = vertices[(i - 1 + n) % n];
    const curr = vertices[i];
    const next = vertices[(i + 1) % n];
    const { approach, exit } = roundedCornerAt(prev, curr, next, radius);
    if (i === 0) parts.push(`M ${approach.x.toFixed(2)} ${approach.y.toFixed(2)}`);
    else parts.push(`L ${approach.x.toFixed(2)} ${approach.y.toFixed(2)}`);
    parts.push(`Q ${curr.x.toFixed(2)} ${curr.y.toFixed(2)} ${exit.x.toFixed(2)} ${exit.y.toFixed(2)}`);
  }
  parts.push('Z');
  return parts.join(' ');
}

/** Per-edge path. Returns the path for the rounded corner at `curr`
 *  followed by a straight line into the next rounded corner approach.
 *  Each edge gets its own gradient stroke so per-pillar colour reads
 *  clearly through the outline. */
function edgePath(prev: XY, curr: XY, next: XY, nextNext: XY, radius: number): string {
  const corner1 = roundedCornerAt(prev, curr, next, radius);
  const corner2 = roundedCornerAt(curr, next, nextNext, radius);
  return [
    `M ${corner1.exit.x.toFixed(2)} ${corner1.exit.y.toFixed(2)}`,
    `L ${corner2.approach.x.toFixed(2)} ${corner2.approach.y.toFixed(2)}`,
    `Q ${next.x.toFixed(2)} ${next.y.toFixed(2)} ${corner2.exit.x.toFixed(2)} ${corner2.exit.y.toFixed(2)}`,
  ].join(' ');
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

const COMPACT_LABELS: Record<string, string> = {
  'Body Composition': 'Body',
  'Functional Strength': 'Strength',
  'Metabolic Fitness': 'Cardio',
  'Movement Quality': 'Movement',
  'Lifestyle Factors': 'Lifestyle',
};

export default function OverallRadarChart({ data, previousData, compact = false }: OverallRadarChartProps) {
  // ─── Layout
  const size = 360;
  const cx = size / 2;
  const cy = size / 2;
  const labelGap = compact ? 24 : 34;
  const maxR = (size / 2) - labelGap - (compact ? 18 : 24);
  const cornerRadius = compact ? 6 : 9;

  const filterId = useId();
  const safeId = filterId.replace(/:/g, '');
  const glowId = `axis-glow-${safeId}`;
  const innerGradientId = `axis-inner-${safeId}`;

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

  // ─── Geometry
  const n = data.length;
  const ringStops = [25, 50, 75, 100];
  const currentVerts = animatedScores.map((s, i) => polarPoint(s, i, n, cx, cy, maxR));
  const previousVerts = previousScores ? previousScores.map((s, i) => polarPoint(s, i, n, cx, cy, maxR)) : null;
  const labelVerts = data.map((_, i) => polarPoint(108, i, n, cx, cy, maxR));

  const pillarColors = animatedScores.map((s) => hslCss(pillarHsl(s)));

  // Average tone — used for the inner faint fill + the central glow tint.
  const avgScore = animatedScores.reduce((sum, v) => sum + v, 0) / Math.max(1, animatedScores.length);
  const avgHsl = pillarHsl(avgScore);

  return (
    <div className="relative h-full w-full">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="h-full w-full"
        role="img"
        aria-label="AXIS Score five-pillar profile"
      >
        <defs>
          {/* Soft outer glow — bigger stdDeviation than before for the
              "alive" outline-with-glow look from the reference. */}
          <filter id={glowId} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="5.5" />
          </filter>

          {/* Faint radial fill — tints the inside of the shape with the
              average tone, very low opacity. Provides subtle depth
              without competing with the gradient stroke. */}
          <radialGradient id={innerGradientId} cx="50%" cy="50%" r="65%">
            <stop offset="0%" stopColor={hslCss(avgHsl)} stopOpacity="0.18" />
            <stop offset="100%" stopColor={hslCss(avgHsl)} stopOpacity="0.04" />
          </radialGradient>

          {/* Per-edge linear gradients — each edge interpolates between
              its two endpoint pillar tones. Built dynamically below. */}
          {data.map((_, i) => {
            const a = currentVerts[i];
            const b = currentVerts[(i + 1) % n];
            return (
              <linearGradient
                key={`edge-grad-${i}`}
                id={`axis-edge-${safeId}-${i}`}
                gradientUnits="userSpaceOnUse"
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
              >
                <stop offset="0%" stopColor={pillarColors[i]} />
                <stop offset="100%" stopColor={pillarColors[(i + 1) % n]} />
              </linearGradient>
            );
          })}
        </defs>

        {/* Reference rings (faint pentagons at 25/50/75/100) */}
        {ringStops.map((stop) => {
          const ringVerts = data.map((_, i) => polarPoint(stop, i, n, cx, cy, maxR));
          return (
            <polygon
              key={stop}
              points={ringVerts.map((v) => `${v.x.toFixed(2)},${v.y.toFixed(2)}`).join(' ')}
              fill="none"
              stroke="hsl(var(--border))"
              strokeWidth={stop === 100 ? 1 : 0.5}
              strokeDasharray={stop === 100 ? '0' : '3 5'}
              opacity={stop === 100 ? 0.5 : 0.3}
            />
          );
        })}

        {/* Spokes from centre (very faint) */}
        {data.map((_, i) => {
          const v = polarPoint(100, i, n, cx, cy, maxR);
          return (
            <line
              key={`spoke-${i}`}
              x1={cx}
              y1={cy}
              x2={v.x}
              y2={v.y}
              stroke="hsl(var(--border))"
              strokeWidth={0.5}
              opacity={0.3}
            />
          );
        })}

        {/* Previous-shape ghost — muted dashed outline (no glow) */}
        {previousVerts && (
          <path
            d={roundedPolygonPath(previousVerts, cornerRadius)}
            fill="none"
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={1.25}
            strokeDasharray="4 5"
            opacity={0.4}
          />
        )}

        {/* Faint inner fill — subtle depth without competing with the stroke */}
        <path
          d={roundedPolygonPath(currentVerts, cornerRadius)}
          fill={`url(#${innerGradientId})`}
          stroke="none"
        />

        {/* Glow layer: render the same outline strokes blurred underneath
            the crisp ones, so the glow halo is per-edge tinted. */}
        <g filter={`url(#${glowId})`} opacity={0.7}>
          {data.map((_, i) => {
            const prev = currentVerts[(i - 1 + n) % n];
            const curr = currentVerts[i];
            const next = currentVerts[(i + 1) % n];
            const nextNext = currentVerts[(i + 2) % n];
            return (
              <path
                key={`glow-edge-${i}`}
                d={edgePath(prev, curr, next, nextNext, cornerRadius)}
                fill="none"
                stroke={`url(#axis-edge-${safeId}-${i})`}
                strokeWidth={3.5}
                strokeLinecap="round"
              />
            );
          })}
        </g>

        {/* Crisp outline: per-edge gradient strokes give per-pillar colour
            information through the outline itself. */}
        {data.map((_, i) => {
          const prev = currentVerts[(i - 1 + n) % n];
          const curr = currentVerts[i];
          const next = currentVerts[(i + 1) % n];
          const nextNext = currentVerts[(i + 2) % n];
          return (
            <path
              key={`edge-${i}`}
              d={edgePath(prev, curr, next, nextNext, cornerRadius)}
              fill="none"
              stroke={`url(#axis-edge-${safeId}-${i})`}
              strokeWidth={2.75}
              strokeLinecap="round"
            />
          );
        })}

        {/* Per-vertex dots — pillar-tone colour, with delta line if changed */}
        {currentVerts.map((v, i) => {
          const prev = previousVerts?.[i];
          const delta = previousScores ? animatedScores[i] - previousScores[i] : 0;
          const showDeltaLine = prev && Math.abs(delta) > 0.5;
          return (
            <g key={`vertex-${i}`}>
              {showDeltaLine && (
                <line
                  x1={prev!.x}
                  y1={prev!.y}
                  x2={v.x}
                  y2={v.y}
                  stroke={pillarColors[i]}
                  strokeWidth={1.5}
                  opacity={0.55}
                  strokeLinecap="round"
                />
              )}
              <circle cx={v.x} cy={v.y} r={5.5} fill={pillarColors[i]} opacity={0.22} />
              <circle cx={v.x} cy={v.y} r={3} fill={pillarColors[i]} />
            </g>
          );
        })}

        {/* Pillar labels — name above + score/100 below in pillar tone */}
        {labelVerts.map((v, i) => {
          const raw = data[i].fullLabel;
          const label = compact ? (COMPACT_LABELS[raw] ?? raw) : raw;
          const score = Math.round(animatedScores[i] ?? 0);
          const anchor: 'start' | 'middle' | 'end' = v.x < cx - 6 ? 'end' : v.x > cx + 6 ? 'start' : 'middle';
          const isAbove = v.y < cy - 4;
          const labelDy = isAbove ? -10 : 4;
          const scoreDy = isAbove ? -10 + (compact ? 13 : 16) : 4 + (compact ? 13 : 16);
          return (
            <g key={`label-${i}`}>
              <text
                x={v.x}
                y={v.y + labelDy}
                textAnchor={anchor}
                className="fill-foreground"
                fontSize={compact ? 11 : 12}
                fontWeight={600}
                style={{ letterSpacing: '-0.005em' }}
              >
                {label}
              </text>
              <text
                x={v.x}
                y={v.y + scoreDy}
                textAnchor={anchor}
                className="tabular-nums"
                fontSize={compact ? 12 : 14}
                fontWeight={700}
              >
                <tspan fill={pillarColors[i]}>{score}</tspan>
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

// ─── Tiny export utility for callers wanting just the colour ────────

export function AxisPentagonChip({ score, className }: { score: number; className?: string }) {
  const c = pillarHsl(score);
  return (
    <span
      className={cn('inline-block h-2 w-2 rounded-full', className)}
      style={{ background: hslCss(c) }}
    />
  );
}
