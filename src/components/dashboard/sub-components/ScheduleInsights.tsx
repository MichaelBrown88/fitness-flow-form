/**
 * Schedule Insights Panel
 *
 * Rich stats dashboard for the Priority tab showing:
 * - Traffic-light status counts (overdue / due soon / up to date)
 * - Timeline breakdown (today / this week / completion rate / avg interval)
 * - Assessment demand bar chart (which pillar is needed most)
 */

import React, { useMemo } from 'react';
import {
  Scale,
  Camera,
  Activity,
  Dumbbell,
  Heart,
  FileText,
  CalendarCheck,
  CalendarDays,
  TrendingUp,
  Clock,
  BarChart3,
} from 'lucide-react';
import type {
  ReassessmentItem,
  ReassessmentType,
  ReassessmentQueueSummary,
} from '@/hooks/useReassessmentQueue';
import { pillarLabel } from '@/hooks/useReassessmentQueue';

// ── Constants ────────────────────────────────────────────────────────

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const ACTIONABLE_PILLARS: ReassessmentType[] = ['inbody', 'posture', 'fitness', 'strength', 'lifestyle'];

// ── Icon helper ──────────────────────────────────────────────────────

const getTypeIcon = (type: ReassessmentType) => {
  switch (type) {
    case 'inbody': return <Scale className="w-3 h-3" />;
    case 'posture': return <Camera className="w-3 h-3" />;
    case 'fitness': return <Activity className="w-3 h-3" />;
    case 'strength': return <Dumbbell className="w-3 h-3" />;
    case 'lifestyle': return <Heart className="w-3 h-3" />;
    case 'full': return <FileText className="w-3 h-3" />;
    default: return <FileText className="w-3 h-3" />;
  }
};

// ── Props ────────────────────────────────────────────────────────────

interface ScheduleInsightsProps {
  queue: ReassessmentItem[];
  summary: ReassessmentQueueSummary;
}

// ── Component ────────────────────────────────────────────────────────

export const ScheduleInsights: React.FC<ScheduleInsightsProps> = ({ queue, summary }) => {
  const insights = useMemo(() => {
    const now = Date.now();
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    const endOfWeek = new Date();
    endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
    endOfWeek.setHours(23, 59, 59, 999);

    let dueToday = 0;
    let dueThisWeek = 0;

    // Per-pillar demand: clients needing each pillar (overdue + due-soon)
    const pillarDemand: Record<string, number> = {};
    for (const p of ACTIONABLE_PILLARS) pillarDemand[p] = 0;

    let totalDays = 0;
    let clientsWithDays = 0;

    for (const item of queue) {
      if (item.daysSinceAssessment < 999) {
        totalDays += item.daysSinceAssessment;
        clientsWithDays++;
      }

      for (const ps of item.pillarSchedules) {
        if (ps.pillar === 'full') continue;

        if (ps.status === 'overdue' || ps.status === 'due-soon') {
          pillarDemand[ps.pillar] = (pillarDemand[ps.pillar] || 0) + 1;
        }

        // Due today: overdue pillars + pillars with due date today
        if (ps.status === 'overdue' || (ps.dueDate.getTime() <= endOfToday.getTime() && ps.status === 'due-soon')) {
          dueToday++;
        }

        // Due this week: anything due by end of week (including overdue)
        if (ps.dueDate.getTime() <= endOfWeek.getTime() || ps.status === 'overdue') {
          dueThisWeek++;
        }
      }
    }

    // Most demanded pillar
    const sortedDemand = Object.entries(pillarDemand).sort(([, a], [, b]) => b - a);
    const mostNeeded = sortedDemand[0];

    const avgDaysSince = clientsWithDays > 0 ? Math.round(totalDays / clientsWithDays) : 0;
    const completionRate = queue.length > 0
      ? Math.round((summary.upToDate / queue.length) * 100)
      : 100;

    return { dueToday, dueThisWeek, pillarDemand, mostNeeded, avgDaysSince, completionRate };
  }, [queue, summary.upToDate]);

  const maxDemand = Math.max(...Object.values(insights.pillarDemand), 1);

  return (
    <div className="space-y-3">
      {/* Row 1: Traffic-light status counts */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-red-50 rounded-xl p-3 border border-red-100">
          <p className="text-2xl font-bold text-red-700">{summary.overdue}</p>
          <p className="text-xs text-red-600 font-medium">Overdue</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
          <p className="text-2xl font-bold text-amber-700">{summary.dueSoon}</p>
          <p className="text-xs text-amber-600 font-medium">Due Soon</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
          <p className="text-2xl font-bold text-emerald-700">{summary.upToDate}</p>
          <p className="text-xs text-emerald-600 font-medium">Up to Date</p>
        </div>
      </div>

      {/* Row 2: Schedule timeline + performance */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={<CalendarCheck className="w-3.5 h-3.5 text-slate-400" />}
          label="Due Today"
          value={insights.dueToday}
          sub="assessments"
        />
        <StatCard
          icon={<CalendarDays className="w-3.5 h-3.5 text-slate-400" />}
          label="This Week"
          value={insights.dueThisWeek}
          sub="assessments"
        />
        <StatCard
          icon={<TrendingUp className="w-3.5 h-3.5 text-slate-400" />}
          label="Completion"
          value={`${insights.completionRate}%`}
          sub="clients on track"
        />
        <StatCard
          icon={<Clock className="w-3.5 h-3.5 text-slate-400" />}
          label="Avg Interval"
          value={`${insights.avgDaysSince}d`}
          sub="since last assessment"
        />
      </div>

      {/* Row 3: Pillar demand chart */}
      <div className="bg-white rounded-xl p-3 border border-slate-200">
        <div className="flex items-center gap-1.5 mb-2">
          <BarChart3 className="w-3.5 h-3.5 text-slate-400" />
          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">
            Assessment Demand
          </p>
        </div>
        <div className="space-y-1.5">
          {ACTIONABLE_PILLARS.map(pillar => {
            const count = insights.pillarDemand[pillar] || 0;
            const pct = Math.round((count / maxDemand) * 100);
            const isTop = insights.mostNeeded?.[0] === pillar && count > 0;

            return (
              <div key={pillar} className="flex items-center gap-2">
                <div className="w-16 flex items-center gap-1 shrink-0">
                  {getTypeIcon(pillar)}
                  <span className="text-[10px] font-medium text-slate-600">
                    {pillarLabel(pillar)}
                  </span>
                </div>
                <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isTop ? 'bg-red-400' : count > 0 ? 'bg-amber-300' : 'bg-emerald-200'
                    }`}
                    style={{ width: `${count > 0 ? Math.max(pct, 8) : 0}%` }}
                  />
                </div>
                <span className={`text-xs font-bold w-6 text-right ${
                  isTop ? 'text-red-600' : count > 0 ? 'text-amber-600' : 'text-emerald-600'
                }`}>
                  {count}
                </span>
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-slate-400 mt-2">
          Clients needing each assessment (overdue + due soon)
        </p>
      </div>
    </div>
  );
};

// ── Stat Card Sub-component ──────────────────────────────────────────

const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub: string;
}> = ({ icon, label, value, sub }) => (
  <div className="bg-white rounded-xl p-3 border border-slate-200">
    <div className="flex items-center gap-1.5 mb-1">
      {icon}
      <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">{label}</p>
    </div>
    <p className="text-xl font-bold text-slate-900">{value}</p>
    <p className="text-[10px] text-slate-400">{sub}</p>
  </div>
);
