/**
 * AXIS Stack — non-radial gauge cluster of the 5-pillar score.
 *
 * Five vertical bars side by side, dense tick scale on the left rail,
 * monospace numeric readout above each bar. Tests the hypothesis that
 * the radial format itself is the source of the "soft / floral" read.
 * Reads as a dashboard or aerospace gauge cluster.
 */

import React from 'react';
import type { RadarData } from '@/components/reports/OverallRadarChart';

interface Props { data: RadarData[]; }

export default function AxisStack({ data }: Props) {
  const w = 440;
  const h = 440;
  const padTop = 56;
  const padBottom = 70;
  const padLeftAxis = 36;
  const padRight = 16;

  const trackHeight = h - padTop - padBottom;
  const trackTop = padTop;
  const trackBottom = h - padBottom;

  const trackArea = w - padLeftAxis - padRight;
  const colW = trackArea / data.length;
  const barW = colW * 0.42;

  const ticks = [0, 25, 50, 75, 100];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" role="img" aria-label="AXIS Stack">
      {/* Left axis rail with tick labels */}
      {ticks.map((t) => {
        const y = trackBottom - (t / 100) * trackHeight;
        return (
          <g key={`tick-${t}`}>
            <line
              x1={padLeftAxis}
              y1={y}
              x2={w - padRight}
              y2={y}
              stroke="hsl(var(--border))"
              strokeWidth={t === 0 || t === 100 ? 0.9 : 0.5}
              strokeDasharray={t === 0 || t === 100 ? '0' : '3 5'}
              opacity={t === 0 || t === 100 ? 0.6 : 0.35}
            />
            <text
              x={padLeftAxis - 8}
              y={y + 3}
              textAnchor="end"
              fontSize={10}
              fontWeight={500}
              className="fill-muted-foreground tabular-nums"
              style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
            >
              {t}
            </text>
          </g>
        );
      })}

      {/* Bars */}
      {data.map((d, i) => {
        const score = Math.max(0, Math.min(100, d.value));
        const colCx = padLeftAxis + colW * (i + 0.5);
        const barX = colCx - barW / 2;
        const barH = (score / 100) * trackHeight;
        const barY = trackBottom - barH;

        return (
          <g key={`bar-${i}`}>
            {/* Bar track (background) */}
            <rect
              x={barX}
              y={trackTop}
              width={barW}
              height={trackHeight}
              fill="none"
              stroke="hsl(var(--border))"
              strokeWidth={0.7}
              opacity={0.5}
            />
            {/* Filled bar */}
            <rect
              x={barX}
              y={barY}
              width={barW}
              height={barH}
              fill="hsl(var(--foreground))"
              fillOpacity={0.12}
              stroke="hsl(var(--foreground))"
              strokeWidth={1.4}
            />
            {/* Cap line */}
            <line
              x1={barX - 4}
              y1={barY}
              x2={barX + barW + 4}
              y2={barY}
              stroke="hsl(var(--foreground))"
              strokeWidth={1.6}
            />

            {/* Score readout above bar */}
            <text
              x={colCx}
              y={trackTop - 22}
              textAnchor="middle"
              fontSize={20}
              fontWeight={700}
              className="fill-foreground tabular-nums"
              style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
            >
              {Math.round(score)}
            </text>
            <text
              x={colCx}
              y={trackTop - 8}
              textAnchor="middle"
              fontSize={9}
              fontWeight={500}
              className="fill-muted-foreground"
              style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace', letterSpacing: '0.08em' }}
            >
              /100
            </text>

            {/* Pillar label below */}
            <text
              x={colCx}
              y={trackBottom + 22}
              textAnchor="middle"
              fontSize={10}
              fontWeight={600}
              className="fill-foreground"
              style={{ letterSpacing: '0.10em', textTransform: 'uppercase' }}
            >
              {d.name}
            </text>
          </g>
        );
      })}

      {/* Bottom rail */}
      <line
        x1={padLeftAxis}
        y1={trackBottom}
        x2={w - padRight}
        y2={trackBottom}
        stroke="hsl(var(--foreground))"
        strokeWidth={1.2}
      />
    </svg>
  );
}
