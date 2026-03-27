import React from 'react';
import { Link } from 'react-router-dom';
import { CreditBalance } from '@/components/org/billing/CreditBalance';
import { useAuth } from '@/hooks/useAuth';
import { DASHBOARD_TASKS } from '@/constants/dashboardTasksCopy';
import { ROUTES } from '@/constants/routes';

interface DashboardHeaderProps {
  coachFirstName: string;
  totalClients: number;
  totalAssessments: number;
  overdueCount?: number;
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
}) => {
  const { orgSettings } = useAuth();
  const assessmentCredits = orgSettings?.assessmentCredits;

  return (
    <div className="mb-4 sm:mb-6">
      <div className="flex items-start justify-between gap-2">
        <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground">
          {getGreeting()}, {coachFirstName}.
        </h1>
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
              to={ROUTES.DASHBOARD_SCHEDULE}
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
