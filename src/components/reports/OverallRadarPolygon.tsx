import React from 'react';
import { CHART_HEX, CHART_PILLAR_COLOR_ORDER } from '@/lib/design/chartColors';
import { CLIENT_PILLAR_LABELS, SCORING_ID_TO_SECTION_ID } from '@/constants/clientReport';
import { PILLAR_SCORE_ORDER, type RadarData } from '@/lib/reports/radarData';
import { cn } from '@/lib/utils';

interface OverallRadarPolygonProps {
  data: RadarData[];
  previousData?: RadarData[];
  compact?: boolean;
  onPillarSelect?: (sectionId: string) => void;
  className?: string;
  /** Use short plain-language pillar labels on public client reports. */
  clientFacingLabels?: boolean;
}

function displayPillarLabel(label: string, fullLabel: string | undefined, clientFacing: boolean): string {
  if (!clientFacing) return label;
  const key = fullLabel ?? label;
  return CLIENT_PILLAR_LABELS[key] ?? CLIENT_PILLAR_LABELS[label] ?? label;
}

function point(cx: number, cy: number, r: number, angle: number) {
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

function sectionIdForIndex(index: number): string | undefined {
  const id = PILLAR_SCORE_ORDER[index];
  return id ? SCORING_ID_TO_SECTION_ID[id] : undefined;
}

function valueAt(data: RadarData[], index: number, previous?: RadarData[]): number {
  const entry = data[index];
  if (!entry) return 0;
  if (previous) {
    const prev = previous.find((p) => p.name === entry.name);
    return prev?.value ?? entry.value;
  }
  return entry.value;
}

/**
 * Five-pillar radar with semantic pillar colours on spokes, hull edges, and vertex dots.
 */
export default function OverallRadarPolygon({
  data,
  previousData,
  compact = false,
  onPillarSelect,
  className,
  clientFacingLabels = false,
}: OverallRadarPolygonProps) {
  const n = data.length;
  if (n === 0) return null;

  const size = compact ? 400 : 480;
  const cx = size / 2;
  const cy = size / 2;
  const baseR = compact ? 108 : 130;
  const labelR = compact ? baseR + 28 : baseR + 38;
  const ang = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;

  const vertices = data.map((d, i) => {
    const r = (Math.max(0, Math.min(100, d.value)) / 100) * baseR;
    return { ...point(cx, cy, r, ang(i)), value: d.value, label: d.name, fullLabel: d.fullLabel };
  });

  const prevVertices = previousData
    ? data.map((d, i) => {
        const prevVal = valueAt(data, i, previousData);
        const r = (Math.max(0, Math.min(100, prevVal)) / 100) * baseR;
        return point(cx, cy, r, ang(i));
      })
    : null;

  const outerPts = data
    .map((_, i) => {
      const p = point(cx, cy, baseR, ang(i));
      return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
    })
    .join(' ');

  const hullPts = vertices.map((v) => `${v.x.toFixed(2)},${v.y.toFixed(2)}`).join(' ');

  const prevHullPts = prevVertices
    ? prevVertices.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')
    : null;

  return (
    <div
      className={cn(
        'flex w-full items-center justify-center',
        compact ? 'min-h-[220px]' : 'min-h-[260px]',
        className,
      )}
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="h-full w-full max-h-[320px] max-w-full"
        role="img"
        aria-label="Five-pillar score radar"
      >
        <polygon
          points={outerPts}
          fill="none"
          stroke={CHART_HEX.gridLight}
          strokeWidth={1}
          opacity={0.85}
        />

        {data.map((_, i) => {
          const color = CHART_PILLAR_COLOR_ORDER[i % CHART_PILLAR_COLOR_ORDER.length];
          const tip = point(cx, cy, baseR, ang(i));
          return (
            <line
              key={`spoke-${i}`}
              x1={cx}
              y1={cy}
              x2={tip.x}
              y2={tip.y}
              stroke={color}
              strokeWidth={0.9}
              opacity={0.35}
            />
          );
        })}

        {prevHullPts ? (
          <polygon
            points={prevHullPts}
            fill="none"
            stroke={CHART_HEX.neutralStroke}
            strokeWidth={1.5}
            strokeDasharray="5 4"
            opacity={0.7}
          />
        ) : null}

        <polygon
          points={hullPts}
          fill="hsl(var(--foreground) / 0.05)"
          stroke="none"
        />

        {vertices.map((v, i) => {
          const next = vertices[(i + 1) % n];
          const color = CHART_PILLAR_COLOR_ORDER[i % CHART_PILLAR_COLOR_ORDER.length];
          return (
            <line
              key={`edge-${i}`}
              x1={v.x}
              y1={v.y}
              x2={next.x}
              y2={next.y}
              stroke={color}
              strokeWidth={2.25}
              strokeLinecap="round"
              opacity={0.9}
            />
          );
        })}

        {vertices.map((v, i) => {
          const color = CHART_PILLAR_COLOR_ORDER[i % CHART_PILLAR_COLOR_ORDER.length];
          return (
            <circle
              key={`dot-${i}`}
              cx={v.x}
              cy={v.y}
              r={compact ? 5 : 6}
              fill={color}
              stroke="hsl(var(--card))"
              strokeWidth={2.5}
            />
          );
        })}

        {vertices.map((v, i) => {
          const prev = previousData?.find((p) => p.name === data[i]?.name);
          const improved = prev != null && v.value > prev.value;
          const regressed = prev != null && v.value < prev.value;
          if (!improved && !regressed) return null;
          const ringColor = improved ? CHART_HEX.scoreGreen : CHART_HEX.scoreRed;
          return (
            <circle
              key={`delta-${i}`}
              cx={v.x}
              cy={v.y}
              r={compact ? 8.5 : 10}
              fill="none"
              stroke={ringColor}
              strokeWidth={1.5}
              opacity={0.85}
            />
          );
        })}

        {data.map((d, i) => {
          const a = ang(i);
          const lp = point(cx, cy, labelR, a);
          const color = CHART_PILLAR_COLOR_ORDER[i % CHART_PILLAR_COLOR_ORDER.length];
          const anchor: 'start' | 'middle' | 'end' =
            lp.x < cx - 8 ? 'end' : lp.x > cx + 8 ? 'start' : 'middle';
          const isAbove = lp.y < cy - 4;
          const isBelow = lp.y > cy + 4;
          const labelDy = isAbove ? (compact ? -6 : -8) : isBelow ? (compact ? 14 : 16) : 4;
          const sectionId = sectionIdForIndex(i);
          const clickable = Boolean(onPillarSelect && sectionId);

          return (
            <text
              key={`lbl-${i}`}
              x={lp.x}
              y={lp.y + labelDy}
              fontSize={compact ? 10 : 11}
              fontWeight={700}
              textAnchor={anchor}
              fill={color}
              className={clickable ? 'cursor-pointer' : undefined}
              onClick={
                clickable
                  ? () => {
                      onPillarSelect?.(sectionId);
                    }
                  : undefined
              }
            >
              {displayPillarLabel(d.name, d.fullLabel ?? d.name, clientFacingLabels)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
