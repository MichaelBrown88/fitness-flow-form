import React from 'react';
import { CHART_HEX, CHART_PILLAR_COLOR_ORDER } from '@/lib/design/chartColors';
import { cn } from '@/lib/utils';

interface MiniPillarRadarProps {
  /** Five scores: Body, Strength, Cardio, Movement, Lifestyle. */
  scores: number[];
  size?: number;
  /** Outline = goal / target slot (dashed hull). */
  variant?: 'filled' | 'outline';
  className?: string;
}

function point(cx: number, cy: number, r: number, angle: number) {
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

/**
 * Compact five-pillar radar — semantic pillar colours, no labels.
 */
export function MiniPillarRadar({
  scores,
  size = 96,
  variant = 'filled',
  className,
}: MiniPillarRadarProps) {
  const cx = size / 2;
  const cy = size / 2;
  const baseR = size * 0.38;
  const n = Math.max(scores.length, 5);
  const ang = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const isOutline = variant === 'outline';

  const vertices = scores.slice(0, n).map((s, i) => {
    const r = (Math.max(0, Math.min(100, s)) / 100) * baseR;
    return point(cx, cy, r, ang(i));
  });

  const outerPts = Array.from({ length: n }, (_, i) => {
    const p = point(cx, cy, baseR, ang(i));
    return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }).join(' ');

  const hullPts = vertices.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn('block shrink-0', className)}
      role="img"
      aria-label="Five-pillar score shape"
    >
      <polygon
        points={outerPts}
        fill="none"
        stroke={CHART_HEX.gridLight}
        strokeWidth={1}
        opacity={0.8}
      />
      {Array.from({ length: n }, (_, i) => {
        const color = CHART_PILLAR_COLOR_ORDER[i % CHART_PILLAR_COLOR_ORDER.length];
        const p = point(cx, cy, baseR, ang(i));
        return (
          <line
            key={`spoke-${i}`}
            x1={cx}
            y1={cy}
            x2={p.x}
            y2={p.y}
            stroke={color}
            strokeWidth={0.6}
            opacity={0.35}
          />
        );
      })}
      <polygon
        points={hullPts}
        fill={isOutline ? 'none' : 'hsl(var(--foreground) / 0.05)'}
        stroke="none"
      />
      {vertices.length >= 2
        ? vertices.map((v, i) => {
            const next = vertices[(i + 1) % vertices.length];
            const color = CHART_PILLAR_COLOR_ORDER[i % CHART_PILLAR_COLOR_ORDER.length];
            return (
              <line
                key={`edge-${i}`}
                x1={v.x}
                y1={v.y}
                x2={next.x}
                y2={next.y}
                stroke={color}
                strokeWidth={isOutline ? 1.1 : 1.5}
                strokeDasharray={isOutline ? '3 2' : undefined}
                strokeLinecap="round"
                opacity={isOutline ? 0.75 : 0.9}
              />
            );
          })
        : null}
      {vertices.map((p, i) => {
        const color = CHART_PILLAR_COLOR_ORDER[i % CHART_PILLAR_COLOR_ORDER.length];
        return (
          <circle
            key={`v-${i}`}
            cx={p.x}
            cy={p.y}
            r={2.5}
            fill={color}
            opacity={isOutline ? 0.55 : 1}
          />
        );
      })}
    </svg>
  );
}
