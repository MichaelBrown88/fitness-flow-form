import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

interface LifestyleFactor {
  name: string;
  value: number; // 0-100
  fullLabel: string;
  tooltip: string;
}

interface LifestyleRadarChartProps {
  factors: LifestyleFactor[];
}

interface AxisTickProps {
  payload: { value: string };
  x: number;
  y: number;
  textAnchor: "start" | "middle" | "end" | "inherit";
  index: number;
}

const renderCustomAxisTick = ({ payload, x, y, textAnchor, index }: AxisTickProps) => {
  return (
    <g>
      <text
        x={x}
        y={y}
        dy={y < 150 ? -10 : y > 250 ? 15 : 0}
        dx={textAnchor === 'start' ? 10 : textAnchor === 'end' ? -10 : 0}
        textAnchor={textAnchor}
        fill="#0f766e" // teal-700
        fontSize="12px"
        fontWeight="600"
      >
        {payload.value}
      </text>
    </g>
  );
};

export default function LifestyleRadarChart({ factors }: LifestyleRadarChartProps) {
  const data = factors.map(f => ({
    factor: f.name,
    value: f.value,
    fullLabel: f.fullLabel,
    tooltip: f.tooltip,
  }));

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { factor: string; value: number; fullLabel: string; tooltip: string } }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg border bg-white p-3 shadow-lg">
          <p className="font-semibold text-slate-900">{data.fullLabel}</p>
          <p className="text-sm text-slate-600 mt-1">{data.tooltip}</p>
          <p className="text-xs text-slate-500 mt-2">Score: {data.value}/100</p>
        </div>
      );
    }
    return null;
  };

  // Use overall lifestyle average to control colour intensity
  const avgValue = data.length ? data.reduce((sum, d) => sum + d.value, 0) / data.length : 0;
  const normalized = Math.max(0, Math.min(1, avgValue / 100));
  const minOpacity = 0.2;
  const maxOpacity = 0.7;
  const dynamicOpacity = minOpacity + (maxOpacity - minOpacity) * normalized;
  const baseColor = '#0f766e'; // teal-700

  return (
    <div className="w-full" style={{ height: '400px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis
            dataKey="factor"
            tick={renderCustomAxisTick}
            tickLine={{ stroke: '#cbd5e1' }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: '#94a3b8', fontSize: 10 }}
            tickCount={5}
          />
          <Radar
            name="Lifestyle"
            dataKey="value"
            stroke={baseColor}
            fill={baseColor}
            fillOpacity={dynamicOpacity}
            strokeWidth={2}
          />
          <RechartsTooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

