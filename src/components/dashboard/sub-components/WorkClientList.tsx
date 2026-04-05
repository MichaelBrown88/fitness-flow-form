import { useMemo } from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { ReassessmentItem } from '@/hooks/useReassessmentQueue';
import { ClientPillarStatusRow } from './ClientPillarStatusRow';

interface WorkClientListProps {
  queue: ReassessmentItem[];
  search?: string;
  onStartAssessment: (clientName: string, pillar: string) => void;
}

export function WorkClientList({ queue, search, onStartAssessment }: WorkClientListProps) {
  const filtered = useMemo(() => {
    const actionable = queue.filter(item => item.status === 'overdue' || item.status === 'due-soon');
    if (!search?.trim()) return actionable;
    const lower = search.toLowerCase();
    return actionable.filter(item => item.clientName.toLowerCase().includes(lower));
  }, [queue, search]);

  if (filtered.length === 0) {
    const hasSearch = search?.trim();
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <CheckCircle2 className="h-8 w-8 text-score-green opacity-70" />
        <p className="text-sm font-semibold text-foreground">
          {hasSearch ? 'No clients match your search' : 'All clients are on track'}
        </p>
        {!hasSearch && (
          <p className="text-xs text-muted-foreground">Nothing due or overdue right now.</p>
        )}
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border/40 px-3">
      {filtered.map(item => (
        <ClientPillarStatusRow
          key={item.id}
          item={item}
          onStartAssessment={onStartAssessment}
        />
      ))}
    </ul>
  );
}
