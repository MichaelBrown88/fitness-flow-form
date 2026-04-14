import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { CHART_HEX, CHART_PILLAR_COLOR_ORDER } from '@/lib/design/chartColors';

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
      <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
        <p className="font-semibold text-foreground">{data.fullLabel}</p>
        <p className="text-sm text-muted-foreground">Pillar score: {data.value}/100</p>
      </div>
    );
  }
  return null;
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
          <PolarGrid stroke={CHART_HEX.gridLight} strokeDasharray="3 3" />
          <PolarAngleAxis
            dataKey="name"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            tick={(({
              payload,
              x,
              y,
              textAnchor,
              index,
            }: {
              payload: { value: string };
              x: number;
              y: number;
              textAnchor: 'start' | 'middle' | 'end' | 'inherit';
              index: number;
            }) => {
              const raw = payload.value;
              const label = compact ? (COMPACT_LABELS[raw] ?? raw) : raw;
              const fontSize = compact ? 9 : label.length > 12 ? 10 : 12;
              const fill =
                CHART_PILLAR_COLOR_ORDER[index % CHART_PILLAR_COLOR_ORDER.length];
              return (
                <text
                  x={x}
                  y={y}
                  dy={compact ? 3 : label.length > 12 ? 8 : 4}
                  textAnchor={textAnchor}
                  fill={fill}
                  fontSize={fontSize}
                  fontWeight={700}
                >
                  {label}
                </text>
              );
            }) as any}
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
              stroke={CHART_HEX.neutralStroke}
              strokeWidth={2}
              fill={CHART_HEX.neutralStroke}
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
              stroke={CHART_HEX.scoreGreen}
              strokeWidth={2.5}
              fill={CHART_HEX.scoreGreen}
              fillOpacity={0.65}
              isAnimationActive={true}
            />
          )}
          {/* Current scores - main layer (shows full current values) */}
          <Radar
            name="Current"
            dataKey="value"
            stroke={CHART_HEX.neutralDark}
            strokeWidth={3}
            fill={CHART_HEX.neutralDark}
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
              stroke={CHART_HEX.scoreRed}
              strokeWidth={2.5}
              fill={CHART_HEX.scoreRed}
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
