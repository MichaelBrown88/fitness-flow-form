import React from 'react';

type Props = {
  value: number; // 0-100
  size?: number; // px
  stroke?: number; // px
  trackColor?: string;
  progressColor?: string;
  label?: React.ReactNode;
};

const RingProgress: React.FC<Props> = ({
  value,
  size = 120,
  stroke = 10,
  trackColor = 'hsl(var(--muted))',
  progressColor = 'hsl(var(--primary))',
  label,
}) => {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div style={{ width: size, height: size }} className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={stroke}
          fill="transparent"
          strokeLinecap="round"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={progressColor}
          strokeWidth={stroke}
          fill="transparent"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 400ms ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold leading-none text-foreground">{Math.round(clamped)}</div>
          {label ? <div className="text-xs text-muted-foreground mt-1">{label}</div> : null}
        </div>
      </div>
    </div>
  );
};

export default RingProgress;


