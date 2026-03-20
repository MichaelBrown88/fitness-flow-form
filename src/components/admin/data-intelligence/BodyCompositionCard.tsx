/**
 * Body Composition Card
 *
 * Visualises InBody-sourced body composition distributions:
 *   - BMI bucket distribution (bar chart)
 *   - Body fat % bucket distribution (bar chart)
 *   - Visceral fat level bucket (bar chart)
 *
 * Only rendered when at least one distribution has data. Silently absent
 * until enough InBody assessments have been captured.
 */

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const BMI_ORDER   = ['<18.5', '18.5-25', '25-30', '30+'];
const BMI_COLORS: Record<string, string> = {
  '<18.5':   '#818cf8',
  '18.5-25': '#22c55e',
  '25-30':   '#eab308',
  '30+':     '#ef4444',
};

const BF_ORDER  = ['<15%', '15-20%', '20-25%', '25-30%', '30-35%', '35%+'];
const VF_ORDER  = ['1-4', '5-9', '10-14', '15+'];

const TOOLTIP_STYLE = {
  backgroundColor: '#1e293b',
  border: '1px solid #334155',
  borderRadius: 8,
  fontSize: 12,
};

interface BucketBarProps {
  data: { key: string; count: number; color?: string }[];
  height?: number;
}

function BucketBar({ data, height = 120 }: BucketBarProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
        <XAxis dataKey="key" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          labelStyle={{ color: '#e2e8f0' }}
          cursor={{ fill: 'rgba(99,102,241,0.08)' }}
        />
        <Bar dataKey="count" name="Clients" radius={[4, 4, 0, 0]}>
          {data.map(d => (
            <Cell key={d.key} fill={d.color ?? '#818cf8'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

interface Props {
  bmiDistribution?: Record<string, number>;
  bodyFatDistribution?: Record<string, number>;
  visceralFatDistribution?: Record<string, number>;
}

export function BodyCompositionCard({ bmiDistribution, bodyFatDistribution, visceralFatDistribution }: Props) {
  const bmiData = BMI_ORDER
    .filter(k => (bmiDistribution?.[k] ?? 0) > 0)
    .map(k => ({ key: k, count: bmiDistribution![k], color: BMI_COLORS[k] ?? '#818cf8' }));

  const bfData = BF_ORDER
    .filter(k => (bodyFatDistribution?.[k] ?? 0) > 0)
    .map(k => ({ key: k, count: bodyFatDistribution![k], color: '#f97316' }));

  const vfData = VF_ORDER
    .filter(k => (visceralFatDistribution?.[k] ?? 0) > 0)
    .map(k => ({ key: k, count: visceralFatDistribution![k], color: '#e879f9' }));

  const hasBmi = bmiData.length > 0;
  const hasBf  = bfData.length > 0;
  const hasVf  = vfData.length > 0;

  if (!hasBmi && !hasBf && !hasVf) return null;

  const totalBmi = bmiData.reduce((s, d) => s + d.count, 0);

  return (
    <div className="bg-admin-card/50 border border-admin-border rounded-2xl p-5 space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-admin-fg">Body Composition</h3>
        <p className="text-xs text-admin-fg-muted mt-0.5">InBody assessment data — {totalBmi} session{totalBmi !== 1 ? 's' : ''} with body composition metrics</p>
      </div>

      {hasBmi && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-admin-fg-muted uppercase tracking-wider">BMI Distribution</p>
          <BucketBar data={bmiData} />
          <div className="flex gap-4 flex-wrap mt-1">
            {bmiData.map(d => {
              const pct = totalBmi > 0 ? Math.round((d.count / totalBmi) * 100) : 0;
              return (
                <div key={d.key} className="flex items-center gap-1.5 text-xs text-admin-fg-muted">
                  <span className="h-2 w-2 rounded-full inline-block" style={{ backgroundColor: d.color }} />
                  {d.key}: {pct}%
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {hasBf && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-admin-fg-muted uppercase tracking-wider">Body Fat %</p>
            <BucketBar data={bfData} />
          </div>
        )}

        {hasVf && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-admin-fg-muted uppercase tracking-wider">Visceral Fat Level</p>
            <BucketBar data={vfData} />
          </div>
        )}
      </div>
    </div>
  );
}
