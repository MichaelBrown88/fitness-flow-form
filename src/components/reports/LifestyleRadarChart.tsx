import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { CHART_HEX, LIFESTYLE_RADAR_FILL } from '@/lib/design/chartColors';

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
        fill={LIFESTYLE_RADAR_FILL}
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
        <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
          <p className="font-semibold text-foreground">{data.fullLabel}</p>
          <p className="mt-1 text-sm text-muted-foreground">{data.tooltip}</p>
          <p className="mt-2 text-xs text-muted-foreground">Score: {data.value}/100</p>
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
  const baseColor = LIFESTYLE_RADAR_FILL;

  return (
    <div className="w-full" style={{ height: '400px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data}>
          <PolarGrid stroke={CHART_HEX.gridLightAlt} />
          <PolarAngleAxis
            dataKey="factor"
            tick={renderCustomAxisTick}
            tickLine={{ stroke: CHART_HEX.gridLight }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: CHART_HEX.tickMuted, fontSize: 10 }}
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

