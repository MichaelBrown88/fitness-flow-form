/**
 * Schedule Insights — Inline Summary
 *
 * Minimal summary line for the schedule tab.
 * Replaced the old multi-card layout with a single text line.
 */

import React from 'react';
import { SCORE_COLORS } from '@/lib/scoring/scoreColor';
import type { ReassessmentQueueSummary } from '@/hooks/useReassessmentQueue';

interface ScheduleInsightsProps {
  summary: ReassessmentQueueSummary;
}

export const ScheduleInsights: React.FC<ScheduleInsightsProps> = ({ summary }) => (
  <p className="text-sm text-slate-500 flex items-center gap-2 flex-wrap">
    {summary.overdue > 0 && (
      <span className={`font-semibold ${SCORE_COLORS.red.text}`}>{summary.overdue} overdue</span>
    )}
    {summary.overdue > 0 && summary.dueSoon > 0 && <span className="text-slate-300">·</span>}
    {summary.dueSoon > 0 && (
      <span className={`font-semibold ${SCORE_COLORS.amber.text}`}>{summary.dueSoon} due soon</span>
    )}
    {(summary.overdue > 0 || summary.dueSoon > 0) && summary.upToDate > 0 && <span className="text-slate-300">·</span>}
    {summary.upToDate > 0 && (
      <span className={`font-semibold ${SCORE_COLORS.green.text}`}>{summary.upToDate} on track</span>
    )}
  </p>
);
