import React from 'react';
import { History } from 'lucide-react';

interface ActivityItem {
  clientName: string;
  category: string;
  date: Date;
  type: string;
}

interface RecentActivityProps {
  recentChanges: ActivityItem[];
}

export const RecentActivity: React.FC<RecentActivityProps> = ({ recentChanges }) => {
  if (recentChanges.length === 0) return null;

  const categoryLabels: Record<string, string> = {
    inbody: 'InBody',
    posture: 'Posture',
    fitness: 'Fitness',
    strength: 'Strength',
    lifestyle: 'Lifestyle',
    all: 'Full Assessment',
  };

  const typeLabels: Record<string, string> = {
    'full': 'Full Assessment',
    'partial-inbody': 'InBody Update',
    'partial-posture': 'Posture Update',
    'partial-fitness': 'Fitness Update',
    'partial-strength': 'Strength Update',
    'partial-lifestyle': 'Lifestyle Update',
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
        <History className="h-4 w-4" />
        Recent Activity
      </h3>
      <div className="space-y-2">
        {recentChanges.map((change, idx) => (
          <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="text-xs text-slate-500">
                {change.date.toLocaleDateString()} {change.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="text-sm text-slate-700">
                <span className="font-semibold">{change.clientName}</span>
                {' - '}
                <span>{typeLabels[change.type] || change.type}</span>
              </div>
            </div>
            <span className="text-xs font-semibold text-slate-500 bg-white px-2 py-0.5 rounded">
              {categoryLabels[change.category] || change.category}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
};

