import React from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { Button } from '@/components/ui/button';
import { Trash2, UserPlus, FileText, Pencil } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { type AssessmentSnapshot, formatSnapshotTypeLabel } from '@/services/assessmentHistory';

interface DashboardDialogsProps {
  deleteDialog: { id: string; name: string } | null;
  setDeleteDialog: (val: { id: string; name: string } | null) => void;
  onDelete: () => void;
  clientHistoryDialog: string | null;
  setClientHistoryDialog: (val: string | null) => void;
  clientHistory: AssessmentSnapshot[];
  clientSummaryId: string | null;
  loadingHistory: boolean;
  onNewAssessment: (clientName: string) => void;
  onEditSnapshot: (snapshot: AssessmentSnapshot) => void;
  deleteSnapshotDialog: { clientName: string; snapshotId: string } | null;
  setDeleteSnapshotDialog: (val: { clientName: string; snapshotId: string } | null) => void;
  onDeleteSnapshot: () => Promise<void>;
}

export const DashboardDialogs: React.FC<DashboardDialogsProps> = ({
  deleteDialog,
  setDeleteDialog,
  onDelete,
  clientHistoryDialog,
  setClientHistoryDialog,
  clientHistory,
  clientSummaryId,
  loadingHistory,
  onNewAssessment,
  onEditSnapshot,
  deleteSnapshotDialog,
  setDeleteSnapshotDialog,
  onDeleteSnapshot,
}) => {
  return (
    <>
      {/* Delete Snapshot Confirmation */}
      <Dialog open={!!deleteSnapshotDialog} onOpenChange={(open) => !open && setDeleteSnapshotDialog(null)}>
        <DialogContent className="rounded-2xl max-w-[90vw] sm:max-w-[425px]">
          <DialogHeader className="text-left">
            <DialogTitle className="text-xl font-bold tracking-tight">Remove snapshot</DialogTitle>
            <DialogDescription className="text-sm font-medium text-muted-foreground pt-2">
              Remove this assessment snapshot from history? If it was the latest, current will be restored from the previous snapshot.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2 mt-6">
            <Button variant="outline" onClick={() => setDeleteSnapshotDialog(null)} className="flex-1 font-bold h-11">
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void onDeleteSnapshot()} className="flex-1 font-bold h-11">
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Assessment Dialog */}
      <Dialog open={!!deleteDialog} onOpenChange={(open) => !open && setDeleteDialog(null)}>
        <DialogContent className="rounded-2xl max-w-[90vw] sm:max-w-[425px]">
          <DialogHeader className="text-left">
            <DialogTitle className="text-xl font-bold tracking-tight">Delete Assessment</DialogTitle>
            <DialogDescription className="text-sm font-medium text-muted-foreground pt-2">
              Are you sure you want to delete the assessment for <span className="text-foreground font-bold">{deleteDialog?.name}</span>? This action is permanent and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row gap-2 mt-6">
            <Button variant="outline" onClick={() => setDeleteDialog(null)} className="flex-1 font-bold h-11 border-border">
              Cancel
            </Button>
            <Button variant="destructive" onClick={onDelete} className="flex-1 font-bold h-11 bg-red-600 hover:bg-red-700 shadow-sm shadow-red-200 transition-all">
              Delete Forever
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Client History Dialog */}
      <Dialog open={!!clientHistoryDialog} onOpenChange={(open) => !open && setClientHistoryDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-4 sm:p-6 rounded-2xl">
          <DialogHeader className="text-left shrink-0">
            <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight">History: {clientHistoryDialog}</DialogTitle>
            <DialogDescription className="text-sm font-medium text-muted-foreground pt-1">
              Complete chronological record for this client.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto pr-2 mt-6 space-y-3 min-h-[300px]">
            {loadingHistory ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground font-bold text-sm">
                <div className="w-6 h-6 border-2 border-foreground border-t-transparent rounded-full animate-spin mb-3" />
                <span>Loading history…</span>
              </div>
            ) : clientHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground font-medium text-sm text-center gap-4 px-4">
                <p>No assessment history found.</p>
                {clientHistoryDialog ? (
                  <Button variant="default" className="font-bold" asChild>
                    <Link
                      to={`${ROUTES.ASSESSMENT}?client=${encodeURIComponent(clientHistoryDialog)}`}
                      onClick={() => setClientHistoryDialog(null)}
                    >
                      Run an assessment
                    </Link>
                  </Button>
                ) : null}
              </div>
            ) : (
              clientHistory.map((snapshot) => (
                <div
                  key={snapshot.id}
                  className="flex items-center justify-between p-4 border border-border rounded-xl hover:bg-muted transition-all group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <div className="text-sm font-bold text-foreground bg-muted px-2 py-0.5 rounded-lg">
                        {snapshot.overallScore}
                      </div>
                      <div className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em]">
                        {snapshot.timestamp?.toDate?.()?.toLocaleDateString?.('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) ?? '—'}
                      </div>
                      <span className="text-xs text-muted-foreground capitalize">
                        {formatSnapshotTypeLabel(snapshot.type)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {clientSummaryId && (
                      <Button variant="outline" size="sm" asChild className="h-8 px-3 rounded-lg text-xs font-bold">
                        <Link to={`/coach/assessments/${clientSummaryId}?clientName=${encodeURIComponent(clientHistoryDialog || '')}`}>
                          <FileText className="h-3.5 w-3.5 mr-1" />
                          View
                        </Link>
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEditSnapshot(snapshot)}
                      className="h-8 px-3 rounded-lg text-xs font-bold"
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (clientHistoryDialog) {
                          setDeleteSnapshotDialog({ clientName: clientHistoryDialog, snapshotId: snapshot.id ?? '' });
                        }
                      }}
                      className="text-red-400 hover:text-red-600 hover:bg-red-50 h-8 w-8 rounded-lg p-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-6 pt-4 border-t border-border shrink-0">
            <Button variant="outline" onClick={() => setClientHistoryDialog(null)} className="sm:flex-1 font-bold h-11 border-border">
              Close
            </Button>
            <Button
              onClick={() => {
                if (clientHistoryDialog) {
                  onNewAssessment(clientHistoryDialog);
                  setClientHistoryDialog(null);
                }
              }}
              className="sm:flex-1 rounded-xl font-bold h-11 shadow-sm transition-all"
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
