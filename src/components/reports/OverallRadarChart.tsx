import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

interface OverallRadarChartProps {
  data: {
    name: string;
    value: number;
    fullLabel: string;
    color: string;
  }[];
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
        <p className="font-semibold text-slate-900">{data.fullLabel}</p>
        <p className="text-sm text-slate-600">Score: {data.value}/100</p>
      </div>
    );
  }
  return null;
};

const renderCustomAxisTick = ({ payload, x, y, textAnchor, index }: any) => {
  // Try to find the color from the data if available
  const colors = ['#10b981', '#6366f1', '#0ea5e9', '#f59e0b', '#a855f7'];
  const color = colors[index % colors.length];

  return (
    <g>
      <text
        x={x}
        y={y}
        dy={y < 150 ? -10 : y > 200 ? 15 : 0}
        dx={textAnchor === 'start' ? 10 : textAnchor === 'end' ? -10 : 0}
        textAnchor={textAnchor}
        fill={color}
        fontSize="11px"
        fontWeight="700"
      >
        {payload.value}
      </text>
    </g>
  );
};

export default function OverallRadarChart({ data }: OverallRadarChartProps) {
  // Use average score to control fill opacity
  const avgValue = data.length > 0 ? data.reduce((sum, d) => sum + d.value, 0) / data.length : 0;
  const normalized = Math.max(0, Math.min(1, avgValue / 100));
  const minOpacity = 0.2;
  const maxOpacity = 0.6;
  const dynamicOpacity = isNaN(normalized) ? minOpacity : minOpacity + (maxOpacity - minOpacity) * normalized;

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis
            dataKey="name"
            tick={renderCustomAxisTick}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={false}
            axisLine={false}
          />
          <Radar
            name="Overall"
            dataKey="value"
            stroke="#1e293b" // slate-800
            strokeWidth={2}
            fill="#334155" // slate-700
            fillOpacity={dynamicOpacity}
          />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
