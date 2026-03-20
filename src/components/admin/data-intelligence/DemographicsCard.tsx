/**
 * Demographics Card
 *
 * Shows age distribution, gender split, and monthly assessment volume trend
 * derived from formData.dateOfBirth, formData.gender, and snapshot timestamps.
 */

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  LineChart, Line, CartesianGrid,
} from 'recharts';

const AGE_ORDER = ['18-29', '30-39', '40-49', '50-59', '60+'];
const GENDER_COLORS = ['#818cf8', '#f472b6', '#94a3b8'];
const GENDER_LABELS: Record<string, string> = { male: 'Male', female: 'Female', other: 'Other' };

interface Props {
  ageDistribution: Record<string, number>;
  genderDistribution: Record<string, number>;
  monthlyAssessmentVolume: Record<string, number>;
  monthlyAverageScores?: Record<string, number>;
  totalAssessments: number;
}

export function DemographicsCard({
  ageDistribution,
  genderDistribution,
  monthlyAssessmentVolume,
  monthlyAverageScores,
  totalAssessments,
}: Props) {
  const ageData = AGE_ORDER
    .filter(k => ageDistribution[k] !== undefined)
    .map(k => ({ age: k, count: ageDistribution[k] ?? 0 }));

  const genderData = Object.entries(genderDistribution)
    .sort((a, b) => b[1] - a[1])
    .map(([key, value]) => ({
      name: GENDER_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1),
      value,
    }));

  const sortedMonthlyEntries = Object.entries(monthlyAssessmentVolume)
    .sort(([a], [b]) => a.localeCompare(b));

  const formatMonthKey = (key: string) =>
    key.replace(/^(\d{4})-(\d{2})$/, (_, y, m) => {
      const d = new Date(Number(y), Number(m) - 1);
      return d.toLocaleString('default', { month: 'short', year: '2-digit' });
    });

  const monthlyData = sortedMonthlyEntries
    .slice(-12)
    .map(([month, count]) => ({
      month: formatMonthKey(month),
      count,
    }));

  // Monthly average score trend (last 12 months, aligned with volume data)
  const sortedScoreEntries = Object.entries(monthlyAverageScores ?? {})
    .sort(([a], [b]) => a.localeCompare(b));

  const scoreTrendData = sortedScoreEntries
    .slice(-12)
    .map(([month, avg]) => ({
      month: formatMonthKey(month),
      avg,
    }));

  const hasScoreTrend = scoreTrendData.length >= 2;

  // Derive month-on-month trend from the last two recorded months (consecutive or not)
  const lastTwo = sortedMonthlyEntries.slice(-2);
  const monthTrend: { delta: number; label: string } | null = (() => {
    if (lastTwo.length < 2) return null;
    const [, prevCount] = lastTwo[0];
    const [, lastCount] = lastTwo[1];
    const delta = lastCount - prevCount;
    const label = delta >= 0 ? `+${delta} vs prev month` : `${delta} vs prev month`;
    return { delta, label };
  })();

  const hasDemographics = ageData.length > 0 || genderData.length > 0;
  const hasMonthly = monthlyData.length > 0;
  const profiledCount = Object.values(ageDistribution).reduce((s, n) => s + n, 0);
  const coveragePct = totalAssessments > 0 ? Math.round((profiledCount / totalAssessments) * 100) : 0;

  return (
    <div className="bg-admin-card border border-admin-border rounded-xl p-5 space-y-6">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium text-admin-fg">Demographics</h3>
          <p className="text-xs text-admin-fg-muted mt-0.5">
            Age, gender, and monthly session volume
            {coveragePct < 100 && profiledCount > 0 && (
              <span className="ml-1 text-amber-500">· {coveragePct}% of sessions have DOB on file</span>
            )}
          </p>
        </div>
      </div>

      {/* Monthly trend */}
      {hasMonthly && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-admin-fg-muted uppercase tracking-wider">Monthly Sessions</p>
            {monthTrend && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                monthTrend.delta > 0
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : monthTrend.delta < 0
                    ? 'bg-red-500/10 text-red-400'
                    : 'bg-slate-500/10 text-slate-400'
              }`}>
                {monthTrend.label}
              </span>
            )}
          </div>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.4} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#e2e8f0' }}
                  itemStyle={{ color: '#818cf8' }}
                />
                <Line type="monotone" dataKey="count" stroke="#818cf8" strokeWidth={2} dot={{ r: 3, fill: '#818cf8' }} name="Sessions" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Monthly average score trend */}
      {hasScoreTrend && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-admin-fg-muted uppercase tracking-wider">Average Overall Score — Monthly Trend</p>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={scoreTrendData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.4} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#e2e8f0' }}
                  itemStyle={{ color: '#22c55e' }}
                  formatter={(val: number) => [`${val.toFixed(1)} pts`, 'Avg Score']}
                />
                <Line type="monotone" dataKey="avg" stroke="#22c55e" strokeWidth={2} dot={{ r: 3, fill: '#22c55e' }} name="Avg Score" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {hasDemographics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Age distribution */}
          {ageData.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-admin-fg-muted uppercase tracking-wider">Age Groups</p>
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ageData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                    <XAxis dataKey="age" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: '#e2e8f0' }}
                      cursor={{ fill: 'rgba(99,102,241,0.1)' }}
                    />
                    <Bar dataKey="count" fill="#818cf8" radius={[4, 4, 0, 0]} name="Sessions" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Gender split */}
          {genderData.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-admin-fg-muted uppercase tracking-wider">Gender Split</p>
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={genderData} cx="50%" cy="50%" innerRadius={32} outerRadius={52} dataKey="value" paddingAngle={3}>
                      {genderData.map((_, i) => (
                        <Cell key={i} fill={GENDER_COLORS[i % GENDER_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                      itemStyle={{ color: '#e2e8f0' }}
                    />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {!hasDemographics && !hasMonthly && (
        <p className="text-sm text-admin-fg-muted text-center py-4">
          Demographics will populate as assessments include date of birth and gender fields.
        </p>
      )}
    </div>
  );
}
