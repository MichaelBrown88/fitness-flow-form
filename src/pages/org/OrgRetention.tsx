import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle, UserX } from 'lucide-react';
import type { OrgAdminOutletContext } from './OrgAdminLayout';

export default function OrgRetention() {
  const { retentionSummary, atRiskClients, criticalClients, retentionLoading } = useOutletContext<OrgAdminOutletContext>();

  return (
    <div className="max-w-7xl mx-auto pb-12 sm:pb-20">
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <div>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                Client Retention
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Identify clients at risk of churn</CardDescription>
            </div>
            {retentionSummary.atRiskClients > 0 && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                <AlertTriangle className="w-3 h-3 mr-1" />
                {retentionSummary.atRiskClients} at risk
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {retentionLoading ? (
            <div className="text-center py-6 text-foreground-secondary text-sm">Loading retention data...</div>
          ) : retentionSummary.totalClients === 0 ? (
            <div className="text-center py-6 text-foreground-secondary text-sm">
              No client data yet. Retention analytics will appear once you have clients.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-lg sm:text-xl font-bold text-foreground">{retentionSummary.totalClients}</p>
                  <p className="text-[10px] sm:text-xs text-foreground-secondary">Total Clients</p>
                </div>
                <div className="bg-emerald-50 rounded-lg p-3 text-center">
                  <p className="text-lg sm:text-xl font-bold text-emerald-700">
                    {retentionSummary.totalClients - retentionSummary.clientsNeedingAttention}
                  </p>
                  <p className="text-[10px] sm:text-xs text-emerald-600">Healthy (&lt;30d)</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-3 text-center">
                  <p className="text-lg sm:text-xl font-bold text-amber-700">{retentionSummary.clientsNeedingAttention}</p>
                  <p className="text-[10px] sm:text-xs text-amber-600">Need Attention (30-60d)</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <p className="text-lg sm:text-xl font-bold text-red-700">{retentionSummary.clientsAtRiskOfChurn}</p>
                  <p className="text-[10px] sm:text-xs text-red-600">At Risk (&gt;60d)</p>
                </div>
              </div>

              {criticalClients.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-red-600 flex items-center gap-1.5">
                    <UserX className="w-3.5 h-3.5" />
                    Critical — No Assessment in 90+ Days
                  </h4>
                  <div className="space-y-2">
                    {criticalClients.slice(0, 5).map((client) => (
                      <div
                        key={client.id}
                        className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{client.name}</p>
                          {client.assignedCoachName && (
                            <p className="text-[10px] text-foreground-secondary">Coach: {client.assignedCoachName}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <Badge variant="destructive" className="text-[10px]">
                            {client.daysSinceAssessment >= 999 ? 'Never' : `${client.daysSinceAssessment}d ago`}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {criticalClients.length > 5 && (
                      <p className="text-xs text-foreground-secondary text-center pt-2">+{criticalClients.length - 5} more critical clients</p>
                    )}
                  </div>
                </div>
              )}

              {atRiskClients.length > 0 && (
                <div className={criticalClients.length > 0 ? 'mt-6 space-y-2' : 'space-y-2'}>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-amber-600 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    At Risk — No Assessment in 60–90 Days
                  </h4>
                  <div className="space-y-2">
                    {atRiskClients.slice(0, 5).map((client) => (
                      <div
                        key={client.id}
                        className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{client.name}</p>
                          {client.assignedCoachName && (
                            <p className="text-[10px] text-foreground-secondary">Coach: {client.assignedCoachName}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300 text-[10px]">
                            {client.daysSinceAssessment}d ago
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {atRiskClients.length > 5 && (
                      <p className="text-xs text-foreground-secondary text-center pt-2">+{atRiskClients.length - 5} more at-risk clients</p>
                    )}
                  </div>
                </div>
              )}

              {criticalClients.length === 0 && atRiskClients.length === 0 && retentionSummary.totalClients > 0 && (
                <div className="text-center py-4 text-emerald-600 text-sm">
                  All clients have been assessed within the last 60 days. Great job!
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
