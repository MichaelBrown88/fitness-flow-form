import React from 'react';

type Trend = 'up' | 'down' | 'neutral';

interface MiniScoreRingProps {
  score: number;
  trend: Trend;
  size?: number;
}

const STROKE_COLORS: Record<Trend, string> = {
  up: 'hsl(var(--score-green-fg))',
  down: 'hsl(var(--score-red-fg))',
  neutral: '#cbd5e1', // slate-300
};

const TEXT_COLORS: Record<Trend, string> = {
  up: 'text-score-green-fg',
  down: 'text-score-red-fg',
  neutral: 'text-slate-700',
};

const MiniScoreRing: React.FC<MiniScoreRingProps> = ({ score, trend, size = 48 }) => {
  const strokeWidth = size <= 24 ? 3 : 4;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(score / 100, 0), 1) * circumference;
  const center = size / 2;
  const isSmall = size <= 24;

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="transparent"
          stroke="#f1f5f9"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="transparent"
          stroke={STROKE_COLORS[trend]}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference}`}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </svg>
      <span className={`absolute font-bold leading-none ${TEXT_COLORS[trend]} ${isSmall ? 'text-[8px]' : 'text-xs'}`}>
        {score}
      </span>
    </div>
  );
};

export default MiniScoreRing;
