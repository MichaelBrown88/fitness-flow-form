/**
 * Clinical Patterns Card
 *
 * Horizontal bar chart showing the prevalence (% of population)
 * of each synthesis-generated clinical pattern.
 */

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import type { PatternChartEntry } from '@/types/analytics';

const TOOLTIP_STYLE = {
  backgroundColor: '#1e293b',
  border: '1px solid #334155',
  borderRadius: '8px',
  color: '#fff',
  fontSize: 12,
};

function barColor(pct: number): string {
  if (pct >= 40) return '#ef4444';
  if (pct >= 20) return '#f97316';
  if (pct >= 10) return '#eab308';
  return '#6366f1';
}

interface Props {
  patterns: PatternChartEntry[];
  totalClients: number;
}

export function ClinicalPatternsCard({ patterns, totalClients }: Props) {
  if (patterns.length === 0) {
    return (
      <div className="bg-admin-card/50 border border-admin-border rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-admin-fg mb-1">Clinical Pattern Prevalence</h3>
        <p className="text-xs text-muted-foreground mt-6 text-center py-8">
          No synthesis patterns detected yet.
        </p>
      </div>
    );
  }

  const chartData = patterns.slice(0, 10);
  const chartHeight = Math.max(220, chartData.length * 36 + 40);

  return (
    <div className="bg-admin-card/50 border border-admin-border rounded-2xl p-5">
      <div className="flex items-start justify-between mb-1">
        <h3 className="text-sm font-semibold text-admin-fg">Clinical Pattern Prevalence</h3>
        <span className="text-xs text-muted-foreground">n = {totalClients}</span>
      </div>
      <p className="text-xs text-admin-fg-muted mb-4">
        % of assessed clients triggering each finding
      </p>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 0, right: 48, left: 0, bottom: 0 }}
          barSize={16}
        >
          <XAxis
            type="number"
            domain={[0, 100]}
            tickFormatter={(v: number) => `${v}%`}
            tick={{ fontSize: 10, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            dataKey="pattern"
            type="category"
            width={140}
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            formatter={(value: number, _: unknown, props: { payload?: PatternChartEntry }) => [
              `${props.payload?.count ?? 0} clients (${value}%)`,
              'Prevalence',
            ]}
          />
          <Bar dataKey="pct" radius={[0, 4, 4, 0]}>
            <LabelList
              dataKey="pct"
              position="right"
              formatter={(v: number) => `${v}%`}
              style={{ fontSize: 10, fill: '#94a3b8' }}
            />
            {chartData.map(entry => (
              <Cell key={entry.pattern} fill={barColor(entry.pct)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
