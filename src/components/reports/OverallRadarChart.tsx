/**
 * AXIS Bloom — One Assess's signature five-pillar visualisation.
 *
 * Five petal shapes radiating from a single centre point. Each petal
 * represents one pillar: tapers to a sharp tip at the centre, expands
 * to a soft rounded end out past the reference ring, length + width
 * driven by score, colour driven by score tone (deep red → lush green).
 *
 * The connected pentagon is gone — your AXIS is now a living bloom,
 * each petal a pillar. Bad pillars are short and red; good pillars are
 * long, fat, and green. Animates from previous → current on view.
 */

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export interface RadarData {
  name: string;
  value: number;
  fullLabel: string;
  /** Legacy field — kept for prop-compat; the bloom derives colour
   *  from each pillar's own score now. */
  color: string;
}

interface OverallRadarChartProps {
  data: RadarData[];
  /** When provided, each petal animates from previous → current and a
   *  ghost petal outline of the previous shape stays behind. */
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

// ─── Petal geometry ─────────────────────────────────────────────────

function petalAngle(i: number, n: number): number {
  return -Math.PI / 2 + (i * 2 * Math.PI) / n;
}

interface PetalShape {
  /** Length from centre to outer tip. */
  length: number;
  /** Half-width at the petal's widest point. */
  halfWidth: number;
}

/**
 * Map a 0–100 pillar score to a petal length + width. Length CAN exceed
 * the reference ring (intentional — bigger radius for healthy pillars).
 * Width has a floor so even bad scores render a visible (but thin) petal.
 */
function petalDimsFor(score: number, baseR: number, maxScale: number): PetalShape {
  const t = Math.max(0, Math.min(100, score)) / 100;
  // Length: tiny minimum (so we don't render a dot) + score-driven growth
  // that allows healthy petals to extend up to ~maxScale × baseR.
  const length = baseR * (0.18 + t * (maxScale - 0.18));
  // Width: also score-driven but with a floor so weak pillars are still
  // visible as slender petals. Sublinear (sqrt) so it doesn't balloon.
  const halfWidth = baseR * (0.08 + Math.sqrt(t) * 0.18);
  return { length, halfWidth };
}

/**
 * Build the SVG path for one petal pointing in direction (ux, uy).
 * Sharp point at centre (cx, cy); rounded bulb at the outer tip.
 * Two cubic Béziers, mirrored across the petal axis.
 */
function petalPath(cx: number, cy: number, ux: number, uy: number, dims: PetalShape): string {
  const { length: L, halfWidth: W } = dims;
  // Perpendicular unit vector to the petal axis
  const nx = -uy;
  const ny = ux;

  // Tip (outer end, where the petal is rounded)
  const tipX = cx + L * ux;
  const tipY = cy + L * uy;

  // Side-max points (where the petal is widest, ~55% along its length)
  const sideAlong = 0.55;
  const leftSideX = cx + sideAlong * L * ux + W * nx;
  const leftSideY = cy + sideAlong * L * uy + W * ny;
  const rightSideX = cx + sideAlong * L * ux - W * nx;
  const rightSideY = cy + sideAlong * L * uy - W * ny;

  // Control points near centre — pulled in slightly so the centre stays
  // a sharp point (no rounding at the stem).
  const stemAlong = 0.06;
  const leftStemX = cx + stemAlong * L * ux + W * 0.35 * nx;
  const leftStemY = cy + stemAlong * L * uy + W * 0.35 * ny;
  const rightStemX = cx + stemAlong * L * ux - W * 0.35 * nx;
  const rightStemY = cy + stemAlong * L * uy - W * 0.35 * ny;

  // Control points near the tip — pulled outward so the tip rounds smoothly.
  const tipAlong = 0.92;
  const leftTipCtlX = cx + tipAlong * L * ux + W * 0.7 * nx;
  const leftTipCtlY = cy + tipAlong * L * uy + W * 0.7 * ny;
  const rightTipCtlX = cx + tipAlong * L * ux - W * 0.7 * nx;
  const rightTipCtlY = cy + tipAlong * L * uy - W * 0.7 * ny;

  return [
    `M ${cx.toFixed(2)} ${cy.toFixed(2)}`,
    // Up the left side, swelling out, into the rounded tip
    `C ${leftStemX.toFixed(2)} ${leftStemY.toFixed(2)},`,
    `  ${leftSideX.toFixed(2)} ${leftSideY.toFixed(2)},`,
    `  ${leftTipCtlX.toFixed(2)} ${leftTipCtlY.toFixed(2)}`,
    // Round across the tip (small Q gives a softly rounded end)
    `Q ${tipX.toFixed(2)} ${tipY.toFixed(2)} ${rightTipCtlX.toFixed(2)} ${rightTipCtlY.toFixed(2)}`,
    // Back down the right side, narrowing back to the sharp centre
    `C ${rightSideX.toFixed(2)} ${rightSideY.toFixed(2)},`,
    `  ${rightStemX.toFixed(2)} ${rightStemY.toFixed(2)},`,
    `  ${cx.toFixed(2)} ${cy.toFixed(2)}`,
    'Z',
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
  // Bigger viewBox so petals can extend past the reference ring
  // without clipping at the edges.
  const size = 380;
  const cx = size / 2;
  const cy = size / 2;
  const labelGap = compact ? 10 : 14;
  // Reference ring radius is what "100" maps to; petals can grow PAST
  // this (1.25x for healthy pillars) so the bloom feels alive and
  // un-bounded, exactly per Michael's note.
  const baseR = (size / 2) - labelGap - (compact ? 24 : 30);
  const petalMaxScale = 1.25;

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

  // Per-pillar petal paths + colours (live, follow the animation)
  const petals = animatedScores.map((s, i) => {
    const angle = petalAngle(i, n);
    const ux = Math.cos(angle);
    const uy = Math.sin(angle);
    const dims = petalDimsFor(s, baseR, petalMaxScale);
    return {
      d: petalPath(cx, cy, ux, uy, dims),
      colour: hslCss(pillarHsl(s)),
      colourSoft: hslCss(pillarHsl(s), 0.18),
      angle,
      ux,
      uy,
      length: dims.length,
    };
  });

  const previousPetals = previousScores
    ? previousScores.map((s, i) => {
        const angle = petalAngle(i, n);
        const ux = Math.cos(angle);
        const uy = Math.sin(angle);
        const dims = petalDimsFor(s, baseR, petalMaxScale);
        return petalPath(cx, cy, ux, uy, dims);
      })
    : null;

  // Label positions sit just past where a 110-score petal would reach
  // (so labels never overlap a healthy petal).
  const labelDistance = baseR * (petalMaxScale * 1.1);

  return (
    <div className="relative h-full w-full">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="h-full w-full"
        role="img"
        aria-label="AXIS Score five-pillar profile"
      >
        <defs>
          <filter id={glowId} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
        </defs>

        {/* Reference rings (faint pentagons at 25/50/75/100) — quiet
            reference scaffolding, not the focus. */}
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
              strokeWidth={stop === 100 ? 0.8 : 0.5}
              strokeDasharray={stop === 100 ? '0' : '3 5'}
              opacity={stop === 100 ? 0.45 : 0.25}
            />
          );
        })}

        {/* Previous-bloom ghost — muted dashed petal outlines (no glow) */}
        {previousPetals?.map((d, i) => (
          <path
            key={`prev-${i}`}
            d={d}
            fill="none"
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={1}
            strokeDasharray="3 4"
            opacity={0.35}
          />
        ))}

        {/* Glow layer: petals re-rendered blurred underneath the crisp
            ones, in their own colour, for the soft halo. */}
        <g filter={`url(#${glowId})`} opacity={0.65}>
          {petals.map((p, i) => (
            <path
              key={`glow-${i}`}
              d={p.d}
              fill={p.colourSoft}
              stroke={p.colour}
              strokeWidth={2}
            />
          ))}
        </g>

        {/* Crisp petals — outline + faint fill, per-pillar colour */}
        {petals.map((p, i) => (
          <path
            key={`petal-${i}`}
            d={p.d}
            fill={p.colourSoft}
            stroke={p.colour}
            strokeWidth={1.75}
            strokeLinejoin="round"
          />
        ))}

        {/* Subtle centre nub — anchors the bloom visually. */}
        <circle cx={cx} cy={cy} r={3.5} fill="hsl(var(--foreground))" opacity={0.85} />
        <circle cx={cx} cy={cy} r={6} fill="hsl(var(--foreground))" opacity={0.12} />

        {/* Pillar labels — name above + score/100 below in pillar tone.
            Positioned past the longest petal so they never collide. */}
        {data.map((_, i) => {
          const angle = petalAngle(i, n);
          const lx = cx + labelDistance * Math.cos(angle);
          const ly = cy + labelDistance * Math.sin(angle);
          const raw = data[i].fullLabel;
          const label = compact ? (COMPACT_LABELS[raw] ?? raw) : raw;
          const score = Math.round(animatedScores[i] ?? 0);
          const anchor: 'start' | 'middle' | 'end' = lx < cx - 6 ? 'end' : lx > cx + 6 ? 'start' : 'middle';
          const isAbove = ly < cy - 4;
          const labelDy = isAbove ? -6 : 6;
          const scoreDy = isAbove ? -6 + (compact ? 13 : 16) : 6 + (compact ? 13 : 16);
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
                {label}
              </text>
              <text
                x={lx}
                y={ly + scoreDy}
                textAnchor={anchor}
                className="tabular-nums"
                fontSize={compact ? 12 : 14}
                fontWeight={700}
              >
                <tspan fill={petals[i].colour}>{score}</tspan>
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
