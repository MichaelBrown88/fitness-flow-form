/**
 * AXIS Blueprint — engineering drawing of the 5-pillar score.
 *
 * Sharp polygon hull with dimension callouts on every spoke (line +
 * arrow + numeric readout). Monospace numerics, dashed grid, all
 * monochrome. Reads as a technical schematic.
 */

import React from 'react';
import type { RadarData } from '@/components/reports/OverallRadarChart';

interface Props { data: RadarData[]; }

function v(cx: number, cy: number, r: number, ang: number) {
  return { x: cx + r * Math.cos(ang), y: cy + r * Math.sin(ang) };
}

export default function AxisBlueprint({ data }: Props) {
  const size = 440;
  const cx = size / 2;
  const cy = size / 2;
  const labelGap = 36;
  const baseR = (size / 2) - labelGap - 30;
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
    <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full" role="img" aria-label="AXIS Blueprint">
      {/* Faint cartesian grid — drafting paper feel */}
      <g opacity={0.18}>
        {Array.from({ length: 11 }).map((_, i) => (
          <line
            key={`gx-${i}`}
            x1={(size / 10) * i}
            y1={0}
            x2={(size / 10) * i}
            y2={size}
            stroke="hsl(var(--border))"
            strokeWidth={0.5}
            strokeDasharray="2 4"
          />
        ))}
        {Array.from({ length: 11 }).map((_, i) => (
          <line
            key={`gy-${i}`}
            x1={0}
            y1={(size / 10) * i}
            x2={size}
            y2={(size / 10) * i}
            stroke="hsl(var(--border))"
            strokeWidth={0.5}
            strokeDasharray="2 4"
          />
        ))}
      </g>

      {/* Polar scale rings (dashed, drafting style) */}
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
            stroke="hsl(var(--foreground))"
            strokeWidth={stop === 100 ? 0.9 : 0.5}
            strokeDasharray={stop === 100 ? '0' : '4 4'}
            opacity={stop === 100 ? 0.55 : 0.3}
          />
        );
      })}

      {/* Hull */}
      <polygon
        points={hullPts}
        fill="hsl(var(--foreground))"
        fillOpacity={0.06}
        stroke="hsl(var(--foreground))"
        strokeWidth={1.6}
      />

      {/* Dimension callouts: spoke + arrowhead + numeric on each axis */}
      {data.map((d, i) => {
        const score = Math.max(0, Math.min(100, d.value));
        const r = (score / 100) * baseR;
        const a = ang(i);
        const tip = v(cx, cy, r, a);
        const inner = v(cx, cy, 14, a);

        const ah = 6;
        const back = v(cx, cy, r - ah, a);
        const perp = a + Math.PI / 2;
        const left = { x: back.x + ah * 0.6 * Math.cos(perp), y: back.y + ah * 0.6 * Math.sin(perp) };
        const right = { x: back.x - ah * 0.6 * Math.cos(perp), y: back.y - ah * 0.6 * Math.sin(perp) };

        const midR = r * 0.55;
        const mid = v(cx, cy, midR, a);
        const labelOff = 10;
        const labelX = mid.x + labelOff * Math.cos(perp);
        const labelY = mid.y + labelOff * Math.sin(perp);

        return (
          <g key={`dim-${i}`}>
            <line
              x1={inner.x.toFixed(2)}
              y1={inner.y.toFixed(2)}
              x2={tip.x.toFixed(2)}
              y2={tip.y.toFixed(2)}
              stroke="hsl(var(--foreground))"
              strokeWidth={1.1}
              opacity={0.85}
            />
            <polygon
              points={`${tip.x.toFixed(2)},${tip.y.toFixed(2)} ${left.x.toFixed(2)},${left.y.toFixed(2)} ${right.x.toFixed(2)},${right.y.toFixed(2)}`}
              fill="hsl(var(--foreground))"
              opacity={0.85}
            />
            <text
              x={labelX.toFixed(2)}
              y={labelY.toFixed(2)}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={10}
              fontWeight={600}
              className="fill-foreground tabular-nums"
              style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
            >
              {Math.round(score)}
            </text>
          </g>
        );
      })}

      {/* Centre datum */}
      <circle cx={cx} cy={cy} r={5} fill="none" stroke="hsl(var(--foreground))" strokeWidth={1} />
      <line x1={cx - 8} y1={cy} x2={cx + 8} y2={cy} stroke="hsl(var(--foreground))" strokeWidth={0.8} />
      <line x1={cx} y1={cy - 8} x2={cx} y2={cy + 8} stroke="hsl(var(--foreground))" strokeWidth={0.8} />

      {/* Pillar labels */}
      {data.map((d, i) => {
        const lp = v(cx, cy, baseR * 1.12, ang(i));
        const anchor: 'start' | 'middle' | 'end' = lp.x < cx - 6 ? 'end' : lp.x > cx + 6 ? 'start' : 'middle';
        return (
          <text
            key={`lbl-${i}`}
            x={lp.x}
            y={lp.y}
            textAnchor={anchor}
            dominantBaseline="middle"
            fontSize={11}
            fontWeight={600}
            className="fill-foreground"
            style={{ letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
          >
            {d.name}
          </text>
        );
      })}

      {/* Top-left title block — drafting touch */}
      <g>
        <rect x={10} y={10} width={110} height={32} fill="none" stroke="hsl(var(--foreground))" strokeWidth={0.7} opacity={0.5} />
        <text x={16} y={24} fontSize={8} className="fill-muted-foreground" style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace', letterSpacing: '0.08em' }}>
          AXIS / 5-PILLAR
        </text>
        <text x={16} y={36} fontSize={8} className="fill-muted-foreground" style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace', letterSpacing: '0.08em' }}>
          REV. A · SCALE 1:1
        </text>
      </g>
    </svg>
  );
}
