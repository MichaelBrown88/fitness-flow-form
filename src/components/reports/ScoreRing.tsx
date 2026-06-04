import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Partial-arc score gauge — the AXIS Score™ visual. A 260° arc with the
 * bottom open, brand-accent fill scaled by score, large numeral inside.
 *
 * Inspired by the original `StartingPointSection` gauge; extracted so any
 * surface (hero, side cards, etc.) can drop in a consistent score visual.
 */

interface ScoreRingProps {
  score: number;
  /** Size in pixels (square). Default 180. */
  size?: number;
  /** Stroke width in viewbox units (0–100). Default 7. */
  strokeWidth?: number;
  /** Display label below the score. Default "AXIS Score™". */
  label?: string;
  className?: string;
}

const ARC_LENGTH = 190; // out of 264 (2π·42) ≈ 72% sweep, leaves ~100° bottom gap
const CIRCUMFERENCE = 264;
const ARC_ROTATION_DEG = 140;

export function ScoreRing({
  score,
  size = 180,
  strokeWidth = 7,
  label = 'AXIS Score™',
  className,
}: ScoreRingProps) {
  const pct = Math.max(0, Math.min(100, score));
  const dash = (pct / 100) * ARC_LENGTH;
  const compactNumerals = size <= 130;

  return (
    <div className={cn('inline-flex flex-col items-center', className)} style={{ width: size }}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="h-full w-full" viewBox="-4 -4 108 108" aria-hidden>
          {/* Track */}
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="transparent"
            className="stroke-border"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${ARC_LENGTH} ${CIRCUMFERENCE}`}
            transform={`rotate(${ARC_ROTATION_DEG} 50 50)`}
          />
          {/* Fill */}
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="transparent"
            stroke="hsl(var(--brand-accent))"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${CIRCUMFERENCE}`}
            transform={`rotate(${ARC_ROTATION_DEG} 50 50)`}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
          <span
            className={
              compactNumerals
                ? 'text-4xl font-bold tabular-nums tracking-[-0.02em] text-foreground sm:text-[2.65rem]'
                : 'text-5xl font-bold tabular-nums tracking-[-0.02em] text-foreground sm:text-6xl'
            }
          >
            {score || '—'}
          </span>
          <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            / 100
          </span>
        </div>
      </div>
      {label ? (
        <span className="mt-1 text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
          {label}
        </span>
      ) : null}
    </div>
  );
}
