/**
 * Priority View Component
 * 
 * Displays clients who need reassessment, prioritized by urgency.
 * Shows pillar gaps and recommended actions.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  Clock, 
  FileText, 
  Activity, 
  Dumbbell, 
  Camera,
  Scale,
  ChevronRight,
  CheckCircle,
  Settings2,
} from 'lucide-react';
import type { UseReassessmentQueueResult, ReassessmentType } from '@/hooks/useReassessmentQueue';

interface PriorityViewProps {
  reassessmentQueue: UseReassessmentQueueResult;
  onNewAssessmentForClient: (clientName: string) => void;
}

/** Get icon for reassessment type */
const getTypeIcon = (type: ReassessmentType) => {
  switch (type) {
    case 'inbody': return <Scale className="w-3 h-3" />;
    case 'posture': return <Camera className="w-3 h-3" />;
    case 'fitness': return <Activity className="w-3 h-3" />;
    case 'strength': return <Dumbbell className="w-3 h-3" />;
    case 'full': return <FileText className="w-3 h-3" />;
    case 'check-in': return <Clock className="w-3 h-3" />;
    default: return <FileText className="w-3 h-3" />;
  }
};

/** Get label for reassessment type */
const getTypeLabel = (type: ReassessmentType) => {
  switch (type) {
    case 'inbody': return 'InBody';
    case 'posture': return 'Posture';
    case 'fitness': return 'Cardio';
    case 'strength': return 'Strength';
    case 'full': return 'Full';
    case 'check-in': return 'Check-in';
    default: return type;
  }
};

/** Priority badge styling */
const getPriorityStyle = (priority: 'high' | 'medium' | 'low') => {
  switch (priority) {
    case 'high':
      return 'bg-red-100 text-red-700 border-red-200';
    case 'medium':
      return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'low':
      return 'bg-slate-100 text-slate-600 border-slate-200';
  }
};

export const PriorityView: React.FC<PriorityViewProps> = ({
  reassessmentQueue,
  onNewAssessmentForClient,
}) => {
  const navigate = useNavigate();
  const { queue, summary, highPriorityClients } = reassessmentQueue;

  if (queue.length === 0) {
    return (
      <div className="py-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-emerald-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">All Caught Up!</h3>
        <p className="text-sm text-slate-500 max-w-sm mx-auto">
          No clients currently need reassessment. Keep up the great work!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-red-50 rounded-xl p-3 border border-red-100">
          <p className="text-2xl font-bold text-red-700">{summary.highPriority}</p>
          <p className="text-xs text-red-600 font-medium">High Priority</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
          <p className="text-2xl font-bold text-amber-700">{summary.mediumPriority}</p>
          <p className="text-xs text-amber-600 font-medium">Medium Priority</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
          <p className="text-2xl font-bold text-slate-700">{summary.lowPriority}</p>
          <p className="text-xs text-slate-500 font-medium">Low Priority</p>
        </div>
        <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-100">
          <p className="text-2xl font-bold text-indigo-700">{summary.totalClients}</p>
          <p className="text-xs text-indigo-600 font-medium">Total Clients</p>
        </div>
      </div>

      {/* High Priority Section */}
      {highPriorityClients.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-red-600">
              High Priority ({highPriorityClients.length})
            </h3>
          </div>
          <div className="space-y-2">
            {highPriorityClients.map((item) => (
              <PriorityCard 
                key={item.clientName} 
                item={item} 
                onAssess={onNewAssessmentForClient}
              />
            ))}
          </div>
        </div>
      )}

      {/* Remaining Queue */}
      {queue.filter(q => q.priority !== 'high').length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            Other Clients ({queue.filter(q => q.priority !== 'high').length})
          </h3>
          <div className="space-y-2">
            {queue
              .filter(q => q.priority !== 'high')
              .slice(0, 10)
              .map((item) => (
                <PriorityCard 
                  key={item.clientName} 
                  item={item} 
                  onAssess={onNewAssessmentForClient}
                  compact
                />
              ))}
            {queue.filter(q => q.priority !== 'high').length > 10 && (
              <p className="text-xs text-slate-400 text-center pt-2">
                +{queue.filter(q => q.priority !== 'high').length - 10} more clients
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/** Individual priority card */
interface PriorityCardProps {
  item: UseReassessmentQueueResult['queue'][0];
  onAssess: (clientName: string) => void;
  compact?: boolean;
}

const PriorityCard: React.FC<PriorityCardProps> = ({ item, onAssess, compact = false }) => {
  return (
    <div 
      className={`rounded-xl border transition-colors ${
        item.priority === 'high' 
          ? 'bg-red-50/50 border-red-200 hover:border-red-300' 
          : item.priority === 'medium'
          ? 'bg-amber-50/50 border-amber-200 hover:border-amber-300'
          : 'bg-white border-slate-200 hover:border-slate-300'
      } ${compact ? 'p-3' : 'p-4'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className={`font-semibold text-slate-900 truncate ${compact ? 'text-sm' : 'text-base'}`}>
              {item.clientName}
            </p>
            <Badge variant="outline" className={`text-[10px] ${getPriorityStyle(item.priority)}`}>
              {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
            </Badge>
            {item.hasCustomCadence && (
              <span className="inline-flex items-center gap-0.5 text-[9px] text-indigo-600">
                <Settings2 className="w-2.5 h-2.5" />
                Custom
              </span>
            )}
          </div>
          
          <p className="text-xs text-slate-500 mb-2">
            {item.priorityReason}
          </p>

          {/* Needs badges with smart reasons */}
          <div className="flex flex-wrap gap-1.5">
            {item.reassessmentNeeds.map((need) => {
              // Get the smart reason from cadence engine if available
              const reason = item.reassessmentReasons?.[need];
              const displayLabel = reason 
                ? `${getTypeLabel(need)} (${reason})`
                : getTypeLabel(need);
              
              return (
                <span 
                  key={need}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full ${
                    item.hasCustomCadence 
                      ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' 
                      : 'bg-slate-100 text-slate-600'
                  }`}
                  title={reason || `Due for ${getTypeLabel(need)}`}
                >
                  {getTypeIcon(need)}
                  <span className="max-w-[200px] truncate">{displayLabel}</span>
                </span>
              );
            })}
          </div>

          {/* Pillar gaps (non-compact view) */}
          {!compact && item.pillarGaps.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Pillar Gaps
              </p>
              <div className="flex flex-wrap gap-2">
                {item.pillarGaps.map((gap) => (
                  <div key={gap.pillar} className="text-xs">
                    <span className="text-slate-600">{gap.pillar}:</span>
                    <span className={`ml-1 font-bold ${
                      gap.score < 40 ? 'text-red-600' : 'text-amber-600'
                    }`}>
                      {gap.score}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="text-right">
            <p className={`font-bold ${
              item.daysSinceAssessment >= 60 ? 'text-red-600' :
              item.daysSinceAssessment >= 30 ? 'text-amber-600' :
              'text-slate-600'
            } ${compact ? 'text-sm' : 'text-base'}`}>
              {item.daysSinceAssessment >= 999 ? 'Never' : `${item.daysSinceAssessment}d`}
            </p>
            <p className="text-[10px] text-slate-400">since last</p>
          </div>
          <Button
            size="sm"
            variant={item.priority === 'high' ? 'default' : 'outline'}
            className={`text-xs h-7 ${
              item.priority === 'high' 
                ? 'bg-red-600 hover:bg-red-700' 
                : ''
            }`}
            onClick={() => onAssess(item.clientName)}
          >
            Assess
            <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};
