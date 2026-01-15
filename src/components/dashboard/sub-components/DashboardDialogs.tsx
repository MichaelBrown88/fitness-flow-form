import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Trash2, UserPlus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatGoal } from '../DashboardConstants';
import type { CoachAssessmentSummary } from '@/services/coachAssessments';

interface DashboardDialogsProps {
  deleteDialog: { id: string; name: string } | null;
  setDeleteDialog: (val: { id: string; name: string } | null) => void;
  onDelete: () => void;
  clientHistoryDialog: string | null;
  setClientHistoryDialog: (val: string | null) => void;
  clientHistory: CoachAssessmentSummary[];
  loadingHistory: boolean;
  onNewAssessment: (clientName: string) => void;
}

export const DashboardDialogs: React.FC<DashboardDialogsProps> = ({
  deleteDialog,
  setDeleteDialog,
  onDelete,
  clientHistoryDialog,
  setClientHistoryDialog,
  clientHistory,
  loadingHistory,
  onNewAssessment,
}) => {
  return (
    <>
      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteDialog} onOpenChange={(open) => !open && setDeleteDialog(null)}>
        <DialogContent className="rounded-2xl max-w-[90vw] sm:max-w-[425px]">
          <DialogHeader className="text-left">
            <DialogTitle className="text-xl font-black tracking-tight">Delete Assessment</DialogTitle>
            <DialogDescription className="text-sm font-medium text-slate-500 pt-2">
              Are you sure you want to delete the assessment for <span className="text-slate-900 font-bold">{deleteDialog?.name}</span>? This action is permanent and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row gap-2 mt-6">
            <Button variant="outline" onClick={() => setDeleteDialog(null)} className="flex-1 rounded-xl font-bold h-11 border-slate-200">
              Cancel
            </Button>
            <Button variant="destructive" onClick={onDelete} className="flex-1 rounded-xl font-bold h-11 bg-red-600 hover:bg-red-700 shadow-sm shadow-red-200 transition-all">
              Delete Forever
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Client History Dialog */}
      <Dialog open={!!clientHistoryDialog} onOpenChange={(open) => !open && setClientHistoryDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-4 sm:p-6 rounded-2xl">
          <DialogHeader className="text-left shrink-0">
            <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight">History: {clientHistoryDialog}</DialogTitle>
            <DialogDescription className="text-sm font-medium text-slate-500 pt-1">
              Complete chronological record for this client.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto pr-2 mt-6 space-y-3 min-h-[300px]">
            {loadingHistory ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 font-bold text-sm">
                <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mb-3" />
                <span>Loading history…</span>
              </div>
            ) : clientHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 font-medium text-sm">
                No assessment history found.
              </div>
            ) : (
              clientHistory.map((assessment) => (
                <div
                  key={assessment.id}
                  className="flex items-center justify-between p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition-all group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <div className="text-sm font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg group-hover:bg-slate-900 group-hover:text-white transition-colors">
                        {assessment.overallScore}
                      </div>
                      {assessment.createdAt && (
                        <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest">
                          {assessment.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      )}
                    </div>
                    {assessment.goals && assessment.goals.length > 0 && (
                      <div className="text-[11px] sm:text-xs text-slate-500 font-medium truncate italic pr-4">
                        {assessment.goals.map(formatGoal).join(', ')}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <Button variant="outline" size="sm" asChild className="h-8 sm:h-9 px-3 rounded-lg text-xs font-bold border-slate-200">
                      <Link to={`/coach/assessments/${assessment.id}`}>
                        Open
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDeleteDialog({ id: assessment.id, name: clientHistoryDialog || '' });
                        setClientHistoryDialog(null);
                      }}
                      className="text-red-400 hover:text-red-600 hover:bg-red-50 h-8 w-8 sm:h-9 sm:w-9 rounded-lg p-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-6 pt-4 border-t border-slate-100 shrink-0">
            <Button variant="outline" onClick={() => setClientHistoryDialog(null)} className="sm:flex-1 rounded-xl font-bold h-11 border-slate-200">
              Close
            </Button>
            <Button
              onClick={() => {
                if (clientHistoryDialog) {
                  onNewAssessment(clientHistoryDialog);
                  setClientHistoryDialog(null);
                }
              }}
              className="sm:flex-1 bg-slate-900 text-white hover:bg-slate-800 rounded-xl font-bold h-11 shadow-sm transition-all"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              New Assessment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
