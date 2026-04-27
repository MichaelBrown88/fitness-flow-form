/**
 * AXIS Pentagon — One Assess's signature five-pillar radar.
 *
 * Custom SVG, not Recharts. Geometric pentagon (one vertex per pillar)
 * that animates from previous scores → current scores, with the fill
 * colour interpolated across the score-tone palette (deep red → lush
 * green) based on the overall AXIS score.
 *
 * Design intent: "fluid, dynamic, alive" — the shape literally expands
 * to its current limits on view, the colour brightens with health, and
 * a faint ghost of the previous shape stays behind for at-a-glance
 * delta context. Inspired by Whoop's lifespan element, geometric not
 * organic, kit-spec.
 */

import React, { useEffect, useMemo, useRef, useState, useId } from 'react';
import { cn } from '@/lib/utils';

export interface RadarData {
  name: string;
  value: number;
  fullLabel: string;
  /** Legacy field — kept for prop-compat with existing callers; unused
   *  by the new pentagon (colour now derives from overall AXIS score). */
  color: string;
}

interface OverallRadarChartProps {
  data: RadarData[];
  /** When provided, the shape animates from the previous scores to the
   *  current scores on mount, and a ghost outline is left behind. */
  previousData?: RadarData[];
  /** Mobile: shrink labels + radius slightly. */
  compact?: boolean;
}

// ─── Colour math ────────────────────────────────────────────────────

/**
 * Interpolate the AXIS shape fill colour across the score range.
 * 0 → deep red (HSL 0 65% 32%), 100 → lush green (HSL 142 62% 45%).
 * Goes through warm amber in the middle, no awkward grey transition.
 */
