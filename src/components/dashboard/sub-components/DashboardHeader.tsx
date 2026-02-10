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
    <div className="mb-6 md:mb-8">
      <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 leading-tight">
        {coachFirstName}&apos;s Dashboard
      </h1>
      <p className="text-sm text-slate-500 font-medium mt-1">
        {totalClients} {totalClients === 1 ? 'client' : 'clients'} · {totalAssessments} {totalAssessments === 1 ? 'assessment' : 'assessments'}
      </p>
    </div>
  );
};
