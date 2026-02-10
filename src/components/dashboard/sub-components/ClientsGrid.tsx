import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  History, 
  UserPlus, 
  ChevronDown,
  AlertCircle,
  Scale,
  Camera,
  Activity,
  Dumbbell,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ClientGroup } from '@/hooks/useDashboardData';
import type { ReassessmentItem, ReassessmentType } from '@/hooks/useReassessmentQueue';
import { getPillarLabel } from '@/constants/pillars';
import { SCORE_COLORS } from '@/lib/scoring/scoreColor';

interface ClientsGridProps {
  loadingData: boolean;
  filteredClients: ClientGroup[];
  search: string;
  visibleCount: number;
  setVisibleCount: (count: number | ((prev: number) => number)) => void;
  onNewAssessment: (clientName: string, category?: string) => void;
  reassessmentQueue?: ReassessmentItem[];
}

/** Get icon for reassessment type */
const getDueIcon = (type: ReassessmentType) => {
  switch (type) {
    case 'bodycomp': return <Scale className="w-3 h-3" />;
    case 'posture': return <Camera className="w-3 h-3" />;
    case 'fitness': return <Activity className="w-3 h-3" />;
    case 'strength': return <Dumbbell className="w-3 h-3" />;
    default: return <AlertCircle className="w-3 h-3" />;
  }
};

/** Get short label for reassessment type */
const getDueLabel = (type: ReassessmentType) => {
  if (type === 'full') return 'Full';
  return getPillarLabel(type);
};

