import React, { useState, useMemo } from 'react';
import { CheckCircle2, ArrowRight, ArrowDown, ArrowUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ProgressSuggestion } from '@/lib/roadmap/types';

const STATUS_LABEL: Record<string, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  achieved: 'Achieved',
  adjusted: 'Adjusted',
};

const DELTA_ICON: Record<string, typeof ArrowUp> = {
  positive: ArrowUp,
  negative: ArrowDown,
};

interface ProgressReviewModalProps {
  suggestions: ProgressSuggestion[];
  onConfirm: (accepted: Set<string>) => void;
  onDismiss: () => void;
}

export const ProgressReviewModal: React.FC<ProgressReviewModalProps> = ({
  suggestions,
  onConfirm,
  onDismiss,
}) => {
  const [accepted, setAccepted] = useState<Set<string>>(
    () => new Set(suggestions.map((s) => s.itemId)),
  );

  const toggleItem = (id: string) => {
    setAccepted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const improvements = useMemo(() => suggestions.filter((s) => s.scoreDelta > 0), [suggestions]);
  const regressions = useMemo(() => suggestions.filter((s) => s.scoreDelta < 0), [suggestions]);

  if (suggestions.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Roadmap Progress Review</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              New assessment data detected — review suggested updates
            </p>
          </div>
          <button onClick={onDismiss} className="p-1 rounded-lg hover:bg-slate-100">
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {improvements.length > 0 && (
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">
              Improvements ({improvements.length})
            </p>
          )}
          {improvements.map((s) => (
            <SuggestionCard key={s.itemId} s={s} accepted={accepted.has(s.itemId)} onToggle={toggleItem} />
          ))}

          {regressions.length > 0 && (
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide pt-2">
              Needs Attention ({regressions.length})
            </p>
          )}
          {regressions.map((s) => (
            <SuggestionCard key={s.itemId} s={s} accepted={accepted.has(s.itemId)} onToggle={toggleItem} />
          ))}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50/50">
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            Skip
          </Button>
          <Button size="sm" onClick={() => onConfirm(accepted)} className="gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Apply {accepted.size} Update{accepted.size !== 1 ? 's' : ''}
          </Button>
        </div>
      </div>
    </div>
  );
};

function SuggestionCard({
  s,
  accepted,
  onToggle,
}: {
  s: ProgressSuggestion;
  accepted: boolean;
  onToggle: (id: string) => void;
}) {
  const DeltaIcon = s.scoreDelta > 0 ? DELTA_ICON.positive : DELTA_ICON.negative;
  const deltaColor = s.scoreDelta > 0 ? 'text-emerald-500' : 'text-amber-500';

  return (
    <button
      type="button"
      onClick={() => onToggle(s.itemId)}
      className={`w-full text-left rounded-xl border p-3 transition-all ${
        accepted ? 'border-indigo-200 bg-indigo-50/50' : 'border-slate-200 bg-white opacity-60'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 ${
          accepted ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300'
        }`}>
          {accepted && <CheckCircle2 className="h-3 w-3 text-white" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{s.itemTitle}</p>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
            <span>{STATUS_LABEL[s.currentStatus]}</span>
            <ArrowRight className="h-3 w-3" />
            <span className="font-semibold text-slate-700">{STATUS_LABEL[s.suggestedStatus]}</span>
            <DeltaIcon className={`h-3 w-3 ml-1 ${deltaColor}`} />
            <span className={deltaColor}>
              {s.scoreDelta > 0 ? '+' : ''}{s.scoreDelta}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">{s.reason}</p>
        </div>
      </div>
    </button>
  );
}
