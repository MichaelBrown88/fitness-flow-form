/**
 * AssistantCharts
 *
 * Recharts-based chart renderers, kept in a separate chunk so the ~100KB
 * recharts library is only loaded when the assistant actually renders a chart.
 * Imported via React.lazy() from AssistantVisualBlock.
 */

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CHART_HEX } from '@/lib/design/chartColors';
import type { AssistantChartVisual } from '@/types/coachAssistant';
import { cn } from '@/lib/utils';

function buildRechartsRows(
  labels: string[],
  datasets: Array<{ label: string; data: number[] }>,
): Record<string, string | number>[] {
  return labels.map((name, i) => {
    const row: Record<string, string | number> = { name };
    for (const ds of datasets) row[ds.label] = ds.data[i] ?? 0;
    return row;
  });
}

export default function AssistantCharts({
  visual,
  className,
}: {
  visual: Extract<AssistantChartVisual, { type: 'radar_chart' | 'bar_chart' | 'line_chart' }>;
  className?: string;
}) {
  const { labels, datasets } = visual.data;
  const rows = buildRechartsRows(labels, datasets);
  const h = 220;

  if (visual.type === 'radar_chart') {
    const single = datasets[0];
    const radarData = labels.map((name, i) => ({
      name,
      value: single?.data[i] ?? 0,
      fullLabel: name,
    }));
    return (
      <div className={cn('rounded-lg border border-border/50 bg-background/60 p-2 dark:bg-background/20', className)}>
        <p className="mb-1 px-1 text-xs font-semibold text-foreground">{visual.title}</p>
        <div style={{ width: '100%', height: h }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
              <PolarGrid stroke={CHART_HEX.gridLight} strokeDasharray="3 3" />
              <PolarAngleAxis dataKey="name" tick={{ fontSize: 10, fill: CHART_HEX.tickMuted }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
              <Radar
                name={single?.label ?? 'Score'}
                dataKey="value"
                stroke={CHART_HEX.scoreAmber}
                fill={CHART_HEX.scoreAmber}
                fillOpacity={0.35}
              />
              <Tooltip
                formatter={(v: number) => [`${v}`, 'Score']}
                labelFormatter={(_, p) => (p?.[0]?.payload as { fullLabel?: string })?.fullLabel ?? ''}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  if (visual.type === 'bar_chart') {
    const keys = datasets.map((d) => d.label);
    return (
      <div className={cn('rounded-lg border border-border/50 bg-background/60 p-2 dark:bg-background/20', className)}>
        <p className="mb-1 px-1 text-xs font-semibold text-foreground">{visual.title}</p>
        <div style={{ width: '100%', height: h }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_HEX.gridLight} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} width={32} />
              <Tooltip />
              {keys.map((k, i) => (
                <Bar
                  key={k}
                  dataKey={k}
                  fill={[CHART_HEX.scoreGreen, CHART_HEX.indigo, CHART_HEX.sky][i % 3]}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  const lineKeys = datasets.map((d) => d.label);
  return (
    <div className={cn('rounded-lg border border-border/50 bg-background/60 p-2 dark:bg-background/20', className)}>
      <p className="mb-1 px-1 text-xs font-semibold text-foreground">{visual.title}</p>
      <div style={{ width: '100%', height: h }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_HEX.gridLight} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis domain={[0, 'auto']} tick={{ fontSize: 10 }} width={32} />
            <Tooltip />
            {lineKeys.map((k, i) => (
              <Line
                key={k}
                type="monotone"
                dataKey={k}
                stroke={[CHART_HEX.scoreAmber, CHART_HEX.indigo][i % 2]}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
