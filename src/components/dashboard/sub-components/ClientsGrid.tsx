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
  Pin,
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
import { ASSESSMENT_COPY } from '@/constants/assessmentCopy';
import { formatClientDisplayName } from '@/lib/utils/clientDisplayName';

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
          <div className="col-span-full py-12 text-center text-xs font-medium text-muted-foreground sm:text-sm">
             <div className="flex flex-col items-center gap-3">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
                <span>Loading clients...</span>
              </div>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="col-span-full py-12 text-center text-xs font-medium text-muted-foreground sm:text-sm">
            {search ? 'No clients match that name.' : 'No clients found.'}
          </div>
        ) : (
          filteredClients.slice(0, visibleCount).map((group) => {
            const reassessmentData = reassessmentMap.get(group.name.toLowerCase());
            const hasPriorityNeeds = reassessmentData && reassessmentData.status !== 'up-to-date';
            
            return (
            <div
              key={group.id}
              className={`group rounded-xl border bg-card p-4 shadow-sm transition-all duration-300 hover:shadow-xl sm:p-5 ${
                reassessmentData?.status === 'overdue' 
                  ? 'border-red-300/60 hover:border-red-400 dark:border-red-800/60' 
                  : reassessmentData?.status === 'due-soon'
                  ? 'border-amber-300/60 hover:border-amber-400 dark:border-amber-800/50'
                  : 'border-border hover:border-border'
              }`}
            >
                <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-base font-bold text-foreground sm:text-lg">
                    {formatClientDisplayName(group.name)}
                  </h3>
                  {group.remoteIntakeAwaitingStudio ? (
                    <Badge variant="secondary" className="mt-1 text-[10px] font-semibold">
                      {ASSESSMENT_COPY.AWAITING_STUDIO_BADGE}
                    </Badge>
                  ) : null}
                  <p className="mt-1 text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
                    {group.assessments.length} assessment{group.assessments.length !== 1 ? 's' : ''}
                  </p>
                  {group.notes && (
                    <span className="flex items-center gap-1 mt-1">
                      <Pin className="h-2.5 w-2.5 text-amber-400 shrink-0" />
                      <span className="max-w-[160px] truncate text-[10px] font-normal text-muted-foreground">
                        {group.notes.length > 60 ? `${group.notes.slice(0, 60)}…` : group.notes}
                      </span>
                    </span>
                  )}
                </div>
                {group.scoreChange !== undefined && (
                  <div className={`flex items-center gap-1 text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full ${
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
                      className={`text-[10px] font-semibold gap-1 ${
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
                <div className="flex items-center justify-between rounded-lg border border-transparent bg-muted/50 p-2 text-xs transition-colors group-hover:border-border group-hover:bg-muted sm:text-sm">
                  <span className="font-medium text-muted-foreground">Latest Score</span>
                  <span className="font-bold text-foreground">{group.latestScore}</span>
                </div>
                {group.latestDate && (
                  <div className="flex items-center justify-between px-2 text-xs sm:text-xs">
                    <span className="font-medium text-muted-foreground">Last Assessment</span>
                    <span className="font-bold uppercase tracking-[0.15em] text-muted-foreground">
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
                  className="h-9 flex-1 rounded-xl border-border text-xs font-bold transition-all hover:border-foreground sm:h-10"
                >
                  <History className="h-3.5 w-3.5 mr-2" />
                  <span className="hidden sm:inline">View History</span>
                  <span className="sm:hidden">History</span>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      className="h-9 flex-1 rounded-xl bg-foreground text-xs font-bold text-background shadow-sm transition-all hover:opacity-90 sm:h-10 hover:shadow-md"
                    >
                      <UserPlus className="h-3.5 w-3.5 mr-2" />
                      <span>Assess</span>
                      <ChevronDown className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 rounded-xl border-border p-1 shadow-xl">
                    <DropdownMenuLabel className="px-2 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">Assessment Type</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-border" />
                    <DropdownMenuItem onClick={() => onNewAssessment(group.name)} className="cursor-pointer rounded-lg px-2 py-2 text-xs font-bold focus:bg-muted">
                      Full Assessment
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-border" />
                    <DropdownMenuItem onClick={() => onNewAssessment(group.name, 'bodycomp')} className="cursor-pointer rounded-lg px-2 py-2 text-xs font-medium text-muted-foreground focus:bg-muted">
                      {getPillarLabel('bodycomp')} Only
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onNewAssessment(group.name, 'posture')} className="cursor-pointer rounded-lg px-2 py-2 text-xs font-medium text-muted-foreground focus:bg-muted">
                      {getPillarLabel('posture')} Only
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onNewAssessment(group.name, 'fitness')} className="cursor-pointer rounded-lg px-2 py-2 text-xs font-medium text-muted-foreground focus:bg-muted">
                      {getPillarLabel('fitness')} Only
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onNewAssessment(group.name, 'strength')} className="cursor-pointer rounded-lg px-2 py-2 text-xs font-medium text-muted-foreground focus:bg-muted">
                      {getPillarLabel('strength')} Only
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onNewAssessment(group.name, 'lifestyle')} className="cursor-pointer rounded-lg px-2 py-2 text-xs font-medium text-muted-foreground focus:bg-muted">
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
            className="rounded-xl border-border px-8 text-xs font-semibold text-muted-foreground transition-all hover:border-foreground hover:text-foreground"
          >
            Show More Clients
          </Button>
        </div>
      )}
    </section>
  );
};
