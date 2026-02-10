/**
 * Schedule Insights Panel
 *
 * Compact stats for the Schedule tab:
 * - Traffic-light status counts (overdue / coming up / on track)
 * - Due Today, This Week, Completion rate
 */

import React, { useMemo } from 'react';
import {
  CalendarCheck,
  CalendarDays,
  TrendingUp,
} from 'lucide-react';
import { UI_SCHEDULE } from '@/constants/ui';
import { SCORE_COLORS } from '@/lib/scoring/scoreColor';
import type {
  ReassessmentItem,
  ReassessmentQueueSummary,
} from '@/hooks/useReassessmentQueue';

// ── Props ────────────────────────────────────────────────────────────

interface ScheduleInsightsProps {
  queue: ReassessmentItem[];
  summary: ReassessmentQueueSummary;
}

// ── Component ────────────────────────────────────────────────────────

export const ScheduleInsights: React.FC<ScheduleInsightsProps> = ({ queue, summary }) => {
  const insights = useMemo(() => {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    const endOfWeek = new Date();
    endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
    endOfWeek.setHours(23, 59, 59, 999);

    let dueToday = 0;
    let dueThisWeek = 0;

    for (const item of queue) {
      for (const ps of item.pillarSchedules) {
        if (ps.pillar === 'full') continue;

        if (ps.status === 'overdue' || (ps.dueDate.getTime() <= endOfToday.getTime() && ps.status === 'due-soon')) {
          dueToday++;
        }

        if (ps.dueDate.getTime() <= endOfWeek.getTime() || ps.status === 'overdue') {
          dueThisWeek++;
        }
      }
    }

    const completionRate = queue.length > 0
      ? Math.round((summary.upToDate / queue.length) * 100)
      : 100;

    return { dueToday, dueThisWeek, completionRate };
  }, [queue, summary.upToDate]);

  return (
    <div className="space-y-3">
      {/* Traffic-light status counts — neutral cards, colored text */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl p-3 bg-white border border-slate-200">
          <p className={`text-2xl font-bold ${SCORE_COLORS.red.text}`}>{summary.overdue}</p>
          <p className={`text-xs font-medium ${SCORE_COLORS.red.text}`}>{UI_SCHEDULE.OVERDUE}</p>
        </div>
        <div className="rounded-xl p-3 bg-white border border-slate-200">
          <p className={`text-2xl font-bold ${SCORE_COLORS.amber.text}`}>{summary.dueSoon}</p>
          <p className={`text-xs font-medium ${SCORE_COLORS.amber.text}`}>{UI_SCHEDULE.COMING_UP}</p>
        </div>
        <div className="rounded-xl p-3 bg-white border border-slate-200">
          <p className={`text-2xl font-bold ${SCORE_COLORS.green.text}`}>{summary.upToDate}</p>
          <p className={`text-xs font-medium ${SCORE_COLORS.green.text}`}>{UI_SCHEDULE.ON_TRACK}</p>
        </div>
      </div>

      {/* Timeline stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          icon={<CalendarCheck className="w-3.5 h-3.5 text-slate-400" />}
          label={UI_SCHEDULE.DUE_TODAY}
          value={insights.dueToday}
          sub="assessments"
        />
        <StatCard
          icon={<CalendarDays className="w-3.5 h-3.5 text-slate-400" />}
          label={UI_SCHEDULE.THIS_WEEK}
          value={insights.dueThisWeek}
          sub="assessments"
        />
        <StatCard
          icon={<TrendingUp className="w-3.5 h-3.5 text-slate-400" />}
          label={UI_SCHEDULE.ON_TRACK}
          value={`${insights.completionRate}%`}
          sub="clients on track"
        />
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
