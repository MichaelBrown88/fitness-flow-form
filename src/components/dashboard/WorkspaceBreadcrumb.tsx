import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkspaceBreadcrumbProps {
  /** The terminal segment, shown bold (e.g. "Today", "Clients"). */
  current: string;
  /** Optional intermediate segments between "Workspace" and `current`. */
  trail?: string[];
  /** Override the root label (defaults to "Workspace"). */
  rootLabel?: string;
  className?: string;
}

/**
 * Kit-spec breadcrumb used at the top of every workspace page (Today,
 * Clients, Artefacts, Studio settings…). Match-renders the same visual
 * across all surfaces so navigation feels coherent.
 */
export function WorkspaceBreadcrumb({
  current,
  trail,
  rootLabel = 'Workspace',
  className,
}: WorkspaceBreadcrumbProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center gap-1.5 text-[13px] text-muted-foreground', className)}
    >
      <span>{rootLabel}</span>
      {trail?.map((seg) => (
        <span key={seg} className="flex items-center gap-1.5">
          <ChevronRight className="h-3.5 w-3.5" />
          <span>{seg}</span>
        </span>
      ))}
      <ChevronRight className="h-3.5 w-3.5" />
      <span className="font-semibold text-foreground">{current}</span>
    </nav>
  );
}
