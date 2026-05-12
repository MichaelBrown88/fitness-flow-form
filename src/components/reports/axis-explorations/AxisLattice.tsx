/**
 * AXIS Lattice — faceted crystalline read of the 5-pillar score.
 *
 * Sharp polygon hull with full internal triangulation (every vertex
 * connected to every other vertex). Reads as a structural diagram /
 * crystallography sample. Cold, precise, gender-neutral.
 */

import React from 'react';
import type { RadarData } from '@/components/reports/OverallRadarChart';

interface Props { data: RadarData[]; }

function v(cx: number, cy: number, r: number, ang: number) {
  return { x: cx + r * Math.cos(ang), y: cy + r * Math.sin(ang) };
}

export default function AxisLattice({ data }: Props) {
  const size = 440;
  const cx = size / 2;
  const cy = size / 2;
  const labelGap = 32;
  const baseR = (size / 2) - labelGap - 28;
  const n = data.length;
  const ringStops = [50, 100];
  const ang = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;

  const verts = data.map((d, i) => {
    const r = (Math.max(0, Math.min(100, d.value)) / 100) * baseR;
    return v(cx, cy, r, ang(i));
  });

  const hullPts = verts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');

  // All internal diagonals (skipping adjacent edges, which the hull already draws)
  const diagonals: Array<[number, number]> = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      diagonals.push([i, j]);
    }
  }

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full" role="img" aria-label="AXIS Lattice">
      {/* Reference rings — minimal, just 50 and 100 */}
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
            strokeWidth={stop === 100 ? 0.9 : 0.5}
            strokeDasharray={stop === 100 ? '0' : '3 5'}
            opacity={stop === 100 ? 0.55 : 0.35}
          />
        );
      })}

      {/* Spokes from centre to each hull vertex (structural ribs) */}
      {verts.map((p, i) => (
        <line
          key={`rib-${i}`}
          x1={cx}
          y1={cy}
          x2={p.x.toFixed(2)}
          y2={p.y.toFixed(2)}
          stroke="hsl(var(--foreground))"
          strokeWidth={0.7}
          opacity={0.45}
        />
      ))}

      {/* Internal diagonals — the crystalline lattice */}
      {diagonals.map(([i, j]) => (
        <line
          key={`d-${i}-${j}`}
          x1={verts[i].x.toFixed(2)}
          y1={verts[i].y.toFixed(2)}
          x2={verts[j].x.toFixed(2)}
          y2={verts[j].y.toFixed(2)}
          stroke="hsl(var(--foreground))"
          strokeWidth={0.9}
          opacity={0.55}
        />
      ))}

      {/* Hull (outer envelope) */}
      <polygon
        points={hullPts}
        fill="hsl(var(--foreground))"
        fillOpacity={0.05}
        stroke="hsl(var(--foreground))"
        strokeWidth={1.8}
        strokeLinejoin="miter"
      />

      {/* Vertex node markers — diamond facets */}
      {verts.map((p, i) => {
        const s = 5;
        const path = `M ${p.x} ${p.y - s} L ${p.x + s} ${p.y} L ${p.x} ${p.y + s} L ${p.x - s} ${p.y} Z`;
        return (
          <path
            key={`node-${i}`}
            d={path}
            fill="hsl(var(--background))"
            stroke="hsl(var(--foreground))"
            strokeWidth={1.5}
          />
        );
      })}

      {/* Centre node */}
      <circle cx={cx} cy={cy} r={3.5} fill="hsl(var(--foreground))" />

      {/* Pillar labels with score */}
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
