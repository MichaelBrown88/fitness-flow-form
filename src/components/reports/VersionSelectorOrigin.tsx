import React from 'react';
import ScoreBadge from './ScoreBadge';
import type { VersionSelectorSnapshot } from './AssessmentVersionSelector';

interface VersionSelectorOriginProps {
  snapshot: VersionSelectorSnapshot;
  isSelected: boolean;
  onSelect: () => void;
}

function formatOriginDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const VersionSelectorOrigin: React.FC<VersionSelectorOriginProps> = ({
  snapshot,
  isSelected,
  onSelect,
}) => {
  return (
    <button
      onClick={onSelect}
      className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-colors duration-150 ${
        isSelected ? 'bg-slate-100' : 'hover:bg-slate-50'
      }`}
    >
      <ScoreBadge score={snapshot.score} trend="neutral" size="md" />
      <div className="flex flex-col items-start min-w-0">
        <span className="text-xs font-semibold text-slate-700 leading-tight">Where You Started</span>
        <span className="text-[10px] text-slate-400 leading-tight">{formatOriginDate(snapshot.date)}</span>
      </div>
      <span className="ml-auto text-[10px] font-black uppercase tracking-[0.15em] text-slate-300">
        Initial
      </span>
    </button>
  );
};

export default VersionSelectorOrigin;
