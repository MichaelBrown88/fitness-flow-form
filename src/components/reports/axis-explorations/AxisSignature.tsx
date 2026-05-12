/**
 * AXIS Signature — hero five-pillar visualization.
 *
 * Sharp geometric pentagon radar with per-pillar semantic identity,
 * a single dominant composite "AXIS Index" number at the centre, and
 * cinematic dark-mode glow inspired by Whoop's Lifespan element.
 *
 * Anatomy:
 *  - Concentric pentagonal range rings (25/50/75/100), dim neutral.
 *  - Five semantic-coloured spokes radiating from the centre.
 *  - Sharp polygon hull connecting the five score vertices — each edge
 *    tinted with its leading pillar's hue.
 *  - Soft per-vertex glow halos in pillar colour (atmospheric depth).
 *  - Gradient-blended hull fill that sweeps through the five hues.
 *  - Big composite AXIS number anchored at the centre.
 *  - Mount animation: number counts up, hull expands from centre,
 *    vertex glows ignite.
 */

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  pillarColor,
  pillarHueAt,
  type RadarData,
} from '@/components/reports/OverallRadarChart';

interface Props {
  data: RadarData[];
  previousData?: RadarData[];
  /** Optional override for the composite — defaults to the simple average. */
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

export default function AxisSignature({ data, previousData, compositeOverride }: Props) {
  const size = 560;
  const cx = size / 2;
  const cy = size / 2;
  const labelGap = 56;
  const baseR = (size / 2) - labelGap - 50;
  const n = data.length;

  const reactId = useId();
  const id = reactId.replace(/:/g, '');
  const gradFill = `axis-sig-grad-${id}`;
  const filterGlow = `axis-sig-glow-${id}`;
  const filterGlowSoft = `axis-sig-soft-${id}`;

  const hues = useMemo(
    () => data.map((d, i) => pillarHueAt(d.name, d.fullLabel, i)),
    [data],
  );

  const targetScores = useMemo(() => data.map((d) => d.value), [data]);
  const prevValues = useMemo(() => {
    if (!previousData) return undefined;
    return data.map((d) => previousData.find((p) => p.name === d.name)?.value ?? d.value);
  }, [data, previousData]);

  const animatedScores = useAnimatedScores(targetScores, {
    from: prevValues ?? targetScores.map(() => 0),
    duration: prevValues ? 1300 : 1100,
  });

  const ringStops = [25, 50, 75, 100];

  const verts = animatedScores.map((s, i) => {
    const r = (Math.max(0, Math.min(100, s)) / 100) * baseR;
    const a = angleAt(i, n);
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  });

  const hullPts = verts.map((v) => `${v.x.toFixed(2)},${v.y.toFixed(2)}`).join(' ');

  const composite = useMemo(() => {
    if (typeof compositeOverride === 'number') return compositeOverride;
    if (animatedScores.length === 0) return 0;
    const sum = animatedScores.reduce((a, b) => a + b, 0);
    return sum / animatedScores.length;
  }, [animatedScores, compositeOverride]);

  // Composite tier wording — gives the number narrative weight.
  const tier = composite >= 85 ? 'PEAK' : composite >= 70 ? 'ASCENT' : composite >= 55 ? 'BUILDING' : composite >= 40 ? 'EMERGING' : 'BASE';

  return (
    <div className="relative h-full w-full">
      <style>{`
        @keyframes axisSigBreathe { 0%,100% { opacity: 0.85 } 50% { opacity: 1 } }
        .axis-sig-glow-anim { animation: axisSigBreathe 3.6s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .axis-sig-glow-anim { animation: none; }
        }
      `}</style>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="h-full w-full"
        role="img"
        aria-label={`AXIS Signature — composite score ${Math.round(composite)} of 100`}
      >
        <defs>
          {/* Gradient that sweeps through all five pillar hues for the hull fill. */}
          <linearGradient id={gradFill} x1="0%" y1="0%" x2="100%" y2="100%">
            {hues.map((h, i) => (
              <stop
                key={i}
                offset={`${(i / Math.max(1, hues.length - 1)) * 100}%`}
                stopColor={`hsl(${h} 72% 55%)`}
                stopOpacity={0.22}
              />
            ))}
          </linearGradient>

          <filter id={filterGlow} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
          <filter id={filterGlowSoft} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
        </defs>

        {/* Concentric pentagonal range rings */}
        {ringStops.map((stop) => {
          const pts = data
            .map((_, i) => {
              const a = angleAt(i, n);
              const r = (stop / 100) * baseR;
              return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
            })
            .join(' ');
          return (
            <polygon
              key={stop}
              points={pts}
              fill="none"
              stroke="currentColor"
              strokeWidth={stop === 100 ? 1.1 : 0.6}
              strokeDasharray={stop === 100 ? '0' : '3 6'}
              opacity={stop === 100 ? 0.40 : 0.18}
              className="text-foreground"
            />
          );
        })}

        {/* Per-pillar semantic-coloured spokes */}
        {data.map((_, i) => {
          const a = angleAt(i, n);
          const ex = cx + baseR * Math.cos(a);
          const ey = cy + baseR * Math.sin(a);
          const hue = hues[i];
          return (
            <line
              key={`spoke-${i}`}
              x1={cx}
              y1={cy}
              x2={ex.toFixed(2)}
              y2={ey.toFixed(2)}
              stroke={pillarColor(hue, 0.35)}
              strokeWidth={1.1}
            />
          );
        })}

        {/* Atmospheric vertex glow halos (soft, broad) */}
        <g filter={`url(#${filterGlowSoft})`} className="axis-sig-glow-anim">
          {verts.map((v, i) => (
            <circle
              key={`halo-${i}`}
              cx={v.x.toFixed(2)}
              cy={v.y.toFixed(2)}
              r={28}
              fill={pillarColor(hues[i], 0.55)}
            />
          ))}
        </g>

        {/* Hull gradient fill */}
        <polygon points={hullPts} fill={`url(#${gradFill})`} stroke="none" />

        {/* Hull edges — each tinted with its leading vertex's hue */}
        {verts.map((v, i) => {
          const next = verts[(i + 1) % n];
          return (
            <line
              key={`edge-${i}`}
              x1={v.x.toFixed(2)}
              y1={v.y.toFixed(2)}
              x2={next.x.toFixed(2)}
              y2={next.y.toFixed(2)}
              stroke={pillarColor(hues[i], 0.95)}
              strokeWidth={2.2}
              strokeLinejoin="miter"
            />
          );
        })}

        {/* Tight crisp glow on hull edges (subtle bloom around the geometry) */}
        <g filter={`url(#${filterGlow})`} opacity={0.6}>
          {verts.map((v, i) => {
            const next = verts[(i + 1) % n];
            return (
              <line
                key={`edge-glow-${i}`}
                x1={v.x.toFixed(2)}
                y1={v.y.toFixed(2)}
                x2={next.x.toFixed(2)}
                y2={next.y.toFixed(2)}
                stroke={pillarColor(hues[i], 0.85)}
                strokeWidth={3}
              />
            );
          })}
        </g>

        {/* Diamond vertex markers — sharp facet on top of the soft halo */}
        {verts.map((v, i) => {
          const s = 7;
          const path = `M ${v.x.toFixed(2)} ${(v.y - s).toFixed(2)} L ${(v.x + s).toFixed(2)} ${v.y.toFixed(2)} L ${v.x.toFixed(2)} ${(v.y + s).toFixed(2)} L ${(v.x - s).toFixed(2)} ${v.y.toFixed(2)} Z`;
          return (
            <g key={`vtx-${i}`}>
              <path d={path} fill={pillarColor(hues[i])} />
              <path
                d={path}
                fill="none"
                stroke={pillarColor(hues[i], 0.4)}
                strokeWidth={1}
              />
            </g>
          );
        })}

        {/* Composite hero block — tier label, big number, /100 */}
        <text
          x={cx}
          y={cy - 64}
          textAnchor="middle"
          fontSize={11}
          fontWeight={700}
          className="fill-muted-foreground"
          style={{ letterSpacing: '0.32em' }}
        >
          AXIS INDEX
        </text>
        <text
          x={cx}
          y={cy + 22}
          textAnchor="middle"
          fontSize={108}
          fontWeight={800}
          className="fill-foreground tabular-nums"
          style={{ letterSpacing: '-0.05em' }}
        >
          {Math.round(composite)}
        </text>
        <text
          x={cx}
          y={cy + 50}
          textAnchor="middle"
          fontSize={11}
          fontWeight={600}
          className="fill-muted-foreground"
          style={{ letterSpacing: '0.28em' }}
        >
          {tier} · /100
        </text>

        {/* Pillar labels at vertices */}
        {data.map((d, i) => {
          const a = angleAt(i, n);
          const lr = baseR * 1.18;
          const lx = cx + lr * Math.cos(a);
          const ly = cy + lr * Math.sin(a);
          const score = Math.round(animatedScores[i] ?? 0);
          const anchor: 'start' | 'middle' | 'end' = lx < cx - 6 ? 'end' : lx > cx + 6 ? 'start' : 'middle';
          const isAbove = ly < cy - 4;
          const dyName = isAbove ? -10 : 10;
          const dyScore = isAbove ? -10 - 22 : 10 + 22;
          return (
            <g key={`lbl-${i}`}>
              <text
                x={lx}
                y={ly + dyName}
                textAnchor={anchor}
                fontSize={10}
                fontWeight={700}
                fill={pillarColor(hues[i])}
                style={{ letterSpacing: '0.20em', textTransform: 'uppercase' }}
              >
                {d.name}
              </text>
              <text
                x={lx}
                y={ly + dyScore}
                textAnchor={anchor}
                fontSize={22}
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
