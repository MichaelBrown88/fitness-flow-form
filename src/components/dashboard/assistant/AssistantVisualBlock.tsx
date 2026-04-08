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

function StatCardsBlock({ visual }: { visual: Extract<AssistantChartVisual, { type: 'stat_cards' }> }) {
  return (
    <div className="space-y-2 pt-1">
      <p className="text-xs font-semibold text-foreground">{visual.title}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {visual.data.cards.map((c, i) => (
          <div
            key={`${c.label}-${i}`}
            className="rounded-lg border border-border/60 bg-card/80 px-3 py-2 shadow-sm dark:bg-card/40"
          >
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{c.label}</p>
            <p className="text-lg font-semibold tabular-nums text-foreground">{c.value}</p>
            <p className="text-[11px] text-muted-foreground leading-snug">{c.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function buildRechartsRows(
  labels: string[],
  datasets: Array<{ label: string; data: number[] }>,
): Record<string, string | number>[] {
  const rows: Record<string, string | number>[] = [];
  const len = labels.length;
  for (let i = 0; i < len; i += 1) {
    const row: Record<string, string | number> = { name: labels[i] };
    for (const ds of datasets) {
      row[ds.label] = ds.data[i] ?? 0;
    }
    rows.push(row);
  }
  return rows;
}

export function AssistantVisualBlock({
  visual,
  className,
}: {
  visual: AssistantChartVisual;
  className?: string;
}) {
  if (visual.type === 'data_table') {
    const { columns, rows } = visual.data;
    return (
      <div className={cn('rounded-lg border border-border/50 bg-background/60 p-3 dark:bg-background/20', className)}>
        <p className="text-xs font-semibold text-foreground">{visual.title}</p>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[280px] border-collapse text-left text-[11px]">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th
                    key={col}
                    scope="col"
                    className="whitespace-nowrap border-b border-border/60 px-2 py-2 font-bold uppercase tracking-wide text-muted-foreground"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className="border-b border-border/35 last:border-b-0">
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className={cn(
                        'max-w-[12rem] px-2 py-2 text-foreground',
                        typeof cell === 'number' && 'tabular-nums',
                        ci === 0 && 'font-medium',
                      )}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (visual.type === 'stat_cards') {
    return (
      <div className={cn('rounded-lg border border-border/50 bg-background/60 p-3 dark:bg-background/20', className)}>
        <StatCardsBlock visual={visual} />
      </div>
    );
  }

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

  const lineKeys = visual.data.datasets.map((d) => d.label);
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
