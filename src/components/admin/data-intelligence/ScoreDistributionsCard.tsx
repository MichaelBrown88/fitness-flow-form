/**
 * Score Distributions Card
 *
 * Renders a small bar chart for each of the 6 scoring pillars
 * (overall + 5 categories) showing count per 20-point bucket.
 */

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { PillarDistributionChartData } from '@/types/analytics';

const BUCKET_COLORS: Record<string, string> = {
  '0-20': '#ef4444',
  '20-40': '#f97316',
  '40-60': '#eab308',
  '60-80': '#22c55e',
  '80-100': '#6366f1',
};

const TOOLTIP_STYLE = {
  backgroundColor: '#1e293b',
  border: '1px solid #334155',
  borderRadius: '8px',
  color: '#fff',
  fontSize: 12,
};

function PillarChart({ pillar }: { pillar: PillarDistributionChartData }) {
  const total = pillar.buckets.reduce((s, b) => s + b.count, 0);
  return (
    <div className="bg-admin-bg/40 rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-admin-fg-muted font-medium">{pillar.label}</span>
        <span className="text-xs text-slate-500">{total} {total === 1 ? 'client' : 'clients'}</span>
      </div>
      <ResponsiveContainer width="100%" height={80}>
        <BarChart data={pillar.buckets} barSize={18} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
          <XAxis
            dataKey="range"
            tick={{ fontSize: 9, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis hide />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
            formatter={(value: number, _: unknown, props: { payload?: { pct?: number } }) => [
              `${value} (${props.payload?.pct ?? 0}%)`,
              'Clients',
            ]}
          />
          <Bar dataKey="count" radius={[3, 3, 0, 0]}>
            {pillar.buckets.map(bucket => (
              <Cell key={bucket.range} fill={BUCKET_COLORS[bucket.range] ?? '#6366f1'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface Props {
  distributions: PillarDistributionChartData[];
}

export function ScoreDistributionsCard({ distributions }: Props) {
  return (
    <div className="bg-admin-card/50 border border-admin-border rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-admin-fg mb-1">Score Distributions</h3>
      <p className="text-xs text-admin-fg-muted mb-4">
        Population spread across five fitness pillars
      </p>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {distributions.map(d => (
          <PillarChart key={d.pillar} pillar={d} />
        ))}
      </div>
      <div className="flex items-center gap-3 mt-4 flex-wrap">
        {Object.entries(BUCKET_COLORS).map(([range, color]) => (
          <span key={range} className="flex items-center gap-1 text-xs text-slate-400">
            <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: color }} />
            {range}
          </span>
        ))}
      </div>
    </div>
  );
}
