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
  /** Coach: full grid. Client: latest/previous only. */
  variant?: 'coach' | 'client';
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
  variant = 'coach',
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
  const [showAllAssessments, setShowAllAssessments] = useState(false);
  const current = snapshots.find((_, i) => currentPage * pageSize + i === selectedIndex) ?? snapshots[0] ?? null;
  const currentTrend = current ? getTrend(selectedIndex) : 'neutral';
  const isClient = variant === 'client';
  const latestIndex = totalCount - 1;
  const previousIndex = totalCount >= 2 ? totalCount - 2 : -1;

  if (totalCount < 1) return null;

  if (isClient && totalCount >= 2 && !showAllAssessments) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-2">
        <VersionSelectorBar
          current={current}
          onPrev={() => onSelect(selectedIndex - 1)}
          onNext={() => onSelect(selectedIndex + 1)}
          gridTrigger={
            <div className="flex items-center gap-1 px-1">
              <button
                type="button"
                onClick={() => onSelect(latestIndex)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                  selectedIndex === latestIndex
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                Latest
              </button>
              {previousIndex >= 0 ? (
                <button
                  type="button"
                  onClick={() => onSelect(previousIndex)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                    selectedIndex === previousIndex
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  Previous
                </button>
              ) : null}
            </div>
          }
          hasPrev={selectedIndex > 0}
          hasNext={selectedIndex < totalCount - 1}
        />
        {totalCount > 2 ? (
          <button
            type="button"
            onClick={() => setShowAllAssessments(true)}
            className="text-xs font-medium text-primary hover:underline"
          >
            All assessments
          </button>
        ) : null}
      </div>
    );
  }

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