function axisFillHsl(score: number): { hue: number; sat: number; light: number } {
  const s = Math.max(0, Math.min(100, score));
  // Smoothly interpolate across red → orange → amber → lime → green.
  // Hue stops: 0 (red), 22 (orange), 42 (amber), 95 (lime), 142 (green).
  const stops = [
    { at: 0, h: 0, s: 65, l: 32 },
    { at: 35, h: 22, s: 80, l: 42 },
    { at: 55, h: 42, s: 88, l: 48 },
    { at: 75, h: 95, s: 60, l: 45 },
    { at: 100, h: 142, s: 62, l: 45 },
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

// ─── Pentagon geometry ──────────────────────────────────────────────

/** Vertex angle for pillar i out of n, starting from the top, going clockwise. */
function vertexAngle(i: number, n: number): number {
  return -Math.PI / 2 + (i * 2 * Math.PI) / n;
}

interface Vertex {
  x: number;
  y: number;
  /** 0–1 — how far from centre. */
  t: number;
}

function vertexFor(score: number, i: number, n: number, cx: number, cy: number, maxR: number): Vertex {
  const t = Math.max(0, Math.min(1, score / 100));
  const r = t * maxR;
  const angle = vertexAngle(i, n);
  return {
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
    t,
  };
}

function polygonPoints(vertices: Vertex[]): string {
  return vertices.map((v) => `${v.x.toFixed(2)},${v.y.toFixed(2)}`).join(' ');
}

// ─── Animation hook ─────────────────────────────────────────────────

/** Animate `to` from `from` over `duration` ms with cubic-out easing. */
function useAnimatedScores(targets: number[], opts: { from?: number[]; duration?: number } = {}): number[] {
  const { from, duration = 1100 } = opts;
  const [values, setValues] = useState<number[]>(() => from ?? targets.map(() => 0));
  const startRef = useRef<number | null>(null);
  const initialRef = useRef<number[]>(values);

  // Reset when the target array length or values change
  const targetsKey = targets.join(',');
  useEffect(() => {
    initialRef.current = values;
    startRef.current = null;

    let raf = 0;
    const tick = (ts: number) => {
      if (startRef.current == null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const t = Math.min(1, elapsed / duration);
      // cubic-out (matches kit easing-out: cubic-bezier(0,0,0.2,1))
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
    // values intentionally omitted — we want to capture the value at the
    // moment targets change, then animate from that snapshot.
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
  // ─── Layout constants
  const size = 320;
  const cx = size / 2;
  const cy = size / 2;
  const labelGap = compact ? 14 : 18;
  const maxR = (size / 2) - labelGap - (compact ? 26 : 30);

  // ─── Stable filter id for the glow (for SSR-safe React 19)
  const filterId = useId();
  const glowId = `axis-glow-${filterId.replace(/:/g, '')}`;
  const gradientId = `axis-grad-${filterId.replace(/:/g, '')}`;

  // ─── Targets for the animation
  const currentScores = useMemo(() => data.map((d) => d.value), [data]);
  const previousScores = useMemo(() => {
    if (!previousData) return undefined;
    return data.map((d) => previousData.find((p) => p.name === d.name)?.value ?? d.value);
  }, [data, previousData]);

  // Animate from previous (if known) to current. On first paint with no
  // previous, expand from 0 → current (the "fill to its limits" feel).
  const animatedScores = useAnimatedScores(currentScores, {
    from: previousScores ?? currentScores.map(() => 0),
    duration: previousScores ? 1100 : 900,
  });

  // ─── Compute geometry
  const n = data.length;
  const ringStops = [25, 50, 75, 100]; // inner reference rings

  const currentVertices = animatedScores.map((s, i) => vertexFor(s, i, n, cx, cy, maxR));
  const previousVertices = previousScores
    ? previousScores.map((s, i) => vertexFor(s, i, n, cx, cy, maxR))
    : null;
  const labelVertices = data.map((_, i) => vertexFor(105, i, n, cx, cy, maxR)); // labels just outside max ring

  // ─── Colour from overall current AXIS (live, follows the animation)
  const currentOverall = animatedScores.reduce((sum, v) => sum + v, 0) / Math.max(1, animatedScores.length);
  const fill = axisFillHsl(currentOverall);
  const fillCss = `hsl(${fill.hue.toFixed(0)} ${fill.sat.toFixed(0)}% ${fill.light.toFixed(0)}%)`;
  const fillSoftCss = `hsl(${fill.hue.toFixed(0)} ${fill.sat.toFixed(0)}% ${fill.light.toFixed(0)}% / 0.18)`;
  const strokeCss = `hsl(${fill.hue.toFixed(0)} ${fill.sat.toFixed(0)}% ${Math.max(20, fill.light - 8).toFixed(0)}%)`;

  return (
    <div className="relative h-full w-full">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="h-full w-full"
        role="img"
        aria-label="AXIS Score five-pillar profile"
      >
        <defs>
          {/* Soft outer glow on the current shape — gives the "alive" feel. */}
          <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Radial gradient: brighter at centre, deeper at the edge of the shape. */}
          <radialGradient id={gradientId} cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor={fillCss} stopOpacity="0.55" />
            <stop offset="60%" stopColor={fillCss} stopOpacity="0.35" />
            <stop offset="100%" stopColor={fillCss} stopOpacity="0.18" />
          </radialGradient>
        </defs>

        {/* Reference rings (faint pentagons at 25/50/75/100) */}
        {ringStops.map((stop) => {
          const ringVerts = data.map((_, i) => vertexFor(stop, i, n, cx, cy, maxR));
          return (
            <polygon
              key={stop}
              points={polygonPoints(ringVerts)}
              fill="none"
              stroke="hsl(var(--border))"
              strokeWidth={stop === 100 ? 1 : 0.6}
              strokeDasharray={stop === 100 ? '0' : '3 4'}
              opacity={stop === 100 ? 0.6 : 0.4}
            />
          );
        })}

        {/* Spokes from centre to each pillar */}
        {data.map((_, i) => {
          const v = vertexFor(100, i, n, cx, cy, maxR);
          return (
            <line
              key={`spoke-${i}`}
              x1={cx}
              y1={cy}
              x2={v.x}
              y2={v.y}
              stroke="hsl(var(--border))"
              strokeWidth={0.6}
              opacity={0.4}
            />
          );
        })}

        {/* Previous-shape ghost outline (where you were last time) */}
        {previousVertices && (
          <polygon
            points={polygonPoints(previousVertices)}
            fill="none"
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={1.25}
            strokeDasharray="4 4"
            opacity={0.45}
          />
        )}

        {/* Current shape — fill (radial gradient) + outer glow */}
        <polygon
          points={polygonPoints(currentVertices)}
          fill={`url(#${gradientId})`}
          stroke={strokeCss}
          strokeWidth={2}
          strokeLinejoin="round"
          filter={`url(#${glowId})`}
        />

        {/* Per-vertex dots + delta indicators */}
        {currentVertices.map((v, i) => {
          const prev = previousVertices?.[i];
          const delta = previousScores ? animatedScores[i] - previousScores[i] : 0;
          const isImproved = delta > 0.5;
          const isRegressed = delta < -0.5;
          const dotColor = isImproved
            ? 'hsl(var(--score-green))'
            : isRegressed
              ? 'hsl(var(--score-red))'
              : strokeCss;

          return (
            <g key={`vertex-${i}`}>
              {/* Delta line: subtle line from previous to current vertex */}
              {prev && (isImproved || isRegressed) && (
                <line
                  x1={prev.x}
                  y1={prev.y}
                  x2={v.x}
                  y2={v.y}
                  stroke={dotColor}
                  strokeWidth={1.5}
                  opacity={0.55}
                />
              )}
              {/* Outer dot — larger, softer, on the shape vertex */}
              <circle cx={v.x} cy={v.y} r={4.5} fill={dotColor} opacity={0.25} />
              <circle cx={v.x} cy={v.y} r={2.5} fill={dotColor} />
            </g>
          );
        })}

        {/* Pillar labels */}
        {labelVertices.map((v, i) => {
          const raw = data[i].fullLabel;
          const label = compact ? (COMPACT_LABELS[raw] ?? raw) : raw;
          const score = Math.round(animatedScores[i] ?? 0);
          // Position label outside the ring; align based on x position
          const anchor: 'start' | 'middle' | 'end' = v.x < cx - 4 ? 'end' : v.x > cx + 4 ? 'start' : 'middle';
          // Vertical adjustment: top labels slightly higher, bottom slightly lower
          const dy = v.y < cy ? -2 : 10;
          return (
            <g key={`label-${i}`}>
              <text
                x={v.x}
                y={v.y + dy}
                textAnchor={anchor}
                className="fill-foreground"
                fontSize={compact ? 10 : 11}
                fontWeight={600}
              >
                {label}
              </text>
              <text
                x={v.x}
                y={v.y + dy + (compact ? 11 : 13)}
                textAnchor={anchor}
                className="fill-muted-foreground tabular-nums"
                fontSize={compact ? 9 : 10}
                fontWeight={500}
              >
                {score}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Used-elsewhere export shape preserved (className helper) ───────

export function AxisPentagonChip({ score, className }: { score: number; className?: string }) {
  // Tiny utility export for callers that want just the colour mapping.
  const c = axisFillHsl(score);
  return (
    <span
      className={cn('inline-block h-2 w-2 rounded-full', className)}
      style={{ background: `hsl(${c.hue.toFixed(0)} ${c.sat.toFixed(0)}% ${c.light.toFixed(0)}%)` }}
    />
  );
}
