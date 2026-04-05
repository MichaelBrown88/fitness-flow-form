import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ChevronRight } from 'lucide-react';
import type { ClientGroup } from '@/hooks/dashboard/types';
import type { CoachAssessmentSummary } from '@/services/coachAssessments';
import { UI_DASHBOARD_CLIENTS } from '@/constants/ui';
import { coachAssessmentReportPath } from '@/constants/routes';
import { scoreGrade, SCORE_COLORS } from '@/lib/scoring/scoreColor';
import { formatClientDisplayName } from '@/lib/utils/clientDisplayName';

const MAX_RECENT = 5;

function assessmentActivityMs(a: CoachAssessmentSummary): number {
  const u = a.updatedAt;
  const c = a.createdAt;
  const uMs = u && typeof u.toMillis === 'function' ? u.toMillis() : 0;
  const cMs = c && typeof c.toMillis === 'function' ? c.toMillis() : 0;
  return Math.max(uMs, cMs);
}

function assessmentDisplayDate(a: CoachAssessmentSummary): Date | null {
  const u = a.updatedAt;
  const c = a.createdAt;
  if (u && typeof u.toDate === 'function') return u.toDate();
  if (c && typeof c.toDate === 'function') return c.toDate();
  return null;
}

interface RecentRow {
  clientName: string;
  assessment: CoachAssessmentSummary;
}

interface RecentAssessmentsListProps {
  clients: ClientGroup[];
}

export function RecentAssessmentsList({ clients }: RecentAssessmentsListProps) {
  const rows = useMemo(() => {
    const list: RecentRow[] = [];
    for (const c of clients) {
      for (const a of c.assessments) {
        list.push({ clientName: c.name, assessment: a });
      }
    }
    list.sort((x, y) => assessmentActivityMs(y.assessment) - assessmentActivityMs(x.assessment));
    return list.slice(0, MAX_RECENT);
  }, [clients]);

  return (
    <section
      className="rounded-xl border border-border bg-card/60 p-4 shadow-sm dark:bg-card/40"
      aria-labelledby="recent-assessments-heading"
    >
      <div className="mb-3">
        <h2
          id="recent-assessments-heading"
          className="text-sm font-semibold tracking-tight text-foreground"
        >
          {UI_DASHBOARD_CLIENTS.RECENT_ASSESSMENTS_TITLE}
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{UI_DASHBOARD_CLIENTS.RECENT_ASSESSMENTS_SUB}</p>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{UI_DASHBOARD_CLIENTS.RECENT_ASSESSMENTS_EMPTY}</p>
      ) : (
        <ul className="divide-y divide-border/80">
          {rows.map(({ clientName, assessment }) => {
            const d = assessmentDisplayDate(assessment);
            const dateLabel = d ? format(d, 'd MMM yyyy') : '—';
            const grade = scoreGrade(assessment.overallScore);
            const href = coachAssessmentReportPath(assessment.id, {
              clientName: clientName,
            });

            return (
              <li key={`${assessment.id}-${clientName}`}>
                <Link
                  to={href}
                  aria-label={`${formatClientDisplayName(clientName)}, ${dateLabel}, ${UI_DASHBOARD_CLIENTS.RECENT_ASSESSMENTS_VIEW}`}
                  className="flex items-center gap-3 py-3 text-left transition-colors hover:bg-muted/50 -mx-1 px-1 rounded-lg"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {formatClientDisplayName(clientName)}
                    </p>
                    <p className="text-xs text-muted-foreground">{dateLabel}</p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center rounded-lg px-2 py-1 text-xs font-bold tabular-nums ${SCORE_COLORS[grade].badge}`}
                    aria-hidden
                  >
                    {assessment.overallScore || '—'}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
