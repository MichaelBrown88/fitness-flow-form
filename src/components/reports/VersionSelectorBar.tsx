import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { VersionSelectorSnapshot } from './AssessmentVersionSelector';

interface VersionSelectorBarProps {
  current: VersionSelectorSnapshot | null;
  onPrev: () => void;
  onNext: () => void;
  gridTrigger: React.ReactNode;
  hasPrev: boolean;
  hasNext: boolean;
}

const VersionSelectorBar: React.FC<VersionSelectorBarProps> = ({
  current,
  onPrev,
  onNext,
  gridTrigger,
  hasPrev,
  hasNext,
}) => {
  if (!current) return null;

  return (
    <div className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-1 py-0.5">
      <Button
        variant="ghost"
        size="sm"
        onClick={onPrev}
        disabled={!hasPrev}
        className="h-8 w-8 p-0 shrink-0"
        aria-label="Previous assessment"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </Button>

      {gridTrigger}

      <Button
        variant="ghost"
        size="sm"
        onClick={onNext}
        disabled={!hasNext}
        className="h-8 w-8 p-0 shrink-0"
        aria-label="Next assessment"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
};

export default VersionSelectorBar;
