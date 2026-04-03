import React from 'react';
import { cn } from '@/lib/utils';
import { postureScoreTone } from '@/lib/posture/aggregatePostureInsights';

interface PostureScoreGaugeProps {
  score: number;
  className?: string;
}

export function PostureScoreGauge({ score, className }: PostureScoreGaugeProps) {
  const tone = postureScoreTone(score);
  const stroke =
    tone === 'green'
      ? 'text-score-green'
      : tone === 'amber'
        ? 'text-score-amber'
        : 'text-score-red';
  const pct = Math.min(100, Math.max(0, score));
  const r = 44;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;

  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      <div className="relative h-28 w-28">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100" aria-hidden>
          <circle cx="50" cy="50" r={r} className="fill-none stroke-border" strokeWidth="8" />
          <circle
            cx="50"
            cy="50"
            r={r}
            className={cn('fill-none', stroke)}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c}`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold tabular-nums text-foreground">{score}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">/ 100</span>
        </div>
      </div>
    </div>
  );
}
