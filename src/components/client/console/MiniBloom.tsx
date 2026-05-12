import React, { useId } from 'react';
import {
  petalDimsFor,
  petalPathFromVerts,
  petalVerts,
  pillarColor,
  pillarHueAt,
  wiltFor,
} from '@/components/reports/OverallRadarChart';
import { cn } from '@/lib/utils';

interface MiniBloomProps {
  /**
   * Scores in canonical pillar order:
   * [Body, Strength, Cardio, Movement, Lifestyle]. Same order as the
   * radar chart's data array.
   */
  scores: number[];
  /** Box edge in px. */
  size?: number;
  /**
   * "outline" renders only stroked petals — used for the GOAL slot in the
   * Journey strip so it reads as a target, not a current state. "filled"
   * is the default — a tinted interior on top of the wilt-aware petal.
   */
  variant?: 'filled' | 'outline';
  className?: string;
}

const PILLAR_FULL: string[] = [
  'Body Composition',
  'Functional Strength',
  'Metabolic Fitness',
  'Movement Quality',
  'Lifestyle Factors',
];

function petalAngle(i: number, n: number): number {
  return -Math.PI / 2 + (i * 2 * Math.PI) / n;
}

/**
 * Lightweight AXIS bloom for the Journey strip. Same petal geometry as
 * the hero bloom (wilt-aware, fatness=0.42) but smaller, no labels,
 * no dots, no animation — just the shape language so coaches see
 * where the client started, where they are, and where they're going.
 */
export const MiniBloom: React.FC<MiniBloomProps> = ({
  scores,
  size = 96,
  variant = 'filled',
  className,
}) => {
  const filterId = useId().replace(/:/g, '');
  const cx = size / 2;
  const cy = size / 2;
  const baseR = size / 2 - 6;
  const fatness = 0.42;
  const n = scores.length;

  const petals = scores.map((s, i) => {
    const angle = petalAngle(i, n);
    const ux = Math.cos(angle);
    const uy = Math.sin(angle);
    const wilt = wiltFor(s);
    const dims = petalDimsFor(s, baseR, 1.0, fatness);
    const verts = petalVerts(cx, cy, ux, uy, dims.length, dims.halfWidth, wilt, i + 1);
    const d = petalPathFromVerts(verts, wilt);
    const hue = pillarHueAt(PILLAR_FULL[i] ?? 'Body Composition', PILLAR_FULL[i] ?? 'Body Composition', i);
    return { d, hue };
  });

  const showFill = variant === 'filled';

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn('block', className)}
      aria-hidden
    >
      <defs>
        <filter id={`mini-bloom-glow-${filterId}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={2.5} />
        </filter>
      </defs>

      {/* Soft halo behind petals — only when filled */}
      {showFill ? (
        <g filter={`url(#mini-bloom-glow-${filterId})`} opacity={0.55}>
          {petals.map((p, i) => (
            <path
              key={`glow-${i}`}
              d={p.d}
              fill="none"
              stroke={pillarColor(p.hue)}
              strokeWidth={3}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}
        </g>
      ) : null}

      {/* Crisp petals */}
      {petals.map((p, i) => (
        <path
          key={`petal-${i}`}
          d={p.d}
          fill={showFill ? pillarColor(p.hue, 0.18) : 'none'}
          stroke={pillarColor(p.hue)}
          strokeWidth={showFill ? 1.6 : 1.4}
          strokeDasharray={variant === 'outline' ? '3 3' : undefined}
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity={variant === 'outline' ? 0.85 : 1}
        />
      ))}

      {/* Centre AXIS diamond (small) */}
      <path
        d={`M ${cx} ${cy - 3} L ${cx + 3} ${cy} L ${cx} ${cy + 3} L ${cx - 3} ${cy} Z`}
        fill="hsl(var(--foreground))"
        opacity={0.85}
      />
    </svg>
  );
};
