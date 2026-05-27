import React from 'react';
import type { RadarData } from '@/lib/reports/radarData';
import { cn } from '@/lib/utils';

/**
 * Clean five-pillar radar — same visual idiom as the landing hero polygon.
 * Outer pentagon ring, subtle spokes, filled hull at actual scores, vertex
 * dots, pillar labels around the outside. Everything rendered inside a
 * single padded SVG so labels never clip against the parent container.
 */

interface Props {
  data: RadarData[];
  /** Optional previous-assessment hull rendered as a dashed outline behind the current one. */
  previousData?: RadarData[];
  className?: string;
}

function point(cx: number, cy: number, r: number, angle: number) {
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

export default function ScoreRadar({ data, previousData, className }: Props) {
  // Generous viewBox so external pillar labels stay inside the SVG bounds
  // — no parent-padding gymnastics needed.
  const size = 480;
  const cx = size / 2;
  const cy = size / 2;
  const baseR = 130; // chart radius
  const labelR = baseR + 38; // distance to label anchor
  const n = data.length;
  const ang = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;

  const outerPts = data
    .map((_, i) => {
      const p = point(cx, cy, baseR, ang(i));
      return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
    })
    .join(' ');

  const hullPts = data
    .map((d, i) => {
      const r = (Math.max(0, Math.min(100, d.value)) / 100) * baseR;
      const p = point(cx, cy, r, ang(i));
      return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
    })
    .join(' ');

  const prevHullPts = previousData
    ? data
        .map((d, i) => {
          const prev = previousData.find((p) => p.name === d.name)?.value ?? d.value;
          const r = (Math.max(0, Math.min(100, prev)) / 100) * baseR;
          const p = point(cx, cy, r, ang(i));
          return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
        })
        .join(' ')
    : null;

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className={cn('h-auto w-full max-w-[440px]', className)}
      role="img"
      aria-label="Five-pillar radar"
    >
      {/* Outer pentagon ring */}
      <polygon points={outerPts} fill="none" stroke="hsl(var(--border))" strokeWidth={1} opacity={0.7} />
      {/* Subtle spokes */}
      {data.map((_, i) => {
        const p = point(cx, cy, baseR, ang(i));
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={p.x.toFixed(2)}
            y2={p.y.toFixed(2)}
            stroke="hsl(var(--border))"
            strokeWidth={0.7}
            opacity={0.4}
          />
        );
      })}

      {/* Previous-assessment hull (dashed) */}
      {prevHullPts ? (
        <polygon
          points={prevHullPts}
          fill="none"
          stroke="hsl(var(--muted-foreground))"
          strokeWidth={1.25}
          strokeDasharray="4 4"
          opacity={0.55}
        />
      ) : null}

      {/* Current hull */}
      <polygon
        points={hullPts}
        fill="hsl(var(--primary) / 0.18)"
        stroke="hsl(var(--primary))"
        strokeWidth={2}
        strokeLinejoin="round"
      />

      {/* Vertex dots */}
      {data.map((d, i) => {
        const r = (Math.max(0, Math.min(100, d.value)) / 100) * baseR;
        const p = point(cx, cy, r, ang(i));
        return (
          <circle
            key={`vx-${i}`}
            cx={p.x}
            cy={p.y}
            r={4}
            fill="hsl(var(--background))"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
          />
        );
      })}

      {/* Pillar labels — SVG text so they never escape the canvas */}
      {data.map((d, i) => {
        const a = ang(i);
        const lp = point(cx, cy, labelR, a);
        const anchor: 'start' | 'middle' | 'end' =
          lp.x < cx - 8 ? 'end' : lp.x > cx + 8 ? 'start' : 'middle';
        const isAbove = lp.y < cy - 4;
        const isBelow = lp.y > cy + 4;
        // Two stacked lines per label: pillar name (eyebrow) + score
        const eyebrowDy = isAbove ? -16 : isBelow ? 12 : 0;
        const scoreDy = isAbove ? 0 : isBelow ? 28 : 16;
        return (
          <g key={`lbl-${i}`}>
            <text
              x={lp.x}
              y={lp.y + eyebrowDy}
              fontSize={10}
              fontWeight={700}
              textAnchor={anchor}
              className="fill-muted-foreground"
              style={{ letterSpacing: '0.08em', textTransform: 'uppercase' }}
            >
              {d.fullLabel}
            </text>
            <text
              x={lp.x}
              y={lp.y + scoreDy}
              fontSize={15}
              fontWeight={700}
              textAnchor={anchor}
              className="fill-foreground"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {Math.round(d.value)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
