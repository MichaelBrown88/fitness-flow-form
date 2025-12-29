import React from 'react';
import { 
  Users, 
  FileText, 
  Target, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle 
} from 'lucide-react';
import type { Analytics } from '@/pages/Dashboard';

interface AnalyticsDashboardProps {
  analytics: Analytics | null;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ analytics }) => {
  if (!analytics) return null;

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Clients</p>
              <h3 className="text-2xl font-bold text-slate-900">{analytics.totalClients}</h3>
              <p className="text-xs text-slate-500 mt-1">
                {analytics.clientsThisMonth > 0 ? `+${analytics.clientsThisMonth} this month` : 'No new clients this month'}
              </p>
            </div>
            <Users className="h-8 w-8 text-slate-400" />
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Assessments</p>
              <h3 className="text-2xl font-bold text-slate-900">{analytics.totalAssessments}</h3>
              <p className="text-xs text-slate-500 mt-1">
                {analytics.assessmentsThisMonth > 0 ? `+${analytics.assessmentsThisMonth} this month` : 'No assessments this month'}
              </p>
            </div>
            <FileText className="h-8 w-8 text-slate-400" />
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Average Score</p>
              <h3 className="text-2xl font-bold text-slate-900">{analytics.averageScore}</h3>
              <p className="text-xs text-slate-500 mt-1">Across all clients</p>
            </div>
            <Target className="h-8 w-8 text-slate-400" />
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Next Session</p>
              <h3 className="text-2xl font-bold text-slate-900">Today</h3>
              <p className="text-xs text-slate-500 mt-1">2 scheduled</p>
            </div>
            <Calendar className="h-8 w-8 text-slate-400" />
          </div>
        </div>
      </section>

      {/* Category Performance & Common Issues */}
      <section className="grid gap-4 md:grid-cols-2">
        {(analytics.highestCategory || analytics.lowestCategory) && (
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Category Performance</h3>
            <div className="space-y-3">
              {analytics.highestCategory && (
                <div className="flex items-center justify-between p-2 bg-emerald-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-medium text-slate-700">Highest</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-slate-900">{analytics.highestCategory.name}</div>
                    <div className="text-xs text-slate-500">Score: {analytics.highestCategory.avgScore}</div>
                  </div>
                </div>
              )}
              {analytics.lowestCategory && (
                <div className="flex items-center justify-between p-2 bg-amber-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-amber-600" />
                    <span className="text-sm font-medium text-slate-700">Lowest</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-slate-900">{analytics.lowestCategory.name}</div>
                    <div className="text-xs text-slate-500">Score: {analytics.lowestCategory.avgScore}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {analytics.mostCommonIssues.length > 0 && (
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Most Common Issues
            </h3>
            <div className="space-y-2">
              {analytics.mostCommonIssues.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                  <span className="text-sm text-slate-700">{item.issue}</span>
                  <span className="text-xs font-semibold text-slate-500 bg-white px-2 py-0.5 rounded">
                    {item.count}x
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