export const ClientsGrid: React.FC<ClientsGridProps> = ({
  loadingData,
  filteredClients,
  search,
  visibleCount,
  setVisibleCount,
  onNewAssessment,
  reassessmentQueue = [],
}) => {
  const navigate = useNavigate();

  // Create a map of client names to their reassessment data
  const reassessmentMap = useMemo(() => {
    const map = new Map<string, ReassessmentItem>();
    reassessmentQueue.forEach(item => {
      map.set(item.clientName.toLowerCase(), item);
    });
    return map;
  }, [reassessmentQueue]);

  return (
    <section className="space-y-4">
      <div className="grid gap-3 sm:gap-4 md:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {loadingData ? (
          <div className="col-span-full text-center text-xs sm:text-sm text-slate-400 font-medium py-12">
             <div className="flex flex-col items-center gap-3">
                <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                <span>Loading clients...</span>
              </div>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="col-span-full text-center text-xs sm:text-sm text-slate-400 font-medium py-12">
            {search ? 'No clients match that name.' : 'No clients found.'}
          </div>
        ) : (
          filteredClients.slice(0, visibleCount).map((group) => {
            const reassessmentData = reassessmentMap.get(group.name.toLowerCase());
            const hasPriorityNeeds = reassessmentData && reassessmentData.status !== 'up-to-date';
            
            return (
            <div
              key={group.id}
              className={`group rounded-xl border bg-white p-4 sm:p-5 shadow-sm hover:shadow-xl transition-all duration-300 ${
                reassessmentData?.status === 'overdue' 
                  ? 'border-red-200 hover:border-red-300' 
                  : reassessmentData?.status === 'due-soon'
                  ? 'border-amber-200 hover:border-amber-300'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="min-w-0 flex-1">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 truncate uppercase tracking-tight">
                    {group.name}
                  </h3>
                  <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
                    {group.assessments.length} assessment{group.assessments.length !== 1 ? 's' : ''}
                  </p>
                </div>
                {group.scoreChange !== undefined && (
                  <div className={`flex items-center gap-1 text-[10px] sm:text-xs font-black shadow-sm px-2 py-0.5 rounded-full ${
                    group.scoreChange >= 0 ? `bg-score-green-light text-score-green-fg` : `bg-score-red-light text-score-red-fg`
                  }`}>
                    {group.scoreChange >= 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {group.scoreChange > 0 ? '+' : ''}{group.scoreChange}
                  </div>
                )}
              </div>
              
              {/* Due For Badges */}
              {hasPriorityNeeds && reassessmentData.pillarSchedules.filter(s => s.status !== 'up-to-date').length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {reassessmentData.pillarSchedules.filter(s => s.status !== 'up-to-date').slice(0, 3).map((s) => (
                    <Badge 
                      key={s.pillar}
                      variant="outline" 
                      className={`text-[9px] font-semibold gap-1 ${
                        s.status === 'overdue'
                          ? SCORE_COLORS.red.pill
                          : SCORE_COLORS.amber.pill
                      }`}
                    >
                      {getDueIcon(s.pillar)}
                      Due: {getDueLabel(s.pillar)}
                    </Badge>
                  ))}
                </div>
              )}
              
              <div className="space-y-2 mb-5 sm:mb-6">
                <div className="flex items-center justify-between text-xs sm:text-sm p-2 bg-slate-50 rounded-lg group-hover:bg-white transition-colors border border-transparent group-hover:border-slate-100">
                  <span className="text-slate-500 font-medium">Latest Score</span>
                  <span className="font-black text-slate-900">{group.latestScore}</span>
                </div>
                {group.latestDate && (
                  <div className="flex items-center justify-between text-[11px] sm:text-xs px-2">
                    <span className="text-slate-400 font-medium">Last Assessment</span>
                    <span className="text-slate-500 font-bold uppercase tracking-wide">
                      {group.latestDate.toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/client/${encodeURIComponent(group.name)}`)}
                  className="flex-1 text-xs font-bold h-9 sm:h-10 rounded-xl border-slate-200 hover:border-slate-900 transition-all"
                >
                  <History className="h-3.5 w-3.5 mr-2" />
                  <span className="hidden sm:inline">View History</span>
                  <span className="sm:hidden">History</span>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      className="flex-1 bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold h-9 sm:h-10 rounded-xl shadow-sm hover:shadow-md transition-all"
                    >
                      <UserPlus className="h-3.5 w-3.5 mr-2" />
                      <span>Assess</span>
                      <ChevronDown className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-xl border-slate-200 p-1">
                    <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2 py-1.5">Assessment Type</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-slate-100" />
                    <DropdownMenuItem onClick={() => onNewAssessment(group.name)} className="rounded-lg text-xs font-bold px-2 py-2 cursor-pointer focus:bg-slate-50">
                      Full Assessment
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-slate-100" />
                    <DropdownMenuItem onClick={() => onNewAssessment(group.name, 'bodycomp')} className="rounded-lg text-xs font-medium px-2 py-2 cursor-pointer focus:bg-slate-50 text-slate-600">
                      {getPillarLabel('bodycomp')} Only
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onNewAssessment(group.name, 'posture')} className="rounded-lg text-xs font-medium px-2 py-2 cursor-pointer focus:bg-slate-50 text-slate-600">
                      {getPillarLabel('posture')} Only
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onNewAssessment(group.name, 'fitness')} className="rounded-lg text-xs font-medium px-2 py-2 cursor-pointer focus:bg-slate-50 text-slate-600">
                      {getPillarLabel('fitness')} Only
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onNewAssessment(group.name, 'strength')} className="rounded-lg text-xs font-medium px-2 py-2 cursor-pointer focus:bg-slate-50 text-slate-600">
                      {getPillarLabel('strength')} Only
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onNewAssessment(group.name, 'lifestyle')} className="rounded-lg text-xs font-medium px-2 py-2 cursor-pointer focus:bg-slate-50 text-slate-600">
                      {getPillarLabel('lifestyle')} Only
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            );
          })
        )}
      </div>

      {!loadingData && filteredClients.length > visibleCount && (
        <div className="flex justify-center pt-4 sm:pt-6">
          <Button 
            variant="outline" 
            onClick={() => setVisibleCount(prev => prev + 12)}
            className="text-slate-500 font-bold text-xs uppercase tracking-widest px-8 rounded-xl border-slate-200 hover:border-slate-900 hover:text-slate-900 transition-all"
          >
            Show More Clients
          </Button>
        </div>
      )}
    </section>
  );
};
