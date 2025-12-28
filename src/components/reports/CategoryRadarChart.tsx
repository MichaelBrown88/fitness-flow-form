import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Radar, Tooltip } from 'recharts';
import type { ScoreDetail } from '@/lib/scoring';

interface CategoryRadarChartProps {
  details: ScoreDetail[];
  categoryName: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: { name: string; value: number; fullLabel: string };
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (active && payload && payload.length > 0) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
        <p className="font-semibold text-slate-900">{data.name}</p>
        <p className="text-sm text-slate-600">Score: {data.value}/100</p>
      </div>
    );
  }
  return null;
}

function renderCustomAxisTick({ payload, x, y, textAnchor, index, color }: any) {
  return (
    <g>
      <text
        x={x}
        y={y}
        dy={y < 150 ? -10 : y > 250 ? 15 : 0}
        dx={textAnchor === 'start' ? 10 : textAnchor === 'end' ? -10 : 0}
        textAnchor={textAnchor}
        fill={color || "#475569"}
        fontSize="11px"
        fontWeight="600"
      >
        {payload.value}
      </text>
    </g>
  );
}

export default function CategoryRadarChart({ details, categoryName }: CategoryRadarChartProps) {
  // Map each category tab to a distinct base colour
const CATEGORY_COLORS: Record<string, string> = {
  'Body Composition': '#10b981',        // emerald-500
  'Muscular Strength': '#6366f1',    // indigo-500
  'Metabolic Fitness': '#0ea5e9',          // sky-500
  'Movement Quality': '#f59e0b',        // amber-500
  'Lifestyle Factors': '#a855f7',               // purple-500
};
  const baseColor = CATEGORY_COLORS[categoryName] ?? '#3b82f6';

  const CustomTick = (props: any) => renderCustomAxisTick({ ...props, color: baseColor });
  
  // Filter out details with no score or invalid values
  // For Movement Quality, we want to show all 3 main points even if score is 0
  const validDetails = categoryName === 'Movement Quality' 
    ? details 
    : details.filter(d => d.score > 0 && d.value !== '-' && d.value !== '');
  
  if (validDetails.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
        <p className="text-sm text-slate-500">No data available for {categoryName}</p>
      </div>
    );
  }
  
  // Prepare data for radar chart
  const radarData = validDetails
    .map(d => ({
      name: d.label,
      fullLabel: d.label,
      value: Math.min(100, Math.max(0, d.score)),
    }))
    .slice(0, 8); 
  
  // Ensure we have at least 3 points for a meaningful radar chart
  // Movement Quality always has 3 points now
  if (radarData.length < 3) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
        <p className="text-sm text-slate-500">Insufficient data for radar chart</p>
      </div>
    );
  }
  
  // Use average score for the category to control colour intensity
  const avgValue = radarData.reduce((sum, d) => sum + d.value, 0) / radarData.length;
  const normalized = Math.max(0, Math.min(1, avgValue / 100));
  const minOpacity = 0.2;
  const maxOpacity = 0.7;
  const dynamicOpacity = minOpacity + (maxOpacity - minOpacity) * normalized;
  
  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={radarData}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis
            dataKey="name"
            tick={<CustomTick />}
            tickLine={false}
            className="text-xs"
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: '#94a3b8', fontSize: 10 }}
            tickCount={5}
          />
          <Radar
            name={categoryName}
            dataKey="value"
            stroke={baseColor}
            fill={baseColor}
            fillOpacity={dynamicOpacity}
            strokeWidth={2}
          />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

