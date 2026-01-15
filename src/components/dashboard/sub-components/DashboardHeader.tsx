import React from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface DashboardHeaderProps {
  coachFirstName: string;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ coachFirstName }) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 leading-tight">
          {coachFirstName}'s Dashboard
        </h1>
        <p className="text-sm text-slate-500 font-medium mt-1">
          Manage clients, view assessments, and track progress.
        </p>
      </div>
      <Button asChild className="bg-slate-900 text-white hover:bg-slate-800 h-10 sm:h-11 px-6 rounded-xl shadow-sm hover:shadow-md transition-all">
        <Link to="/assessment" className="flex items-center gap-2">
          <span className="text-base font-bold">+</span>
          <span>New Assessment</span>
        </Link>
      </Button>
    </div>
  );
};
