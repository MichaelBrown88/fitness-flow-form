import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, UserPlus, Mail, X, AlertTriangle } from 'lucide-react';
import type { OrgAdminOutletContext } from './OrgAdminLayout';

export default function OrgTeam() {
  const { coaches, coachMetricsMap, setShowAddCoachDialog, handleRemoveCoach, removingCoach } = useOutletContext<OrgAdminOutletContext>();

  return (
    <div className="max-w-7xl mx-auto pb-12 sm:pb-20">
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <div>
              <CardTitle className="text-base sm:text-lg">Coaches</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Manage your organization&apos;s coaches</CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => setShowAddCoachDialog(true)}
              className="gradient-bg text-primary-foreground hover:opacity-90 text-xs sm:text-sm h-9"
            >
              <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
              Add Coach
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {coaches.length === 0 ? (
            <div className="p-6 sm:p-8 rounded-lg border-2 border-dashed border-border text-center">
              <Users className="w-8 h-8 sm:w-10 sm:h-10 text-foreground-tertiary mx-auto mb-2 sm:mb-3" />
              <p className="text-foreground-secondary text-xs sm:text-sm mb-3 sm:mb-4">No coaches added yet</p>
              <Button size="sm" onClick={() => setShowAddCoachDialog(true)} variant="outline" className="text-xs sm:text-sm h-9">
                <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                Add Your First Coach
              </Button>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {coaches.map((coach) => {
                const metrics = coachMetricsMap.get(coach.uid);
                const atRiskCount = metrics?.atRiskClients || 0;
                const avgDays = metrics?.averageDaysSinceAssessment || 0;
                return (
                  <div
                    key={coach.uid}
                    className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 p-3 sm:p-4 rounded-lg border transition-colors ${
                      atRiskCount > 0 ? 'bg-amber-50/50 border-amber-200 hover:border-amber-300' : 'bg-muted/50 border-border hover:border-border-medium'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs sm:text-sm font-medium text-foreground truncate">{coach.displayName}</p>
                        {coach.role === 'org_admin' && (
                          <span className="px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-[10px] font-bold bg-gradient-light text-gradient-dark border border-border-medium shrink-0">
                            Admin
                          </span>
                        )}
                        {atRiskCount > 0 && (
                          <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300 text-[10px] sm:text-[10px]">
                            <AlertTriangle className="w-2.5 h-2.5 mr-1" />
                            {atRiskCount} at risk
                          </Badge>
                        )}
                      </div>
                      {coach.email && (
                        <div className="flex items-center gap-1 mt-1">
                          <Mail className="w-3 h-3 text-foreground-tertiary shrink-0" />
                          <p className="text-[10px] sm:text-xs text-foreground-secondary truncate">{coach.email}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 sm:gap-5 text-xs sm:text-sm w-full sm:w-auto justify-between sm:justify-end">
                      <div className="text-left sm:text-right">
                        <p className="text-foreground-secondary text-[10px] sm:text-xs">Clients</p>
                        <p className="text-foreground font-medium text-xs sm:text-sm">{coach.clientCount}</p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-foreground-secondary text-[10px] sm:text-xs">Assessments</p>
                        <p className="text-foreground font-medium text-xs sm:text-sm">{coach.assessmentCount}</p>
                      </div>
                      <div className="text-left sm:text-right hidden sm:block">
                        <p className="text-foreground-secondary text-[10px] sm:text-xs">Avg Days</p>
                        <p
                          className={`font-medium text-xs sm:text-sm ${
                            avgDays > 60 ? 'text-red-600' : avgDays > 30 ? 'text-amber-600' : 'text-emerald-600'
                          }`}
                        >
                          {avgDays > 0 ? `${avgDays}d` : '—'}
                        </p>
                      </div>
                      {coach.role !== 'org_admin' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveCoach(coach.uid, coach.displayName)}
                          disabled={removingCoach === coach.uid}
                          className="text-foreground-tertiary hover:text-red-600 hover:bg-red-50 h-9 w-9 sm:h-8 sm:w-8 p-0 shrink-0"
                        >
                          {removingCoach === coach.uid ? (
                            <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-foreground-tertiary border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
