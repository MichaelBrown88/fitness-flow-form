/**
 * Goal Distribution + Training History Card
 *
 * Goal distribution: horizontal bar chart — handles many goals cleanly without
 * squashing labels in a donut. Goals sorted by count descending.
 *
 * Training history: donut chart — only 3 fixed values so it reads well.
 */

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { GoalChartEntry } from '@/types/analytics';

const GOAL_COLORS = ['#6366f1', '#22c55e', '#f97316', '#eab308', '#3b82f6', '#ec4899', '#14b8a6', '#a855f7'];

const TRAINING_COLORS: Record<string, string> = {
  beginner:     '#6366f1',
  intermediate: '#22c55e',
  advanced:     '#f97316',
};

const TRAINING_LABELS: Record<string, string> = {
  beginner:     'Beginner',
  intermediate: 'Intermediate',
  advanced:     'Advanced',
};

const TOOLTIP_STYLE = {
  backgroundColor: '#1e293b',
  border: '1px solid #334155',
  borderRadius: '8px',
  color: '#fff',
  fontSize: 12,
};

interface Props {
  goalData: GoalChartEntry[];
  trainingHistory: Record<string, number>;
}

export function GoalAndTrainingCard({ goalData, trainingHistory }: Props) {
  const trainingData = Object.entries(trainingHistory).map(([key, value]) => ({
    name: TRAINING_LABELS[key] ?? key,
    value,
  }));

  // Sort goals by count descending, limit to top 8 for readability
  const sortedGoals = [...goalData]
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const maxGoalCount = sortedGoals[0]?.value ?? 1;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Goal distribution — horizontal bar chart */}
      <div className="bg-admin-card/50 border border-admin-border rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-admin-fg mb-1">Goal Distribution</h3>
        <p className="text-xs text-admin-fg-muted mb-4">Client-reported primary goals (top {sortedGoals.length})</p>

        {sortedGoals.length === 0 ? (
          <p className="text-xs text-admin-fg-muted text-center py-10">No goal data yet</p>
        ) : (
          <div className="space-y-3">
            {sortedGoals.map((entry, i) => {
              const pct = maxGoalCount > 0 ? Math.round((entry.value / maxGoalCount) * 100) : 0;
              return (
                <div key={entry.name} className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 w-32 shrink-0 truncate" title={entry.name}>
                    {entry.name}
                  </span>
                  <div className="flex-1 bg-admin-bg rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: GOAL_COLORS[i % GOAL_COLORS.length] }}
                    />
                  </div>
                  <span className="text-xs text-slate-500 w-8 text-right shrink-0">{entry.value}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Training history — donut (3 values, works well as donut) */}
      <div className="bg-admin-card/50 border border-admin-border rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-admin-fg mb-1">Training History</h3>
        <p className="text-xs text-admin-fg-muted mb-3">Experience level distribution</p>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={trainingData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={78}
              dataKey="value"
              paddingAngle={2}
            >
              {trainingData.map(entry => (
                <Cell
                  key={entry.name}
                  fill={
                    TRAINING_COLORS[
                      Object.keys(TRAINING_LABELS).find(k => TRAINING_LABELS[k] === entry.name) ?? ''
                    ] ?? '#6366f1'
                  }
                />
              ))}
            </Pie>
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11, color: '#94a3b8' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
