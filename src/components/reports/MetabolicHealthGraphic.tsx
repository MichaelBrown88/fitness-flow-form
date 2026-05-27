import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Anatomical heart + lungs silhouette, colour-coded by the cardio category
 * score. Same visual language as `MuscleMap` — neutral grey baseline,
 * accent colour highlights the active state.
 *
 * Inline SVG so it scales crisply and theme-tints via currentColor without
 * any additional dependency. Stylised, not medically detailed.
 */

interface MetabolicHealthGraphicProps {
  /** 0–100 cardio/metabolic fitness score. */
  score: number;
  /** Optional metric labels rendered below the graphic. */
  metrics?: Array<{ label: string; value: string }>;
  className?: string;
}

const BODY = 'hsl(220 13% 91%)'; // muted neutral, matches MuscleMap
const STROKE = 'hsl(220 13% 70%)';

function zoneColor(score: number): { fill: string; label: string } {
  if (score >= 80) return { fill: '#16a34a', label: 'Excellent' };
  if (score >= 65) return { fill: '#22c55e', label: 'Good' };
  if (score >= 45) return { fill: '#f59e0b', label: 'Fair' };
  if (score >= 25) return { fill: '#ef4444', label: 'Poor' };
  return { fill: '#b91c1c', label: 'Very poor' };
}

export function MetabolicHealthGraphic({ score, metrics, className }: MetabolicHealthGraphicProps) {
  const { fill, label } = zoneColor(score);

  return (
    <div className={cn('rounded-xl border border-border bg-card p-4', className)}>
      <p className="mb-3 text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
        Cardiovascular health
      </p>
      <div className="flex items-center gap-5">
        {/* SVG anatomical heart + lungs */}
        <svg
          viewBox="0 0 200 180"
          className="h-32 w-32 shrink-0"
          xmlns="http://www.w3.org/2000/svg"
          aria-label={`Cardiovascular fitness: ${label}`}
        >
          {/* Left lung */}
          <path
            d="M 60 30
               Q 30 40 25 75
               Q 22 110 35 145
               Q 50 160 75 155
               Q 82 130 82 95
               Q 82 65 78 38
               Q 70 30 60 30 Z"
            fill={BODY}
            stroke={STROKE}
            strokeWidth="1.5"
            opacity="0.85"
          />
          {/* Right lung (mirrored) */}
          <path
            d="M 140 30
               Q 170 40 175 75
               Q 178 110 165 145
               Q 150 160 125 155
               Q 118 130 118 95
               Q 118 65 122 38
               Q 130 30 140 30 Z"
            fill={BODY}
            stroke={STROKE}
            strokeWidth="1.5"
            opacity="0.85"
          />
          {/* Trachea / bronchi */}
          <path
            d="M 100 15 L 100 50 M 100 50 L 82 65 M 100 50 L 118 65"
            stroke={STROKE}
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          {/* Heart — sits centrally, tilted slightly left as in real anatomy */}
          <path
            d="M 100 70
               C 88 60, 70 60, 70 80
               C 70 95, 85 110, 100 125
               C 115 110, 130 95, 130 80
               C 130 60, 112 60, 100 70 Z"
            fill={fill}
            stroke={fill}
            strokeWidth="1.5"
            opacity="0.95"
          />
          {/* Heart pulse line subtle overlay */}
          <path
            d="M 75 92 L 88 92 L 92 82 L 100 105 L 108 82 L 112 92 L 125 92"
            stroke="white"
            strokeWidth="1.8"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.9"
          />
        </svg>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span
              className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
              style={{ backgroundColor: fill, color: 'white' }}
            >
              {label}
            </span>
            <span className="text-xs text-muted-foreground">cardiovascular fitness</span>
          </div>
          {metrics && metrics.length > 0 && (
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
              {metrics.map((m) => (
                <div key={m.label} className="min-w-0">
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {m.label}
                  </dt>
                  <dd className="text-sm font-semibold text-foreground tabular-nums">{m.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </div>
  );
}
