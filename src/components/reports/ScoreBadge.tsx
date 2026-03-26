import React from 'react';

type Trend = 'up' | 'down' | 'neutral';

interface ScoreBadgeProps {
  score: number;
  trend: Trend;
  size?: 'sm' | 'md';
}

const BG: Record<Trend, string> = {
  up: 'bg-emerald-100',
  down: 'bg-red-100',
  neutral: 'bg-muted',
};

const TEXT: Record<Trend, string> = {
  up: 'text-emerald-700',
  down: 'text-red-700',
  neutral: 'text-muted-foreground',
};

const SIZES = {
  sm: 'h-6 w-6 text-[10px]',
  md: 'h-10 w-10 text-sm',
} as const;

const ScoreBadge: React.FC<ScoreBadgeProps> = ({ score, trend, size = 'md' }) => (
  <div
    className={`inline-flex items-center justify-center rounded-full font-bold shrink-0 ${BG[trend]} ${TEXT[trend]} ${SIZES[size]}`}
  >
    {score}
  </div>
);

export default ScoreBadge;
