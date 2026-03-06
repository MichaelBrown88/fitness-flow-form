import { Link, useOutletContext } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { formatSnapshotTypeLabel } from '@/services/assessmentHistory';
import { Pencil, Trash2, ExternalLink } from 'lucide-react';
import type { ClientDetailOutletContext } from './ClientDetailLayout';

export default function ClientHistory() {
  const ctx = useOutletContext<ClientDetailOutletContext>();
  const {
    clientName,
    loadingSnapshots,
    snapshots,
    assessments,
    setDeleteSnapshotDialog,
    handleEditSnapshot,
  } = ctx;

  if (loadingSnapshots) {
    return (
      <div className="py-8 flex justify-center">
        <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (snapshots.length === 0) {
    return (
      <p className="text-sm text-slate-400 py-4 text-center">
        No assessment history yet. Complete an assessment to see past snapshots here.
      </p>
    );
  }

  const reportId = assessments[0]?.id;

  return (
    <ul className="space-y-2">
      {snapshots.map((snapshot) => (
        <li
          key={snapshot.id ?? snapshot.timestamp.toMillis()}
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-sm font-medium text-slate-900">
              {snapshot.timestamp?.toDate?.()?.toLocaleDateString?.() ?? '—'}
            </span>
            <span className="text-xs text-slate-500 font-medium tracking-wide">
              {formatSnapshotTypeLabel(snapshot.type)}
            </span>
            <span className="text-sm font-semibold text-slate-700">{snapshot.overallScore}/100</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {reportId && (
              <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-slate-600" asChild>
                <Link to={`/coach/assessments/${reportId}?clientName=${encodeURIComponent(clientName)}`}>
                  <ExternalLink className="h-3.5 w-3.5 mr-1" />
                  View
                </Link>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs text-slate-600"
              onClick={() => handleEditSnapshot(snapshot)}
            >
              <Pencil className="h-3.5 w-3.5 mr-1" />
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => setDeleteSnapshotDialog({ snapshotId: snapshot.id ?? '' })}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Delete
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
