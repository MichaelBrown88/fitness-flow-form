import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import VersionSelectorBar from './VersionSelectorBar';
import VersionSelectorGrid from './VersionSelectorGrid';
import VersionSelectorOrigin from './VersionSelectorOrigin';
import ScoreBadge from './ScoreBadge';

export interface VersionSelectorSnapshot {
  id: string;
  score: number;
  date: Date;
  type: string;
}

export interface AssessmentVersionSelectorProps {
  snapshots: VersionSelectorSnapshot[];
  selectedIndex: number;
  totalCount: number;
  initialAssessment: VersionSelectorSnapshot | null;
  initialAssessmentGlobalIndex: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  onSelect: (index: number) => void;
  onPageChange: (page: number) => void;
  getTrend: (globalIndex: number) => 'up' | 'down' | 'neutral';
}

const AssessmentVersionSelector: React.FC<AssessmentVersionSelectorProps> = ({
  snapshots,
  selectedIndex,
  totalCount,
  initialAssessment,
  initialAssessmentGlobalIndex,
  currentPage,
  totalPages,
  pageSize,
  onSelect,
  onPageChange,
  getTrend,
}) => {
  const [open, setOpen] = useState(false);
  const current = snapshots.find((_, i) => currentPage * pageSize + i === selectedIndex) ?? snapshots[0] ?? null;
  const currentTrend = current ? getTrend(selectedIndex) : 'neutral';

  if (totalCount < 1) return null;

  const handleGridSelect = (index: number) => {
    onSelect(index);
    setOpen(false);
  };

  const handleOriginSelect = () => {
    onSelect(initialAssessmentGlobalIndex);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <VersionSelectorBar
        current={current}
        onPrev={() => onSelect(selectedIndex - 1)}
        onNext={() => onSelect(selectedIndex + 1)}
        gridTrigger={
          <PopoverTrigger asChild>
            <button className="flex items-center justify-center gap-2 min-w-0 rounded-lg px-2 py-1 hover:bg-muted/80 transition-colors duration-150">
              <ScoreBadge score={current?.score ?? 0} trend={currentTrend} size="sm" />
              <span className="text-xs text-muted-foreground leading-tight truncate">
                {current ? current.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
              </span>
            </button>
          </PopoverTrigger>
        }
        hasPrev={selectedIndex > 0}
        hasNext={selectedIndex < totalCount - 1}
      />
      <PopoverContent align="center" className="w-auto p-0 rounded-2xl border border-border shadow-lg">
        <VersionSelectorGrid
          items={snapshots}
          selectedIndex={selectedIndex}
          totalCount={totalCount}
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          onSelect={handleGridSelect}
          onPageChange={onPageChange}
          getTrend={getTrend}
        />
        {initialAssessment && totalCount > 1 && (
          <>
            <div className="border-t border-dashed border-border mx-4" />
            <div className="px-4 pb-3 pt-2">
              <VersionSelectorOrigin
                snapshot={initialAssessment}
                isSelected={selectedIndex === initialAssessmentGlobalIndex}
                onSelect={handleOriginSelect}
              />
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default AssessmentVersionSelector;
