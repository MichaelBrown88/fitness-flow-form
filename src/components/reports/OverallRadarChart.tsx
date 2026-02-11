import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

export interface RadarData {
  name: string;
  value: number;
  fullLabel: string;
  color: string;
}

interface OverallRadarChartProps {
  data: RadarData[];
  previousData?: RadarData[]; // Optional previous scores for comparison
  compact?: boolean; // Mobile: smaller radius, abbreviated labels
}

/** Shorten long pillar names for mobile */
const COMPACT_LABELS: Record<string, string> = {
  'Body Composition': 'Body Comp',
  'Functional Strength': 'Strength',
  'Metabolic Fitness': 'Cardio',
  'Movement Quality': 'Movement',
  'Lifestyle Factors': 'Lifestyle',
};

interface TooltipPayload {
  payload: RadarData;
  value: number;
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as RadarData;
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
        <p className="font-semibold text-slate-900">{data.fullLabel}</p>
        <p className="text-sm text-slate-600">Score: {data.value}/100</p>
      </div>
    );
  }
  return null;
};

interface AxisTickProps {
  payload: { value: string };
  x: number;
  y: number;
  textAnchor: "start" | "middle" | "end" | "inherit";
  index: number;
}

const renderCustomAxisTick = ({ 
  payload, 
  x, 
  y, 
  textAnchor, 
  index 
}: AxisTickProps) => {
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

export default function OverallRadarChart({ data, previousData, compact = false }: OverallRadarChartProps) {
  // Use average score to control fill opacity
  const avgValue = data.reduce((sum, d) => sum + d.value, 0) / data.length;
  const normalized = Math.max(0, Math.min(1, avgValue / 100));
  const minOpacity = 0.2;
  const maxOpacity = 0.6;
  const dynamicOpacity = minOpacity + (maxOpacity - minOpacity) * normalized;

  // Check if there are improvements or regressions
  const hasImprovements = previousData ? data.some(current => {
    const prev = previousData.find(p => p.name === current.name);
    return prev && current.value > prev.value;
  }) : false;
  
  const hasRegressions = previousData ? data.some(current => {
    const prev = previousData.find(p => p.name === current.name);
    return prev && current.value < prev.value;
  }) : false;

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius={compact ? '62%' : '75%'} data={data}>
          <PolarGrid stroke="#e4e4e7" strokeDasharray="3 3" />
          <PolarAngleAxis
            dataKey="name"
            tick={({ payload, x, y, textAnchor }: { payload: { value: string }; x: number; y: number; textAnchor: "start" | "middle" | "end" | "inherit" }) => {
              const raw = payload.value;
              const label = compact ? (COMPACT_LABELS[raw] ?? raw) : raw;
              const fontSize = compact ? 9 : (label.length > 12 ? 10 : 12);
              return (
                <text
                  x={x}
                  y={y}
                  dy={compact ? 3 : (label.length > 12 ? 8 : 4)}
                  textAnchor={textAnchor}
                  fill="#71717a"
                  fontSize={fontSize}
                  fontWeight={700}
                >
                  {label}
                </text>
              );
            }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 100]}
            tick={false}
            axisLine={false}
          />
          {/* Show previous scores in light gray if available - base layer */}
          {previousData && (
            <Radar
              name="Previous"
              dataKey={(entry: RadarData) => {
                const prev = previousData.find(p => p.name === entry.name);
                return prev ? prev.value : 0;
              }}
              stroke="#d4d4d8"
              strokeWidth={2}
              fill="#d4d4d8"
              fillOpacity={0.25}
              isAnimationActive={false}
            />
          )}
          {/* Show improvements in green - ONLY the NEW area (difference from previous to current) */}
          {/* Strategy: Show current.value for improved areas, previous.value for non-improved areas */}
          {/* The gray previous layer underneath makes the green visually appear as only the new area */}
          {hasImprovements && previousData && (
            <Radar
              name="Improvement"
              dataKey={(entry: RadarData) => {
                const prev = previousData.find(p => p.name === entry.name);
                if (!prev) return 0;
                // For improved areas: show current value (green fills 0 to current)
                // Since gray previous (0 to previous) is underneath, green appears as only the difference
                if (entry.value > prev.value) {
                  return entry.value;
                }
                // For non-improved areas: show previous value so green doesn't extend
                // This ensures green only appears where there's improvement
                return prev.value;
              }}
              stroke="#10b981"
              strokeWidth={2.5}
              fill="#10b981"
              fillOpacity={0.65}
              isAnimationActive={true}
            />
          )}
          {/* Current scores - main layer (shows full current values) */}
          <Radar
            name="Current"
            dataKey="value"
            stroke="#18181b"
            strokeWidth={3}
            fill="#18181b"
            fillOpacity={0.3}
          />
          {/* Show regressions in red overlay - the LOST area (shown on top to indicate what was lost) */}
          {hasRegressions && previousData && (
            <Radar
              name="Regression"
              dataKey={(entry: RadarData) => {
                const prev = previousData.find(p => p.name === entry.name);
                if (!prev) return 0;
                // For regressed areas: show previous value (red fills 0 to previous)
                // Since current black (0 to current) is underneath, red appears as the lost area
                if (entry.value < prev.value) {
                  return prev.value;
                }
                // For non-regressed areas: show current value so red doesn't extend
                return entry.value;
              }}
              stroke="#ef4444"
              strokeWidth={2.5}
              fill="#ef4444"
              fillOpacity={0.5}
              isAnimationActive={true}
            />
          )}
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
