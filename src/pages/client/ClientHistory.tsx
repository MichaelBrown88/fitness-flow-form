import { Link, useOutletContext } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { formatSnapshotTypeLabel } from '@/services/assessmentHistory';
import { computeScores } from '@/lib/scoring';
import { Pencil, Trash2, ExternalLink } from 'lucide-react';
import type { ClientDetailOutletContext } from './ClientDetailLayout';

export default function ClientHistory() {
  const ctx = useOutletContext<ClientDetailOutletContext>();
  const {
    clientName,
    loadingSnapshots,
    snapshots,
    setDeleteSnapshotDialog,
    handleEditSnapshot,
  } = ctx;

  if (loadingSnapshots) {
    return (
      <div className="py-8 flex justify-center">
        <div className="w-6 h-6 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (snapshots.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No assessment history yet. Complete an assessment to see past snapshots here.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {snapshots.map((snapshot) => {
        const stored = snapshot.overallScore;
        // Old snapshots can have a stale/zero overallScore (saved before scoring
        // was finalised). Recompute from formData when the stored value looks bogus.
        const displayScore =
          stored && stored > 0
            ? stored
            : Math.round(computeScores(snapshot.formData).overall);
        const viewTarget = snapshot.id
          ? `/coach/assessments/${encodeURIComponent(snapshot.id)}?clientName=${encodeURIComponent(clientName)}`
          : null;
        return (
          <li
            key={snapshot.id ?? snapshot.timestamp.toMillis()}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-muted/50 px-4 py-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-sm font-medium text-foreground">
                {snapshot.timestamp?.toDate?.()?.toLocaleDateString?.() ?? '—'}
              </span>
              <span className="text-xs text-muted-foreground font-medium tracking-wide">
                {formatSnapshotTypeLabel(snapshot.type)}
              </span>
              <span className="text-sm font-semibold text-foreground-secondary">{displayScore}/100</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {viewTarget && (
                <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-foreground-secondary" asChild>
                  <Link to={viewTarget}>
                    <ExternalLink className="h-3.5 w-3.5 mr-1" />
                    View
                  </Link>
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs text-foreground-secondary"
                onClick={() => handleEditSnapshot(snapshot)}
              >
                <Pencil className="h-3.5 w-3.5 mr-1" />
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setDeleteSnapshotDialog({ snapshotId: snapshot.id ?? '' })}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Delete
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
