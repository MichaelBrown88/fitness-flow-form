import React from 'react';
import { Link } from 'react-router-dom';
import { CreditBalance } from '@/components/org/billing/CreditBalance';
import { useAuth } from '@/hooks/useAuth';
import { DASHBOARD_TASKS } from '@/constants/dashboardTasksCopy';
import { dashboardWorkPath } from '@/constants/routes';
import { WorkspaceGreetingMark } from '@/components/dashboard/WorkspaceGreetingMark';

interface DashboardHeaderProps {
  coachFirstName: string;
  totalClients: number;
  totalAssessments: number;
  overdueCount?: number;
  /** Compact strip for assistant / artifacts shell */
  variant?: 'default' | 'compact';
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  coachFirstName,
  totalClients,
  totalAssessments,
  overdueCount = 0,
  variant = 'default',
}) => {
  const { orgSettings } = useAuth();
  const assessmentCredits = orgSettings?.assessmentCredits;

  if (variant === 'compact') {
    return (
      <div className="shrink-0 border-b border-border/60 bg-background/95 px-3 py-2 sm:px-4 sm:py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="min-w-0 text-xs text-muted-foreground sm:text-sm">
            <span className="font-semibold text-foreground">{`${getGreeting()}, ${coachFirstName}.`}</span>
            <span className="text-border"> · </span>
            <span>
              {totalClients} {totalClients === 1 ? 'client' : 'clients'}
            </span>
            <span className="text-border"> · </span>
            <span>
              {totalAssessments} {totalAssessments === 1 ? 'assessment' : 'assessments'}
            </span>
            {overdueCount > 0 ? (
              <>
                <span className="text-border"> · </span>
                <Link
                  to={dashboardWorkPath('tasks')}
                  className="font-semibold text-score-amber-fg underline-offset-2 transition-colors hover:underline dark:text-amber-400"
                  title={DASHBOARD_TASKS.HEADER_PAST_CADENCE_LINK_TITLE}
                >
                  {DASHBOARD_TASKS.HEADER_PAST_CADENCE(overdueCount)}
                </Link>
              </>
            ) : null}
          </p>
          {assessmentCredits !== undefined ? (
            <CreditBalance credits={assessmentCredits} className="shrink-0 scale-90 sm:scale-100" />
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 sm:mb-6">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <WorkspaceGreetingMark className="h-9 w-9 sm:h-10 sm:w-10" />
          <h1 className="font-serif text-xl sm:text-2xl tracking-tight text-foreground min-w-0">
            {`${getGreeting()}, ${coachFirstName}.`}
          </h1>
        </div>
        {assessmentCredits !== undefined && (
          <CreditBalance credits={assessmentCredits} className="shrink-0" />
        )}
      </div>
      <p className="text-sm text-muted-foreground font-medium mt-0.5 flex items-center gap-1.5 flex-wrap">
        <span>{totalClients} {totalClients === 1 ? 'client' : 'clients'}</span>
        <span className="text-border">·</span>
        <span>{totalAssessments} {totalAssessments === 1 ? 'assessment' : 'assessments'}</span>
        {overdueCount > 0 && (
          <>
            <span className="text-border">·</span>
            <Link
              to={dashboardWorkPath('tasks')}
              className="font-semibold text-score-amber-fg underline-offset-2 transition-colors hover:underline dark:text-amber-400"
              title={DASHBOARD_TASKS.HEADER_PAST_CADENCE_LINK_TITLE}
            >
              {DASHBOARD_TASKS.HEADER_PAST_CADENCE(overdueCount)}
            </Link>
          </>
        )}
      </p>
    </div>
  );
};
