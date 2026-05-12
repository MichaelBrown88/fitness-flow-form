/**
 * AXIS Radar — instrumentation read of the 5-pillar score.
 *
 * Concentric pentagonal grid, sharp filled hull, axis ticks with numeric
 * labels. Single-color (no per-pillar identity), gender-neutral. Reads
 * as a precision instrument / radar display.
 */

import React from 'react';
import type { RadarData } from '@/components/reports/OverallRadarChart';

interface Props { data: RadarData[]; }

function v(cx: number, cy: number, r: number, ang: number) {
  return { x: cx + r * Math.cos(ang), y: cy + r * Math.sin(ang) };
}

export default function AxisRadar({ data }: Props) {
  const size = 440;
  const cx = size / 2;
  const cy = size / 2;
  const labelGap = 30;
  const baseR = (size / 2) - labelGap - 28;
  const n = data.length;
  const ringStops = [25, 50, 75, 100];
  const ang = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;

  const hullPts = data
    .map((d, i) => {
      const r = (Math.max(0, Math.min(100, d.value)) / 100) * baseR;
      const p = v(cx, cy, r, ang(i));
      return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
    })
    .join(' ');

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full" role="img" aria-label="AXIS Radar">
      {/* Concentric pentagonal range rings */}
      {ringStops.map((stop) => {
        const pts = data
          .map((_, i) => {
            const r = (stop / 100) * baseR;
            const p = v(cx, cy, r, ang(i));
            return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
          })
          .join(' ');
        return (
          <polygon
            key={stop}
            points={pts}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth={stop === 100 ? 1 : 0.7}
            opacity={stop === 100 ? 0.7 : 0.45}
          />
        );
      })}

      {/* Spokes from centre to outer ring */}
      {data.map((_, i) => {
        const p = v(cx, cy, baseR, ang(i));
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={p.x.toFixed(2)}
            y2={p.y.toFixed(2)}
            stroke="hsl(var(--border))"
            strokeWidth={0.7}
            opacity={0.5}
          />
        );
      })}

      {/* Tick marks every 25 along each spoke */}
      {data.map((_, i) =>
        ringStops.slice(0, 3).map((stop) => {
          const r = (stop / 100) * baseR;
          const p = v(cx, cy, r, ang(i));
          const tickAng = ang(i) + Math.PI / 2;
          const tx = p.x + 4 * Math.cos(tickAng);
          const ty = p.y + 4 * Math.sin(tickAng);
          const tx2 = p.x - 4 * Math.cos(tickAng);
          const ty2 = p.y - 4 * Math.sin(tickAng);
          return (
            <line
              key={`tick-${i}-${stop}`}
              x1={tx.toFixed(2)}
              y1={ty.toFixed(2)}
              x2={tx2.toFixed(2)}
              y2={ty2.toFixed(2)}
              stroke="hsl(var(--foreground))"
              strokeWidth={0.8}
              opacity={0.6}
            />
          );
        }),
      )}

      {/* Filled hull */}
      <polygon
        points={hullPts}
        fill="hsl(var(--foreground))"
        fillOpacity={0.10}
        stroke="hsl(var(--foreground))"
        strokeWidth={2}
        strokeLinejoin="miter"
      />

      {/* Vertex markers */}
      {data.map((d, i) => {
        const r = (Math.max(0, Math.min(100, d.value)) / 100) * baseR;
        const p = v(cx, cy, r, ang(i));
        return (
          <rect
            key={`vx-${i}`}
            x={p.x - 3}
            y={p.y - 3}
            width={6}
            height={6}
            fill="hsl(var(--background))"
            stroke="hsl(var(--foreground))"
            strokeWidth={1.5}
          />
        );
      })}

      {/* Centre crosshair */}
      <line x1={cx - 6} y1={cy} x2={cx + 6} y2={cy} stroke="hsl(var(--foreground))" strokeWidth={1} />
      <line x1={cx} y1={cy - 6} x2={cx} y2={cy + 6} stroke="hsl(var(--foreground))" strokeWidth={1} />
      <circle cx={cx} cy={cy} r={2} fill="hsl(var(--foreground))" />

      {/* Top axis numeric scale */}
      {ringStops.map((stop) => {
        const r = (stop / 100) * baseR;
        return (
          <text
            key={`scale-${stop}`}
            x={cx + 6}
            y={cy - r + 3}
            fontSize={9}
            fontWeight={500}
            className="fill-muted-foreground"
            style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
          >
            {stop}
          </text>
        );
      })}

      {/* Pillar labels */}
      {data.map((d, i) => {
        const lp = v(cx, cy, baseR * 1.10, ang(i));
        const score = Math.round(d.value);
        const anchor: 'start' | 'middle' | 'end' = lp.x < cx - 6 ? 'end' : lp.x > cx + 6 ? 'start' : 'middle';
        const isAbove = lp.y < cy - 4;
        return (
          <g key={`lbl-${i}`}>
            <text
              x={lp.x}
              y={lp.y + (isAbove ? -6 : 6)}
              textAnchor={anchor}
              fontSize={11}
              fontWeight={600}
              className="fill-foreground"
              style={{ letterSpacing: '0.04em', textTransform: 'uppercase' }}
            >
              {d.name}
            </text>
            <text
              x={lp.x}
              y={lp.y + (isAbove ? -6 : 6) + 14}
              textAnchor={anchor}
              fontSize={13}
              fontWeight={700}
              className="fill-foreground tabular-nums"
              style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
            >
              {score}
              <tspan className="fill-muted-foreground" fontSize={10} fontWeight={500}>/100</tspan>
            </text>
          </g>
        );
      })}
    </svg>
  );
}
