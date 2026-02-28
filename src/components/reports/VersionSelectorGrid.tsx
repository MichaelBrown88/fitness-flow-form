import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ScoreBadge from './ScoreBadge';
import type { VersionSelectorSnapshot } from './AssessmentVersionSelector';

interface VersionSelectorGridProps {
  items: VersionSelectorSnapshot[];
  selectedIndex: number;
  totalCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  onSelect: (globalIndex: number) => void;
  onPageChange: (page: number) => void;
  getTrend: (globalIndex: number) => 'up' | 'down' | 'neutral';
}

function formatGridDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const VersionSelectorGrid: React.FC<VersionSelectorGridProps> = ({
  items,
  selectedIndex,
  currentPage,
  totalPages,
  pageSize,
  onSelect,
  onPageChange,
  getTrend,
}) => {
  const pageOffset = currentPage * pageSize;

  return (
    <div className="w-72 p-4">
      {/* Page navigation */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mb-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 0}
            className="h-7 w-7 p-0"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs text-slate-400">
            Page {currentPage + 1} of {totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages - 1}
            className="h-7 w-7 p-0"
            aria-label="Next page"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* 3×3 grid */}
      <div className="grid grid-cols-3 gap-3">
        {items.map((snap, i) => {
          const globalIndex = pageOffset + i;
          const isSelected = globalIndex === selectedIndex;
          const trend = getTrend(globalIndex);

          return (
            <button
              key={snap.id}
              onClick={() => onSelect(globalIndex)}
              className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl transition-colors duration-150 ${
                isSelected ? 'bg-slate-100' : 'hover:bg-slate-50'
              }`}
            >
              <span className="text-[10px] text-slate-400 leading-tight">
                {formatGridDate(snap.date)}
              </span>
              <ScoreBadge score={snap.score} trend={trend} size="md" />
              <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 leading-tight truncate max-w-full">
                {snap.type}
              </span>
            </button>
          );
        })}
      </div>

      {/* Dot indicators */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 mt-3">
          {Array.from({ length: totalPages }, (_, i) => (
            <span
              key={i}
              className={`inline-block h-1.5 w-1.5 rounded-full transition-colors ${
                i === currentPage ? 'bg-slate-700' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default VersionSelectorGrid;
