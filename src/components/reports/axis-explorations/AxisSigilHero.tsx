/**
 * AXIS Sigil Hero — the standout signature visualization.
 *
 * Five Pillar Sigils placed at pentagon vertex angles around a central
 * composite AXIS Index. Cinematic dark register, semantic per-pillar
 * hues retained, animated mount reveal, no curves or petals.
 *
 * The same sigil components rendered here are reused as branding
 * stamps throughout the report (section headers, summary cards, share
 * cards). One identity system, two contexts.
 */

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  pillarColor,
  pillarHueAt,
  type RadarData,
} from '@/components/reports/OverallRadarChart';
import { sigilKindFor, SigilByKind } from './AxisSigils';

interface Props {
  data: RadarData[];
  previousData?: RadarData[];
  /** Optional override for the composite — defaults to simple average. */
  compositeOverride?: number;
}

function angleAt(i: number, n: number): number {
  return -Math.PI / 2 + (i * 2 * Math.PI) / n;
}

function useAnimatedScores(
  targets: number[],
  opts: { from?: number[]; duration?: number } = {},
): number[] {
  const { from, duration = 1300 } = opts;
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

export default function AxisSigilHero({ data, previousData, compositeOverride }: Props) {
  const size = 600;
  const cx = size / 2;
  const cy = size / 2;
  const sigilRadius = 195;          // distance from centre to sigil centre
  const sigilSize = 110;            // rendered size of each sigil
  const labelDistance = 285;        // pillar label distance from centre

  const reactId = useId();
  const id = reactId.replace(/:/g, '');
  const ringFilter = `axis-hero-ring-${id}`;
  const haloFilter = `axis-hero-halo-${id}`;

  const targetScores = useMemo(() => data.map((d) => d.value), [data]);
  const prevValues = useMemo(() => {
    if (!previousData) return undefined;
    return data.map((d) => previousData.find((p) => p.name === d.name)?.value ?? d.value);
  }, [data, previousData]);
  const animatedScores = useAnimatedScores(targetScores, {
    from: prevValues ?? targetScores.map(() => 0),
    duration: prevValues ? 1300 : 1100,
  });

  const composite = useMemo(() => {
    if (typeof compositeOverride === 'number') return compositeOverride;
    if (animatedScores.length === 0) return 0;
    return animatedScores.reduce((a, b) => a + b, 0) / animatedScores.length;
  }, [animatedScores, compositeOverride]);

  const tier =
    composite >= 85 ? 'PEAK'
    : composite >= 70 ? 'ASCENT'
    : composite >= 55 ? 'BUILDING'
    : composite >= 40 ? 'EMERGING'
    : 'BASE';

  const n = data.length;

  return (
    <div className="relative h-full w-full">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="h-full w-full"
        role="img"
        aria-label={`AXIS Index — composite score ${Math.round(composite)} of 100`}
      >
        <defs>
          <filter id={ringFilter} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
          <filter id={haloFilter} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
        </defs>

        {/* Faint pentagonal range scaffolding at 50 / 100 */}
        {[50, 100].map((stop) => {
          const pts = data
            .map((_, i) => {
              const a = angleAt(i, n);
              const r = (stop / 100) * sigilRadius;
              return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
            })
            .join(' ');
          return (
            <polygon
              key={stop}
              points={pts}
              fill="none"
              stroke="currentColor"
              strokeWidth={stop === 100 ? 1 : 0.5}
              strokeDasharray={stop === 100 ? '0' : '3 6'}
              opacity={stop === 100 ? 0.18 : 0.10}
              className="text-foreground"
            />
          );
        })}

        {/* Spokes from centre to each sigil — semantic hue */}
        {data.map((d, i) => {
          const a = angleAt(i, n);
          const ex = cx + sigilRadius * Math.cos(a);
          const ey = cy + sigilRadius * Math.sin(a);
          const hue = pillarHueAt(d.name, d.fullLabel, i);
          return (
            <line
              key={`spoke-${i}`}
              x1={cx}
              y1={cy}
              x2={ex.toFixed(2)}
              y2={ey.toFixed(2)}
              stroke={pillarColor(hue, 0.18)}
              strokeWidth={1}
            />
          );
        })}

        {/* Atmospheric halo behind each sigil — tinted by pillar */}
        <g filter={`url(#${haloFilter})`}>
          {data.map((d, i) => {
            const a = angleAt(i, n);
            const x = cx + sigilRadius * Math.cos(a);
            const y = cy + sigilRadius * Math.sin(a);
            const hue = pillarHueAt(d.name, d.fullLabel, i);
            const score = animatedScores[i] ?? 0;
            const alpha = 0.20 + (score / 100) * 0.55;
            return (
              <circle
                key={`halo-${i}`}
                cx={x.toFixed(2)}
                cy={y.toFixed(2)}
                r={56}
                fill={pillarColor(hue, alpha)}
              />
            );
          })}
        </g>

        {/* Pillar sigils */}
        {data.map((d, i) => {
          const a = angleAt(i, n);
          const x = cx + sigilRadius * Math.cos(a);
          const y = cy + sigilRadius * Math.sin(a);
          const hue = pillarHueAt(d.name, d.fullLabel, i);
          const kind = sigilKindFor(d.name, d.fullLabel);
          const score = animatedScores[i] ?? 0;
          return (
            <g
              key={`sigil-${i}`}
              transform={`translate(${(x - sigilSize / 2).toFixed(2)} ${(y - sigilSize / 2).toFixed(2)})`}
            >
              <SigilByKind kind={kind} score={score} size={sigilSize} hue={hue} glow={true} />
            </g>
          );
        })}

        {/* Composite hero — AXIS INDEX label, big number, tier */}
        <text
          x={cx}
          y={cy - 56}
          textAnchor="middle"
          fontSize={11}
          fontWeight={700}
          className="fill-muted-foreground"
          style={{ letterSpacing: '0.34em' }}
        >
          AXIS INDEX
        </text>
        <text
          x={cx}
          y={cy + 18}
          textAnchor="middle"
          fontSize={92}
          fontWeight={800}
          className="fill-foreground tabular-nums"
          style={{ letterSpacing: '-0.05em' }}
        >
          {Math.round(composite)}
        </text>
        <text
          x={cx}
          y={cy + 46}
          textAnchor="middle"
          fontSize={11}
          fontWeight={600}
          className="fill-muted-foreground"
          style={{ letterSpacing: '0.30em' }}
        >
          {tier} · /100
        </text>

        {/* Pillar labels with score under each sigil */}
        {data.map((d, i) => {
          const a = angleAt(i, n);
          const lx = cx + labelDistance * Math.cos(a);
          const ly = cy + labelDistance * Math.sin(a);
          const score = Math.round(animatedScores[i] ?? 0);
          const hue = pillarHueAt(d.name, d.fullLabel, i);
          const anchor: 'start' | 'middle' | 'end' = lx < cx - 6 ? 'end' : lx > cx + 6 ? 'start' : 'middle';
          const isAbove = ly < cy - 4;
          const dyName = isAbove ? -8 : 8;
          const dyScore = isAbove ? -8 - 18 : 8 + 18;
          return (
            <g key={`lbl-${i}`}>
              <text
                x={lx}
                y={ly + dyName}
                textAnchor={anchor}
                fontSize={10}
                fontWeight={700}
                fill={pillarColor(hue)}
                style={{ letterSpacing: '0.22em', textTransform: 'uppercase' }}
              >
                {d.name}
              </text>
              <text
                x={lx}
                y={ly + dyScore}
                textAnchor={anchor}
                fontSize={20}
                fontWeight={800}
                className="fill-foreground tabular-nums"
                style={{ letterSpacing: '-0.02em' }}
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
