import React from 'react';

interface DashboardHeaderProps {
  coachFirstName: string;
  totalClients: number;
  totalAssessments: number;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  coachFirstName,
  totalClients,
  totalAssessments,
}) => {
  return (
    <div className="mb-4 sm:mb-6">
      <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-slate-900">
        {coachFirstName}&apos;s Dashboard
      </h1>
      <p className="text-sm text-slate-400 font-medium mt-0.5">
        {totalClients} {totalClients === 1 ? 'client' : 'clients'} · {totalAssessments} {totalAssessments === 1 ? 'assessment' : 'assessments'}
      </p>
    </div>
  );
};
